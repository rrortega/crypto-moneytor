require('dotenv').config();
const usdtTRC0Handler = require('./handlers/tron-usdt');
const usdtERC0Handler = require('./handlers/ethereum-usdt');
const usdtPolygonHandler = require('./handlers/polygon-usdt');
const btcHandler = require('./handlers/btc');
const ethHandler = require('./handlers/ethereum-eth'); 
const tronHandler = require('./handlers/tron-trx');
const rippleHandler = require('./handlers/ripple-xrp');


const handlers = {
    'tron:usdt': usdtTRC0Handler,
    'erc20:usdt': usdtERC0Handler,
    'polygon:usdt': usdtPolygonHandler,
    'bitcoin:btc': btcHandler,
    'erc20:eth': ethHandler,
    'trc20:trx' : tronHandler,
    'ripple:xrp': rippleHandler,
};

const POLLING_INTERVAL_ACTIVE = process.env.POLLING_INTERVAL_ACTIVE || 30000;
const POLLING_INTERVAL_IDLE = process.env.POLLING_INTERVAL_IDLE || 3600000; 
 
/**
 * Monitorea las wallets activas según la red y moneda
 */
async function monitorWallets() {
    const activeWallets = await redis.smembers('active_wallets');
    for (const walletKey of activeWallets) {
        const [network, coin, wallet] = walletKey.split(':');
        const handlerKey = `${network}:${coin}`;

        if (handlers[handlerKey]) {
            console.log(`Monitoreando ${network} ${coin} para la wallet ${wallet}`);
            await handlers[handlerKey].monitor(wallet);
        } else {
            console.warn(`No hay manejador para ${handlerKey}`);
        }
    }

    // Ajustar el intervalo según la cantidad de wallets activas
    const interval = activeWallets.length > 0
        ? process.env.POLLING_INTERVAL_ACTIVE || 30000
        : process.env.POLLING_INTERVAL_IDLE || 3600000;

    setTimeout(monitorWallets, interval);
}

module.exports = { monitorWallets };