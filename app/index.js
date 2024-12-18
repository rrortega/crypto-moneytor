require('dotenv').config();
const express = require('express');
const { monitorWallets } = require('./services/monitor');
const walletRoutes = require('./routes/wallet');

const app = express();
app.use(express.json());

app.use('/api', walletRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    monitorWallets(); // Iniciar monitoreo
});
