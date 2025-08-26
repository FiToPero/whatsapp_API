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

// Variables de entorno
require('dotenv').config();

// Módulos para manejo de archivos
const fs = require('fs').promises;
const path = require('path');

// WhatsApp Web.js: Biblioteca que conecta con WhatsApp Web
// Client: Clase principal para manejar la conexión
// LocalAuth: Estrategia de autenticación que guarda la sesión localmente
const { Client, LocalAuth } = require('whatsapp-web.js');

// IA Simple: Asistente virtual para respuestas automáticas
const SimpleAI = require('./ai/OpenAI.js');

// Base de datos MongoDB
const { mongoConnection } = require('./database/mongodb');
const whatsappDB = require('./services/whatsappDB');

// ================= INICIALIZACIÓN DE VARIABLES =================

// Crear instancia de la aplicación Express
const app = express();

// Puerto donde correrá el servidor (3000 es el puerto estándar para desarrollo)
const PORT = process.env.PORT || 3000;

// Variable global para almacenar la instancia del cliente de WhatsApp
// null significa que aún no se ha inicializado
let whatsappClient = null;

// Variable de estado que indica si WhatsApp está conectado y listo
// false por defecto hasta que se complete la autenticación
let isClientReady = false;

// Variable de estado para MongoDB
let isMongoConnected = false;

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

// ================= FUNCIÓN DE INICIALIZACIÓN DE MONGODB =================

const initializeMongoDB = async () => {
    try {
        await mongoConnection.connect();
        isMongoConnected = true;
        console.log('MongoDB conectado exitosamente');
    } catch (error) {
        console.error('Error conectando a MongoDB:', error.message);
        isMongoConnected = false;
    }
};

// ================= FUNCIÓN DE INICIALIZACIÓN DE WHATSAPP =================

const initializeWhatsApp = () => {
    // Log de inicio del proceso de inicialización
    console.log('Inicializando cliente de WhatsApp para API...');
    
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
        console.log('Código QR generado. Escanea con tu WhatsApp:');
        // Imprime el código QR como texto (para debug, no se ve como QR visual)
        console.log(qr);
    });

    // Evento: Cliente listo para usar (autenticado y conectado)
    whatsappClient.on('ready', async () => {
        console.log('¡Cliente de WhatsApp API listo!');
        // Cambiar estado global a conectado
        isClientReady = true;
        
        // Sincronizar chats con MongoDB si está conectado (sin bloquear)
        if (isMongoConnected) {
            console.log('Iniciando sincronización de chats con MongoDB...');
            
            // Ejecutar sincronización en background
            setTimeout(async () => {
                try {
                    const chats = await whatsappClient.getChats();
                    console.log(`Sincronizando ${chats.length} chats con MongoDB...`);
                    
                    let syncCount = 0;
                    for (const chat of chats) {
                        try {
                            const chatData = {
                                chatId: chat.id._serialized,
                                name: chat.name,
                                isGroup: chat.isGroup,
                                archived: chat.archived,
                                pinned: chat.pinned,
                                unreadCount: chat.unreadCount
                            };
                            
                            // Agregar información de grupo si aplica
                            if (chat.isGroup && chat.groupMetadata) {
                                chatData.groupMetadata = {
                                    creation: chat.groupMetadata.creation,
                                    owner: chat.groupMetadata.owner?._serialized,
                                    description: chat.groupMetadata.desc,
                                    descriptionOwner: chat.groupMetadata.descOwner?._serialized,
                                    descriptionTime: chat.groupMetadata.descTime,
                                    participantsCount: chat.participants?.length || 0,
                                    participants: chat.participants?.map(p => ({
                                        id: p.id._serialized,
                                        isAdmin: p.isAdmin,
                                        isSuperAdmin: p.isSuperAdmin
                                    })) || []
                                };
                            }
                            
                            await whatsappDB.saveOrUpdateChat(chatData);
                            syncCount++;
                        } catch (chatError) {
                            console.error(`Error sincronizando chat ${chat.name}:`, chatError.message);
                        }
                    }
                    
                    console.log(`${syncCount} chats sincronizados con MongoDB`);
                } catch (error) {
                    console.error('Error en sincronización de chats:', error.message);
                }
            }, 2000); // Esperar 2 segundos antes de sincronizar
        }
    });

    // Evento: Autenticación exitosa
    whatsappClient.on('authenticated', () => {
        console.log('Cliente autenticado correctamente');
    });

    // Evento: Error de autenticación
    whatsappClient.on('auth_failure', msg => {
        console.error('Error de autenticación:', msg);
        // Marcar como no conectado en caso de error
        isClientReady = false;
    });

    // Evento: Cliente desconectado
    whatsappClient.on('disconnected', (reason) => {
        console.log('Cliente desconectado:', reason);
        // Marcar como no conectado
        isClientReady = false;
    });

    // Evento: Mensaje recibido
    // whatsappClient.on('message', async msg => {
    //     try {
    //         // ================= IDENTIFICAR TIPO DE CHAT =================
            
    //         // Método 1: Verificar por el formato del ID
    //         const isFromGroup = msg.from.endsWith('@g.us');
            
    //         // Método 2: Obtener información del chat (más confiable)
    //         const chat = await msg.getChat();
    //         const isGroupChat = chat.isGroup;
            
    //         // Log del mensaje recibido con información del tipo de chat
    //         const chatType = isGroupChat ? 'GRUPO' : 'INDIVIDUAL';
    //         console.log(`[${chatType}] Mensaje recibido de ${msg.from}: "${msg.body}"`);
            
    //         // Si es grupo, obtener información adicional
    //         if (isGroupChat) {
    //             console.log(`[GRUPO] Nombre: "${chat.name}"`);
    //             console.log(`[GRUPO] Remitente: ${msg.author || 'Desconocido'}`);
    //         }
            
    //         // ================= GUARDAR EN MONGODB =================
            
    //         let mediaInfo = null;
            
    //         // ================= DESCARGA DE MULTIMEDIA =================
            
    //         if (msg.hasMedia) {
    //             try {
    //                 console.log(`[MULTIMEDIA] Descargando ${msg.type} de ${chat.name}...`);
                    
    //                 // Descargar el archivo multimedia
    //                 const media = await msg.downloadMedia();
                    
    //                 if (media && media.data) {
    //                     // Determinar extensión y carpeta según el tipo de archivo
    //                     let extension = 'unknown';
    //                     let folder = 'documents';
                        
    //                     switch (msg.type) {
    //                         case 'image':
    //                             extension = media.mimetype?.includes('png') ? 'png' : 'jpg';
    //                             folder = 'images';
    //                             break;
    //                         case 'audio':
    //                         case 'ptt': // Push to Talk (nota de voz)
    //                             extension = media.mimetype?.includes('mpeg') ? 'mp3' : 'ogg';
    //                             folder = 'audios';
    //                             break;
    //                         case 'video':
    //                             extension = media.mimetype?.includes('quicktime') ? 'mov' : 'mp4';
    //                             folder = 'videos';
    //                             break;
    //                         case 'document':
    //                             extension = media.filename ? 
    //                                 path.extname(media.filename).substring(1) || 'pdf' : 'pdf';
    //                             folder = 'documents';
    //                             break;
    //                         case 'sticker':
    //                             extension = 'webp';
    //                             folder = 'stickers';
    //                             break;
    //                         default:
    //                             extension = 'bin';
    //                             folder = 'documents';
    //                     }
                        
    //                     // Crear nombre único para el archivo
    //                     const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    //                     const chatId = msg.from.replace(/@c\.us|@g\.us/g, '');
    //                     const messageId = msg.id._serialized.split('_')[0];
    //                     const fileName = `${chatId}_${timestamp}_${messageId}.${extension}`;
                        
    //                     // Rutas del archivo
    //                     const relativePath = `${folder}/${fileName}`;
    //                     const fullPath = path.join('/app/downloads', relativePath);
    //                     const downloadUrl = `/download/${fileName}`;
                        
    //                     // Guardar archivo en el sistema
    //                     await fs.writeFile(fullPath, media.data, 'base64');
                        
    //                     // Calcular tamaño del archivo
    //                     const fileSize = Buffer.from(media.data, 'base64').length;
                        
    //                     mediaInfo = {
    //                         filename: fileName,
    //                         originalFilename: media.filename || null,
    //                         mimetype: media.mimetype || 'unknown',
    //                         size: fileSize,
    //                         extension: extension,
    //                         relativePath: relativePath,
    //                         fullPath: fullPath,
    //                         downloadUrl: downloadUrl,
    //                         downloadedAt: new Date(),
    //                         downloadSuccess: true
    //                     };
                        
    //                     console.log(`[MULTIMEDIA] ${msg.type} guardado: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`);
    //                 }
                    
    //             } catch (mediaError) {
    //                 console.error(`[MULTIMEDIA] Error descargando ${msg.type}:`, mediaError.message);
                    
    //                 // Guardar información del error
    //                 mediaInfo = {
    //                     filename: null,
    //                     originalFilename: null,
    //                     mimetype: null,
    //                     size: null,
    //                     extension: null,
    //                     relativePath: null,
    //                     fullPath: null,
    //                     downloadUrl: null,
    //                     downloadedAt: new Date(),
    //                     downloadSuccess: false
    //                 };
    //             }
    //         }
            
    //         if (isMongoConnected) {
    //             try {
    //                 // Preparar datos del mensaje para MongoDB
    //                 const messageData = {
    //                     messageId: msg.id._serialized,
    //                     chatId: msg.from,
    //                     from: msg.from,
    //                     author: msg.author || null,
    //                     to: msg.to,
    //                     body: msg.body || '', // Valor por defecto para mensajes sin texto
    //                     type: msg.type || 'text',
    //                     timestamp: new Date(msg.timestamp * 1000),
    //                     fromMe: msg.fromMe,
    //                     hasMedia: msg.hasMedia,
    //                     isGroup: isGroupChat,
    //                     chatName: chat.name,
    //                     isForwarded: msg.isForwarded || false,
    //                     isStatus: msg.isStatus || false,
    //                     deviceType: msg.deviceType || null,
    //                     // Agregar información de multimedia
    //                     mediaInfo: mediaInfo
    //                 };
                    
    //                 // Solo mostrar log para mensajes con contenido o media
    //                 if (messageData.body || messageData.hasMedia) {
    //                     const contentPreview = messageData.body ? 
    //                         messageData.body.substring(0, 50) + (messageData.body.length > 50 ? '...' : '') :
    //                         `[${messageData.type.toUpperCase()}]${mediaInfo?.filename ? ` - ${mediaInfo.filename}` : ''}`;
    //                     console.log(`[DB] Guardando: ${chatType} - ${contentPreview}`);
    //                 }
                    
    //                 // Guardar mensaje en MongoDB
    //                 await whatsappDB.saveMessage(messageData);
                    
    //                 // Actualizar información del chat si es necesario
    //                 const chatData = {
    //                     chatId: chat.id._serialized,
    //                     name: chat.name,
    //                     isGroup: chat.isGroup,
    //                     archived: chat.archived,
    //                     pinned: chat.pinned,
    //                     unreadCount: chat.unreadCount
    //                 };
                    
    //                 await whatsappDB.saveOrUpdateChat(chatData);
                    
    //             } catch (dbError) {
    //                 console.error('[DB] Error guardando mensaje:', dbError.message);
    //             }
    //         }
            
    //         // ================= RESPUESTA AUTOMÁTICA CON IA =================
            
    //         // Solo responder si la IA está activada y el mensaje no es de nosotros
    //         if (aiEnabled && !msg.fromMe) {
                
    //             // Configurar diferentes comportamientos para grupos vs individuales
    //             let shouldRespond = true;
                
    //             if (isGroupChat) {
    //                 // En grupos, solo responder si mencionan al bot o usan palabras clave
    //                 const mentionKeywords = ['bot hablame']; //['bot', 'asistente', 'ayuda', 'help'];
    //                 const messageText = msg.body.toLowerCase();
    //                 shouldRespond = mentionKeywords.some(keyword => messageText.includes(keyword));
                    
    //                 console.log(`[GRUPO] ${shouldRespond ? 'Responderá' : 'No responderá'} (keywords: ${mentionKeywords.join(', ')})`);
    //             }
                
    //             if (shouldRespond) {
    //                 // Obtener información del contacto (nombre si está disponible)
    //                 const contact = await msg.getContact();
    //                 const senderInfo = {
    //                     name: contact.pushname || contact.name || null,
    //                     number: msg.from,
    //                     isGroup: isGroupChat,
    //                     groupName: isGroupChat ? chat.name : null,
    //                     author: msg.author || null // En grupos, quién envió el mensaje
    //                 };
                    
    //                 // Generar respuesta con la IA
    //                 const aiResponse = await aiBot.generateResponse(msg.body, senderInfo);
                    
    //                 // Enviar respuesta automática
    //                 await msg.reply(aiResponse);
                    
    //                 console.log(`[${chatType}] Respuesta enviada a ${msg.from}: "${aiResponse}"`);
                    
    //                 // ================= GUARDAR RESPUESTA IA EN MONGODB =================
                    
    //                 if (isMongoConnected) {
    //                     try {
    //                         // Determinar palabras clave que activaron la respuesta (para grupos)
    //                         const activatedKeywords = [];
    //                         if (isGroupChat) {
    //                             const mentionKeywords = ['bot hablame'];
    //                             const messageText = msg.body.toLowerCase();
    //                             activatedKeywords.push(...mentionKeywords.filter(keyword => messageText.includes(keyword)));
    //                         }
                            
    //                         // Actualizar el mensaje original con información de la respuesta IA
    //                         await whatsappDB.updateMessageWithAIResponse(msg.id._serialized, {
    //                             responseText: aiResponse,
    //                             keywords: activatedKeywords,
    //                             category: isGroupChat ? 'group_triggered' : 'individual_auto'
    //                         });
                            
    //                     } catch (dbError) {
    //                         console.error('[DB] Error actualizando respuesta IA:', dbError.message);
    //                     }
    //                 }
    //             }
    //         }
            
    //     } catch (error) {
    //         console.error('Error procesando mensaje:', error);
    //     }
    // });

    // Inicializar el cliente y manejar errores
    whatsappClient.initialize().catch(error => {
        console.error('Error inicializando cliente:', error);
    });
};

// ================= RUTAS DE LA API =================

// RUTA: GET /status - Estado de la conexión
app.get('/status', async (req, res) => {
    const response = {
        whatsapp: {
            status: isClientReady ? 'connected' : 'disconnected',
            message: isClientReady ? 'WhatsApp conectado y listo' : 'WhatsApp no conectado'
        },
        mongodb: {
            status: isMongoConnected ? 'connected' : 'disconnected',
            message: isMongoConnected ? 'MongoDB conectado' : 'MongoDB no conectado'
        },
        ai: {
            enabled: aiEnabled,
            status: aiEnabled ? 'active' : 'inactive'
        },
        timestamp: new Date().toISOString()
    };
    
    // Obtener estadísticas de MongoDB si está conectado
    if (isMongoConnected) {
        try {
            const stats = await whatsappDB.getGlobalStats();
            response.mongodb.stats = stats;
        } catch (error) {
            response.mongodb.statsError = error.message;
        }
    }
    
    res.json(response);
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
        
        console.log(`[API] Mensaje enviado a ${formattedNumber}: "${message}"`);

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
        console.error('Error enviando mensaje:', error);
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
        console.error('Error obteniendo chats:', error);
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
        console.error('Error obteniendo información del chat:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// ================= ENDPOINTS DE MONGODB =================

// RUTA: GET /media/:chatId - Obtener archivos multimedia de un chat
app.get('/media/:chatId', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { chatId } = req.params;
        const { type, limit = 20, skip = 0 } = req.query;

        // Buscar mensajes con multimedia
        const query = { 
            chatId, 
            hasMedia: true,
            'mediaInfo.downloadSuccess': true
        };

        if (type) {
            query.type = type;
        }

        const messages = await whatsappDB.getChatMessages(chatId, {
            limit: parseInt(limit),
            skip: parseInt(skip),
            hasMedia: true
        });

        const mediaFiles = messages
            .filter(msg => msg.mediaInfo && msg.mediaInfo.downloadSuccess)
            .map(msg => ({
                messageId: msg.messageId,
                from: msg.from,
                timestamp: msg.timestamp,
                caption: msg.body,
                type: msg.type,
                media: {
                    filename: msg.mediaInfo.filename,
                    originalFilename: msg.mediaInfo.originalFilename,
                    mimetype: msg.mediaInfo.mimetype,
                    size: msg.mediaInfo.size,
                    extension: msg.mediaInfo.extension,
                    downloadUrl: msg.mediaInfo.downloadUrl,
                    downloadedAt: msg.mediaInfo.downloadedAt
                }
            }));

        res.json({
            success: true,
            chatId,
            count: mediaFiles.length,
            mediaFiles
        });

    } catch (error) {
        console.error('Error obteniendo archivos multimedia:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /download/:filename - Descargar archivo específico
app.get('/download/:filename', async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Buscar información del archivo en MongoDB
        const { Message } = require('./models/whatsapp');
        const message = await Message.findOne({ 'mediaInfo.filename': filename });
        
        if (!message || !message.mediaInfo.downloadSuccess) {
            return res.status(404).json({
                error: 'Archivo no encontrado',
                filename
            });
        }
        
        // Verificar que el archivo existe físicamente
        try {
            await fs.access(message.mediaInfo.fullPath);
        } catch (e) {
            return res.status(404).json({
                error: 'Archivo físico no encontrado',
                filename
            });
        }
        
        // Configurar headers para descarga
        res.setHeader('Content-Type', message.mediaInfo.mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${message.mediaInfo.originalFilename || filename}"`);
        
        // Enviar archivo
        const fileBuffer = await fs.readFile(message.mediaInfo.fullPath);
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Error descargando archivo:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /media/stats - Estadísticas de archivos multimedia
app.get('/media/stats', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { Message } = require('./models/whatsapp');
        
        // Estadísticas por tipo de archivo
        const statsByType = await Message.aggregate([
            { 
                $match: { 
                    hasMedia: true, 
                    'mediaInfo.downloadSuccess': true 
                } 
            },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    totalSize: { $sum: '$mediaInfo.size' },
                    avgSize: { $avg: '$mediaInfo.size' }
                }
            },
            { $sort: { count: -1 } }
        ]);

        // Estadísticas totales
        const totalStats = await Message.aggregate([
            { 
                $match: { 
                    hasMedia: true, 
                    'mediaInfo.downloadSuccess': true 
                } 
            },
            {
                $group: {
                    _id: null,
                    totalFiles: { $sum: 1 },
                    totalSize: { $sum: '$mediaInfo.size' },
                    avgSize: { $avg: '$mediaInfo.size' }
                }
            }
        ]);

        // Estadísticas de errores
        const errorStats = await Message.countDocuments({
            hasMedia: true,
            'mediaInfo.downloadSuccess': false
        });

        res.json({
            success: true,
            total: totalStats[0] || { totalFiles: 0, totalSize: 0, avgSize: 0 },
            byType: statsByType.map(stat => ({
                type: stat._id,
                count: stat.count,
                totalSize: stat.totalSize,
                avgSize: Math.round(stat.avgSize),
                totalSizeMB: (stat.totalSize / (1024 * 1024)).toFixed(2)
            })),
            errors: {
                failedDownloads: errorStats
            }
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas multimedia:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /db/messages/:chatId - Obtener mensajes de un chat desde MongoDB
app.get('/db/messages/:chatId', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { chatId } = req.params;
        const { 
            limit = 50, 
            skip = 0, 
            fromDate, 
            toDate, 
            fromMe, 
            includeAI = true 
        } = req.query;

        const options = {
            limit: parseInt(limit),
            skip: parseInt(skip),
            fromDate,
            toDate,
            fromMe: fromMe === 'true' ? true : fromMe === 'false' ? false : undefined,
            includeAI: includeAI === 'true'
        };

        const messages = await whatsappDB.getChatMessages(chatId, options);

        res.json({
            success: true,
            chatId,
            count: messages.length,
            messages: messages.map(msg => ({
                id: msg.messageId,
                from: msg.from,
                author: msg.author,
                body: msg.body,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                isGroup: msg.isGroup,
                type: msg.type,
                hasMedia: msg.hasMedia,
                mediaInfo: msg.hasMedia && msg.mediaInfo ? {
                    filename: msg.mediaInfo.filename,
                    originalFilename: msg.mediaInfo.originalFilename,
                    mimetype: msg.mediaInfo.mimetype,
                    size: msg.mediaInfo.size,
                    downloadUrl: msg.mediaInfo.downloadUrl,
                    downloadSuccess: msg.mediaInfo.downloadSuccess
                } : null,
                aiResponse: msg.aiResponse?.generated ? {
                    text: msg.aiResponse.responseText,
                    timestamp: msg.aiResponse.responseTimestamp,
                    keywords: msg.aiResponse.keywords,
                    category: msg.aiResponse.category
                } : null
            }))
        });

    } catch (error) {
        console.error('Error obteniendo mensajes de MongoDB:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /db/search - Buscar mensajes en MongoDB
app.get('/db/search', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { 
            q: query, 
            chatId, 
            isGroup, 
            fromMe, 
            dateFrom, 
            dateTo, 
            limit = 50, 
            skip = 0 
        } = req.query;

        if (!query) {
            return res.status(400).json({
                error: 'Parámetro de búsqueda "q" es requerido'
            });
        }

        const options = {
            chatId,
            isGroup: isGroup === 'true' ? true : isGroup === 'false' ? false : undefined,
            fromMe: fromMe === 'true' ? true : fromMe === 'false' ? false : undefined,
            dateFrom,
            dateTo,
            limit: parseInt(limit),
            skip: parseInt(skip)
        };

        const messages = await whatsappDB.searchMessages(query, options);

        res.json({
            success: true,
            query,
            count: messages.length,
            results: messages.map(msg => ({
                id: msg.messageId,
                chatId: msg.chatId,
                chatName: msg.chatName,
                from: msg.from,
                author: msg.author,
                body: msg.body,
                timestamp: msg.timestamp,
                fromMe: msg.fromMe,
                isGroup: msg.isGroup,
                type: msg.type
            }))
        });

    } catch (error) {
        console.error('Error buscando mensajes:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET /db/stats/:chatId - Obtener estadísticas de un chat
app.get('/db/stats/:chatId', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { chatId } = req.params;
        const stats = await whatsappDB.getChatStats(chatId);

        if (!stats) {
            return res.status(404).json({
                error: 'Chat no encontrado en la base de datos'
            });
        }

        res.json({
            success: true,
            chatId,
            stats
        });

    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: POST /db/cleanup - Limpiar mensajes antiguos
app.post('/db/cleanup', async (req, res) => {
    try {
        if (!isMongoConnected) {
            return res.status(503).json({
                error: 'MongoDB no está conectado'
            });
        }

        const { daysOld = 30 } = req.body;
        const deletedCount = await whatsappDB.cleanOldMessages(parseInt(daysOld));

        res.json({
            success: true,
            message: `Limpieza completada`,
            deletedMessages: deletedCount,
            daysOld: parseInt(daysOld)
        });

    } catch (error) {
        console.error('Error en limpieza:', error);
        res.status(500).json({
            error: 'Error interno del servidor',
            message: error.message
        });
    }
});

// RUTA: GET / - Documentación
app.get('/', (req, res) => {
    res.json({
        name: 'WhatsApp API con IA y Multimedia',
        version: '2.1.0',
        aiEnabled: aiEnabled,
        endpoints: {
            'GET /status': 'Estado de la conexión, IA y MongoDB con estadísticas',
            'POST /send-message': 'Enviar mensaje { number, message }',
            'GET /chats': 'Obtener lista de todos los chats (grupos e individuales)',
            'GET /chat/:id': 'Obtener información específica de un chat por ID',
            'POST /ai/toggle': 'Activar/desactivar IA automática',
            'POST /ai/custom-response': 'Agregar respuestas personalizadas { category, responses }',
            'GET /media/:chatId': 'Obtener archivos multimedia de un chat (?type=image&limit=20)',
            'GET /download/:filename': 'Descargar archivo específico',
            'GET /media/stats': 'Estadísticas de archivos multimedia descargados',
            'GET /db/messages/:chatId': 'Obtener mensajes de un chat desde MongoDB (incluye multimedia)',
            'GET /db/search': 'Buscar mensajes en MongoDB (?q=texto&chatId=...)',
            'GET /db/stats/:chatId': 'Obtener estadísticas de un chat',
            'POST /db/cleanup': 'Limpiar mensajes antiguos { daysOld: 30 }'
        },
        features: [
            'Descarga automática de multimedia (imágenes, audios, videos, documentos)',
            'Almacenamiento organizado por tipo de archivo',
            'URLs de descarga para acceder a archivos',
            'Metadatos completos en MongoDB',
            'Estadísticas de uso de multimedia',
            'Respuestas automáticas con IA',
            'Detección de grupos vs chats individuales',
            'Persistencia completa en MongoDB'
        ],
        downloadFolders: {
            '/app/downloads/images': 'Imágenes (jpg, png)',
            '/app/downloads/audios': 'Audios y notas de voz (mp3, ogg)',
            '/app/downloads/videos': 'Videos (mp4, mov)',
            '/app/downloads/documents': 'Documentos (pdf, doc, etc)',
            '/app/downloads/stickers': 'Stickers (webp)'
        }
    });
});

// ================= INICIALIZACIÓN =================

// Función de inicialización asíncrona
const initializeApp = async () => {
    console.log('Iniciando WhatsApp API con MongoDB...');
    
    // 1. Inicializar MongoDB primero
    await initializeMongoDB();
    
    // 2. Inicializar WhatsApp
    initializeWhatsApp();
    
    // 3. Iniciar servidor HTTP
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`API de WhatsApp con IA corriendo en http://localhost:${PORT}`);
        console.log(`IA automática: ${aiEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
        console.log(`MongoDB: ${isMongoConnected ? 'CONECTADO' : 'DESCONECTADO'}`);
        console.log(`Documentación: http://localhost:${PORT}`);
    });
};

// Inicializar la aplicación
initializeApp().catch(error => {
    console.error('Error crítico iniciando la aplicación:', error);
    process.exit(1);
});

module.exports = app;