const mongoose = require('mongoose');

// ===== ESQUEMA PARA CHATS =====
const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    name: {
        type: String,
        required: true
    },
    isGroup: {
        type: Boolean,
        required: true,
        default: false
    },
    type: {
        type: String,
        enum: ['individual', 'group'],
        required: true
    },
    // Información adicional del chat
    archived: {
        type: Boolean,
        default: false
    },
    pinned: {
        type: Boolean,
        default: false
    },
    unreadCount: {
        type: Number,
        default: 0
    },
    // Información específica de grupos
    groupMetadata: {
        creation: Date,
        owner: String,
        description: String,
        descriptionOwner: String,
        descriptionTime: Date,
        participantsCount: Number,
        participants: [{
            id: String,
            isAdmin: Boolean,
            isSuperAdmin: Boolean
        }]
    },
    // Estadísticas
    stats: {
        totalMessages: {
            type: Number,
            default: 0
        },
        lastMessageAt: Date,
        firstMessageAt: Date
    }
}, {
    timestamps: true // Agrega createdAt y updatedAt automáticamente
});

// ===== ESQUEMA PARA MENSAJES =====
const messageSchema = new mongoose.Schema({
    messageId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    chatId: {
        type: String,
        required: true,
        index: true
    },
    // Información del remitente
    from: {
        type: String,
        required: true
    },
    author: String, // Para grupos, quién envió el mensaje
    to: String,
    // Contenido del mensaje
    body: {
        type: String,
        required: false,  // Cambiado a false para mensajes de media sin texto
        default: ''       // Valor por defecto para mensajes sin texto
    },
    type: {
        type: String,
        enum: [
            'text', 'image', 'audio', 'video', 'document', 'sticker', 
            'location', 'contact', 'revoked', 'ptt', 'chat', 'list',
            'buttons', 'template', 'interactive', 'poll', 'order',
            'payment', 'unknown', 'other'
        ],
        default: 'text'
    },
    // Metadatos del mensaje
    timestamp: {
        type: Date,
        required: true
    },
    fromMe: {
        type: Boolean,
        required: true,
        default: false
    },
    hasMedia: {
        type: Boolean,
        default: false
    },
    // Información del chat
    isGroup: {
        type: Boolean,
        required: true
    },
    chatName: String,
    // Información adicional
    isForwarded: {
        type: Boolean,
        default: false
    },
    isStatus: {
        type: Boolean,
        default: false
    },
    deviceType: String,
    // Respuesta de IA
    aiResponse: {
        generated: {
            type: Boolean,
            default: false
        },
        responseText: String,
        responseTimestamp: Date,
        keywords: [String], // Para grupos, qué palabras clave activaron la IA
        category: String
    }
}, {
    timestamps: true
});

// Índices compuestos para mejorar rendimiento
messageSchema.index({ chatId: 1, timestamp: -1 });
messageSchema.index({ from: 1, timestamp: -1 });
messageSchema.index({ isGroup: 1, timestamp: -1 });
messageSchema.index({ 'aiResponse.generated': 1 });

// ===== MÉTODOS ESTÁTICOS =====

// Método para obtener estadísticas de un chat
chatSchema.statics.getStats = async function(chatId) {
    const Chat = this;
    const Message = mongoose.model('Message');
    
    const stats = await Message.aggregate([
        { $match: { chatId: chatId } },
        {
            $group: {
                _id: null,
                totalMessages: { $sum: 1 },
                firstMessage: { $min: '$timestamp' },
                lastMessage: { $max: '$timestamp' },
                fromMeCount: {
                    $sum: { $cond: [{ $eq: ['$fromMe', true] }, 1, 0] }
                },
                fromOthersCount: {
                    $sum: { $cond: [{ $eq: ['$fromMe', false] }, 1, 0] }
                },
                aiResponsesCount: {
                    $sum: { $cond: [{ $eq: ['$aiResponse.generated', true] }, 1, 0] }
                }
            }
        }
    ]);
    
    return stats[0] || {
        totalMessages: 0,
        firstMessage: null,
        lastMessage: null,
        fromMeCount: 0,
        fromOthersCount: 0,
        aiResponsesCount: 0
    };
};

// Método para buscar mensajes
messageSchema.statics.searchMessages = async function(query, options = {}) {
    const {
        chatId,
        isGroup,
        fromMe,
        dateFrom,
        dateTo,
        limit = 50,
        skip = 0
    } = options;
    
    const searchCriteria = {
        body: new RegExp(query, 'i')
    };
    
    if (chatId) searchCriteria.chatId = chatId;
    if (typeof isGroup === 'boolean') searchCriteria.isGroup = isGroup;
    if (typeof fromMe === 'boolean') searchCriteria.fromMe = fromMe;
    
    if (dateFrom || dateTo) {
        searchCriteria.timestamp = {};
        if (dateFrom) searchCriteria.timestamp.$gte = new Date(dateFrom);
        if (dateTo) searchCriteria.timestamp.$lte = new Date(dateTo);
    }
    
    return this.find(searchCriteria)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip);
};

module.exports = {
    Chat: mongoose.model('Chat', chatSchema),
    Message: mongoose.model('Message', messageSchema)
};
