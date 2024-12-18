const axios = require('axios');

async function send(wallet, data, event) {
    try {
        await axios.post(process.env.WEBHOOK_URL, { wallet, data, event });
        console.log(`Webhook enviado: ${event} para ${wallet}`);
    } catch (error) {
        console.error(`Error enviando webhook para ${wallet}:`, error.message);
    }
}

module.exports = { send };
