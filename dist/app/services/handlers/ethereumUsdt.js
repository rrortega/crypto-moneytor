import cache from '../../helpers/cacheHelper';
import webhook from '../webhook';
import CurrencyHelper from '../../helpers/currencyHelper';
import MultiChainService from '../multiChainService';
// Configuración de confirmaciones máximas para ERC20
const MAX_CONFIRMATIONS = parseInt(process.env.ERC20_MAX_CONFIRMATIONS || '12', 12);
async function monitor(wallet) {
    if (Array.isArray(wallet)) {
        for (const w of wallet) {
            await monitor(w);
        }
        return;
    }
    try {
        const chainService = new MultiChainService('etherscan', (process.env.MULTICHAIN_API_KEYS || '').split(','), // Claves desde el .env
        parseInt(process.env.ETHERSCAN_MAX_REQUESTS || '0', 10), // Límite de solicitudes
        parseInt(process.env.ETHERSCAN_RESET_INTERVAL || '0', 10) // Intervalo de reinicio
        );
        const transactions = await chainService.getTransactions(MultiChainService.ETHEREUM_MAINNET, wallet);
        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = parseInt(tx.confirmations);
            const lastTxID = await cache.get(`wallet:${wallet}:last_tx`);
            const isIncoming = tx.to.toLowerCase() === wallet.toLowerCase();
            if (!isIncoming)
                continue;
            if (confirmations > MAX_CONFIRMATIONS + 1)
                continue; //detener el proceso si ya se ha confirmado
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
                    network: 'ETHEREUM',
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
    }
    catch (error) {
        console.error(`Error monitoreando wallet ERC20 ${wallet}:`, error.message);
    }
}
export default { monitor };
