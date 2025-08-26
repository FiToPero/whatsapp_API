const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/test', (req, res) => {
    res.json({
        success: true,
        message: 'API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

app.get('/status', (req, res) => {
    res.json({
        mongodb: 'connecting...',
        whatsapp: 'initializing...',
        status: 'starting'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`API de prueba corriendo en http://localhost:${PORT}`);
});

module.exports = app;
