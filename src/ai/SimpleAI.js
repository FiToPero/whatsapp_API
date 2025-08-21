// ================================================================
// IA SIMPLE PARA WHATSAPP - RESPUESTAS AUTOMÁTICAS
// ================================================================

class SimpleAI {
    constructor() {
        // Base de conocimientos simple
        this.responses = {
            // Saludos
            saludos: [
                '¡Hola! 👋 ¿En qué puedo ayudarte?',
                '¡Hola! Soy el asistente virtual. ¿Cómo estás?',
                '¡Hola! 😊 Estoy aquí para ayudarte'
            ],
            
            // Despedidas
            despedidas: [
                '¡Hasta luego! 👋 Que tengas un buen día',
                'Adiós! 😊 Espero haberte ayudado',
                '¡Nos vemos! Que todo esté muy bien'
            ],
            
            // Preguntas frecuentes
            ayuda: [
                'Puedo ayudarte con información general, responder preguntas básicas o simplemente conversar. ¿Qué necesitas?',
                'Estoy aquí para ayudarte. Puedes preguntarme lo que quieras 😊'
            ],
            
            // Respuestas por defecto
            default: [
                'Interesante... 🤔 Cuéntame más sobre eso',
                'Entiendo. ¿Hay algo específico en lo que pueda ayudarte?',
                'Gracias por escribir. ¿En qué más puedo asistirte?',
                'No estoy seguro de cómo responder a eso, pero estoy aquí para ayudarte 😊'
            ]
        };
        
        // Palabras clave para detectar intenciones
        this.keywords = {
            saludos: ['hola', 'hello', 'hi', 'buenos dias', 'buenas tardes', 'buenas noches', 'que tal', 'como estas'],
            despedidas: ['adios', 'bye', 'hasta luego', 'nos vemos', 'chau', 'adiós'],
            ayuda: ['ayuda', 'help', 'que puedes hacer', 'como funciona', 'info', 'información'],
            tiempo: ['clima', 'tiempo', 'temperatura'],
            nombre: ['como te llamas', 'tu nombre', 'quien eres', 'que eres']
        };
    }
    
    // Función principal para generar respuestas
    async generateResponse(message, senderInfo = {}) {
        // Limpiar y normalizar el mensaje
        const normalizedMessage = message.toLowerCase().trim();
        
        // Log para debug
        console.log(`🤖 [IA] Procesando mensaje: "${message}"`);
        
        // Detectar intención del mensaje
        const intention = this.detectIntention(normalizedMessage);
        
        // Generar respuesta basada en la intención
        let response = await this.getResponseByIntention(intention, normalizedMessage, senderInfo);
        
        // Agregar personalización si tenemos info del remitente
        if (senderInfo.name) {
            response = this.personalizeResponse(response, senderInfo.name);
        }
        
        console.log(`🤖 [IA] Respuesta generada: "${response}"`);
        return response;
    }
    
    // Detectar la intención del mensaje
    detectIntention(message) {
        // Revisar cada categoría de palabras clave
        for (const [intention, keywords] of Object.entries(this.keywords)) {
            for (const keyword of keywords) {
                if (message.includes(keyword)) {
                    return intention;
                }
            }
        }
        
        // Si no se detecta ninguna intención específica
        return 'default';
    }
    
    // Obtener respuesta según la intención
    async getResponseByIntention(intention, message, senderInfo) {
        switch (intention) {
            case 'saludos':
                return this.getRandomResponse('saludos');
                
            case 'despedidas':
                return this.getRandomResponse('despedidas');
                
            case 'ayuda':
                return this.getRandomResponse('ayuda');
                
            case 'tiempo':
                return 'No puedo consultar el clima en tiempo real, pero puedes usar apps como Weather o Google 🌤️';
                
            case 'nombre':
                return 'Soy un asistente virtual de WhatsApp 🤖 Puedes llamarme Bot o Asistente';
                
            default:
                // Respuestas inteligentes para casos específicos
                if (message.includes('gracias')) {
                    return '¡De nada! 😊 Estoy aquí para ayudarte';
                }
                
                if (message.includes('?')) {
                    return 'Es una buena pregunta. Déjame pensar... 🤔 ¿Podrías darme más detalles?';
                }
                
                if (message.length > 100) {
                    return 'Veo que tienes mucho que decir. Es interesante 📝 ¿Hay algo específico en lo que pueda ayudarte?';
                }
                
                return this.getRandomResponse('default');
        }
    }
    
    // Obtener respuesta aleatoria de una categoría
    getRandomResponse(category) {
        const responses = this.responses[category];
        if (!responses || responses.length === 0) {
            return 'Hola! ¿En qué puedo ayudarte? 😊';
        }
        
        const randomIndex = Math.floor(Math.random() * responses.length);
        return responses[randomIndex];
    }
    
    // Personalizar respuesta con el nombre del usuario
    personalizeResponse(response, userName) {
        // Agregar el nombre al inicio ocasionalmente
        if (Math.random() < 0.3) { // 30% de probabilidad
            return `${userName}, ${response.toLowerCase()}`;
        }
        return response;
    }
    
    // Configurar respuestas personalizadas
    addCustomResponse(category, responses) {
        if (!this.responses[category]) {
            this.responses[category] = [];
        }
        
        if (Array.isArray(responses)) {
            this.responses[category] = [...this.responses[category], ...responses];
        } else {
            this.responses[category].push(responses);
        }
    }
    
    // Agregar palabras clave personalizadas
    addCustomKeywords(category, keywords) {
        if (!this.keywords[category]) {
            this.keywords[category] = [];
        }
        
        if (Array.isArray(keywords)) {
            this.keywords[category] = [...this.keywords[category], ...keywords];
        } else {
            this.keywords[category].push(keywords);
        }
    }
}

module.exports = SimpleAI;
