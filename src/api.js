// ================================================================
// WHATSAPP API - DOCUMENTACIÓN COMPLETA
// ================================================================
// Esta API permite enviar y recibir mensajes de WhatsApp a través
// de endpoints HTTP REST usando whatsapp-web.js y Express.js
// ================================================================

// ================= IMPORTACIÓN DE MÓDULOS =================

// Express: Framework web para Node.js que permite crear servidores HTTP
const express = require('express');

// CORS: Middleware que permite Cross-Origin Resource Sharing
// Permite que la API sea accesible desde otros dominios/puertos
const cors = require('cors');

// WhatsApp Web.js: Biblioteca que conecta con WhatsApp Web
// Client: Clase principal para manejar la conexión
// LocalAuth: Estrategia de autenticación que guarda la sesión localmente
const { Client, LocalAuth } = require('whatsapp-web.js');

// IA Simple: Asistente virtual para respuestas automáticas
const SimpleAI = require('./ai/SimpleAI');

// ================= INICIALIZACIÓN DE VARIABLES =================

// Crear instancia de la aplicación Express
const app = express();

// Puerto donde correrá el servidor (3000 es el puerto estándar para desarrollo)
const PORT = 3000;

// Variable global para almacenar la instancia del cliente de WhatsApp
// null significa que aún no se ha inicializado
let whatsappClient = null;

// Variable de estado que indica si WhatsApp está conectado y listo
// false por defecto hasta que se complete la autenticación
let isClientReady = false;

// Instancia de la IA para respuestas automáticas
const aiBot = new SimpleAI();

// Variable para controlar si la IA está activada
let aiEnabled = true;

// ================= CONFIGURACIÓN DE MIDDLEWARES =================

// CORS: Habilita el acceso desde cualquier origen (*)
// Permite que aplicaciones web desde otros dominios usen esta API
app.use(cors());

// JSON Parser: Middleware que convierte el cuerpo de las peticiones HTTP
// de formato JSON a objetos JavaScript accesibles via req.body
app.use(express.json());

// ================= FUNCIÓN DE INICIALIZACIÓN DE WHATSAPP =================

const initializeWhatsApp = () => {
    // Log de inicio del proceso de inicialización
    console.log('🔄 Inicializando cliente de WhatsApp para API...');
    
    // Crear nueva instancia del cliente de WhatsApp
    whatsappClient = new Client({
        // Estrategia de autenticación local
        authStrategy: new LocalAuth({
            // Ruta donde se guardarán los datos de autenticación
            // Esto permite que la sesión persista entre reinicios
            dataPath: '/app/.wwebjs_auth'
        }),
        
        // Configuración de Puppeteer (controla el navegador Chrome)
        puppeteer: {
            // Modo headless: ejecuta Chrome sin interfaz gráfica
            headless: true,
            
            // Argumentos específicos para Chrome en Docker
            args: [
                '--no-sandbox',                    // Desactiva sandbox de seguridad (necesario en Docker)
                '--disable-setuid-sandbox',        // Desactiva sandbox setuid
                '--disable-dev-shm-usage',         // Usa /tmp en lugar de /dev/shm (evita problemas de memoria)
                '--disable-accelerated-2d-canvas', // Desactiva aceleración de canvas 2D
                '--no-first-run',                  // Evita el wizard de primera ejecución
                '--no-zygote',                     // Desactiva proceso zygote
                '--disable-gpu',                   // Desactiva GPU (no disponible en headless)
                '--disable-background-timer-throttling',     // Evita throttling de timers
                '--disable-backgrounding-occluded-windows',  // Evita optimizaciones de ventanas ocultas
                '--disable-renderer-backgrounding',          // Evita backgrounding del renderer
                '--disable-web-security',          // Desactiva seguridad web (solo para desarrollo)
                '--disable-features=TranslateUI',  // Desactiva interfaz de traducción
                '--disable-ipc-flooding-protection' // Desactiva protección de flooding IPC
            ]
        }
    });

    // ================= EVENT LISTENERS DEL CLIENTE =================

    // Evento: Se genera un código QR para autenticación
    whatsappClient.on('qr', qr => {
        console.log('📱 Código QR generado. Escanea con tu WhatsApp:');
        // Imprime el código QR como texto (para debug, no se ve como QR visual)
        console.log(qr);
    });

    // Evento: Cliente listo para usar (autenticado y conectado)
    whatsappClient.on('ready', () => {
        console.log('🚀 ¡Cliente de WhatsApp API listo!');
        // Cambiar estado global a conectado
        isClientReady = true;
    });

    // Evento: Autenticación exitosa
    whatsappClient.on('authenticated', () => {
        console.log('✅ Cliente autenticado correctamente');
    });

    // Evento: Error de autenticación
    whatsappClient.on('auth_failure', msg => {
        console.error('❌ Error de autenticación:', msg);
        // Marcar como no conectado en caso de error
        isClientReady = false;
    });

    // Evento: Cliente desconectado
    whatsappClient.on('disconnected', (reason) => {
        console.log('📤 Cliente desconectado:', reason);
        // Marcar como no conectado
        isClientReady = false;
    });

    // Evento: Mensaje recibido
    whatsappClient.on('message', async msg => {
        try {
            // ================= IDENTIFICAR TIPO DE CHAT =================
            
            // Método 1: Verificar por el formato del ID
            const isFromGroup = msg.from.endsWith('@g.us');
            
            // Método 2: Obtener información del chat (más confiable)
            const chat = await msg.getChat();
            const isGroupChat = chat.isGroup;
            
            // Log del mensaje recibido con información del tipo de chat
            const chatType = isGroupChat ? 'GRUPO' : 'INDIVIDUAL';
            console.log(`📨 [${chatType}] Mensaje recibido de ${msg.from}: "${msg.body}"`);
            
            // Si es grupo, obtener información adicional
            if (isGroupChat) {
                console.log(`👥 [GRUPO] Nombre: "${chat.name}"`);
                console.log(`👤 [GRUPO] Remitente: ${msg.author || 'Desconocido'}`);
            }
            
            // ================= RESPUESTA AUTOMÁTICA CON IA =================
            
            // Solo responder si la IA está activada y el mensaje no es de nosotros
            if (aiEnabled && !msg.fromMe) {
                
                // Configurar diferentes comportamientos para grupos vs individuales
                let shouldRespond = true;
                
                if (isGroupChat) {
                    // En grupos, solo responder si mencionan al bot o usan palabras clave
                    const mentionKeywords = ['bot hablame']; //['bot', 'asistente', 'ayuda', 'help'];
                    const messageText = msg.body.toLowerCase();
                    shouldRespond = mentionKeywords.some(keyword => messageText.includes(keyword));
                    
                    console.log(`🤖 [GRUPO] ${shouldRespond ? 'Responderá' : 'No responderá'} (keywords: ${mentionKeywords.join(', ')})`);
                }
                
                if (shouldRespond) {
                    // Obtener información del contacto (nombre si está disponible)
                    const contact = await msg.getContact();
                    const senderInfo = {
                        name: contact.pushname || contact.name || null,
                        number: msg.from,
                        isGroup: isGroupChat,
                        groupName: isGroupChat ? chat.name : null,
                        author: msg.author || null // En grupos, quién envió el mensaje
                    };
                    
                    // Generar respuesta con la IA
                    const aiResponse = await aiBot.generateResponse(msg.body, senderInfo);
                    
                    // Enviar respuesta automática
                    await msg.reply(aiResponse);
                    
                    console.log(`🤖 [${chatType}] Respuesta enviada a ${msg.from}: "${aiResponse}"`);
                }
            }
            
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
        }
    });

    // Inicializar el cliente y manejar errores
    whatsappClient.initialize().catch(error => {
        console.error('❌ Error inicializando cliente:', error);
    });
};

// ================= RUTAS DE LA API =================

// RUTA: GET /status - Estado de la conexión
app.get('/status', (req, res) => {
    res.json({
        status: isClientReady ? 'connected' : 'disconnected',
        message: isClientReady ? 'WhatsApp conectado y listo' : 'WhatsApp no conectado',
        aiEnabled: aiEnabled,
        timestamp: new Date().toISOString()
    });
});

// RUTA: POST /ai/toggle - Activar/desactivar IA
app.post('/ai/toggle', (req, res) => {
    aiEnabled = !aiEnabled;
    res.json({
        success: true,
        message: aiEnabled ? 'IA activada' : 'IA desactivada',
        aiEnabled: aiEnabled
    });
});

// RUTA: POST /ai/custom-response - Agregar respuesta personalizada
app.post('/ai/custom-response', (req, res) => {
    try {
        const { category, responses } = req.body;
        
        if (!category || !responses) {
            return res.status(400).json({
                error: 'Faltan parámetros requeridos',
                required: ['category', 'responses']
            });
        }
        
        aiBot.addCustomResponse(category, responses);
        
        res.json({
            success: true,
            message: `Respuestas agregadas a la categoría: ${category}`,
            category: category,
            addedResponses: Array.isArray(responses) ? responses : [responses]
        });
        
    } catch (error) {
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: POST /send-message - Enviar mensaje
app.post('/send-message', async (req, res) => {
    try {
        const { number, message } = req.body;

        if (!number || !message) {
            return res.status(400).json({
                error: 'Faltan parámetros requeridos',
                required: ['number', 'message']
            });
        }

        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado',
                message: 'Espera a que se conecte o escanea el código QR'
            });
        }

        const formattedNumber = number.includes('@') ? number : `${number}@c.us`;
        const sentMessage = await whatsappClient.sendMessage(formattedNumber, message);
        
        console.log(`📤 [API] Mensaje enviado a ${formattedNumber}: "${message}"`);

        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            data: {
                to: formattedNumber,
                message: message,
                messageId: sentMessage.id._serialized,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /chats - Obtener chats con información de tipo
app.get('/chats', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado'
            });
        }

        const chats = await whatsappClient.getChats();
        
        const chatList = chats.map(chat => ({
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            type: chat.isGroup ? 'group' : 'individual',
            participantsCount: chat.isGroup ? chat.participants?.length : 1,
            lastMessage: chat.lastMessage ? {
                body: chat.lastMessage.body,
                timestamp: chat.lastMessage.timestamp,
                from: chat.lastMessage.from,
                fromMe: chat.lastMessage.fromMe
            } : null
        }));

        // Separar grupos e individuales
        const groups = chatList.filter(chat => chat.isGroup);
        const individuals = chatList.filter(chat => !chat.isGroup);

        res.json({
            success: true,
            summary: {
                total: chatList.length,
                groups: groups.length,
                individuals: individuals.length
            },
            chats: chatList,
            groups: groups,
            individuals: individuals
        });

    } catch (error) {
        console.error('❌ Error obteniendo chats:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /chat/:id - Obtener información específica de un chat
app.get('/chat/:id', async (req, res) => {
    try {
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado'
            });
        }

        const chatId = req.params.id;
        const chat = await whatsappClient.getChatById(chatId);
        
        if (!chat) {
            return res.status(404).json({
                error: 'Chat no encontrado',
                chatId: chatId
            });
        }

        const chatInfo = {
            id: chat.id._serialized,
            name: chat.name,
            isGroup: chat.isGroup,
            type: chat.isGroup ? 'group' : 'individual',
            archived: chat.archived,
            pinned: chat.pinned,
            muteExpiration: chat.muteExpiration,
            unreadCount: chat.unreadCount
        };

        // Información adicional para grupos
        if (chat.isGroup) {
            chatInfo.groupMetadata = {
                creation: chat.groupMetadata?.creation,
                owner: chat.groupMetadata?.owner?._serialized,
                desc: chat.groupMetadata?.desc,
                descOwner: chat.groupMetadata?.descOwner?._serialized,
                descTime: chat.groupMetadata?.descTime,
                participantsCount: chat.participants?.length || 0,
                participants: chat.participants?.map(p => ({
                    id: p.id._serialized,
                    isAdmin: p.isAdmin,
                    isSuperAdmin: p.isSuperAdmin
                })) || []
            };
        }

        res.json({
            success: true,
            chat: chatInfo
        });

    } catch (error) {
        console.error('❌ Error obteniendo información del chat:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET / - Documentación
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp API con IA',
        version: '2.0.0',
        aiEnabled: aiEnabled,
        endpoints: {
            'GET /status': 'Estado de la conexión y IA',
            'POST /send-message': 'Enviar mensaje { number, message }',
            'GET /chats': 'Obtener lista de todos los chats (grupos e individuales)',
            'GET /chat/:id': 'Obtener información específica de un chat por ID',
            'POST /ai/toggle': 'Activar/desactivar IA automática',
            'POST /ai/custom-response': 'Agregar respuestas personalizadas { category, responses }'
        },
        documentation: 'API de WhatsApp con respuestas automáticas de IA'
    });
});

// ================= INICIALIZACIÓN =================

// Inicializar WhatsApp cuando se inicie el servidor
initializeWhatsApp();

// Iniciar servidor HTTP
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 API de WhatsApp con IA corriendo en http://localhost:${PORT}`);
    console.log(`🤖 IA automática: ${aiEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
    console.log(`📖 Documentación: http://localhost:${PORT}`);
});

module.exports = app;