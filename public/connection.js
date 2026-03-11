/**
 * Wrapper for client-side TikTok connection over Socket.IO
 * With reconnect functionality.
 */
class TikTokIOConnection {
    constructor(backendUrl) {
        this.socket = io(backendUrl);
        this.uniqueId = null;
        this.options = null;

        this.socket.on('connect', () => {
            console.info("✅ Socket conectado al servidor!");

            // Reconnect to streamer if uniqueId already set
            if (this.uniqueId) {
                console.info("🔄 Reconectando a TikTok...");
                this.socket.emit('setUniqueId', this.uniqueId, this.options);
            }
        });

        this.socket.on('disconnect', () => {
            console.warn("⚠️ Socket desconectado del servidor!");
        });

        this.socket.on('streamEnd', () => {
            console.warn("📢 LIVE ha terminado!");
            this.uniqueId = null;
        });

        this.socket.on('tiktokDisconnected', (errMsg) => {
            console.warn("❌ TikTok desconectado:", errMsg);
            if (errMsg && errMsg.includes('LIVE has ended')) {
                this.uniqueId = null;
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error("🔥 Error de conexión:", error);
        });
    }

    connect(uniqueId, options) {
        this.uniqueId = uniqueId;
        this.options = options || {};

        // Limpiar listeners antiguos
        this.socket.off('tiktokConnected');
        this.socket.off('tiktokDisconnected');

        // Re-agregar listener permanente
        this.socket.on('tiktokDisconnected', (errMsg) => {
            console.warn("❌ TikTok desconectado:", errMsg);
            if (errMsg && errMsg.includes('LIVE has ended')) {
                this.uniqueId = null;
            }
        });

        // Enviar solicitud de conexión
        this.socket.emit('setUniqueId', this.uniqueId, this.options);

        return new Promise((resolve, reject) => {
            this.socket.once('tiktokConnected', resolve);
            this.socket.once('tiktokDisconnected', reject);

            setTimeout(() => {
                reject('⏰ Tiempo de conexión agotado');
            }, 15000);
        });
    }

    disconnect() {
        this.uniqueId = null;
        this.socket.emit('disconnect_tiktok');
    }

    on(eventName, eventHandler) {
        this.socket.on(eventName, eventHandler);
    }
}