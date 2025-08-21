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
            // Log del mensaje recibido mostrando remitente y contenido
            console.log(`📨 [API] Mensaje recibido de ${msg.from}: "${msg.body}"`);
            // Aquí se pueden agregar respuestas automáticas o procesamiento
        } catch (error) {
            console.error('❌ Error procesando mensaje:', error);
        }
    });

    // Inicializar el cliente y manejar errores
    whatsappClient.initialize().catch(error => {
        console.error('❌ Error inicializando cliente:', error);
    });
};

// ================= DEFINICIÓN DE RUTAS DE LA API =================

// RUTA: GET /status
// Propósito: Verificar el estado de conexión de WhatsApp
app.get('/status', (req, res) => {
    // Retornar JSON con el estado actual
    res.json({
        // Estado basado en la variable global isClientReady
        status: isClientReady ? 'connected' : 'disconnected',
        // Mensaje descriptivo del estado
        message: isClientReady ? 'WhatsApp conectado y listo' : 'WhatsApp no conectado',
        // Timestamp ISO para rastrear cuándo se consultó
        timestamp: new Date().toISOString()
    });
});

// RUTA: POST /send-message
// Propósito: Enviar mensaje a un número específico
app.post('/send-message', async (req, res) => {
    try {
        // Extraer parámetros del cuerpo de la petición
        const { number, message } = req.body;

        // ================= VALIDACIONES =================
        
        // Verificar que se enviaron los parámetros requeridos
        if (!number || !message) {
            return res.status(400).json({
                error: 'Faltan parámetros requeridos',
                required: ['number', 'message']
            });
        }

        // Verificar que WhatsApp esté conectado
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado',
                message: 'Espera a que se conecte o escanea el código QR'
            });
        }

        // ================= PROCESAMIENTO =================

        // Formatear número: agregar @c.us si no lo tiene
        // @c.us es el sufijo para números individuales en WhatsApp
        const formattedNumber = number.includes('@') ? number : `${number}@c.us`;

        // Enviar mensaje usando el cliente de WhatsApp
        // await espera a que se complete el envío
        const sentMessage = await whatsappClient.sendMessage(formattedNumber, message);
        
        // Log del mensaje enviado
        console.log(`📤 [API] Mensaje enviado a ${formattedNumber}: "${message}"`);

        // ================= RESPUESTA EXITOSA =================
        
        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            data: {
                to: formattedNumber,              // Destinatario
                message: message,                 // Contenido del mensaje
                messageId: sentMessage.id._serialized, // ID único del mensaje
                timestamp: new Date().toISOString() // Timestamp del envío
            }
        });

    } catch (error) {
        // ================= MANEJO DE ERRORES =================
        
        console.error('❌ Error enviando mensaje:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /chats
// Propósito: Obtener lista de todos los chats disponibles
app.get('/chats', async (req, res) => {
    try {
        // Verificar conexión
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado'
            });
        }

        // Obtener todos los chats del cliente
        const chats = await whatsappClient.getChats();
        
        // Mapear chats a un formato más limpio y útil
        const chatList = chats.map(chat => ({
            id: chat.id._serialized,    // ID único del chat
            name: chat.name,            // Nombre del chat o contacto
            isGroup: chat.isGroup,      // true si es grupo, false si es individual
            // Información del último mensaje (si existe)
            lastMessage: chat.lastMessage ? {
                body: chat.lastMessage.body,           // Contenido del mensaje
                timestamp: chat.lastMessage.timestamp, // Fecha y hora
                from: chat.lastMessage.from           // Remitente
            } : null
        }));

        // Retornar lista de chats
        res.json({
            success: true,
            chats: chatList,
            total: chatList.length  // Cantidad total de chats
        });

    } catch (error) {
        console.error('❌ Error obteniendo chats:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /messages/:chatId
// Propósito: Obtener mensajes de un chat específico
app.get('/messages/:chatId', async (req, res) => {
    try {
        // Extraer ID del chat de los parámetros de la URL
        const { chatId } = req.params;
        
        // Extraer límite de mensajes de query parameters (por defecto 50)
        const { limit = 50 } = req.query;

        // Verificar conexión
        if (!isClientReady) {
            return res.status(503).json({
                error: 'WhatsApp no está conectado'
            });
        }

        // Obtener el chat específico por su ID
        const chat = await whatsappClient.getChatById(chatId);
        
        // Obtener mensajes del chat con límite especificado
        const messages = await chat.fetchMessages({ limit: parseInt(limit) });

        // Mapear mensajes a formato más limpio
        const messageList = messages.map(msg => ({
            id: msg.id._serialized,  // ID único del mensaje
            body: msg.body,          // Contenido del mensaje
            from: msg.from,          // Remitente
            to: msg.to,              // Destinatario
            timestamp: msg.timestamp, // Fecha y hora
            type: msg.type,          // Tipo de mensaje (text, image, etc.)
            isFromMe: msg.fromMe     // true si lo envié yo, false si lo recibí
        }));

        // Retornar lista de mensajes
        res.json({
            success: true,
            chatId: chatId,
            messages: messageList,
            total: messageList.length
        });

    } catch (error) {
        console.error('❌ Error obteniendo mensajes:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET / (Ruta raíz)
// Propósito: Documentación de la API
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp API',
        version: '1.0.0',
        // Documentación de todos los endpoints disponibles
        endpoints: {
            'GET /status': 'Estado de la conexión',
            'POST /send-message': 'Enviar mensaje { number, message }',
            'GET /chats': 'Obtener lista de chats',
            'GET /messages/:chatId': 'Obtener mensajes de un chat'
        },
        documentation: 'https://github.com/your-repo/whatsapp-api'
    });
});

// ================= INICIALIZACIÓN =================

// Inicializar WhatsApp cuando se inicie el servidor
initializeWhatsApp();

// Iniciar servidor HTTP en el puerto especificado
// '0.0.0.0' permite acceso desde cualquier IP (importante para Docker)
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 API de WhatsApp corriendo en http://localhost:${PORT}`);
    console.log(`📖 Documentación: http://localhost:${PORT}`);
});

// Exportar la aplicación para testing o uso externo
module.exports = app;

// ================================================================
// EJEMPLO DE USO:
// 
// 1. Verificar estado:
//    curl http://localhost:3000/status
// 
// 2. Enviar mensaje:
//    curl -X POST http://localhost:3000/send-message \
//      -H "Content-Type: application/json" \
//      -d '{"number": "5493382672450", "message": "Hola!"}'
// 
// 3. Ver chats:
//    curl http://localhost:3000/chats
// 
// 4. Ver mensajes:
//    curl http://localhost:3000/messages/5493382672450@c.us?limit=10
// ================================================================
