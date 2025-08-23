# 🔍 Consultas Útiles para MongoDB Compass - WhatsApp API

## 📊 Filtros Básicos

### Ver solo grupos
```json
{ "isGroup": true }
```

### Ver solo chats individuales
```json
{ "isGroup": false }
```

### Mensajes con respuesta de IA
```json
{ "aiResponse.generated": true }
```

### Mensajes sin respuesta de IA
```json
{ "aiResponse.generated": { "$ne": true } }
```

### Mensajes de hoy
```json
{
  "timestamp": {
    "$gte": "2025-08-23T00:00:00.000Z",
    "$lt": "2025-08-24T00:00:00.000Z"
  }
}
```

### Buscar texto en mensajes
```json
{ "body": { "$regex": "hola", "$options": "i" } }
```

### Mensajes que son audios (PTT)
```json
{ "type": "ptt" }
```

### Mensajes con media (imágenes, videos, etc.)
```json
{ "hasMedia": true }
```

## 🔍 Filtros Avanzados

### Mensajes de un chat específico
```json
{ "chatId": "5491123456789@c.us" }
```

### Mensajes de un grupo específico
```json
{ 
  "isGroup": true,
  "chatName": "Doctores sin doctorado🤪"
}
```

### Mensajes enviados por mí
```json
{ "fromMe": true }
```

### Mensajes recibidos de otros
```json
{ "fromMe": false }
```

### Mensajes reenviados
```json
{ "isForwarded": true }
```

### Mensajes de la última hora
```json
{
  "timestamp": {
    "$gte": "{{ ISODate().toISOString().slice(0, -5) + (ISODate().getUTCHours()-1).toString().padStart(2,'0') + ISODate().toISOString().slice(-5) }}"
  }
}
```

### Mensajes largos (más de 100 caracteres)
```json
{
  "$expr": {
    "$gt": [{ "$strLenCP": "$body" }, 100]
  }
}
```

## 📈 Agregaciones (Pestaña Aggregations)

### 1. Conteo de mensajes por chat
```json
[
  {
    "$group": {
      "_id": "$chatName",
      "totalMessages": { "$sum": 1 },
      "lastMessage": { "$max": "$timestamp" },
      "isGroup": { "$first": "$isGroup" }
    }
  },
  {
    "$sort": { "totalMessages": -1 }
  }
]
```

### 2. Estadísticas de IA por categoría
```json
[
  {
    "$match": { "aiResponse.generated": true }
  },
  {
    "$group": {
      "_id": "$aiResponse.category",
      "count": { "$sum": 1 },
      "avgResponseTime": {
        "$avg": {
          "$subtract": ["$aiResponse.responseTimestamp", "$timestamp"]
        }
      }
    }
  }
]
```

### 3. Actividad por hora del día
```json
[
  {
    "$group": {
      "_id": { "$hour": "$timestamp" },
      "messages": { "$sum": 1 }
    }
  },
  {
    "$sort": { "_id": 1 }
  }
]
```

### 4. Top 10 palabras más usadas
```json
[
  {
    "$match": { "body": { "$ne": "" } }
  },
  {
    "$project": {
      "words": {
        "$split": [{ "$toLower": "$body" }, " "]
      }
    }
  },
  {
    "$unwind": "$words"
  },
  {
    "$match": {
      "words": { "$regex": "^[a-zA-Z]{3,}$" }
    }
  },
  {
    "$group": {
      "_id": "$words",
      "count": { "$sum": 1 }
    }
  },
  {
    "$sort": { "count": -1 }
  },
  {
    "$limit": 10
  }
]
```

### 5. Mensajes por tipo (texto, audio, imagen, etc.)
```json
[
  {
    "$group": {
      "_id": "$type",
      "count": { "$sum": 1 }
    }
  },
  {
    "$sort": { "count": -1 }
  }
]
```

### 6. Chats más activos (con más mensajes)
```json
[
  {
    "$group": {
      "_id": {
        "chatId": "$chatId",
        "chatName": "$chatName",
        "isGroup": "$isGroup"
      },
      "messageCount": { "$sum": 1 },
      "lastActivity": { "$max": "$timestamp" },
      "firstActivity": { "$min": "$timestamp" }
    }
  },
  {
    "$sort": { "messageCount": -1 }
  },
  {
    "$limit": 20
  }
]
```

### 7. Análisis de respuestas de IA por día
```json
[
  {
    "$match": { "aiResponse.generated": true }
  },
  {
    "$group": {
      "_id": {
        "year": { "$year": "$timestamp" },
        "month": { "$month": "$timestamp" },
        "day": { "$dayOfMonth": "$timestamp" }
      },
      "aiResponses": { "$sum": 1 },
      "avgResponseLength": {
        "$avg": { "$strLenCP": "$aiResponse.responseText" }
      }
    }
  },
  {
    "$sort": { "_id": 1 }
  }
]
```

## 🎯 Índices Útiles

Para mejorar el rendimiento, considera crear estos índices:

```javascript
// En la colección messages
db.messages.createIndex({ "chatId": 1, "timestamp": -1 })
db.messages.createIndex({ "timestamp": -1 })
db.messages.createIndex({ "isGroup": 1 })
db.messages.createIndex({ "aiResponse.generated": 1 })
db.messages.createIndex({ "fromMe": 1 })

// En la colección chats
db.chats.createIndex({ "chatId": 1 }, { unique: true })
db.chats.createIndex({ "isGroup": 1 })
```

## 💡 Tips para MongoDB Compass

1. **Favoritos**: Guarda tus consultas frecuentes como favoritos
2. **Exportar**: Usa "Export Collection" para crear backups
3. **Performance**: Revisa la pestaña "Performance" para optimizar consultas
4. **Real Time**: Activa "Auto Refresh" para ver datos en tiempo real
5. **Charts**: Usa MongoDB Charts para visualizaciones avanzadas

## 🔧 Solución de Problemas

### Si no puedes conectar:
1. Verifica que Docker esté corriendo: `docker compose ps`
2. Revisa los logs: `docker compose logs mongodb`
3. Prueba la conexión: `./open-compass.sh`

### Si no ves datos:
1. Ejecuta la API para generar datos: `npm run api`
2. Envía algunos mensajes de WhatsApp
3. Verifica en terminal: `docker compose exec mongodb mongosh...`

¡Explora y analiza todos tus datos de WhatsApp con estas consultas! 🚀
