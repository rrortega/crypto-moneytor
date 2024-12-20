const express = require('express');
const cache = require('../helpers/cacheHelper');
const supportedHandlers = require('../config/handlers');
const router = express.Router();
/**
 * Suscribir una wallet
 */
router.post('/subscribe', async (req, res) => {
    const { network, coin, wallet, callbackUrl } = req?.body || { network: false, coin: false, wallet: false, callbackUrl: false };

    if (!network || !coin || !wallet) {
        return res.status(400).json({ error: 'Network, coin, and wallet are required' });
    }

    const walletKey = `${network}:${coin}:${wallet}`;

    if (!supportedHandlers.includes(`${network}:${coin}`)) {
        return res.status(400).json({ error: 'Unsupported network or coin' });
    }

    try {
        const added = await cache.sadd('active_wallets', walletKey);

        if (callbackUrl) {
            await cache.set(`wallet:${wallet}:callback`, callbackUrl);
        }

        if (added === 1) {
            res.status(201).json({ message: `Wallet ${walletKey} added to monitoring.`, callbackUrl });
        } else {
            res.status(200).json({ message: `Wallet ${walletKey} is already being monitored.`, callbackUrl });
        }
    } catch (error) {
        console.error(`Error adding wallet ${walletKey} to monitoring:`, error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
