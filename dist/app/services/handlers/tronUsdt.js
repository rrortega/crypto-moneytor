import cache from '../../helpers/cacheHelper.js';
import webhook from '../webhook.js';
import CurrencyHelper from '../../helpers/currencyHelper.js';
import TronHelper from '../../helpers/tronHelper.js';
// Configuración de confirmaciones máximas para TRC20
const MAX_CONFIRMATIONS = parseInt(process.env.TRON_MAX_CONFIRMATIONS || '30', 10);
async function monitor(wallet) {
    if (Array.isArray(wallet)) {
        for (const w of wallet) {
            await monitor(w);
        }
        return;
    }
    try {
        const lastTxID = await cache.get(`wallet:${wallet}:last_tx`);
        const transactions = await TronHelper.getIncomingTransactions(wallet);
        for (const tx of transactions) {
            const amount = tx.amount;
            // Convertir cantidad a USD
            const amountUSD = await CurrencyHelper.convertToUSD('USDT', amount);
            const fee = 0;
            if (tx.confirmations > MAX_CONFIRMATIONS + 1)
                continue; //detener el proceso si ya se ha confirmado
            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: tx.txID !== lastTxID || tx.confirmations <= 1 ? 'new_transaction' : 'update_transaction',
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
            if (webhookData.data.confirmed) {
                webhookData.event = 'confirmed_transaction';
            }
            // Enviar webhook si las confirmaciones están dentro del rango permitido
            if (tx.confirmations <= MAX_CONFIRMATIONS + 3) {
                await webhook.send(webhookData);
                // Actualizar el último txID para evitar duplicados
                if (tx.txID !== lastTxID) {
                    await cache.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    }
    catch (error) {
        console.error(`Error monitoreando wallet TRC20 ${wallet}:`, error.message);
    }
}
export default { monitor };
