require('dotenv').config();
const tronWeb = require('../../helpers/tronweb');
const redis = require('../../config/redis');
const webhook = require('../webhook');

const MAX_CONFIRMATIONS = process.env.TRON_MAX_CONFIRMATIONS || 41;

async function monitor(wallet) {
    try {
        const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);
        const transactions = await tronWeb.trx.getTransactionsRelated(wallet, 'to');

        for (const tx of transactions) {
            if (tx.txID !== lastTxID) {
                console.log(`Nueva transacción detectada: ${tx.txID}`);
                await redis.set(`wallet:${wallet}:last_tx`, tx.txID);
                await webhook.send(wallet, tx, 'new_transaction');
            }

            // Verificar confirmaciones
            const txInfo = await tronWeb.trx.getTransactionInfo(tx.txID);
            if (txInfo.blockNumber && txInfo.confirmations <= MAX_CONFIRMATIONS) {
                console.log(`Confirmaciones (${txInfo.confirmations}): ${tx.txID}`);
                await webhook.send(wallet, tx, `confirmations_${txInfo.confirmations}`);
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet TRC20 ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
