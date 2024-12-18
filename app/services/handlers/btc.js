const redis = require('../config/redis');
const webhook = require('../webhook');
const axios = require('axios'); // Para consultar un API de BTC

async function monitor(wallet) {
    try {
        const response = await axios.get(`https://blockchain.info/rawaddr/${wallet}`);
        const transactions = response.data.txs;

        for (const tx of transactions) {
            const txID = tx.hash;

            const lastTxID = await redis.get(`wallet:${wallet}:last_tx`);
            if (txID !== lastTxID) {
                console.log(`Nueva transacción en BTC: ${txID}`);
                await redis.set(`wallet:${wallet}:last_tx`, txID);
                await webhook.send(wallet, tx, 'new_transaction');
            }
        }
    } catch (error) {
        console.error(`Error monitoreando wallet BTC ${wallet}:`, error.message);
    }
}

module.exports = { monitor };
