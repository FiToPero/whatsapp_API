const { Chat, Message } = require('../models/whatsapp');

// ===== SERVICIO DE BASE DE DATOS PARA WHATSAPP =====
class WhatsAppDBService {
    
    // ===== GESTIÓN DE CHATS =====
    
    async saveOrUpdateChat(chatData) {
        try {
            const { chatId, name, isGroup, unreadCount = 0, groupMetadata = null } = chatData;

            const chatInfo = { chatId, name, isGroup, unreadCount };

            if (isGroup && groupMetadata) {
                chatInfo.groupMetadata = groupMetadata;
            }

            const chat = await Chat.findOneAndUpdate(
                { chatId }, chatInfo, { upsert: true, new: true, setDefaultsOnInsert: true }
            );
            return chat;

        } catch (error) {
            console.error('[DB] Error guardando chat:', error);
            throw error;
        }
    }

    async getChatInfo(chatId) {
        try {
            return await Chat.findOne({ chatId });
        } catch (error) {
            console.error('[DB] Error obteniendo chat:', error);
            throw error;
        }
    }

    async getAllChats() {
        try {
            return await Chat.all();
        } catch (error) {
            console.error('[DB] Error obteniendo chats:', error);
            throw error;
        }
    }

    // ===== VERIFICACIÓN DE EXISTENCIA =====
    
    /**
     * Verifica si un mensaje ya existe en la base de datos
     * @param {string} messageId - ID único del mensaje
     * @returns {boolean} true si el mensaje existe
     */
    async messageExists(messageId) {
        try {
            const message = await Message.findOne({ messageId }).select('messageId').lean();
            return !!message;
        } catch (error) {
            console.error('[DB] Error verificando existencia del mensaje:', error);
            return false;
        }
    }

    /**
     * Verifica si un mensaje tiene multimedia ya procesada
     * @param {string} messageId - ID único del mensaje
     * @returns {boolean} true si tiene multimedia procesada
     */
    async messageHasProcessedMedia(messageId) {
        try {
            const message = await Message.findOne({ 
                messageId, 
                'mediaInfo.downloadSuccess': true 
            }).select('messageId mediaInfo').lean();
            return !!message;
        } catch (error) {
            console.error('[DB] Error verificando multimedia del mensaje:', error);
            return false;
        }
    }

    /**
     * Verifica qué mensajes de una lista ya existen en la base de datos
     * @param {Array} messageIds - Array de IDs de mensajes
     * @returns {Array} Array de IDs que ya existen
     */
    async getExistingMessageIds(messageIds) {
        try {
            const existingMessages = await Message.find({ 
                messageId: { $in: messageIds } 
            }).select('messageId').lean();
            
            return existingMessages.map(msg => msg.messageId);
        } catch (error) {
            console.error('[DB] Error verificando mensajes existentes:', error);
            return [];
        }
    }

    // ===== GESTIÓN DE MENSAJES =====

    async findOneAndUpdate(messageData) {
        try {
            const {
                messageId,
                chatId,
                from,
                to,
                body,
                type = 'text',
                timestamp,
                fromMe,
                hasMedia = false,
                isGroup,
                author,
                chatName,
                mediaInfo
            } = messageData;

            const message = {
                messageId,
                chatId,
                from,
                to,
                body,
                type,
                timestamp,
                fromMe,
                hasMedia,
                isGroup,
                author,
                chatName,
                mediaInfo
            };

            await Message.findOneAndUpdate({ messageId: message.messageId }, message, { upsert: true, new: true, setDefaultsOnInsert: true });

            return message;

        } catch (error) {
            console.error('[DB] Error guardando mensaje:', error);
            throw error;
        }
    }

    async getChatMessages(chatId) {
        try {
            const messages = await Message.find(chatId).limit(10)

            return messages;
        } catch (error) {
            console.error('[DB] Error obteniendo mensajes:', error);
            throw error;
        }
    }

    // async searchMessages(searchTerm, options = {}) {
    //     try {
    //         return await Message.search(searchTerm, options);
    //     } catch (error) {
    //         console.error('[DB] Error buscando mensajes:', error);
    //         throw error;
    //     }
    // }
}

module.exports = new WhatsAppDBService();
