import cache from '../../helpers/cacheHelper.js';
import webhook from '../webhook.js';
import CurrencyHelper from '../../helpers/currencyHelper.js';
import MultiChainService from '../multiChainService.js';

// Configuración de confirmaciones máximas para Arbitrum
const MAX_CONFIRMATIONS = parseInt(process.env.ARBITRUM_MAX_CONFIRMATIONS || '12') || 12;

async function monitor(wallet: string | string[]) {
    if (Array.isArray(wallet)) {
        for (const w of wallet) {
            await monitor(w);
        }
        return;
    }
    try {
        const chainService = new MultiChainService(
            'arbitrum',
            (process.env.MULTICHAIN_API_KEYS || '').split(','), // Claves desde el .env
            parseInt(process.env.ARBITRUM_MAX_REQUESTS || '0', 10), // Límite de solicitudes
            parseInt(process.env.ARBITRUM_RESET_INTERVAL || '0', 10) // Intervalo de reinicio
        );

        const transactions = await chainService.getTransactions(MultiChainService.ARBITRUM_ONE_MAINNET, wallet);

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.confirmations;
            const isIncoming = tx.to.toLowerCase() === wallet.toLowerCase();
            if (!isIncoming) continue;
            if (confirmations >= MAX_CONFIRMATIONS + 1) continue; // Detener el proceso si ya se ha confirmado 
            const lastTxID = await cache.get(`wallet:${wallet}:last_tx`);

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
                    fee: parseFloat((tx.gasUsed * tx.gasPrice).toString()) / 1e18, // Convertir de Wei a ETH
                    network: 'ARBITRUM',
                    sowAt: new Date(tx.timeStamp * 1000).toISOString(),
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
                if (tx.txID !== lastTxID) {
                    await cache.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet Arbitrum ${wallet}:`, (error as Error).message);
    }
}

export default { monitor };