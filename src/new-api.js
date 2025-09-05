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

require('dotenv').config();

// node_modules/whatsapp-web.js/src/client.js change the line 175 replace this:
// const INTRO_IMG_SELECTOR = 'div[role=\'textbox\']'; //'[data-icon=\'chat\']';

// ================= INICIALIZACIÓN DE VARIABLES =================
const app = express();
const PORT = process.env.PORT || 3000;
let whatsappClient;
let isReady = false;


// ================= INSTANCIAS =================
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
    whatsappClient = new Client({ 
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
        isReady = true;
        console.log('✅ ¡CLIENTE DE WHATSAPP READY...! Conectado y funcionando correctamente \n');
    });

    // Evento: Mensaje recibido
    whatsappClient.on('message', async msg => {
        try {
            if (msg.fromMe) {
                console.log(' Ignorando mensaje propio para evitar bucles');
                return;
            }
            // Identificar tipo de chat
            const chat = await msg.getChat();

             // ✅ SOLUCIÓN 3: Filtrar por chat específico
            if (chat.id._serialized !== '5493417028585@c.us' || chat.isGroup) {
                console.log(`⏭️ Ignorando chat: ${chat.id._serialized}`);
                return;
            }

            console.log(`Chat.name: "${chat.name}" Mensaje From: ${msg.from} Body: "${msg.body}"`);
            
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

             //////////////   Response AI /////////////
            try {
                if (aiEnabled && !msg.fromMe) {

                    // Contexts for AI ///
                    const messagesOld = await whatsappDB.getChatMessages(chat.id._serialized, 5);

                    console.log('MessagesOld:', messagesOld);

                    const responseAI = await aiBot.generateResponse(messagesOld);
                    console.log('Response AI:', responseAI);
                    if (responseAI) {
                        let newMessage = await chat.sendMessage(responseAI);
                        let sendNewMessageSave = {
                            messageId: newMessage.id._serialized,
                            chatId: chat.id._serialized,
                            from: newMessage.from,
                            to: newMessage.to,
                            body: responseAI,
                            type: newMessage.type,
                            timestamp: newMessage.timestamp,
                            fromMe: newMessage.fromMe,
                            hasMedia: newMessage.hasMedia,
                            isGroup: chat.isGroup,
                            author: msg.author || null,
                            chatName: chat.name,
                            mediaInfo: null
                        };
                        await whatsappDB.findOneAndUpdate(sendNewMessageSave);
                        console.log('✅ Respuesta IA enviada y guardada');
                    }
                }
            } catch (error) {
                console.error('AI error:', error);
            }
            /////////////////////////////////////

        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });
};

///  ===============  ROUTES  ===============

// RUTA: GET /synchronize-chats - Sincronizar chats con MongoDB
app.get('/synchronize-chats', async (req, res) => {
    if(!isReady){
        return res.status(503).json({
            error: 'WhatsApp no está listo',
            message: 'Espera a que el cliente se conecte'
        });
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
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
        res.json({
            success: true,
            message: 'Sincronización completada correctamente',
            statistics: {
                totalChats: chats.length,
            }
    });
    } catch (error) {
        console.error('Error en sincronización de chats:', error.message);
    }
});

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