require('dotenv').config();
const tronWeb = require('../../helpers/tronweb');
const redis = require('../../config/redis');
const webhook = require('../webhook');
const conversionService = require('../services/conversion');

// Configuración de confirmaciones máximas para TRX
const MAX_CONFIRMATIONS = process.env.TRX_MAX_CONFIRMATIONS || 41;

async function monitor(wallet) {
    try {
        const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);
        const transactions = await tronWeb.trx.getTransactionsRelated(wallet, 'to');

        for (const tx of transactions) {
            const txInfo = await tronWeb.trx.getTransactionInfo(tx.txID);
            const confirmations = txInfo.blockNumber
                ? await tronWeb.trx.getConfirmedBlock(txInfo.blockNumber).number - txInfo.blockNumber
                : 0;

            const isIncoming = tx.raw_data.contract[0].parameter.value.to_address === wallet;
            const type = isIncoming ? 'CRD' : 'DBT';
            const amount = tronWeb.fromSun(txInfo.amount || '0');

            // Convertir cantidad a USD
            const amountUSD = await conversionService.convertToUSD('TRX', amount);

            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: tx.txID !== lastTxID ? 'new_transaction' : 'update_transaction',
                data: {
                    txID: tx.txID,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'TRX',
                    confirmations: confirmations,
                    address: isIncoming
                        ? tx.raw_data.contract[0].parameter.value.owner_address // Dirección de origen
                        : tx.raw_data.contract[0].parameter.value.to_address, // Dirección de destino
                    fee: tronWeb.fromSun(txInfo.fee || '0'), // Convertir fee de SUN a TRX
                    network: 'TRON',
                    sowAt: new Date(txInfo.blockTimeStamp).toISOString(),
                    type: type,
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
                    await redis.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet TRX ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
