# 📊 Configuración de MongoDB Compass

## 🔧 Pasos para conectar MongoDB Compass

### 1. Descargar e Instalar MongoDB Compass
Descarga MongoDB Compass desde: https://www.mongodb.com/try/download/compass

### 2. Configuración de Conexión

**Método 1: Conexión String URI**
```
mongodb://fito:fito@localhost:27017/whatsapp_messages?authSource=admin
```

**Método 2: Configuración Manual**
```
Host: localhost
Port: 27017
Authentication: Username/Password
Username: fito
Password: fito
Authentication Database: admin
Default Database: whatsapp_messages
```

### 3. Datos Disponibles

#### 📋 Colecciones:
- **`chats`** - Información de todos los chats (grupos e individuales)
- **`messages`** - Todos los mensajes enviados y recibidos

#### 🔍 Estructura de `chats`:
```json
{
  "_id": "ObjectId",
  "chatId": "5491123456789@c.us",
  "name": "Juan Pérez",
  "isGroup": false,
  "type": "individual",
  "archived": false,
  "pinned": false,
  "unreadCount": 0,
  "stats": {
    "totalMessages": 25,
    "lastMessageAt": "2025-08-23T10:30:00.000Z",
    "firstMessageAt": "2025-08-20T15:20:00.000Z"
  },
  "createdAt": "2025-08-23T09:15:00.000Z",
  "updatedAt": "2025-08-23T10:30:00.000Z"
}
```

#### 💬 Estructura de `messages`:
```json
{
  "_id": "ObjectId",
  "messageId": "false_5491123456789@c.us_B8F2A1C3D4E5F678",
  "chatId": "5491123456789@c.us",
  "from": "5491123456789@c.us",
  "author": null,
  "body": "Hola, ¿cómo estás?",
  "type": "text",
  "timestamp": "2025-08-23T10:30:00.000Z",
  "fromMe": false,
  "hasMedia": false,
  "isGroup": false,
  "chatName": "Juan Pérez",
  "isForwarded": false,
  "isStatus": false,
  "deviceType": null,
  "aiResponse": {
    "generated": true,
    "responseText": "¡Hola! Estoy muy bien, gracias por preguntar.",
    "responseTimestamp": "2025-08-23T10:30:05.000Z",
    "keywords": [],
    "category": "individual_auto"
  },
  "createdAt": "2025-08-23T10:30:00.000Z",
  "updatedAt": "2025-08-23T10:30:05.000Z"
}
```

### 4. Consultas Útiles en MongoDB Compass

#### 📊 Filtros de Ejemplo:

**Mensajes de grupos solamente:**
```json
{ "isGroup": true }
```

**Mensajes con respuesta de IA:**
```json
{ "aiResponse.generated": true }
```

**Mensajes de un chat específico:**
```json
{ "chatId": "5491123456789@c.us" }
```

**Mensajes de hoy:**
```json
{
  "timestamp": {
    "$gte": "2025-08-23T00:00:00.000Z",
    "$lt": "2025-08-24T00:00:00.000Z"
  }
}
```

**Mensajes que contienen una palabra:**
```json
{ "body": { "$regex": "hola", "$options": "i" } }
```

#### 🔍 Agregaciones de Ejemplo:

**Contar mensajes por chat:**
```json
[
  {
    "$group": {
      "_id": "$chatName",
      "totalMessages": { "$sum": 1 },
      "lastMessage": { "$max": "$timestamp" }
    }
  },
  { "$sort": { "totalMessages": -1 } }
]
```

**Estadísticas de IA:**
```json
[
  {
    "$match": { "aiResponse.generated": true }
  },
  {
    "$group": {
      "_id": "$aiResponse.category",
      "count": { "$sum": 1 }
    }
  }
]
```

### 5. Tips para MongoDB Compass

1. **Vista de Documentos**: Usa la pestaña "Documents" para ver los datos
2. **Filtros**: Aplica filtros JSON para buscar datos específicos
3. **Agregaciones**: Usa la pestaña "Aggregations" para análisis avanzados
4. **Índices**: Revisa los índices en la pestaña "Indexes"
5. **Esquema**: Ve la estructura de datos en "Schema"

### 6. Verificar Conexión

Si la conexión falla, verifica:
1. Que Docker Compose esté corriendo: `docker compose ps`
2. Que MongoDB esté en el puerto 27017: `docker compose logs mongodb`
3. Que las credenciales sean correctas en `.env`

### 7. Datos de Prueba

Para generar datos de prueba, ejecuta la API y envía algunos mensajes a WhatsApp.

```bash
# Verificar datos en terminal
docker compose exec mongodb mongosh --username fito --password fito --authenticationDatabase admin whatsapp_messages --eval "db.messages.countDocuments()"
```

¡MongoDB Compass te permitirá explorar visualmente todos los chats y mensajes de WhatsApp almacenados! 🚀
