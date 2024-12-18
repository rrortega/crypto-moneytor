require('dotenv').config();
const redis = require('../config/redis');
const tronHandler = require('./handlers/tron-usdt');
const btcHandler = require('./handlers/btc');

const POLLING_INTERVAL_ACTIVE = process.env.POLLING_INTERVAL_ACTIVE || 30000;
const POLLING_INTERVAL_IDLE = process.env.POLLING_INTERVAL_IDLE || 3600000;

const handlers = {
    'tron:usdt': tronHandler,
    'bitcoin:btc': btcHandler,
};

async function monitorWallets() {
    const wallets = await redis.smembers('active_wallets');
    const interval = wallets.length > 0 ? POLLING_INTERVAL_ACTIVE : POLLING_INTERVAL_IDLE;

    console.log(`Monitoreando ${wallets.length} wallets. Intervalo: ${interval / 1000} segundos`);

    for (const walletKey of wallets) {
        const [network, coin, wallet] = walletKey.split(':');
        const handlerKey = `${network}:${coin}`;

        if (handlers[handlerKey]) {
            console.log(`Monitoreando ${network} ${coin} para la wallet ${wallet}`);
            await handlers[handlerKey].monitor(wallet);
        } else {
            console.warn(`No hay manejador para ${handlerKey}`);
        }
    }

    setTimeout(monitorWallets, interval);
}

module.exports = { monitorWallets };
