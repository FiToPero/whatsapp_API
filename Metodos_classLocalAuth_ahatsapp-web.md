# **🔐 Guía Completa de LocalAuth() - whatsapp-web.js**

## **📋 Descripción General**

`LocalAuth` es una estrategia de autenticación incluida en **whatsapp-web.js** que permite:
- 💾 **Persistir sesiones** localmente en el sistema de archivos
- 🔄 **Reutilizar autenticación** sin escanear QR repetidamente  
- 👥 **Múltiples clientes** con sesiones independientes
- 🗂️ **Gestión automática** de datos de autenticación

---

## **🔧 Constructor: `new LocalAuth(options)`**

### **📖 Sintaxis básica:**
```javascript
const { LocalAuth } = require('whatsapp-web.js');

const authStrategy = new LocalAuth({
    dataPath: string,           // Ruta de almacenamiento
    clientId: string,           // ID único del cliente
    store: Object,              // Almacén personalizado (opcional)
    serialize: Function,        // Serialización personalizada (opcional)
    deserialize: Function       // Deserialización personalizada (opcional)
});
```

---

## **⚙️ Opciones del Constructor**

### **1. 📁 `dataPath` (string)**
```javascript
new LocalAuth({
    dataPath: '/app/.wwebjs_auth'  // Ruta absoluta recomendada
})
```
- **Por defecto**: `'./.wwebjs_auth'`
- **Descripción**: Carpeta donde se guardan todos los datos de autenticación
- **Recomendación**: Usar rutas absolutas en Docker
- **Estructura creada**:
  ```
  dataPath/
  ├── session-{clientId}/
  │   ├── Default/
  │   │   ├── Local Storage/
  │   │   ├── Session Storage/
  │   │   ├── IndexedDB/
  │   │   └── Cookies
  │   ├── session.json
  │   ├── .wwebjs_cache/
  │   └── ...archivos de Chromium
  ```

### **2. 🆔 `clientId` (string)**
```javascript
new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api-client'  // ID único
})
```
- **Por defecto**: `'session'`
- **Descripción**: Identificador único para diferenciar clientes
- **Uso**: Esencial para múltiples instancias de WhatsApp
- **Ejemplos**:
  ```javascript
  clientId: 'bot-ventas'      // Bot de ventas
  clientId: 'bot-soporte'     // Bot de soporte  
  clientId: 'admin-principal' // Cliente administrativo
  ```

### **3. 🗄️ `store` (Object)**
```javascript
new LocalAuth({
    store: customStoreObject  // Almacén personalizado
})
```
- **Por defecto**: Almacén de archivos local
- **Descripción**: Permite usar almacenes alternativos
- **Casos de uso**:
  - Base de datos (MongoDB, PostgreSQL)
  - Redis para sesiones en memoria
  - Almacenamiento en la nube (AWS S3, Google Cloud)

### **4. 🔄 `serialize` (Function)**
```javascript
new LocalAuth({
    serialize: (obj) => {
        console.log('Serializando:', obj);
        return JSON.stringify(obj, null, 2);
    }
})
```
- **Descripción**: Función personalizada para serializar datos antes de guardar
- **Parámetros**: `obj` (Object) - Objeto a serializar
- **Retorna**: `string` - Datos serializados

### **5. 🔄 `deserialize` (Function)**
```javascript
new LocalAuth({
    deserialize: (str) => {
        console.log('Deserializando:', str);
        return JSON.parse(str);
    }
})
```
- **Descripción**: Función personalizada para deserializar datos al cargar
- **Parámetros**: `str` (string) - Datos serializados
- **Retorna**: `Object` - Objeto deserializado

---

## **🛠️ Métodos de Instancia**

### **📱 Métodos de Autenticación**

#### **1. `logout()`**
```javascript
await authStrategy.logout();
```
- **Descripción**: Cierra sesión y marca los datos como inválidos
- **Retorna**: `Promise<void>`
- **Uso**: Cuando el usuario hace logout manualmente

#### **2. `destroy()`**
```javascript
await authStrategy.destroy();
```
- **Descripción**: Destruye completamente la estrategia de autenticación
- **Retorna**: `Promise<void>`
- **Uso**: Al cerrar la aplicación o reiniciar cliente

### **📊 Métodos de Sesión**

#### **3. `getSession()`**
```javascript
const sessionData = await authStrategy.getSession();
console.log('Datos de sesión:', sessionData);
```
- **Descripción**: Obtiene los datos de la sesión actual
- **Retorna**: `Promise<Object|null>`
- **Estructura del objeto**:
  ```javascript
  {
    WABrowserId: "string",
    WASecretBundle: "string", 
    WAToken1: "string",
    WAToken2: "string",
    // ...otros datos de WhatsApp Web
  }
  ```

#### **4. `setSession(sessionData)`**
```javascript
await authStrategy.setSession({
    WABrowserId: "...",
    WASecretBundle: "...",
    // ...otros datos
});
```
- **Descripción**: Establece datos de sesión manualmente
- **Parámetros**: `sessionData` (Object) - Datos de sesión válidos
- **Retorna**: `Promise<void>`
- **Uso**: Migrar sesiones entre instancias

### **🔍 Métodos de Verificación**

#### **5. `dataExists()`**
```javascript
const hasData = await authStrategy.dataExists();
if (hasData) {
    console.log('✅ Sesión guardada encontrada');
} else {
    console.log('❌ No hay sesión guardada, se requiere QR');
}
```
- **Descripción**: Verifica si existen datos de autenticación guardados
- **Retorna**: `Promise<boolean>`
- **Uso**: Decidir si mostrar QR o cargar sesión existente

### **🗑️ Métodos de Limpieza**

#### **6. `deleteSession()`**
```javascript
await authStrategy.deleteSession();
console.log('🧹 Sesión eliminada del disco');
```
- **Descripción**: Elimina todos los datos de la sesión del disco
- **Retorna**: `Promise<void>`
- **Uso**: Limpiar sesiones corruptas o forzar nueva autenticación

### **🔄 Métodos de Ciclo de Vida**

#### **7. `beforeBrowserInitialized()`**
```javascript
await authStrategy.beforeBrowserInitialized();
```
- **Descripción**: Se ejecuta antes de inicializar el navegador Puppeteer
- **Retorna**: `Promise<void>`
- **Uso**: Preparar datos antes del inicio

#### **8. `afterBrowserInitialized()`**
```javascript
await authStrategy.afterBrowserInitialized();
```
- **Descripción**: Se ejecuta después de inicializar el navegador
- **Retorna**: `Promise<void>`
- **Uso**: Configuraciones post-inicialización

---

## **💡 Ejemplos Prácticos**

### **🚀 Ejemplo 1: Configuración Básica**
```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'my-whatsapp-bot'
    })
});

client.on('qr', (qr) => {
    console.log('Escanea este QR:', qr);
});

client.on('ready', () => {
    console.log('✅ Cliente autenticado y listo');
});

await client.initialize();
```

### **👥 Ejemplo 2: Múltiples Clientes**
```javascript
// Cliente para ventas
const ventasClient = new Client({
    authStrategy: new LocalAuth({
        clientId: 'ventas-bot',
        dataPath: '/app/auth/ventas'
    })
});

// Cliente para soporte
const soporteClient = new Client({
    authStrategy: new LocalAuth({
        clientId: 'soporte-bot', 
        dataPath: '/app/auth/soporte'
    })
});

// Inicializar ambos
await Promise.all([
    ventasClient.initialize(),
    soporteClient.initialize()
]);
```

### **🔍 Ejemplo 3: Verificar Estado de Sesión**
```javascript
const authStrategy = new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api'
});

// Verificar si existe sesión
const hasSession = await authStrategy.dataExists();

if (hasSession) {
    console.log('✅ Sesión existente encontrada');
    
    // Obtener datos de sesión
    const sessionData = await authStrategy.getSession();
    console.log('📊 Datos de sesión:', Object.keys(sessionData));
    
} else {
    console.log('❌ No hay sesión, se requerirá QR');
}
```

### **🧹 Ejemplo 4: Limpieza de Sesión**
```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'whatsapp-api'
    })
});

// Limpiar en caso de logout
client.on('disconnected', async (reason) => {
    console.log(`Desconectado: ${reason}`);
    
    if (reason === 'LOGOUT') {
        console.log('🧹 Usuario hizo logout, limpiando sesión...');
        
        // Limpiar datos de autenticación
        await client.authStrategy.logout();
        await client.authStrategy.deleteSession();
        
        console.log('✅ Sesión limpiada correctamente');
        
        // Reiniciar si es necesario
        setTimeout(() => {
            client.initialize();
        }, 5000);
    }
});
```

### **💾 Ejemplo 5: Almacén Personalizado con MongoDB**
```javascript
class MongoStore {
    constructor(mongoConnection) {
        this.db = mongoConnection;
    }
    
    async save(clientId, data) {
        await this.db.collection('whatsapp_sessions').updateOne(
            { clientId },
            { $set: { data, updatedAt: new Date() } },
            { upsert: true }
        );
    }
    
    async load(clientId) {
        const doc = await this.db.collection('whatsapp_sessions').findOne({ clientId });
        return doc ? doc.data : null;
    }
    
    async delete(clientId) {
        await this.db.collection('whatsapp_sessions').deleteOne({ clientId });
    }
}

// Usar almacén personalizado
const mongoStore = new MongoStore(mongoConnection);

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-api',
        store: mongoStore
    })
});
```

### **🔐 Ejemplo 6: Serialización Personalizada con Encriptación**
```javascript
const crypto = require('crypto');

function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'secure-client',
        serialize: (obj) => encrypt(JSON.stringify(obj)),
        deserialize: (str) => JSON.parse(decrypt(str))
    })
});
```

---

## **📂 Estructura de Archivos Generados**

### **🗂️ Directorio principal:**
```
/app/.wwebjs_auth/
├── session-whatsapp-api-client/           # Carpeta del cliente específico
│   ├── Default/                           # Perfil de Chromium
│   │   ├── Local Storage/                 # Almacenamiento local
│   │   │   └── leveldb/
│   │   ├── Session Storage/               # Almacenamiento de sesión
│   │   ├── IndexedDB/                     # Base de datos del navegador
│   │   ├── Cookies                        # Cookies de WhatsApp Web
│   │   ├── Preferences                    # Preferencias del navegador
│   │   └── ...otros archivos de Chromium
│   ├── session.json                       # Datos principales de autenticación
│   ├── .wwebjs_cache/                     # Cache temporal
│   │   ├── images/                        # Imágenes en cache
│   │   └── ...otros archivos temporales
│   └── DevToolsActivePort                 # Puerto de desarrollo (debugging)
└── .gitignore                            # Archivo para ignorar en Git
```

### **📋 Contenido de `session.json`:**
```json
{
    "WABrowserId": "\"9.2.1--bGluYWJsZQ==\"",
    "WASecretBundle": "{\"key\":\"...\",\"encKey\":\"...\"}",
    "WAToken1": "\"token_value_1\"",
    "WAToken2": "\"token_value_2\"",
    "WANoiseInfo": "{\"staticPublicKey\":\"...\"}",
    "WASignalKeys": "[{\"keyId\":1,\"publicKey\":\"...\"}]",
    "WABinaryVersion": "[2,2408,14]",
    "WAPrimaryVersion": "[5,0]"
}
```

---

## **🚨 Comandos de Limpieza Manual**

### **🧹 Limpiar sesión específica:**
```bash
# Eliminar solo la sesión de un cliente específico
rm -rf /app/.wwebjs_auth/session-whatsapp-api-client

# Verificar qué sesiones existen
ls -la /app/.wwebjs_auth/
```

### **🗑️ Limpieza completa:**
```bash
# Eliminar todas las sesiones (CUIDADO!)
rm -rf /app/.wwebjs_auth

# Crear carpeta limpia con permisos correctos
mkdir -p /app/.wwebjs_auth
chmod 755 /app/.wwebjs_auth
```

### **📊 Verificar espacio utilizado:**
```bash
# Ver tamaño de las sesiones
du -sh /app/.wwebjs_auth/*

# Ver archivos más grandes
find /app/.wwebjs_auth -type f -exec ls -lh {} \; | sort -k5 -hr | head -10
```

---

## **⚠️ Mejores Prácticas**

### **🔒 Seguridad:**
- ✅ **Usar rutas absolutas** en Docker
- ✅ **Permisos correctos** en carpetas (755)
- ✅ **Backup periódico** de sesiones importantes
- ✅ **Encriptar datos sensibles** en producción
- ❌ **No commitear** carpetas de autenticación a Git

### **🚀 Rendimiento:**
- ✅ **Limpiar sesiones viejas** periódicamente
- ✅ **Monitorear espacio en disco** usado por sesiones
- ✅ **Usar clientId únicos** para cada instancia
- ❌ **No mantener** demasiadas sesiones simultáneas

### **🔧 Desarrollo:**
- ✅ **Logs informativos** sobre estado de sesiones
- ✅ **Manejo de errores** en operaciones de archivo
- ✅ **Timeout adecuado** para inicialización
- ✅ **Verificar dataExists()** antes de inicializar

### **📁 Organización:**
```javascript
// ✅ BUENA ESTRUCTURA
/app/
├── .wwebjs_auth/           # Sesiones de autenticación
│   ├── session-ventas/     # Cliente de ventas
│   ├── session-soporte/    # Cliente de soporte
│   └── session-admin/      # Cliente administrativo
├── logs/                   # Logs de aplicación
├── downloads/              # Archivos descargados
└── src/                    # Código fuente
```

---

## **🔄 Troubleshooting Común**

### **❌ Problema: QR se pide constantemente**
```javascript
// Solución: Verificar permisos y limpiar sesión corrupta
const authStrategy = new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api'
});

if (await authStrategy.dataExists()) {
    console.log('⚠️ Sesión existente encontrada, verificando...');
    try {
        const session = await authStrategy.getSession();
        if (!session || !session.WABrowserId) {
            console.log('🧹 Sesión corrupta, eliminando...');
            await authStrategy.deleteSession();
        }
    } catch (error) {
        console.log('🧹 Error leyendo sesión, eliminando...');
        await authStrategy.deleteSession();
    }
}
```

### **❌ Problema: Error de permisos**
```bash
# Solución: Corregir permisos de carpeta
sudo chown -R $(whoami):$(whoami) /app/.wwebjs_auth
chmod -R 755 /app/.wwebjs_auth
```

### **❌ Problema: Sesión no se guarda**
```javascript
// Solución: Verificar eventos y esperar a que se guarde
client.on('authenticated', () => {
    console.log('✅ Autenticado - sesión se está guardando...');
});

client.on('ready', async () => {
    console.log('✅ Cliente listo');
    
    // Verificar que la sesión se guardó
    const hasData = await client.authStrategy.dataExists();
    console.log('💾 Sesión guardada:', hasData);
});
```

---

**💡 Esta guía cubre todos los aspectos de `LocalAuth()` para una implementación robusta y segura en whatsapp-web.js**# **🔐 Guía Completa de LocalAuth() - whatsapp-web.js**

## **📋 Descripción General**

`LocalAuth` es una estrategia de autenticación incluida en **whatsapp-web.js** que permite:
- 💾 **Persistir sesiones** localmente en el sistema de archivos
- 🔄 **Reutilizar autenticación** sin escanear QR repetidamente  
- 👥 **Múltiples clientes** con sesiones independientes
- 🗂️ **Gestión automática** de datos de autenticación

---

## **🔧 Constructor: `new LocalAuth(options)`**

### **📖 Sintaxis básica:**
```javascript
const { LocalAuth } = require('whatsapp-web.js');

const authStrategy = new LocalAuth({
    dataPath: string,           // Ruta de almacenamiento
    clientId: string,           // ID único del cliente
    store: Object,              // Almacén personalizado (opcional)
    serialize: Function,        // Serialización personalizada (opcional)
    deserialize: Function       // Deserialización personalizada (opcional)
});
```

---

## **⚙️ Opciones del Constructor**

### **1. 📁 `dataPath` (string)**
```javascript
new LocalAuth({
    dataPath: '/app/.wwebjs_auth'  // Ruta absoluta recomendada
})
```
- **Por defecto**: `'./.wwebjs_auth'`
- **Descripción**: Carpeta donde se guardan todos los datos de autenticación
- **Recomendación**: Usar rutas absolutas en Docker
- **Estructura creada**:
  ```
  dataPath/
  ├── session-{clientId}/
  │   ├── Default/
  │   │   ├── Local Storage/
  │   │   ├── Session Storage/
  │   │   ├── IndexedDB/
  │   │   └── Cookies
  │   ├── session.json
  │   ├── .wwebjs_cache/
  │   └── ...archivos de Chromium
  ```

### **2. 🆔 `clientId` (string)**
```javascript
new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api-client'  // ID único
})
```
- **Por defecto**: `'session'`
- **Descripción**: Identificador único para diferenciar clientes
- **Uso**: Esencial para múltiples instancias de WhatsApp
- **Ejemplos**:
  ```javascript
  clientId: 'bot-ventas'      // Bot de ventas
  clientId: 'bot-soporte'     // Bot de soporte  
  clientId: 'admin-principal' // Cliente administrativo
  ```

### **3. 🗄️ `store` (Object)**
```javascript
new LocalAuth({
    store: customStoreObject  // Almacén personalizado
})
```
- **Por defecto**: Almacén de archivos local
- **Descripción**: Permite usar almacenes alternativos
- **Casos de uso**:
  - Base de datos (MongoDB, PostgreSQL)
  - Redis para sesiones en memoria
  - Almacenamiento en la nube (AWS S3, Google Cloud)

### **4. 🔄 `serialize` (Function)**
```javascript
new LocalAuth({
    serialize: (obj) => {
        console.log('Serializando:', obj);
        return JSON.stringify(obj, null, 2);
    }
})
```
- **Descripción**: Función personalizada para serializar datos antes de guardar
- **Parámetros**: `obj` (Object) - Objeto a serializar
- **Retorna**: `string` - Datos serializados

### **5. 🔄 `deserialize` (Function)**
```javascript
new LocalAuth({
    deserialize: (str) => {
        console.log('Deserializando:', str);
        return JSON.parse(str);
    }
})
```
- **Descripción**: Función personalizada para deserializar datos al cargar
- **Parámetros**: `str` (string) - Datos serializados
- **Retorna**: `Object` - Objeto deserializado

---

## **🛠️ Métodos de Instancia**

### **📱 Métodos de Autenticación**

#### **1. `logout()`**
```javascript
await authStrategy.logout();
```
- **Descripción**: Cierra sesión y marca los datos como inválidos
- **Retorna**: `Promise<void>`
- **Uso**: Cuando el usuario hace logout manualmente

#### **2. `destroy()`**
```javascript
await authStrategy.destroy();
```
- **Descripción**: Destruye completamente la estrategia de autenticación
- **Retorna**: `Promise<void>`
- **Uso**: Al cerrar la aplicación o reiniciar cliente

### **📊 Métodos de Sesión**

#### **3. `getSession()`**
```javascript
const sessionData = await authStrategy.getSession();
console.log('Datos de sesión:', sessionData);
```
- **Descripción**: Obtiene los datos de la sesión actual
- **Retorna**: `Promise<Object|null>`
- **Estructura del objeto**:
  ```javascript
  {
    WABrowserId: "string",
    WASecretBundle: "string", 
    WAToken1: "string",
    WAToken2: "string",
    // ...otros datos de WhatsApp Web
  }
  ```

#### **4. `setSession(sessionData)`**
```javascript
await authStrategy.setSession({
    WABrowserId: "...",
    WASecretBundle: "...",
    // ...otros datos
});
```
- **Descripción**: Establece datos de sesión manualmente
- **Parámetros**: `sessionData` (Object) - Datos de sesión válidos
- **Retorna**: `Promise<void>`
- **Uso**: Migrar sesiones entre instancias

### **🔍 Métodos de Verificación**

#### **5. `dataExists()`**
```javascript
const hasData = await authStrategy.dataExists();
if (hasData) {
    console.log('✅ Sesión guardada encontrada');
} else {
    console.log('❌ No hay sesión guardada, se requiere QR');
}
```
- **Descripción**: Verifica si existen datos de autenticación guardados
- **Retorna**: `Promise<boolean>`
- **Uso**: Decidir si mostrar QR o cargar sesión existente

### **🗑️ Métodos de Limpieza**

#### **6. `deleteSession()`**
```javascript
await authStrategy.deleteSession();
console.log('🧹 Sesión eliminada del disco');
```
- **Descripción**: Elimina todos los datos de la sesión del disco
- **Retorna**: `Promise<void>`
- **Uso**: Limpiar sesiones corruptas o forzar nueva autenticación

### **🔄 Métodos de Ciclo de Vida**

#### **7. `beforeBrowserInitialized()`**
```javascript
await authStrategy.beforeBrowserInitialized();
```
- **Descripción**: Se ejecuta antes de inicializar el navegador Puppeteer
- **Retorna**: `Promise<void>`
- **Uso**: Preparar datos antes del inicio

#### **8. `afterBrowserInitialized()`**
```javascript
await authStrategy.afterBrowserInitialized();
```
- **Descripción**: Se ejecuta después de inicializar el navegador
- **Retorna**: `Promise<void>`
- **Uso**: Configuraciones post-inicialización

---

## **💡 Ejemplos Prácticos**

### **🚀 Ejemplo 1: Configuración Básica**
```javascript
const { Client, LocalAuth } = require('whatsapp-web.js');

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'my-whatsapp-bot'
    })
});

client.on('qr', (qr) => {
    console.log('Escanea este QR:', qr);
});

client.on('ready', () => {
    console.log('✅ Cliente autenticado y listo');
});

await client.initialize();
```

### **👥 Ejemplo 2: Múltiples Clientes**
```javascript
// Cliente para ventas
const ventasClient = new Client({
    authStrategy: new LocalAuth({
        clientId: 'ventas-bot',
        dataPath: '/app/auth/ventas'
    })
});

// Cliente para soporte
const soporteClient = new Client({
    authStrategy: new LocalAuth({
        clientId: 'soporte-bot', 
        dataPath: '/app/auth/soporte'
    })
});

// Inicializar ambos
await Promise.all([
    ventasClient.initialize(),
    soporteClient.initialize()
]);
```

### **🔍 Ejemplo 3: Verificar Estado de Sesión**
```javascript
const authStrategy = new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api'
});

// Verificar si existe sesión
const hasSession = await authStrategy.dataExists();

if (hasSession) {
    console.log('✅ Sesión existente encontrada');
    
    // Obtener datos de sesión
    const sessionData = await authStrategy.getSession();
    console.log('📊 Datos de sesión:', Object.keys(sessionData));
    
} else {
    console.log('❌ No hay sesión, se requerirá QR');
}
```

### **🧹 Ejemplo 4: Limpieza de Sesión**
```javascript
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'whatsapp-api'
    })
});

// Limpiar en caso de logout
client.on('disconnected', async (reason) => {
    console.log(`Desconectado: ${reason}`);
    
    if (reason === 'LOGOUT') {
        console.log('🧹 Usuario hizo logout, limpiando sesión...');
        
        // Limpiar datos de autenticación
        await client.authStrategy.logout();
        await client.authStrategy.deleteSession();
        
        console.log('✅ Sesión limpiada correctamente');
        
        // Reiniciar si es necesario
        setTimeout(() => {
            client.initialize();
        }, 5000);
    }
});
```

### **💾 Ejemplo 5: Almacén Personalizado con MongoDB**
```javascript
class MongoStore {
    constructor(mongoConnection) {
        this.db = mongoConnection;
    }
    
    async save(clientId, data) {
        await this.db.collection('whatsapp_sessions').updateOne(
            { clientId },
            { $set: { data, updatedAt: new Date() } },
            { upsert: true }
        );
    }
    
    async load(clientId) {
        const doc = await this.db.collection('whatsapp_sessions').findOne({ clientId });
        return doc ? doc.data : null;
    }
    
    async delete(clientId) {
        await this.db.collection('whatsapp_sessions').deleteOne({ clientId });
    }
}

// Usar almacén personalizado
const mongoStore = new MongoStore(mongoConnection);

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'whatsapp-api',
        store: mongoStore
    })
});
```

### **🔐 Ejemplo 6: Serialización Personalizada con Encriptación**
```javascript
const crypto = require('crypto');

function encrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, key);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    const algorithm = 'aes-256-cbc';
    const key = process.env.ENCRYPTION_KEY;
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, key);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
}

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/.wwebjs_auth',
        clientId: 'secure-client',
        serialize: (obj) => encrypt(JSON.stringify(obj)),
        deserialize: (str) => JSON.parse(decrypt(str))
    })
});
```

---

## **📂 Estructura de Archivos Generados**

### **🗂️ Directorio principal:**
```
/app/.wwebjs_auth/
├── session-whatsapp-api-client/           # Carpeta del cliente específico
│   ├── Default/                           # Perfil de Chromium
│   │   ├── Local Storage/                 # Almacenamiento local
│   │   │   └── leveldb/
│   │   ├── Session Storage/               # Almacenamiento de sesión
│   │   ├── IndexedDB/                     # Base de datos del navegador
│   │   ├── Cookies                        # Cookies de WhatsApp Web
│   │   ├── Preferences                    # Preferencias del navegador
│   │   └── ...otros archivos de Chromium
│   ├── session.json                       # Datos principales de autenticación
│   ├── .wwebjs_cache/                     # Cache temporal
│   │   ├── images/                        # Imágenes en cache
│   │   └── ...otros archivos temporales
│   └── DevToolsActivePort                 # Puerto de desarrollo (debugging)
└── .gitignore                            # Archivo para ignorar en Git
```

### **📋 Contenido de `session.json`:**
```json
{
    "WABrowserId": "\"9.2.1--bGluYWJsZQ==\"",
    "WASecretBundle": "{\"key\":\"...\",\"encKey\":\"...\"}",
    "WAToken1": "\"token_value_1\"",
    "WAToken2": "\"token_value_2\"",
    "WANoiseInfo": "{\"staticPublicKey\":\"...\"}",
    "WASignalKeys": "[{\"keyId\":1,\"publicKey\":\"...\"}]",
    "WABinaryVersion": "[2,2408,14]",
    "WAPrimaryVersion": "[5,0]"
}
```

---

## **🚨 Comandos de Limpieza Manual**

### **🧹 Limpiar sesión específica:**
```bash
# Eliminar solo la sesión de un cliente específico
rm -rf /app/.wwebjs_auth/session-whatsapp-api-client

# Verificar qué sesiones existen
ls -la /app/.wwebjs_auth/
```

### **🗑️ Limpieza completa:**
```bash
# Eliminar todas las sesiones (CUIDADO!)
rm -rf /app/.wwebjs_auth

# Crear carpeta limpia con permisos correctos
mkdir -p /app/.wwebjs_auth
chmod 755 /app/.wwebjs_auth
```

### **📊 Verificar espacio utilizado:**
```bash
# Ver tamaño de las sesiones
du -sh /app/.wwebjs_auth/*

# Ver archivos más grandes
find /app/.wwebjs_auth -type f -exec ls -lh {} \; | sort -k5 -hr | head -10
```

---

## **⚠️ Mejores Prácticas**

### **🔒 Seguridad:**
- ✅ **Usar rutas absolutas** en Docker
- ✅ **Permisos correctos** en carpetas (755)
- ✅ **Backup periódico** de sesiones importantes
- ✅ **Encriptar datos sensibles** en producción
- ❌ **No commitear** carpetas de autenticación a Git

### **🚀 Rendimiento:**
- ✅ **Limpiar sesiones viejas** periódicamente
- ✅ **Monitorear espacio en disco** usado por sesiones
- ✅ **Usar clientId únicos** para cada instancia
- ❌ **No mantener** demasiadas sesiones simultáneas

### **🔧 Desarrollo:**
- ✅ **Logs informativos** sobre estado de sesiones
- ✅ **Manejo de errores** en operaciones de archivo
- ✅ **Timeout adecuado** para inicialización
- ✅ **Verificar dataExists()** antes de inicializar

### **📁 Organización:**
```javascript
// ✅ BUENA ESTRUCTURA
/app/
├── .wwebjs_auth/           # Sesiones de autenticación
│   ├── session-ventas/     # Cliente de ventas
│   ├── session-soporte/    # Cliente de soporte
│   └── session-admin/      # Cliente administrativo
├── logs/                   # Logs de aplicación
├── downloads/              # Archivos descargados
└── src/                    # Código fuente
```

---

## **🔄 Troubleshooting Común**

### **❌ Problema: QR se pide constantemente**
```javascript
// Solución: Verificar permisos y limpiar sesión corrupta
const authStrategy = new LocalAuth({
    dataPath: '/app/.wwebjs_auth',
    clientId: 'whatsapp-api'
});

if (await authStrategy.dataExists()) {
    console.log('⚠️ Sesión existente encontrada, verificando...');
    try {
        const session = await authStrategy.getSession();
        if (!session || !session.WABrowserId) {
            console.log('🧹 Sesión corrupta, eliminando...');
            await authStrategy.deleteSession();
        }
    } catch (error) {
        console.log('🧹 Error leyendo sesión, eliminando...');
        await authStrategy.deleteSession();
    }
}
```

### **❌ Problema: Error de permisos**
```bash
# Solución: Corregir permisos de carpeta
sudo chown -R $(whoami):$(whoami) /app/.wwebjs_auth
chmod -R 755 /app/.wwebjs_auth
```

### **❌ Problema: Sesión no se guarda**
```javascript
// Solución: Verificar eventos y esperar a que se guarde
client.on('authenticated', () => {
    console.log('✅ Autenticado - sesión se está guardando...');
});

client.on('ready', async () => {
    console.log('✅ Cliente listo');
    
    // Verificar que la sesión se guardó
    const hasData = await client.authStrategy.dataExists();
    console.log('💾 Sesión guardada:', hasData);
});
```

---

**💡 Esta guía cubre todos los aspectos de `LocalAuth()` para una implementación robusta y segura en whatsapp-web.js**