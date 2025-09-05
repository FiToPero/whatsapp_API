const OpenAI = require('openai');

class OpenAIService {
    constructor() {
        // Inicializar cliente de OpenAI
        this.client = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        // Configuración por defecto
        this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
        this.max_completion_tokens = parseInt(process.env.OPENAI_MAX_TOKENS) || 500;
        this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;
        this.presence_penalty = parseFloat(process.env.OPENAI_PRESENCE_PENALTY) || 0.1;
        this.frequency_penalty = parseFloat(process.env.OPENAI_FREQUENCY_PENALTY) || 0.1;

        console.log(`OpenAI inicializado con modelo: ${this.model}`);
    }

    async generateResponse(messagesOld) {
        try {
            // Crear contexto personalizado basado en el remitente
            const systemPrompt = this.createSystemPrompt(messagesOld.chatName);

            // Preparar historial de conversación
            const messages = [
                { role: "system", content: systemPrompt },
                ...messagesOld.map(msg => ({
                    role: msg.fromMe ? "assistant" : "user",
                    content: msg.body
                }))
            ];
            // Llamar a OpenAI
            const completion = await this.client.chat.completions.create({
                model: this.model,
                messages: messages,
                max_completion_tokens: this.max_completion_tokens,
                temperature: this.temperature,
                presence_penalty: this.presence_penalty,
                frequency_penalty: this.frequency_penalty
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

    createSystemPrompt(name) {
        let prompt = `Eres un asistente virtual útil y amigable para WhatsApp. 

            INSTRUCCIONES:
            - Responde de forma concisa y amigable
            - Máximo 2-3 líneas por respuesta
            - No uses emojis
            - Sé helpful y positivo
            - Si no sabes algo, admítelo honestamente`;

        // Personalizar según el contexto
        if (name) {
            prompt += `\n- El usuario se llama ${name}`;
        }

        return prompt;
    }
}

module.exports = OpenAIService;