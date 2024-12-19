const axios = require('axios');
const redis = require('../../config/redis');
const webhook = require('../webhook');
const conversionService = require('../conversion');
const { etherscanApiKeyManager } = require('../apikey-manager');


// Configuración de confirmaciones máximas para ETH
const MAX_CONFIRMATIONS = process.env.ETH_MAX_CONFIRMATIONS || 12;

async function monitor(wallet) {
    try {
        const response = await etherscanApiKeyManager.fetchFromService(`https://api.etherscan.io/api`, {
            module: 'account',
            action: 'txlist',
            address: wallet,
            startblock: 0,
            endblock: 99999999,
            sort: 'asc',
        }); 
        const transactions = response.result;

        for (const tx of transactions) {
            const txID = tx.hash;
            const confirmations = tx.confirmations;
            const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);

            const isIncoming = tx.to.toLowerCase() === wallet.toLowerCase();
            const type = isIncoming ? 'CRD' : 'DBT';
            const amount = parseFloat(tx.value) / 1e18; // Convertir de Wei a ETH

            // Convertir cantidad a USD
            const amountUSD = await conversionService.convertToUSD('ETH', amount);

            // Construir el objeto webhook
            const webhookData = {
                wallet: wallet,
                event: txID !== lastTxID ? 'new_transaction' : 'update_transaction',
                data: {
                    txID: txID,
                    amount: amount,
                    amountUSD: amountUSD,
                    coin: 'ETH',
                    confirmations: confirmations,
                    address: isIncoming ? tx.from : tx.to,
                    fee: parseFloat(tx.gasUsed * tx.gasPrice) / 1e18, // Convertir de Wei a ETH
                    network: 'ETHEREUM',
                    sowAt: new Date(tx.timeStamp * 1000).toISOString(),
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
        console.error(`Error monitoreando wallet ETH ${wallet}:`, error.message);
    }
}


module.exports = { monitor };
