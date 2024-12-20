const express = require('express');
const cache = require('../helpers/cache');
const router = express.Router();

/** 
 * Lista las suscripciones activas
 */
router.get('/subscribtions', async (req, res) => {
    try {
        const activeWallets = await cache.smembers('active_wallets');

        const walletsWithCallbacks = await Promise.all(activeWallets.map(async (walletKey) => {
            const [network, coin, wallet] = walletKey.split(':');
            const callbackUrl = await cache.get(`wallet:${wallet}:callback`);
            return { network, coin, wallet, callbackUrl: callbackUrl || process.env.WEBHOOK_URL };
        }));

        res.status(200).json({ wallets: walletsWithCallbacks });
    } catch (error) {
        console.error('Error fetching active wallets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
