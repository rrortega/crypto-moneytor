require('dotenv').config();
const cache = require('../../helpers/cacheHelper');
const webhook = require('../webhook');
const CurrencyHelper = require('../../helpers/currencyHelper');
const TronHelper = require('../../helpers/tronHelper');


// Configuración de confirmaciones máximas para TRC20
const MAX_CONFIRMATIONS = process.env.TRON_MAX_CONFIRMATIONS || 30;

async function monitor(wallet) {
    try {
         const lastTxID = await cache.get(`wallet:${wallet}:last_tx`);
        const transactions = await TronHelper.getIncomingTransactions(wallet);

        for (const tx of transactions) {
            const amount = tx.amount;
            // Convertir cantidad a USD
            const amountUSD = await CurrencyHelper.convertToUSD('USDT', amount);
            const fee = 0;
            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: tx.txID !== lastTxID ? 'new_transaction' : 'update_transaction',
                data: {
                    txID: tx.id,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'USDT',
                    confirmed: tx.confirmations >= MAX_CONFIRMATIONS && tx.confirmed,
                    confirmations: tx.confirmations,
                    address: tx.from,
                    fee: fee,
                    network: 'TRON',
                    sowAt: new Date(tx.timestamp).toISOString(),
                    type: 'CRD'
                },
            }; 

            // Cambiar el evento a "confirmed_transaction" si alcanza las confirmaciones máximas
            if (webhookData, webhookData.data.confirmed) {
                webhookData.event = 'confirmed_transaction';
            }

            // Enviar webhook si las confirmaciones están dentro del rango permitido
            if (tx.confirmations <= MAX_CONFIRMATIONS+3) { 

                await webhook.send(webhookData);

                // Actualizar el último txID para evitar duplicados
                if (tx.txID !== lastTxID) {
                    await cache.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet TRC20 ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
