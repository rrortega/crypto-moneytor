require('dotenv').config();
const cache = require('../helpers/cacheHelper');
const usdtTRC0Handler = require('./handlers/tronUsdt');
const usdtERC0Handler = require('./handlers/ethereumUsdt');
const usdtPolygonHandler = require('./handlers/polygonUsdt');
const btcHandler = require('./handlers/btc');
const ethHandler = require('./handlers/ethereumEth');
const tronHandler = require('./handlers/tronTrx');
const rippleHandler = require('./handlers/rippleXrp');
const bnbHandler = require('./handlers/bnbUsdt');
const arbitrumHandler = require('./handlers/arbitrumUsdt');

const handlers = {
    'trc20:usdt': usdtTRC0Handler,
    'erc20:usdt': usdtERC0Handler,
    'polygon:usdt': usdtPolygonHandler,
    'bitcoin:btc': btcHandler,
    'erc20:eth': ethHandler,
    'trc20:trx': tronHandler,
    'ripple:xrp': rippleHandler,
    'bep20:usdt': bnbHandler,
    'arbitrum:usdt': arbitrumHandler,
};

const POLLING_INTERVAL_ACTIVE = process.env.POLLING_INTERVAL_ACTIVE || 30000;
const POLLING_INTERVAL_IDLE = process.env.POLLING_INTERVAL_IDLE || 3600000;

/**
 * Monitorea las wallets activas según la red y moneda
 */
async function monitorWallets() {
    try {
        const activeWallets = await cache.smembers('active_wallets');
        const btcWallets = []; // Almacena wallets BTC
        const otherWallets = []; // Almacena wallets de otras redes

        for (const walletKey of activeWallets) {
            const [network, coin, wallet] = walletKey.split(':');
            const handlerKey = `${network}:${coin}`;

            if (handlerKey === 'bitcoin:btc') {
                btcWallets.push(wallet);
            } else if (handlers[handlerKey]) {
                otherWallets.push({ handlerKey, wallet });
            } else {
                console.warn(`No hay manejador para ${handlerKey}`);
            }
        }

        // Monitorear wallets BTC como grupo
        if (btcWallets.length > 0) {
            console.log(btcWallets.length > 1 ? `Monitoreando múltiples wallets BTC: ${btcWallets.join(', ')}` : `Monitoreando wallet BTC: ${btcWallets.join('')}`);
            await handlers['bitcoin:btc'].monitor(btcWallets);
        }

        // Monitorear el resto de las wallets
        for (const { handlerKey, wallet } of otherWallets) {
            console.log(`Monitoreando ${handlerKey.split(':').join(' ')} para la wallet ${wallet}`);
            await handlers[handlerKey].monitor(wallet);
        }

        // Ajustar el intervalo según la cantidad de wallets activas
        const interval = activeWallets.length > 0
            ? POLLING_INTERVAL_ACTIVE
            : POLLING_INTERVAL_IDLE;

        setTimeout(monitorWallets, interval);
    } catch (error) {
        console.error('Error monitoreando wallets:', error.message);
        setTimeout(monitorWallets, POLLING_INTERVAL_IDLE);
    }
}

module.exports = { monitorWallets };
