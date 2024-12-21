const axios = require('axios');
const cache = require('../helpers/cacheHelper');

// Configuración
const MAX_RETRIES = 10;
const RETRY_DELAY = 5000;
const MAX_DUPLICATES = 3;
const REQUEST_TIMEOUT = 10000; // Tiempo máximo para una solicitud en ms

const retryQueue = [];
let isRetrying = false;

async function wasSent(data) {
    const cached = await cache.get(`webhook:${payload.wallet}:${payload.data.txID}`);
    return cached && JSON.parse(cached).confirmed && JSON.parse(cached).attempts >= MAX_DUPLICATES;
}
async function send(data) {
    const cacheKey = `webhook:${data.wallet}:${data.data.txID}`;
    const cached = await cache.get(cacheKey);

    // Evitar duplicados
    if (cached) {
        const { confirmations, attempts } = JSON.parse(cached);
        if (data.data.confirmations === confirmations && attempts >= MAX_DUPLICATES) {
            console.log(`Webhook ya enviado ${MAX_DUPLICATES} veces para ${data.data.txID}`);
            return;
        }
    }

    try {
        // Obtener la URL de callback específica de la billetera o usar la genérica
        let callbackUrl = await cache.get(`wallet:${data.wallet}:callback`);
        if (!callbackUrl) {
            callbackUrl = process.env.WEBHOOK_URL;
        }

        const response = await axios.post(callbackUrl, data, { timeout: REQUEST_TIMEOUT });

        if (response.status === 200) {
            console.log(`Webhook enviado con éxito para ${data.data.txID}`, data);
            await cache.set(cacheKey, JSON.stringify({ confirmations: data.data.confirmations, attempts: 1 }), 3600);
        } else {
            throw new Error(`Respuesta no exitosa: ${response.status}`);
        }
    } catch (error) {
        console.error(`Error enviando webhook para ${data.wallet}:`, error.message);

        // Manejo de reintentos
        const cachedData = JSON.parse(await cache.get(cacheKey)) || { confirmations: 0, attempts: 0 };
        const attempts = cachedData.attempts + 1;

        const max_retries = process.env.MAX_RETRIES || MAX_RETRIES;

        if (attempts <= max_retries) {
            console.log(`Agregando webhook a la cola de reintentos (${attempts}/${max_retries}) para ${data.data.txID}`);
            await cache.set(cacheKey, JSON.stringify({ confirmations: data.data.confirmations, attempts }), 3600);
            retryQueue.push(data);

            if (!isRetrying) {
                processRetryQueue();
            }
        } else {
            console.error(`Se alcanzó el máximo de reintentos para ${data.data.txID}`);
            throw error;
        }
    }
}

async function processRetryQueue() {
    isRetrying = true;
    while (retryQueue.length > 0) {
        const data = retryQueue.shift();
        try {
            console.log(`Reintentando webhook para ${data.data.txID}`);
            await send(data);
        } catch (error) {
            console.error(`Error en reintento para ${data.data.txID}:`, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }

    isRetrying = false;
}

module.exports = { send, wasSent };
