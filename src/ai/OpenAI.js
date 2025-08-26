const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        // Inicializar cliente de OpenAI
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Configuración por defecto
        this.model = process.env.OPENAI_MODEL || 'gpt-5-nano';
        this.maxTokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 150;
        this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
        
        console.log(`OpenAI inicializado con modelo: ${this.model}`);
    }

    async generateResponse(message, senderInfo = {}) {
        try {
            // Crear contexto personalizado basado en el remitente
            const systemPrompt = this.createSystemPrompt(senderInfo);
            
            // Preparar mensajes para OpenAI
            const messages = [
                {
                    role: "system",
                    content: systemPrompt
                },
                {
                    role: "user",
                    content: message
                }
            ];

            // Llamar a OpenAI
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                max_tokens: this.maxTokens,
                temperature: this.temperature,
                presence_penalty: 0.1,
                frequency_penalty: 0.1
            });

            const response = completion.choices[0]?.message?.content?.trim();
            
            if (!response) {
                return "Lo siento, no pude generar una respuesta en este momento.";
            }

            console.log(`[OpenAI] Respuesta generada (${completion.usage.total_tokens} tokens)`);
            return response;

        } catch (error) {
            console.error('[OpenAI] Error:', error); //error.message, error.code
            return "Lo siento, hubo un error al generar la respuesta.";
        }
    }

    createSystemPrompt(senderInfo) {
        let prompt = `Eres un asistente virtual útil y amigable para WhatsApp. 

            INSTRUCCIONES:
            - Responde de forma concisa y amigable
            - Máximo 2-3 líneas por respuesta
            - Usa emojis ocasionalmente
            - Sé helpful y positivo
            - Si no sabes algo, admítelo honestamente`;

        // Personalizar según el contexto
        if (senderInfo.name) {
            prompt += `\n- El usuario se llama ${senderInfo.name}`;
        }

        if (senderInfo.isGroup) {
            prompt += `\n- Estás respondiendo en un grupo de WhatsApp llamado "${senderInfo.groupName}"`;
            prompt += `\n- Mantén las respuestas breves para no interrumpir la conversación grupal`;
        } else {
            prompt += `\n- Estás en una conversación individual`;
            prompt += `\n- Puedes ser un poco más detallado si es necesario`;
        }

        return prompt;
    }

    // Método para conversaciones más complejas (opcional)
    async generateContextualResponse(messages, senderInfo = {}) {
        try {
            const systemPrompt = this.createSystemPrompt(senderInfo);
            
            // Preparar historial de conversación
            const openaiMessages = [
                { role: "system", content: systemPrompt },
                ...messages.map(msg => ({
                    role: msg.fromMe ? "assistant" : "user",
                    content: msg.body
                }))
            ];

            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: openaiMessages.slice(-10), // Últimos 10 mensajes para contexto
                max_tokens: this.maxTokens,
                temperature: this.temperature
            });

            return completion.choices[0]?.message?.content?.trim() || 
                   "No pude generar una respuesta adecuada.";

        } catch (error) {
            console.error('[OpenAI] Error en respuesta contextual:', error.message);
            return this.generateResponse(messages[messages.length - 1]?.body || "", senderInfo);
        }
    }

    // Método para validar la configuración
    async testConnection() {
        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [{ role: "user", content: "Hola" }],
                max_tokens: 10
            });
            
            console.log('Conexión con OpenAI exitosa');
            return true;
        } catch (error) {
            console.error('Error conectando con OpenAI:', error.message);
            return false;
        }
    }
}

module.exports = OpenAIService;