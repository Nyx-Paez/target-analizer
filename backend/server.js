const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const NodeCache = require('node-cache');
const { z } = require('zod');
const { runGhostBrowser } = require('./services/analyzer');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Subsistema de Caché (24 horas)
const cache = new NodeCache({ stdTTL: 86400 });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/public')));

// Limitador de Peticiones
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Demasiadas peticiones desde esta IP."
});
app.use('/api', limiter);

// Validación Zod
const urlSchema = z.object({ url: z.string().url() });

// Controlador de Colas en Memoria
const queue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || queue.length === 0) return;
    isProcessing = true;
    
    const { url, socketId } = queue.shift();
    const socket = io.sockets.sockets.get(socketId);
    
    try {
        if (socket) socket.emit('log', '[INFO] Procesando en Ghost Browser...');
        const report = await runGhostBrowser(url, socket);
        cache.set(url, report);
        if (socket) socket.emit('analysis_complete', report);
    } catch (error) {
        if (socket) socket.emit('analysis_error', error.message);
    } finally {
        isProcessing = false;
        processQueue(); // Procesar el siguiente
    }
}

io.on('connection', (socket) => {
    socket.on('start_analysis', (data) => {
        try {
            const { url } = urlSchema.parse(data);
            
            // Verificar Caché
            const cachedData = cache.get(url);
            if (cachedData) {
                socket.emit('log', '[INFO] Retornando datos desde Caché (Ahorro de recursos)...');
                socket.emit('analysis_complete', cachedData);
                return;
            }

            socket.emit('log', `[INFO] URL Validada. Añadiendo a la cola de trabajo (Posición: ${queue.length + 1})...`);
            queue.push({ url, socketId: socket.id });
            processQueue();

        } catch (error) {
            socket.emit('analysis_error', 'VULNERABILIDAD: URL Inválida detectada por Zod.');
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`[+] Servidor v2.0 en puerto ${PORT}`));
