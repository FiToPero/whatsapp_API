const mongoose = require('mongoose');
require('dotenv').config();

// ===== CONFIGURACIÓN DE CONEXIÓN =====
const MONGO_CONFIG = {
    host: process.env.DB_MONGO_HOST || 'mongodb',
    port: process.env.DB_MONGO_PORT || 27017,
    database: process.env.DB_MONGO_DATABASE || 'whatsapp_messages',
    username: process.env.DB_MONGO_USERNAME,
    password: process.env.DB_MONGO_PASSWORD
};

// Construir URI de conexión
const MONGO_URI = `mongodb://${MONGO_CONFIG.username}:${MONGO_CONFIG.password}@${MONGO_CONFIG.host}:${MONGO_CONFIG.port}/${MONGO_CONFIG.database}?authSource=admin`;

// ===== CONFIGURACIÓN DE MONGOOSE =====
const mongooseOptions = {
    maxPoolSize: 10, // Mantener hasta 10 conexiones de socket
    serverSelectionTimeoutMS: 5000, // Mantener intentando enviar operaciones por 5 segundos
    socketTimeoutMS: 45000, // Cerrar sockets después de 45 segundos de inactividad
    family: 4 // Usar IPv4, omitir IPv6
};

// ===== CONEXIÓN A MONGODB =====
class MongoConnection {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
    }

    async connect() {
        try {
            console.log('[MongoDB] Intentando conectar...');
            console.log(`[MongoDB] URI: ${MONGO_CONFIG.host}:${MONGO_CONFIG.port}/${MONGO_CONFIG.database}`);

            await mongoose.connect(MONGO_URI, mongooseOptions);
            
            this.isConnected = true;
            this.connectionAttempts = 0;

            console.log('[MongoDB] Conectado exitosamente');
            console.log(`[MongoDB] Base de datos: ${MONGO_CONFIG.database}`);

            return true;
            
        } catch (error) {
            this.isConnected = false;
            this.connectionAttempts++;

            console.error('[MongoDB] Error de conexión:', error.message);

            if (this.connectionAttempts < this.maxRetries) {
                console.log(`[MongoDB] Reintentando conexión... (${this.connectionAttempts}/${this.maxRetries})`);

                // Esperar antes de reintentar (exponential backoff)
                const delay = Math.min(1000 * Math.pow(2, this.connectionAttempts), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
                
                return this.connect();
            } else {
                console.error('[MongoDB] Máximo número de reintentos alcanzado');
                throw error;
            }
        }
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log('[MongoDB] Desconectado');
        } catch (error) {
            console.error('[MongoDB] Error al desconectar:', error.message);
        }
    }

    getStatus() {
        return {
            isConnected: this.isConnected,
            connectionState: mongoose.connection.readyState,
            host: MONGO_CONFIG.host,
            port: MONGO_CONFIG.port,
            database: MONGO_CONFIG.database,
            connectionAttempts: this.connectionAttempts
        };
    }
}

// ===== EVENTOS DE MONGOOSE =====
mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Mongoose conectado');
});

mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Error de Mongoose:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('[MongoDB] Mongoose desconectado');
});

// Manejar cierre graceful
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('[MongoDB] Conexión cerrada por terminación de app');
    process.exit(0);
});

// ===== EXPORTAR INSTANCIA =====
const mongoConnection = new MongoConnection();

module.exports = {
    mongoConnection,
    mongoose,
    MONGO_CONFIG
};
