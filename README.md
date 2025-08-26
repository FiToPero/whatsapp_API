# 🚀 WhatsApp API con MongoDB y IA

Una API completa de WhatsApp que permite enviar/recibir mensajes, respuestas automáticas con IA y almacenamiento en MongoDB.

## 📋 Características

- ✅ **Envío/Recepción de mensajes** de WhatsApp via API REST
- ✅ **Respuestas automáticas con IA** configurable
- ✅ **Base de datos MongoDB** para almacenar todos los mensajes y chats
- ✅ **Detección de grupos vs chats individuales**
- ✅ **Estadísticas completas** de mensajes y chats
- ✅ **Búsqueda de mensajes** en MongoDB
- ✅ **Docker Compose** para fácil despliegue

## 🛠️ Tecnologías

- **Node.js** + Express.js
- **WhatsApp Web.js** para conexión con WhatsApp
- **MongoDB** + Mongoose para base de datos
- **OpenAI API** para respuestas inteligentes
- **Docker** + Docker Compose

## 🚀 Instalación

### 1. Clonar repositorio
```bash
git clone [tu-repo]
cd whatsapp_API
```

### 2. Configurar variables de entorno
Edita el archivo `.env`:
```env
# === APLICACIÓN ===
APP_NAME=whatsapp_API
NODE_ENV=development
PORT=3000

# === MONGODB ===
DB_MONGO_HOST=mongodb
DB_MONGO_PORT=27017
DB_MONGO_DATABASE=whatsapp_messages
DB_MONGO_USERNAME=fito
DB_MONGO_PASSWORD=fito

# === OPENAI ===
OPENAI_API_KEY=tu_api_key_aqui

# === MYSQL (opcional) ===
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=whatsappapidb
DB_USERNAME=fito
DB_PASSWORD=fito
```

### 3. Ejecutar con Docker
```bash
# Iniciar servicios
docker compose up -d

# Ver logs
docker compose logs -f node

# Ejecutar API
docker compose exec node npm run api
```

## 📡 Endpoints de la API

### Estado del Sistema
```bash
GET /status
```
**Respuesta:**
```json
{
  "whatsapp": {
    "status": "connected",
    "ready": true
  },
  "mongodb": {
    "status": "connected",
    "ready": true,
    "stats": {
      "chats": {
        "total": 69,
        "groups": 8,
        "individuals": 61
      },
      "messages": {
        "total": 1247,
        "aiResponses": 23
      }
    }
  },
  "ai": {
    "enabled": true
  },
  "timestamp": "2025-08-23T10:30:00.000Z"
}
```

### Enviar Mensaje
```bash
POST /send-message
Content-Type: application/json

{
  "number": "5491123456789",
  "message": "Hola desde la API!"
}
```

### Obtener Chats
```bash
GET /chats
```

### Mensajes de MongoDB
```bash
# Obtener mensajes de un chat
GET /db/messages/5491123456789@c.us?limit=100

# Buscar mensajes
GET /db/search?q=hola&limit=50&isGroup=false

# Estadísticas de un chat  
GET /db/stats/5491123456789@c.us

# Limpiar mensajes antiguos
POST /db/cleanup
{
  "daysOld": 30
}
```

### Control de IA
```bash
# Activar/Desactivar IA
POST /ai/toggle

# Agregar respuestas personalizadas
POST /ai/custom-response
{
  "category": "saludos",
  "responses": ["¡Hola!", "¿Cómo estás?"]
}
```

## 🤖 Funcionalidades de IA

### Respuestas Automáticas
- **Chats individuales**: Responde automáticamente a todos los mensajes
- **Grupos**: Solo responde cuando detecta palabras clave como "bot hablame"

### Configuración de IA
```javascript
// En grupos, personaliza las palabras clave:
const keywords = ['bot hablame', 'asistente', 'ayuda'];

// Personaliza las respuestas por contexto
const aiBot = new SimpleAI();
```

## 💾 Base de Datos MongoDB

### Esquemas Principales

#### Chat Schema
```javascript
{
  chatId: String,        // ID único del chat
  name: String,          // Nombre del chat/contacto
  isGroup: Boolean,      // Si es grupo o individual
  type: String,          // 'group' | 'individual'
  groupMetadata: {       // Solo para grupos
    participantsCount: Number,
    participants: Array,
    owner: String
  },
  stats: {
    totalMessages: Number,
    lastMessageAt: Date,
    firstMessageAt: Date
  }
}
```

#### Message Schema
```javascript
{
  messageId: String,     // ID único del mensaje
  chatId: String,        // ID del chat
  from: String,          // Remitente
  author: String,        // En grupos, quién envió
  body: String,          // Contenido del mensaje
  type: String,          // 'text', 'image', 'audio', 'ptt', etc.
  timestamp: Date,       // Fecha/hora del mensaje
  fromMe: Boolean,       // Si lo envié yo
  isGroup: Boolean,      // Si es de un grupo
  chatName: String,      // Nombre del chat
  aiResponse: {          // Respuesta de IA generada
    generated: Boolean,
    responseText: String,
    responseTimestamp: Date,
    keywords: Array,
    category: String
  }
}
```

### Consultas Útiles

```bash
# Obtener estadísticas globales
curl http://localhost:3000/status

# Buscar mensajes por texto
curl "http://localhost:3000/db/search?q=hola&limit=20"

# Mensajes de un grupo específico
curl "http://localhost:3000/db/messages/123456789@g.us?limit=50"

# Solo mensajes con respuesta de IA
curl "http://localhost:3000/db/search?q=.&includeAI=true"
```

## 🔧 Configuración Avanzada

### Personalizar Respuestas de IA
Edita `src/ai/SimpleAI.js`:

```javascript
// Agregar nuevas categorías
const responses = {
  saludos: ["¡Hola!", "¿Qué tal?", "¡Buenos días!"],
  despedidas: ["¡Hasta luego!", "¡Nos vemos!", "¡Adiós!"],
  // ...más categorías
};

// Personalizar detección de contexto
generateResponse(message, senderInfo) {
  // Tu lógica personalizada aquí
}
```

### Configurar Palabras Clave para Grupos
Edita `src/api-simple.js`:

```javascript
// Personalizar palabras clave que activan el bot en grupos
const keywords = [
  'bot hablame', 
  'asistente', 
  'ayuda', 
  'help',
  '@bot'
];
```

## 📊 Monitoreo y Logs

### Ver Logs en Tiempo Real
```bash
# Logs de la aplicación
docker compose logs -f node

# Logs de MongoDB
docker compose logs -f mongodb

# Logs de todos los servicios
docker compose logs -f
```

### Verificar Estado de Servicios
```bash
# Estado de contenedores
docker compose ps

# Verificar conexiones
curl http://localhost:3000/status
```

## 🛠️ Desarrollo

### Scripts Disponibles
```bash
# API simplificada (recomendada)
npm run api

# API completa con todas las funciones
npm run api-full

# Bot básico sin API
npm run start
```

### Estructura del Proyecto
```
src/
├── ai/
│   └── SimpleAI.js           # Lógica de IA
├── database/
│   └── mongodb.js            # Conexión MongoDB
├── models/
│   └── whatsapp.js           # Esquemas Mongoose
├── services/
│   └── whatsappDB.js         # Servicios de base de datos
├── api-simple.js             # API simplificada
├── api.js                    # API completa
└── index.js                  # Bot básico
```

## 🚨 Solución de Problemas

### WhatsApp no se conecta
1. Escanea el código QR que aparece en los logs
2. Verifica que los permisos de Docker están correctos
3. Revisa que el directorio `.wwebjs_auth` se crea correctamente

### MongoDB no conecta
1. Verifica que el contenedor de MongoDB está ejecutándose
2. Revisa las credenciales en `.env`
3. Verifica la conectividad: `docker compose exec mongodb mongosh`

### Errores de validación en mensajes
- Algunos tipos de mensajes (audios, stickers) pueden no tener texto
- El esquema está configurado para manejar estos casos automáticamente

## 📈 Próximas Características

- [ ] Interfaz web para administración
- [ ] Webhooks para integración externa
- [ ] Respaldo automático de la base de datos
- [ ] Análisis de sentimientos en mensajes
- [ ] Integración con más servicios de IA
- [ ] Dashboard de estadísticas en tiempo real

## 📝 Licencia

MIT License - ver archivo `LICENSE` para más detalles.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Agrega nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Abre un Pull Request

---

🔥 **¡API de WhatsApp lista para producción con MongoDB y IA integrada!** 🔥
