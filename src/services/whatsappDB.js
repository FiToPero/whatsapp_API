const { Chat, Message } = require('../models/whatsapp');

// ===== SERVICIO DE BASE DE DATOS PARA WHATSAPP =====
class WhatsAppDBService {
    
    // ===== GESTIÓN DE CHATS =====
    
    async saveOrUpdateChat(chatData) {
        try {
            const {
                chatId,
                name,
                isGroup,
                archived = false,
                pinned = false,
                unreadCount = 0,
                groupMetadata = null
            } = chatData;

            const chatInfo = {
                chatId,
                name,
                isGroup,
                type: isGroup ? 'group' : 'individual',
                archived,
                pinned,
                unreadCount
            };

            if (isGroup && groupMetadata) {
                chatInfo.groupMetadata = groupMetadata;
            }

            const chat = await Chat.findOneAndUpdate(
                { chatId },
                chatInfo,
                { 
                    upsert: true, 
                    new: true,
                    setDefaultsOnInsert: true
                }
            );

            // Log silencioso para no saturar la consola
            // console.log(`[DB] Chat guardado: ${name} (${isGroup ? 'Grupo' : 'Individual'})`);
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

    async getAllChats(filters = {}) {
        try {
            const { isGroup, limit = 100, skip = 0 } = filters;
            
            const query = {};
            if (typeof isGroup === 'boolean') {
                query.isGroup = isGroup;
            }

            const chats = await Chat.find(query)
                .sort({ 'stats.lastMessageAt': -1 })
                .limit(limit)
                .skip(skip);

            return chats;
        } catch (error) {
            console.error('[DB] Error obteniendo chats:', error);
            throw error;
        }
    }

    // ===== GESTIÓN DE MENSAJES =====

    async saveMessage(messageData) {
        try {
            const {
                messageId,
                chatId,
                from,
                author,
                to,
                body,
                type = 'text',
                timestamp,
                fromMe,
                hasMedia = false,
                isGroup,
                chatName,
                isForwarded = false,
                isStatus = false,
                deviceType,
                aiResponse = null
            } = messageData;

            const message = new Message({
                messageId,
                chatId,
                from,
                author,
                to,
                body,
                type,
                timestamp,
                fromMe,
                hasMedia,
                isGroup,
                chatName,
                isForwarded,
                isStatus,
                deviceType,
                aiResponse
            });

            await message.save();

            // Actualizar estadísticas del chat
            await this.updateChatStats(chatId, timestamp);

            // Solo mostrar log detallado para depuración si es necesario
            // console.log(`[DB] Mensaje guardado: ${chatName} - ${body.substring(0, 50)}${body.length > 50 ? '...' : ''}`);
            return message;

        } catch (error) {
            console.error('[DB] Error guardando mensaje:', error);
            throw error;
        }
    }

    async updateMessageWithAIResponse(messageId, aiResponseData) {
        try {
            const updatedMessage = await Message.findOneAndUpdate(
                { messageId },
                { 
                    $set: { 
                        'aiResponse': {
                            generated: true,
                            responseText: aiResponseData.responseText,
                            responseTimestamp: new Date(),
                            keywords: aiResponseData.keywords || [],
                            category: aiResponseData.category || 'general'
                        }
                    }
                },
                { new: true }
            );

            if (updatedMessage) {
                console.log(`[DB] Respuesta IA actualizada para mensaje: ${messageId}`);
            }

            return updatedMessage;
        } catch (error) {
            console.error('[DB] Error actualizando respuesta IA:', error);
            throw error;
        }
    }

    async getChatMessages(chatId, options = {}) {
        try {
            const {
                limit = 50,
                skip = 0,
                fromDate,
                toDate,
                fromMe,
                includeAI = true
            } = options;

            const query = { chatId };

            if (fromDate || toDate) {
                query.timestamp = {};
                if (fromDate) query.timestamp.$gte = new Date(fromDate);
                if (toDate) query.timestamp.$lte = new Date(toDate);
            }

            if (typeof fromMe === 'boolean') {
                query.fromMe = fromMe;
            }

            if (!includeAI) {
                query['aiResponse.generated'] = { $ne: true };
            }

            const messages = await Message.find(query)
                .sort({ timestamp: -1 })
                .limit(limit)
                .skip(skip);

            return messages;
        } catch (error) {
            console.error('[DB] Error obteniendo mensajes:', error);
            throw error;
        }
    }

    async searchMessages(searchTerm, options = {}) {
        try {
            return await Message.searchMessages(searchTerm, options);
        } catch (error) {
            console.error('[DB] Error buscando mensajes:', error);
            throw error;
        }
    }

    // ===== ESTADÍSTICAS =====

    async updateChatStats(chatId, messageTimestamp) {
        try {
            const chat = await Chat.findOne({ chatId });
            
            if (chat) {
                const updateData = {
                    $inc: { 'stats.totalMessages': 1 },
                    $set: { 'stats.lastMessageAt': messageTimestamp }
                };

                // Si es el primer mensaje, establecer firstMessageAt
                if (!chat.stats?.firstMessageAt) {
                    updateData.$set['stats.firstMessageAt'] = messageTimestamp;
                }

                await Chat.findOneAndUpdate({ chatId }, updateData);
            }
        } catch (error) {
            console.error('[DB] Error actualizando estadísticas:', error);
        }
    }

    async getChatStats(chatId) {
        try {
            const chat = await Chat.findOne({ chatId });
            if (!chat) return null;

            const dbStats = await Chat.getStats(chatId);
            
            return {
                chatInfo: {
                    name: chat.name,
                    isGroup: chat.isGroup,
                    type: chat.type
                },
                stats: dbStats
            };
        } catch (error) {
            console.error('[DB] Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    async getGlobalStats() {
        try {
            const totalChats = await Chat.countDocuments();
            const totalGroups = await Chat.countDocuments({ isGroup: true });
            const totalIndividuals = await Chat.countDocuments({ isGroup: false });
            const totalMessages = await Message.countDocuments();
            const totalAIResponses = await Message.countDocuments({ 'aiResponse.generated': true });

            const recentMessages = await Message.find()
                .sort({ timestamp: -1 })
                .limit(1);

            return {
                chats: {
                    total: totalChats,
                    groups: totalGroups,
                    individuals: totalIndividuals
                },
                messages: {
                    total: totalMessages,
                    aiResponses: totalAIResponses,
                    lastMessageAt: recentMessages[0]?.timestamp || null
                }
            };
        } catch (error) {
            console.error('[DB] Error obteniendo estadísticas globales:', error);
            throw error;
        }
    }

    // ===== UTILIDADES =====

    async cleanOldMessages(daysOld = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            const result = await Message.deleteMany({
                timestamp: { $lt: cutoffDate },
                'aiResponse.generated': { $ne: true } // Mantener mensajes con respuesta IA
            });

            console.log(`[DB] Limpieza: ${result.deletedCount} mensajes antiguos eliminados`);
            return result.deletedCount;
        } catch (error) {
            console.error('[DB] Error en limpieza:', error);
            throw error;
        }
    }
}

module.exports = new WhatsAppDBService();
