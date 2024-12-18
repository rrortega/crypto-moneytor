const axios = require('axios');

async function send(data) {
    try {
        await axios.post(process.env.WEBHOOK_URL, data);
        console.log(`Webhook enviado con éxito para ${data.wallet}: ${data.event}`);
    } catch (error) {
        console.error(`Error enviando webhook para ${data.wallet}:`, error.message);
    }
}

module.exports = { send };
