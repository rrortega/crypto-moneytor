import express from 'express';
import cache from '../helpers/cacheHelper';
import supportedHandlers from '../config/handlers';
const router = express.Router();
/**
 * Suscribir una wallet
 */
router.post('/subscribe', async (req, res) => {
    const { network, coin, wallet, callbackUrl } = req.body;
    if (!network || !coin || !wallet) {
        return res.status(400).json({ error: 'Network, coin, and wallet are required' });
    }
    const walletKey = `${network}:${coin}:${wallet}`;
    if (!supportedHandlers.includes(`${network}:${coin}`)) {
        return res.status(400).json({ error: 'Unsupported network or coin' });
    }
    try {
        const added = (await cache.sadd('active_wallets', walletKey));
        const lastCachedCallbacks = JSON.parse((await cache.get(`wallet:${wallet}:callback`)) || '[]');
        console.log(lastCachedCallbacks);
        if (callbackUrl) {
            if (!lastCachedCallbacks.includes(callbackUrl)) {
                lastCachedCallbacks.push(callbackUrl);
                await cache.set(`wallet:${wallet}:callback`, JSON.stringify(lastCachedCallbacks));
            }
        }
        if (added === 1) {
            return res.status(201).json({
                message: `Wallet ${walletKey} added to monitoring.`,
                callbackUrls: lastCachedCallbacks
            });
        }
        else {
            return res.status(200).json({
                message: `Wallet ${walletKey} is already being monitored.`,
                callbackUrls: lastCachedCallbacks
            });
        }
    }
    catch (error) {
        console.error(`Error adding wallet ${walletKey} to monitoring:`, error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
