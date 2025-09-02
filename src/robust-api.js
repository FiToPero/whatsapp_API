const express = require('express');
const cors = require('cors');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');

require('dotenv').config();

// ================= INICIALIZACIÓN DE VARIABLES =================
const app = express();
const PORT = process.env.PORT || 3000;
let whatsappClient = null;

// ================= CONFIGURACIÓN DE MIDDLEWARES =================
app.use(cors());
app.use(express.json());

// ================= FUNCIÓN DE INICIALIZACIÓN DE WHATSAPP =================

const initializeWhatsApp = async () => {
    console.log('Inicializando cliente de WhatsApp para API...');
    
    // Crear nueva instancia del cliente de WhatsApp
    whatsappClient = new Client({  
        authStrategy: new LocalAuth({
            dataPath: '/app/.wwebjs_auth',
            clientId: 'client-API_js'
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
    if(whatsappClient){console.log('Cliente creado');}
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
        console.log('📱 Preparando conexión con WhatsApp...');
    });

    // Evento: Cliente listo para usar (autenticado y conectado)
    whatsappClient.on('ready', () => {
        console.log('🎉 ¡CLIENTE DE WHATSAPP LISTO!');
        console.log('✅ Conectado y funcionando correctamente');
        console.log('');
        isClientReady = true;
        
        setTimeout(async () => {
            try {
                const chats = await whatsappClient.getChats();
                console.log(`📊 Sincronizando ${chats.length} chats...`);
                
                for (const chat of chats) {
                    console.log(`Chat: ${chat.name} | ID: ${chat.id._serialized}`);
                }
                
                console.log('✅ Sincronización completada');
                
            } catch (error) {
                console.error('❌ Error en sincronización de chats:', error.message);
            }
        }, 2000); // Esperar 2 segundos antes de sincronizar
        
    });

    // Evento: Mensaje recibido
    whatsappClient.on('message', msg => {
        try {
            // Identificar tipo de chat
            const chat = msg.getChat();
            const isGroupChat = chat.isGroup;
            const chatType = isGroupChat ? 'GRUPO' : 'INDIVIDUAL';
            
            console.log(`[${chatType}] Mensaje recibido de ${msg.from}: "${msg.body}"`);
            
            if (isGroupChat) {
                console.log(`[GRUPO] Nombre: "${chat.name}"`);
                console.log(`[GRUPO] Remitente: ${msg.author || 'Desconocido'}`);
            }
            
            // Respuesta automática simple para pruebas
            if (!msg.fromMe && msg.body.toLowerCase().includes('hola')) {
                msg.reply('¡Hola! Soy el bot de WhatsApp API. ¿Cómo puedo ayudarte?');
                console.log(`[${chatType}] Respuesta automática enviada`);
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });

    
    // Evento: Cuando la sesión se guarda
    whatsappClient.on('auth_success', () => {
        console.log('💾 Sesión de autenticación guardada exitosamente');
    });

    // Evento: Error de autenticación
    whatsappClient.on('auth_failure', msg => {
        console.error('❌ Error de autenticación:', msg);
        isClientReady = false;
    });

    // Evento: Cliente desconectado
    whatsappClient.on('disconnected', (reason) => {
        console.log('🔌 Cliente desconectado:', reason);
        isClientReady = false;
    });

    // Evento: Estado de carga
    whatsappClient.on('loading_screen', (percent, message) => {
        console.log(`📡 Cargando WhatsApp... ${percent}% - ${message}`);
    });

    // Evento: Cambio de estado
    whatsappClient.on('change_state', state => {
        console.log('🔄 Estado del cliente cambiado a:', state);
    });



    try {
        await whatsappClient.initialize();  // ← Agregar await
        console.log('✅ Cliente WhatsApp inicializado correctamente');
    } catch (error) {
        console.error('❌ Error inicializando cliente:', error);
        throw error;
    }
};




// ================= INICIALIZACIÓN =================

// Función de inicialización asíncrona
const initializeApp = () => { 
      try {
        initializeWhatsApp();

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