const fs = require('fs').promises;
const path = require('path');

class MediaProcessor {
    /**
     * Procesa y guarda un archivo multimedia de un mensaje de WhatsApp
     * @param {Object} msg - Mensaje de WhatsApp que contiene multimedia
     * @returns {Object} Información del archivo procesado
     */
    static async processMessage(msg) {
        try {
            console.log(`📸 Procesando multimedia del mensaje ${msg.id._serialized}...`);
            
            // Descargar el archivo multimedia
            const media = await msg.downloadMedia();

            if (media && media.data) {
                // Guardar archivo en el servidor
                const mediaDir = '/app/downloads/media';
                await fs.mkdir(mediaDir, { recursive: true });
                
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const extension = media.mimetype ? media.mimetype.split('/')[1].split(';')[0] : 'bin';
                const filename = `${timestamp}_${msg.id._serialized}.${extension}`;
                const filePath = path.join(mediaDir, filename);
                const relativePath = `media/${filename}`;
                const downloadUrl = `/api/media/download/${encodeURIComponent(msg.id._serialized)}`;

                await fs.writeFile(filePath, media.data, 'base64');
                
                console.log(`✅ Multimedia guardada: ${filename}`);

                return {
                    filename: filename,
                    originalFilename: media.filename || null,
                    mimetype: media.mimetype,
                    size: Buffer.from(media.data, 'base64').length,
                    extension: extension,
                    relativePath: relativePath,
                    fullPath: filePath,
                    downloadUrl: downloadUrl,
                    downloadedAt: new Date(),
                    downloadSuccess: true
                };
            } else {
                console.log(`⚠️ No se pudo descargar media del mensaje ${msg.id._serialized}`);
                return {
                    filename: 'download_failed',
                    downloadSuccess: false,
                    error: 'Media download returned null or no data'
                };
            }
        } catch (mediaError) {
            console.log(`⚠️ Error procesando media del mensaje ${msg.id._serialized}:`, mediaError.message);
            return {
                filename: 'download_error',
                downloadSuccess: false,
                error: mediaError.message
            };
        }
    }

    /**
     * Genera un nombre de archivo seguro basado en timestamp y ID del mensaje
     * @param {Object} msg - Mensaje de WhatsApp
     * @param {string} extension - Extensión del archivo
     * @returns {string} Nombre de archivo seguro
     */
    static generateSafeFilename(msg, extension) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        return `${timestamp}_${msg.id._serialized}.${extension}`;
    }

    /**
     * Extrae la extensión del archivo desde el mimetype
     * @param {string} mimetype - Tipo MIME del archivo
     * @returns {string} Extensión del archivo
     */
    static extractExtension(mimetype) {
        if (!mimetype) return 'bin';
        return mimetype.split('/')[1].split(';')[0];
    }

    /**
     * Verifica si un mensaje tiene multimedia
     * @param {Object} msg - Mensaje de WhatsApp
     * @returns {boolean} True si tiene multimedia
     */
    static hasMedia(msg) {
        return msg && msg.hasMedia === true;
    }
}

module.exports = MediaProcessor;
