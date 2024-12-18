const express = require('express');
const redis = require('../config/redis');
const router = express.Router();

router.post('/wallets', async (req, res) => {
    const { network, coin, wallet } = req.body;

    if (!network || !coin || !wallet) {
        return res.status(400).send('Network, coin, and wallet are required');
    }

    const supportedHandlers = ['trc20:usdt','erc20:usdt','polygon:usdt', 'bitcoin:btc','erc20:eth','trc20:trx','ripple:xrp'];
    const walletKey = `${network}:${coin}:${wallet}`;

    if (!supportedHandlers.includes(`${network}:${coin}`)) {
        return res.status(400).send('Unsupported network or coin');
    }

    await redis.sadd('active_wallets', walletKey);
    res.send(`Wallet ${walletKey} added to monitoring.`);
});

module.exports = router;
