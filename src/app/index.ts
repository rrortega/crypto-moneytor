import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import walletSubscribe from './routes/walletSubscribe.js';  // Nota: añade .js
import walletUnsubscribe from './routes/walletUnsubscribe.js';  // Nota: añade .js
import walletSubscriptions from './routes/walletSubscriptions.js';  // Nota: añade .js
import monitorWallets from './services/monitor.js';  // Nota: añade .js

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer el archivo swagger.json desde la carpeta config
const swaggerFilePath = path.join(__dirname, './config/swagger.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf-8'));

// Usar Swagger como middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Verificación de rutas
console.log('Load walletSubscribe route:', !!walletSubscribe);
console.log('LoadwalletUnsubscribe route:', !!walletUnsubscribe);
console.log('Load walletSubscriptions route:', !!walletSubscriptions);

// Rutas con manejo de errores
app.use('/api', walletSubscribe || ((req, res, next) => {
    console.error('walletSubscribe route not loaded');
    next();
}));

app.use('/api', walletUnsubscribe || ((req, res, next) => {
    console.error('walletUnsubscribe route not loaded');
    next();
}));

app.use('/api', walletSubscriptions || ((req, res, next) => {
    console.error('walletSubscriptions route not loaded');
    next();
}));

// Manejador de 404
app.use((req, res) => {
    console.log(`Ruta no encontrada: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'Not Found' });
});

// Servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
    monitorWallets(); // Iniciar monitoreo
});