import axios from 'axios';
import cache from '../../helpers/cacheHelper';
import webhook from '../webhook';
import CurrencyHelper from '../../helpers/currencyHelper';

// Configuración de confirmaciones máximas para Ripple
const MAX_CONFIRMATIONS = parseInt(process.env.XRP_MAX_CONFIRMATIONS || '6', 10);

async function monitor(wallet: string | string[]) {
    if (Array.isArray(wallet)) {
        for (const w of wallet) {
            await monitor(w);
        }
        return;
    }
    try {
        const response = await axios.get(`https://data.ripple.com/v2/accounts/${wallet}/transactions`, {
            params: {
                type: 'Payment',
                result: 'tesSUCCESS',
                limit: 10, // Ajusta el límite según tus necesidades
            },
        });

        const transactions = response.data.transactions;

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.ledger_index ? response.data.ledger_index - tx.ledger_index : 0;
            const lastTxID = await cache.get(`wallet:${wallet}:last_tx`); 
            const isIncoming = tx.specification.destination === wallet;
            if (!isIncoming) continue;
            if (confirmations > MAX_CONFIRMATIONS+1) continue; //detener el proceso si ya se ha confirmado
            const amount = parseFloat(tx.specification.amount.value); 
            // Convertir cantidad a USD
            const amountUSD = await CurrencyHelper.convertToUSD('XRP', amount);
            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: txID !== lastTxID || confirmations <=1 ? 'new_transaction' : 'update_transaction',
                data: {
                    txID: txID,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'XRP',
                    confirmations: confirmations,
                    confirmed: confirmations >= MAX_CONFIRMATIONS,
                    address: isIncoming ? tx.specification.source : tx.specification.destination,
                    fee: parseFloat(tx.outcome.fee),
                    network: 'RIPPLE',
                    sowAt: new Date(tx.outcome.timestamp).toISOString(),
                    type: 'CRD'
                },
            };

            // Cambiar el evento a "confirmed_transaction" si alcanza las confirmaciones máximas
            if (confirmations === MAX_CONFIRMATIONS) {
                webhookData.event = 'confirmed_transaction';
            }

            // Enviar webhook si las confirmaciones están dentro del rango permitido
            if (confirmations <= MAX_CONFIRMATIONS) {
                await webhook.send(webhookData);

                // Actualizar el último txID para evitar duplicados
                if (txID !== lastTxID) {
                    await cache.set(`wallet:${wallet}:last_tx`, txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet Ripple (XRP) ${wallet}:`, (error as Error).message);
    }
}

export default{ monitor };
