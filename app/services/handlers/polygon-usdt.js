const axios = require('axios');
const redis = require('../config/redis');
const webhook = require('../webhook');
const conversionService = require('../services/conversion');

// Configuración de confirmaciones máximas para Polygon
const MAX_CONFIRMATIONS = process.env.POLYGON_MAX_CONFIRMATIONS || 12;

async function monitor(wallet) {
    try {
        const response = await axios.get(`https://api.polygonscan.com/api`, {
            params: {
                module: 'account',
                action: 'tokentx',
                address: wallet,
                contractaddress: process.env.USDT_CONTRACT_ADDRESS,
                startblock: 0,
                endblock: 99999999,
                sort: 'asc',
                apikey: process.env.POLYGONSCAN_API_KEY,
            },
        });

        const transactions = response.data.result;

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.confirmations;
            const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);

            const isIncoming = tx.to.toLowerCase() === wallet.toLowerCase();
            const type = isIncoming ? 'CRD' : 'DBT';
            const amount = parseFloat(tx.value) / 1e6; // Convertir de USDT (con 6 decimales)

            // Convertir cantidad a USD
            const amountUSD = await conversionService.convertToUSD('USDT', amount);

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
                    address: isIncoming ? tx.from : tx.to,
                    fee: parseFloat(tx.gasUsed * tx.gasPrice) / 1e18, // Convertir de Wei a MATIC
                    network: 'POLYGON',
                    sowAt: new Date(tx.timeStamp * 1000).toISOString(),
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
        console.error(`Error monitoreando wallet Polygon ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
