const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const fs = require('fs').promises;
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const SimpleAI = require('./ai/OpenAI.js');
const { mongoConnection } = require('./database/mongodb');
const whatsappDB = require('./services/whatsappDB');
const MediaProcessor = require('./services/mediaProcessor');
const { group } = require('console');

require('dotenv').config();
// node_modules/whatsapp-web.js/src/client.js change the line 175 replace this:
// const INTRO_IMG_SELECTOR = 'div[role=\'textbox\']'; //'[data-icon=\'chat\']';
// ================= INICIALIZACIÓN DE VARIABLES =================
const app = express();
const PORT = process.env.PORT || 3000;

// connect Data Base MongoDB ///
const connectMongoDB = async () => {
    try {
        await mongoConnection.connect();
        console.log('✅ Conexión a MongoDB establecida');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error.message);
    }
};

// Instancia de la IA para respuestas automáticas
const aiBot = new SimpleAI();
let aiEnabled = true;

// ================= CONFIGURACIÓN DE MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= FUNCIÓN DE INICIALIZACIÓN DE WHATSAPP =================
const initializeWhatsApp = async () => {
    console.log('Inicializando cliente de WhatsApp para API...');
    
    // Crear nueva instancia del cliente de WhatsApp
    let whatsappClient = new Client({ 
        webVersionCache: {
            type: 'remote',
            remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2407.3.html', // Replace with a known working version
        },
        authStrategy: new LocalAuth({
            dataPath: '/app/.wwebjs_auth',
            clientId: 'client-API-393381500529'
        }), 
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-web-security',
                '--disable-features=TranslateUI',
                '--disable-ipc-flooding-protection'
            ],
            timeout: 2000 // Sin timeout
        }
    });
    
    whatsappClient.initialize(); ///////

    // ================= EVENT LISTENERS DEL CLIENTE =================
    // Evento: Se genera un código QR para autenticación
    whatsappClient.on('qr', qr => {
        // Mostrar QR code visual en la terminal
        qrcode.generate(qr, { small: true });
        console.log('⏳ Esperando que escanees el código...');
    });
    // Evento: Cliente autenticado
    whatsappClient.on('authenticated', () => {
        console.log('✅ Cliente autenticado correctamente');
    });
    // Evento: Cliente listo para usar (autenticado y conectado)
    whatsappClient.on('ready', async () => {
        console.log('✅ ¡CLIENTE DE WHATSAPP READY...! Conectado y funcionando correctamente \n');
        
        await setTimeout(async () => {
            try {
                const chats = await whatsappClient.getChats();
                console.log(`Sincronizando ${chats.length} chats...`);
                
                for (const chat of chats) {
                    console.log(`Chat: ${chat.name} | ID: ${chat.id._serialized} | Group: ${chat.isGroup}`);
                    
                    try {
                        /// Save chat MongoDB //
                        let groupMetadata = null;
                        if (chat.isGroup) {
                            groupMetadata = {
                                creation: chat.groupMetadata.creation,
                                owner: chat.groupMetadata.owner?._serialized || null,
                                description: chat.groupMetadata.desc,
                                participantCount: chat.groupMetadata.participants.length,
                                participants: chat.groupMetadata.participants.map(p => ({
                                    id: p.id._serialized,
                                    isAdmin: p.isAdmin,
                                    isSuperAdmin: p.isSuperAdmin
                                }))
                            };
                        } 
                        await whatsappDB.saveOrUpdateChat({
                            chatId: chat.id._serialized,
                            name: chat.name,
                            isGroup: chat.isGroup,
                            unreadCount: chat.unreadCount,
                            groupMetadata: chat.isGroup ? groupMetadata : null
                        });
                    } catch (error) {
                        console.error('Error saving chat:', error);
                    }
                    try {
                        ///// Save Message of Chat  ////////
                        const messages = await chat.fetchMessages({ limit: 30 });
                        
                        // VERIFICACIÓN POR LOTES (más eficiente)
                        const messageIds = messages.map(msg => msg.id._serialized);
                        const existingIds = await whatsappDB.getExistingMessageIds(messageIds);
                        console.log(`${existingIds.length}/${messages.length} mensajes ya existen`);
                        
                        for (const msg of messages) {
                            //  VERIFICAR SI EL MENSAJE YA EXISTE (verificación local)
                            if (existingIds.includes(msg.id._serialized)) {
                                console.log(`Mensaje ${msg.id._serialized} ya existe, saltando...`);
                                continue; // Saltar al siguiente mensaje
                            }
                            
                            console.log(`Procesando nuevo mensaje ${msg.id._serialized}...`);
                            
                            let messageSave = {
                                    messageId: msg.id._serialized,
                                    chatId: chat.id._serialized,
                                    from: msg.from,
                                    to: msg.to,
                                    body: msg.body,
                                    type: msg.type,
                                    timestamp: msg.timestamp,
                                    fromMe: msg.fromMe,
                                    hasMedia: msg.hasMedia,
                                    isGroup: chat.isGroup,
                                    author: msg.author || null,
                                    chatName: chat.name || null,
                                    mediaInfo: null
                            };
                            if (msg.hasMedia) {
                                // Procesar multimedia si existe
                                console.log(`Procesando multimedia del mensaje ${msg.id._serialized}...`);
                                messageSave.mediaInfo = await MediaProcessor.processMessage(msg);
                            }

                            await whatsappDB.findOneAndUpdate(messageSave);
                        }
                    } catch (error) {
                        console.error('Error Save messages:', error);
                    }
                }
                console.log('✅ Sincronización completada \n');
            } catch (error) {
                console.error('Error en sincronización de chats:', error.message);
            }
        }, 2000);
    });

    // Evento: Mensaje recibido
    whatsappClient.on('message', async msg => {
        try {
            // Identificar tipo de chat
            const chat = await msg.getChat();

            const chatType = chat.isGroup ? 'GRUPO' : 'INDIVIDUAL';
            console.log(`[${chatType}] Chat.name: "${chat.name}" Mensaje From: ${msg.from} Body: "${msg.body}"`);
            
            let messageSave = {
                messageId: msg.id._serialized,
                chatId: chat.id._serialized,
                from: msg.from,
                to: msg.to,
                body: msg.body,
                type: msg.type,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                hasMedia: msg.hasMedia,
                isGroup: chat.isGroup,
                author: msg.author || null,
                chatName: chat.name,
                mediaInfo: null
            };
            // Procesar multimedia si existe
            if (msg.hasMedia) {
                console.log(`Procesando multimedia del mensaje en tiempo real ${msg.id._serialized}...`);
                messageSave.mediaInfo = await MediaProcessor.processMessage(msg);
            }

            await whatsappDB.findOneAndUpdate(messageSave);

        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
        //////////////   Response AI /////////////
        // Contexts for AI ///
        const messageOld = await whatsappDB.getChatMessages(msg.id._serialized);
        const senderInfo = {
            name: chat.name,
            id: chat.id._serialized,
            isGroup: chat.isGroup,
            groupName: chat.name
        }

        if (aiEnabled) {
            // const responseAI = await aiBot.generateResponse(msg.body, senderInfo, messageOld);
        }


    });

    
    // Evento: Cuando la sesión se guarda
    whatsappClient.on('auth_success', () => {
        console.log('💾 Sesión de autenticación guardada exitosamente');
    });
    // Evento: Error de autenticación
    whatsappClient.on('auth_failure', msg => {
        console.error('❌ Error de autenticación:', msg);
    });
    // Evento: Cliente desconectado
    whatsappClient.on('disconnected', (reason) => {
        console.log('🔌 Cliente desconectado:', reason);
    });
    // Evento: Estado de carga
    whatsappClient.on('loading_screen', (percent, message) => {
        console.log(`📡 Cargando WhatsApp... ${percent}% - ${message}`);
    });
    // Evento: Cambio de estado
    whatsappClient.on('change_state', state => {
        console.log('🔄 Estado del cliente cambiado a:', state);
    });



    // try {
    //     await whatsappClient.initialize();
    //     console.log('✅ Cliente WhatsApp inicializado correctamente');
    // } catch (error) {
    //     console.error('❌ Error inicializando cliente:', error);
    //     throw error;
    // }
};

// ================= INICIALIZACIÓN =================

// Función de inicialización asíncrona
const initializeApp = async () => {
    try {
        await connectMongoDB();

        await initializeWhatsApp();

        app.listen(PORT, '0.0.0.0', () => {
            console.log('WhatsApp API con MongoDB Iniciado ///// LISTENING');
        });
        
    } catch (error) {
        console.error('Error crítico iniciando la aplicación:', error);
        process.exit(1);
    }
};

// Inicializar la aplicación
initializeApp()

module.exports = app;