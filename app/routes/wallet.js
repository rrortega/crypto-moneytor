const express = require('express');
const redis = require('../config/redis');
const router = express.Router();

router.post('/wallets', async (req, res) => {
    const { network, coin, wallet } = req.body;

    if (!network || !coin || !wallet) {
        return res.status(400).send('Network, coin, and wallet are required');
    }

    const walletKey = `${network}:${coin}:${wallet}`;
    await redis.sadd('active_wallets', walletKey);

    res.send(`Wallet ${walletKey} added to monitoring.`);
});

module.exports = router;
