const mongoose = require('mongoose');

// ===== SCHEMA FOR CHATS =====
const chatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    isGroup: { type: Boolean, required: true, default: false },
    unreadCount: { type: Number, default: 0 },
    groupMetadata: {
        creation: Date,
        owner: String,
        description: String,
        participantsCount: Number,
        participants: [{
            id: String,
            isAdmin: Boolean,
            isSuperAdmin: Boolean
        }]
    },
}, {
    timestamps: true
});

// ===== SCHEMA FOR MESSAGE =====
const messageSchema = new mongoose.Schema({
    messageId: { type: String, required: true, unique: true, index: true },
    chatId: { type: String, required: true, index: true },
    from: { type: String, required: true },
    to: { type: String },
    body: {
        type: String,
        required: false,  // Cambiado a false para mensajes de media sin texto
        default: ''       // Valor por defecto para mensajes sin texto
    },
    type: { type: String },
    timestamp: { type: Date, required: true },
    fromMe: { type: Boolean, required: true, default: false },
    hasMedia: { type: Boolean, default: false },
    // Información del chat
    isGroup: { type: Boolean, required: true },
    author: { type: String }, // Para grupos, quién envió el mensaje
    chatName: { type: String },
    // Información de multimedia descargado
    mediaInfo: {
        filename: { type: String, default: null },
        originalFilename: { type: String, default: null },
        mimetype: { type: String, default: null },
        size: { type: Number, default: null }, // Tamaño en bytes
        extension: { type: String, default: null }, // jpg, mp4, ogg, etc.
        relativePath: { type: String, default: null }, // Ruta relativa desde /app/downloads
        fullPath: { type: String, default: null }, // Ruta completa del archivo
        downloadUrl: { type: String, default: null }, // URL para acceder via API
        downloadSuccess: { type: Boolean, default: false }
    }
}, {
    timestamps: true
});

// Índices compuestos para mejorar rendimiento
messageSchema.index({ chatId: 1, timestamp: -1 });
messageSchema.index({ from: 1, timestamp: -1 });
messageSchema.index({ isGroup: 1, timestamp: -1 });


module.exports = {
    Chat: mongoose.model('Chat', chatSchema),
    Message: mongoose.model('Message', messageSchema)
};
