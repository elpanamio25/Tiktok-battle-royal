const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const net = require('net');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.io con CORS permitido
const io = new Server(server, { 
    cors: { origin: "*" } 
});

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static("public"));

io.on("connection", (socket) => {
    console.log("Nuevo cliente conectado al servidor local");
    
    let tiktokConnection = null;

    socket.on("setUniqueId", async (uniqueId, options) => {
        console.log(`Intentando conectar a TikTok LIVE: ${uniqueId}`);

        // Desconectar conexión previa si existe para este socket
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch (e) {}
        }

        // Crear nueva conexión con TikTok
        tiktokConnection = new WebcastPushConnection(uniqueId, options);

        try {
            await tiktokConnection.connect();
            console.log(`Conectado exitosamente a la LIVE de: ${uniqueId}`);

            // IMPORTANTE: Nombre de evento unificado con connection.js
            socket.emit("tiktokConnected", { uniqueId });

        } catch (err) {
            console.error("Error al conectar con TikTok:", err);
            // Notificar al frontend del fallo
            socket.emit("tiktokDisconnected", err.toString());
            return;
        }

        // --- REENVÍO DE EVENTOS ---
        // Usamos io.emit para que todos los navegadores abiertos vean lo mismo
        
        tiktokConnection.on("chat", (data) => {
            io.emit("chat", data);
        });

        tiktokConnection.on("gift", (data) => {
            io.emit("gift", data);
        });

        tiktokConnection.on("like", (data) => {
            io.emit("like", data);
        });

        tiktokConnection.on("member", (data) => {
            io.emit("member", data);
        });

        tiktokConnection.on("follow", (data) => {
            io.emit("follow", data);
        });

        tiktokConnection.on("share", (data) => {
            io.emit("share", data);
        });

        tiktokConnection.on("roomUser", (data) => {
            io.emit("roomUser", data);
        });

        tiktokConnection.on("streamEnd", () => {
            console.log("El stream ha finalizado");
            io.emit("streamEnd");
        });
    });

    socket.on("disconnect", () => {
        console.log("Cliente desconectado");
        if (tiktokConnection) {
            tiktokConnection.disconnect();
        }
    });
});

// 🚀 FUNCIÓN PARA BUSCAR PUERTO AUTOMÁTICAMENTE
function findAvailablePort(startPort, maxAttempts = 100) {
    return new Promise((resolve, reject) => {
        function tryPort(port) {
            const testServer = net.createServer();
            
            testServer.once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    console.log(`❌ Puerto ${port} está OCUPADO, probando ${port + 1}...`);
                    if (port - startPort < maxAttempts) {
                        tryPort(port + 1);
                    } else {
                        reject(new Error(`No se encontró puerto libre después de ${maxAttempts} intentos`));
                    }
                } else {
                    reject(err);
                }
            });
            
            testServer.once('listening', () => {
                testServer.close();
                console.log(`✅ Puerto ${port} está LIBRE`);
                resolve(port);
            });
            
            testServer.listen(port);
        }
        
        tryPort(startPort);
    });
}

// 🎯 INICIAR SERVIDOR CON BÚSQUEDA AUTOMÁTICA DE PUERTO
async function startServer() {
    try {
        // Puerto inicial (puedes cambiarlo si quieres)
        const startPort = 3000;
        
        console.log('🔍 Buscando puerto disponible...');
        const port = await findAvailablePort(startPort);
        
        server.listen(port, () => {
            console.log('\n' + '='.repeat(50));
            console.log('        🎮 SERVIDOR INICIADO CON ÉXITO');
            console.log('='.repeat(50));
            console.log(`   📌 Puerto:      ${port}`);
            console.log(`   🌐 URL Local:   http://localhost:${port}`);
            console.log(`   🎥 OBS:         http://localhost:${port}/obs.html`);
            console.log('='.repeat(50) + '\n');
            
            // Guardar el puerto en una variable global por si alguien lo necesita
            process.env.ACTUAL_PORT = port;
        });
        
    } catch (error) {
        console.error('\n❌ Error fatal:', error.message);
        console.log('\n💡 Sugerencias:');
        console.log('   • Cierra algunos programas que usen puertos');
        console.log('   • Reinicia tu computadora');
        console.log('   • Usa un rango de puertos diferente\n');
        process.exit(1);
    }
}

const port = await findAvailablePort(3000);
server.listen(port, ...);
// Iniciar el servidor
startServer();
