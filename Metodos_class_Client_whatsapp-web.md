

## **🔧 Métodos de la clase Client de whatsapp-web.js**

### **📱 MÉTODOS DE INICIALIZACIÓN Y CONEXIÓN**

```javascript
// Inicialización
client.initialize()                    // Inicializar cliente
client.destroy()                       // Destruir cliente y cerrar conexión
client.logout()                        // Cerrar sesión
client.getState()                      // Obtener estado actual del cliente

// Información del cliente
client.info                           // Información básica del cliente
client.pupPage                        // Página de Puppeteer (para debugging)
```

### **👤 MÉTODOS DE CONTACTOS**

```javascript
// Obtener contactos
client.getContacts()                   // Obtener todos los contactos
client.getContactById(contactId)       // Obtener contacto por ID
client.getNumberId(number)             // Verificar si un número está en WhatsApp
client.isRegisteredUser(number)        // Verificar si un usuario está registrado

// Información de contacto
contact.getAbout()                     // Obtener estado/about del contacto
contact.getProfilePicUrl()             // Obtener URL de foto de perfil
contact.getCommonGroups()              // Obtener grupos en común
```

### **💬 MÉTODOS DE CHATS**

```javascript
// Obtener chats
client.getChats()                      // Obtener todos los chats
client.getChatById(chatId)             // Obtener chat por ID
client.getChatLabels(chatId)           // Obtener etiquetas de un chat

// Gestión de chats
chat.archive()                         // Archivar chat
chat.unarchive()                       // Desarchivar chat
chat.pin()                            // Fijar chat
chat.unpin()                          // Desfijar chat
chat.delete()                         // Eliminar chat
chat.mute(unmuteDate)                 // Silenciar chat
chat.unmute()                         // Quitar silencio

// Información del chat
chat.fetchMessages(options)            // Obtener mensajes del chat
chat.loadEarlierMessages(options)      // Cargar mensajes anteriores
chat.getLastSeen()                     // Obtener última vez visto
```

### **📨 MÉTODOS DE MENSAJES**

```javascript
// Enviar mensajes
client.sendMessage(chatId, content, options)     // Enviar mensaje
client.sendSeen(chatId)                          // Marcar como visto
chat.sendMessage(content, options)               // Enviar mensaje al chat
chat.sendSeen()                                  // Marcar chat como visto

// Tipos de mensajes
chat.sendMessage(text)                           // Texto simple
chat.sendMessage(media, { caption: 'texto' })   // Multimedia con texto
chat.sendMessage(location)                       // Ubicación
chat.sendMessage(contact)                        // Contacto
chat.sendMessage(poll)                           // Encuesta

// Reacciones y respuestas
message.reply(content)                           // Responder mensaje
message.react(emoji)                             // Reaccionar con emoji
message.forward(chatId)                          // Reenviar mensaje
message.star()                                   // Marcar como favorito
message.unstar()                                 // Quitar de favoritos
message.delete(everyone = false)                 // Eliminar mensaje

// Información de mensajes
message.getInfo()                                // Información del mensaje
message.getQuotedMessage()                       // Mensaje citado
message.downloadMedia()                          // Descargar multimedia
message.getContact()                             // Obtener contacto del remitente
message.getChat()                                // Obtener chat del mensaje
message.getOrder()                               // Información de pedido (Business)
```

### **👥 MÉTODOS DE GRUPOS**

```javascript
// Crear y gestionar grupos
client.createGroup(name, participants)           // Crear grupo
group.addParticipants(participants)              // Agregar participantes
group.removeParticipants(participants)           // Remover participantes
group.promoteParticipants(participants)          // Promover a admin
group.demoteParticipants(participants)           // Quitar admin

// Configuración del grupo
group.setSubject(subject)                        // Cambiar nombre
group.setDescription(description)                // Cambiar descripción
group.setMessagesAdminsOnly(adminsOnly)          // Solo admins pueden escribir
group.setEditGroupInfoAdminsOnly(adminsOnly)     // Solo admins pueden editar info
group.setGroupPicture(media)                     // Cambiar foto del grupo

// Información del grupo
group.getParticipants()                          // Obtener participantes
group.getAdmins()                               // Obtener administradores
group.getGroupPicUrl()                          // Obtener URL de foto del grupo
group.getInviteCode()                           // Obtener código de invitación
group.revokeInvite()                            // Revocar código de invitación
group.leave()                                   // Salir del grupo
```

### **📷 MÉTODOS DE MULTIMEDIA**

```javascript
// Multimedia
const media = MessageMedia.fromFilePath(filePath)  // Crear media desde archivo
const media = MessageMedia.fromUrl(url)            // Crear media desde URL
const media = MessageMedia.fromBase64(mime, data)  // Crear media desde base64

// Descargar contenido
message.downloadMedia()                            // Descargar archivo adjunto
contact.getProfilePicUrl()                         // Foto de perfil de contacto
chat.getProfilePicUrl()                           // Foto de perfil de chat/grupo
```

### **📋 MÉTODOS DE LISTAS Y BOTONES**

```javascript
// Listas interactivas
const list = new List(body, buttonText, sections, title, footer)
chat.sendMessage(list)

// Botones
const buttons = new Buttons(body, buttons, title, footer)
chat.sendMessage(buttons)

// Polls (encuestas)
const poll = new Poll(name, options, options)
chat.sendMessage(poll)
```

### **🏢 MÉTODOS DE WHATSAPP BUSINESS**

```javascript
// Catálogo de productos
client.getBusinessProfileProducts(number)         // Productos de un negocio
client.getOrderbyId(orderId)                      // Obtener pedido por ID

// Etiquetas
client.getLabels()                                // Obtener todas las etiquetas
client.getLabelById(labelId)                      // Obtener etiqueta por ID
client.getChatsByLabelId(labelId)                 // Chats con cierta etiqueta
```

### **🔧 MÉTODOS DE UTILIDAD**

```javascript
// Screenshots y QR
client.getQrCode()                                // Obtener código QR
client.takeScreenshot()                           // Captura de pantalla

// Verificaciones
client.isRegisteredUser(number)                   // Verificar si está registrado
client.getNumberId(number)                        // Obtener ID de número
client.getFormattedNumber(number)                 // Formatear número

// Estados
client.getState()                                 // Estado del cliente
client.info                                       // Información del cliente
```

### **📱 MÉTODOS DE ESTADOS (STORIES)**

```javascript
// Estados/Stories
client.getStatus()                                // Obtener estados
client.sendMessage(chatId, media, {sendAsStory: true}) // Enviar como estado
```

### **🔔 EVENTOS DISPONIBLES**

```javascript
// Eventos principales que puedes escuchar
client.on('qr', (qr) => {})                      // Código QR generado
client.on('ready', () => {})                     // Cliente listo
client.on('authenticated', () => {})             // Autenticado
client.on('auth_failure', (msg) => {})           // Error de autenticación
client.on('disconnected', (reason) => {})        // Desconectado

// Eventos de mensajes
client.on('message', (message) => {})            // Mensaje recibido
client.on('message_create', (message) => {})     // Mensaje creado
client.on('message_revoke_everyone', (message) => {}) // Mensaje eliminado para todos
client.on('message_revoke_me', (message) => {})  // Mensaje eliminado para mí
client.on('message_ack', (message, ack) => {})   // Confirmación de mensaje

// Eventos de grupos
client.on('group_join', (notification) => {})    // Alguien se unió al grupo
client.on('group_leave', (notification) => {})   // Alguien salió del grupo
client.on('group_admin_changed', (notification) => {}) // Cambio de admin

// Eventos de llamadas
client.on('call', (call) => {})                  // Llamada recibida

// Eventos de contactos
client.on('contact_changed', (message, oldId, newId, isContact) => {})
```

## **💡 Ejemplos de uso avanzados:**

### **📊 Obtener estadísticas detalladas:**
```javascript
// Obtener información completa del cliente
const clientInfo = client.info;
console.log('WhatsApp Web version:', clientInfo.wid);

// Verificar si un número está en WhatsApp
const numberId = await client.getNumberId('5491123456789');
if (numberId) {
    console.log('Número registrado:', numberId._serialized);
}
```

### **👥 Gestión avanzada de grupos:**
```javascript
// Crear grupo con múltiples participantes
const group = await client.createGroup('Mi Grupo', [
    '5491123456789@c.us',
    '5491987654321@c.us'
]);

// Obtener información detallada del grupo
const participants = await group.getParticipants();
const admins = await group.getAdmins();
const inviteCode = await group.getInviteCode();
```

### **📷 Manejo avanzado de multimedia:**
```javascript
// Enviar imagen con opciones
const media = MessageMedia.fromFilePath('./imagen.jpg');
await chat.sendMessage(media, {
    caption: 'Mi imagen',
    sendMediaAsSticker: false,
    sendMediaAsDocument: false
});

// Descargar y procesar multimedia
const media = await message.downloadMedia();
const buffer = Buffer.from(media.data, 'base64');
```