const express = require('express');
const cache = require('../helpers/cacheHelper');
const supportedHandlers = require('../config/handlers');
const router = express.Router();
 /**
  * Elimina una suscripción de una wallet
  */
router.delete('/:wallet', async (req, res) => {
    const { wallet } = req.params;

    if (!wallet) {
        return res.status(400).json({ error: 'Wallet address is required.' });
    }

    try {
        let walletRemoved = false;

        for (const handler of supportedHandlers) {
            const [network, coin] = handler.split(':');
            const walletKey = `${network}:${coin}:${wallet}`;
            const removed = await cache.srem('active_wallets', walletKey);

            if (removed === 1) {
                walletRemoved = true;
                console.log(`Wallet ${walletKey} removed from monitoring.`);
            }

            await cache.del(`wallet:${wallet}:callback`);
        }

        if (walletRemoved) {
            return res.status(200).json({ message: `Wallet ${wallet} removed from all monitoring.` });
        } else {
            return res.status(404).json({ error: `Wallet ${wallet} is not being monitored.` });
        }
    } catch (error) {
        console.error(`Error removing wallet ${wallet} from monitoring:`, error);
        return res.status(500).json({ error: 'Internal server error.' });
    }
});

module.exports = router;
