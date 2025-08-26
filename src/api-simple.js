// ================================================================
// WHATSAPP API CON MONGODB - VERSIÓN ESTABLE
// ================================================================

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// MongoDB
const { mongoConnection } = require('./database/mongodb');
const whatsappDB = require('./services/whatsappDB');

// WhatsApp
const { Client, LocalAuth } = require('whatsapp-web.js');
const SimpleAI = require('./ai/SimpleAI');

// ================= CONFIGURACIÓN =================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Variables globales
let whatsappClient = null;
let isClientReady = false;
let isMongoConnected = false;
let aiEnabled = true;
const aiBot = new SimpleAI();

// ================= INICIALIZACIÓN MONGODB =================
const initializeMongoDB = async () => {
    try {
        console.log('Conectando a MongoDB...');
        await mongoConnection.connect();
        isMongoConnected = true;
        console.log('MongoDB conectado');
    } catch (error) {
        console.error('Error MongoDB:', error.message);
        isMongoConnected = false;
    }
};

// ================= INICIALIZACIÓN WHATSAPP =================
const initializeWhatsApp = () => {
    console.log('Inicializando WhatsApp...');
    
    whatsappClient = new Client({
        authStrategy: new LocalAuth({
            dataPath: '/app/.wwebjs_auth'
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
                '--disable-gpu'
            ]
        }
    });

    // Eventos
    whatsappClient.on('qr', qr => {
        console.log('Código QR generado');
    });

    whatsappClient.on('ready', () => {
        console.log('WhatsApp listo');
        isClientReady = true;
    });

    whatsappClient.on('authenticated', () => {
        console.log('WhatsApp autenticado');
    });

    whatsappClient.on('auth_failure', msg => {
        console.error('Error autenticación:', msg);
        isClientReady = false;
    });

    whatsappClient.on('message', async msg => {
        if (msg.fromMe) return; // Ignorar mensajes propios
        
        try {
            const chat = await msg.getChat();
            const isGroup = chat.isGroup;
            
            // Guardar en MongoDB
            if (isMongoConnected) {
                try {
                    const messageData = {
                        messageId: msg.id._serialized,
                        chatId: msg.from,
                        from: msg.from,
                        author: msg.author || null,
                        to: msg.to,
                        body: msg.body || '',
                        type: msg.type || 'text',
                        timestamp: new Date(msg.timestamp * 1000),
                        fromMe: msg.fromMe,
                        hasMedia: msg.hasMedia,
                        isGroup: isGroup,
                        chatName: chat.name
                    };
                    
                    await whatsappDB.saveMessage(messageData);
                } catch (dbError) {
                    console.error('Error DB:', dbError.message);
                }
            }
            
            // Respuesta IA
            if (aiEnabled && msg.body && msg.body.trim()) {
                let shouldRespond = true;
                
                if (isGroup) {
                    const keywords = ['bot hablame'];
                    shouldRespond = keywords.some(k => msg.body.toLowerCase().includes(k));
                }
                
                if (shouldRespond) {
                    const contact = await msg.getContact();
                    const senderInfo = {
                        name: contact.pushname || contact.name || null,
                        number: msg.from,
                        isGroup: isGroup,
                        groupName: isGroup ? chat.name : null
                    };
                    
                    const aiResponse = await aiBot.generateResponse(msg.body, senderInfo);
                    await msg.reply(aiResponse);

                    console.log(`Respuesta enviada a ${chat.name}`);
                }
            }
            
        } catch (error) {
            console.error('Error procesando mensaje:', error.message);
        }
    });

    whatsappClient.initialize().catch(error => {
        console.error('Error inicializando WhatsApp:', error);
    });
};

// ================= ENDPOINTS =================

app.get('/status', async (req, res) => {
    const response = {
        whatsapp: {
            status: isClientReady ? 'connected' : 'disconnected',
            ready: isClientReady
        },
        mongodb: {
            status: isMongoConnected ? 'connected' : 'disconnected',
            ready: isMongoConnected
        },
        ai: {
            enabled: aiEnabled
        },
        timestamp: new Date().toISOString()
    };
    
    if (isMongoConnected) {
        try {
            const stats = await whatsappDB.getGlobalStats();
            response.mongodb.stats = stats;
        } catch (error) {
            response.mongodb.error = error.message;
        }
    }
    
    res.json(response);
});

app.post('/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;
        
        if (!number || !message) {
            return res.status(400).json({
                error: 'Faltan parámetros: number, message'
            });
        }
        
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no conectado'
            });
        }
        
        const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
        const sentMessage = await whatsappClient.sendMessage(formattedNumber, message);
        
        res.json({
            success: true,
            messageId: sentMessage.id._serialized,
            to: formattedNumber
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/chats', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no conectado'
            });
        }
        
        const chats = await whatsappClient.getChats();
        const chatList = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            unreadCount: chat.unreadCount
        }));
        
        res.json({
            success: true,
            count: chatList.length,
            chats: chatList
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/db/messages/:chatId', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no conectado'
            });
        }
        
        const { chatId } = req.params;
        const { limit = 50 } = req.query;
        
        const messages = await whatsappDB.getChatMessages(chatId, {
            limit: parseInt(limit)
        });
        
        res.json({
            success: true,
            chatId,
            count: messages.length,
            messages: messages.map(msg => ({
                id: msg.messageId,
                from: msg.from,
                body: msg.body,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                isGroup: msg.isGroup,
                type: msg.type
            }))
        });
        
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.post('/ai/toggle', (req, res) => {
    aiEnabled = !aiEnabled;
    res.json({
        success: true,
        aiEnabled
    });
});

app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp API con MongoDB',
        version: '3.0.0',
        endpoints: {
            'GET /status': 'Estado del sistema',
            'POST /send-message': 'Enviar mensaje',
            'GET /chats': 'Lista de chats',
            'GET /db/messages/:chatId': 'Mensajes de un chat',
            'POST /ai/toggle': 'Activar/desactivar IA'
        }
    });
});

// ================= INICIO =================
const startApp = async () => {
    console.log('Iniciando WhatsApp API con MongoDB...');
    
    // 1. MongoDB
    await initializeMongoDB();
    
    // 2. WhatsApp
    initializeWhatsApp();
    
    // 3. Servidor
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor en http://localhost:${PORT}`);
        console.log(`IA: ${aiEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
        console.log(`MongoDB: ${isMongoConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
    });
};

startApp().catch(error => {
    console.error('Error crítico:', error);
    process.exit(1);
});

module.exports = app;
