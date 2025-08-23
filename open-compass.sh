#!/bin/bash

# 🚀 Script para abrir MongoDB Compass con configuración automática

echo "🔧 Configurando MongoDB Compass para WhatsApp API..."

# Configuración de conexión
MONGO_URI="mongodb://fito:fito@localhost:27017/whatsapp_messages?authSource=admin"

echo "📋 Datos de conexión:"
echo "URI: $MONGO_URI"
echo "Base de datos: whatsapp_messages"
echo "Colecciones: chats, messages"
echo ""

# Verificar si MongoDB está corriendo
echo "🔍 Verificando conexión a MongoDB..."
if docker compose exec mongodb mongosh --username fito --password fito --authenticationDatabase admin whatsapp_messages --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB está conectado y funcionando"
    
    # Mostrar estadísticas
    echo ""
    echo "📊 Estadísticas actuales:"
    docker compose exec mongodb mongosh --username fito --password fito --authenticationDatabase admin whatsapp_messages --eval "
    console.log('Chats registrados:', db.chats.countDocuments());
    console.log('Mensajes almacenados:', db.messages.countDocuments());
    " 2>/dev/null
    
else
    echo "❌ Error: MongoDB no está disponible"
    echo "💡 Ejecuta: docker compose up -d"
    exit 1
fi

echo ""
echo "🎯 Para conectar MongoDB Compass:"
echo "1. Abre MongoDB Compass"
echo "2. Usa esta URI de conexión:"
echo "   $MONGO_URI"
echo ""
echo "🔗 O configura manualmente:"
echo "   Host: localhost"
echo "   Port: 27017" 
echo "   Username: fito"
echo "   Password: fito"
echo "   Auth Database: admin"
echo "   Default Database: whatsapp_messages"
echo ""

# Intentar abrir MongoDB Compass automáticamente
if command -v mongodb-compass &> /dev/null; then
    echo "🚀 Abriendo MongoDB Compass..."
    mongodb-compass "$MONGO_URI" &
elif command -v flatpak &> /dev/null && flatpak list | grep -q mongodb; then
    echo "🚀 Abriendo MongoDB Compass (Flatpak)..."
    flatpak run com.mongodb.Compass "$MONGO_URI" &
else
    echo "💡 MongoDB Compass no encontrado."
    echo "   Descárgalo desde: https://www.mongodb.com/try/download/compass"
    echo "   Luego usa la URI de conexión mostrada arriba."
fi

echo ""
echo "✨ ¡MongoDB Compass configurado! Explora tus datos de WhatsApp."
