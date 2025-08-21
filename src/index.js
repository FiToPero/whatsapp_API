const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Iniciando cliente de WhatsApp...');

// Crear cliente de WhatsApp con configuración para Docker
const client = new Client({
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
            '--disable-gpu',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-web-security',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
        ]
    }
});

// Eventos del cliente
client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('authenticated', () => {
    console.log('✅ Cliente autenticado correctamente');
});

client.on('auth_failure', msg => {
    console.error('❌ Error de autenticación:', msg);
});

client.on('disconnected', (reason) => {
    console.log('📤 Cliente desconectado:', reason);
});

// Generar código QR para autenticación
client.on('qr', qr => {
    console.log('📱 Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Cliente listo
client.on('ready', () => {
    console.log('🚀 ¡Cliente de WhatsApp listo!');
    console.log('📲 Esperando mensajes...');
});

// Recibir mensajes
client.on('message', async msg => {
    try {
        console.log(`📨 Mensaje recibido de ${msg.from}: "${msg.body}"`);
        
        // Responder automáticamente a ciertos mensajes
        if (msg.body.toLowerCase() === 'hola') {
            await msg.reply('¡Hola! Este es un bot automático. 🤖');
            console.log('🤖 Respuesta enviada');
        }
        
        // Respuesta para "claudio"
        if (msg.body.toLowerCase().includes('claudio')) {
            await msg.reply('¡Hola Claudio! 👋');
            console.log('👋 Respuesta a Claudio enviada');
        }
    } catch (error) {
        console.error('❌ Error procesando mensaje:', error);
    }
});

// Manejar errores
client.on('error', (error) => {
    console.error('❌ Error del cliente:', error);
});

// Inicializar cliente
client.initialize().catch(error => {
    console.error('❌ Error inicializando cliente:', error);
});
