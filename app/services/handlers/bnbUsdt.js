const axios = require('axios');
const cache = require('../../helpers/cacheHelper');
const webhook = require('../webhook');
const CurrencyHelper = require('../../helpers/currencyHelper');
const MultiChainService = require('../multiChainService');

// Configuración de confirmaciones máximas para BEP20
const MAX_CONFIRMATIONS = process.env.BEP20_MAX_CONFIRMATIONS || 12;

async function monitor(wallet) {
    try {
        const chainService = new MultiChainService(
            'bscscan',
            process.env.MULTICHAIN_API_KEYS.split(','), // Claves desde el .env
            parseInt(process.env.BSCSCAN_MAX_REQUESTS, 10), // Límite de solicitudes
            parseInt(process.env.BSCSCAN_RESET_INTERVAL, 10) // Intervalo de reinicio
        );

        const transactions = await chainService.getTransactions(MultiChainService.BNB_SMART_CHAIN_MAINNET, wallet);

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.confirmations;
            const lastTxID = await cache.get(`wallet:${wallet}:last_tx`);

            const isIncoming = tx.to.toLowerCase() === wallet.toLowerCase();
            if (!isIncoming) continue; // Ignorar transacciones salientes

            const amount = parseFloat(tx.value) / 1e6; // Convertir de USDT (con 6 decimales)

            // Convertir cantidad a USD
            const amountUSD = await CurrencyHelper.convertToUSD('USDT', amount);

            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: txID !== lastTxID ? 'new_transaction' : 'update_transaction',
                data: {
                    txID: txID,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'USDT',
                    confirmations: confirmations,
                    confirmed: confirmations >= MAX_CONFIRMATIONS,
                    address: isIncoming ? tx.from : tx.to,
                    fee: parseFloat(tx.gasUsed * tx.gasPrice) / 1e18, // Convertir de Wei a BNB
                    network: 'BNB',
                    sowAt: new Date(tx.timeStamp * 1000).toISOString(),
                    type: 'CRD'
                },
            };

            // Cambiar el evento a "confirmed_transaction" si alcanza las confirmaciones máximas
            if (confirmations >= MAX_CONFIRMATIONS) {
                webhookData.event = 'confirmed_transaction';
            }

            // Enviar webhook si las confirmaciones están dentro del rango permitido
            if (confirmations <= MAX_CONFIRMATIONS) {
                await webhook.send(webhookData);

                // Actualizar el último txID para evitar duplicados
                if (tx.txID !== lastTxID) {
                    await cache.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet BEP20 ${wallet}:`, error.message);
    }
}

module.exports = { monitor };