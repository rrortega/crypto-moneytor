const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const walletSubscribe = require('./routes/walletSubscribe');
const walletUnsubscribe = require('./routes/walletUnsubscribe');
const walletSubscriptions = require('./routes/walletSubscriptions');
const { monitorWallets } = require('./services/monitor');


require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Leer el archivo swagger.json desde la carpeta config
const swaggerFilePath = path.join(__dirname, './config/swagger.json');
const swaggerDocument = JSON.parse(fs.readFileSync(swaggerFilePath, 'utf-8'));

// Usar Swagger como middleware
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

 


// Rutas
app.use('/api', walletSubscribe);
app.use('/api', walletUnsubscribe);
app.use('/api', walletSubscriptions);

// Servidor
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Swagger UI disponible en http://localhost:${PORT}/api-docs`);
    monitorWallets(); // Iniciar monitoreo
});
