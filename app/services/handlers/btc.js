const axios = require('axios');
const redis = require('../../config/redis');
const webhook = require('../webhook');
const conversionService = require('../conversion');

// Configuración de confirmaciones máximas para BTC
const MAX_CONFIRMATIONS = process.env.BTC_MAX_CONFIRMATIONS || 6;

async function monitor(wallet) {
    try {
        const response = await axios.get(`https://blockchain.info/rawaddr/${wallet}`);
        const transactions = response.data.txs;

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.block_height ? response.data.latest_block.height - tx.block_height : 0;
            const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);

            const isIncoming = tx.inputs.every(input => input.prev_out.addr !== wallet);
            const type = isIncoming ? 'CRD' : 'DBT';
            const amount = tx.out.reduce((sum, output) => (output.addr === wallet ? sum + output.value : sum), 0) / 1e8;

            // Convertir cantidad a USD usando caché interno para optimización
            const amountUSD = await conversionService.convertToUSD('BTC', amount);

            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: txID !== lastTxID ? 'new_transaction' : 'updatetransaction',
                data: {
                    txID: txID,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'BTC',
                    confirmations: confirmations,
                    address: isIncoming
                        ? tx.inputs[0].prev_out.addr
                        : tx.out.find(output => output.addr !== wallet).addr,
                    fee: tx.fee / 1e8,
                    network: 'BTC',
                    sowAt: new Date(tx.time * 1000).toISOString(),
                    type: type,
                },
            };

            // Cambiar el evento a "confirmed_transaction" si alcanza las confirmaciones máximas
            if (confirmations === MAX_CONFIRMATIONS) {
                webhookData.event = 'confirmed_transaction';
            }

            // Enviar webhook si no excede las confirmaciones máximas
            if (confirmations <= MAX_CONFIRMATIONS) {
                await webhook.send(webhookData);

                // Actualizar el último txID para evitar duplicados
                if (tx.txID !== lastTxID) {
                    await redis.set(`wallet:${wallet}:last_tx`, tx.txID);
                }
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet BTC ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
