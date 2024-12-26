import axios from 'axios';
import cache from '../helpers/cacheHelper';
import { WebhookData } from '../models/webhook';

// Configuración
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 10;
const RETRY_DELAY = Number(process.env.RETRY_DELAY) || 5000;
const MAX_DUPLICATES = Number(process.env.MAX_DUPLICATES) || 3;
const REQUEST_TIMEOUT = Number(process.env.REQUEST_TIMEOUT) || 10000; // ms


/**
 * Cola de reintentos, donde cada ítem corresponde a **un** callback fallido
 * (no a toda la wallet completa).
 */
const retryQueue: WebhookData[] = [];
let isRetrying = false;

/**
 * Genera la clave de cache para un webhook específico (wallet + txID + callbackUrl).
 */
function getCacheKey(wallet: string, txID: string, callbackUrl: string): string {
    return `webhook:${wallet}:${txID}:${callbackUrl}`;
}

/**
 * Verifica si se ha enviado el webhook (para esa URL) suficientes veces
 * (basado en MAX_DUPLICATES y las confirmaciones).
 */
export async function wasSent(data: WebhookData): Promise<boolean> {
    if (!data.callbackUrl) return false;

    const cacheKey = getCacheKey(data.wallet, data.data.txID, data.callbackUrl);
    const cached = await cache.get(cacheKey);

    if (!cached) return false;

    const parsed = JSON.parse(cached);
    // Puedes ajustar la condición de “confirmado” a tus reglas de negocio
    return !!parsed.confirmed && parsed.attempts >= MAX_DUPLICATES;
}

/**
 * Envía un webhook a **un** endpoint específico.
 */
async function sendToCallback(data: WebhookData, callbackUrl: string) {
    const cacheKey = getCacheKey(data.wallet, data.data.txID, callbackUrl);
    const cached = await cache.get(cacheKey);

    // Evitar duplicados de confirmaciones
    if (cached) {
        const { confirmations, attempts } = JSON.parse(cached);
        const sameConfirmations = data.data.confirmations === confirmations;
        if (sameConfirmations && attempts >= MAX_DUPLICATES) {
            console.log(`\n[Webhook] Ya enviado ${MAX_DUPLICATES} veces (mismas confirmaciones) -> ${data.data.txID} => ${callbackUrl}`);
            return;
        }
    }

    try {
        const response = await axios.post(callbackUrl, data, { timeout: REQUEST_TIMEOUT });
        if (response.status === 200) {
            console.log(`\n[Webhook] Enviado con éxito: ${data.data.txID} => ${callbackUrl}`, data);
            // Si es la primera vez que se envía con éxito, guardamos attempts=1
            await cache.set(
                cacheKey,
                JSON.stringify({ confirmations: data.data.confirmations, attempts: 1, confirmed: true }),
                3600,
            );
        } else {
            throw new Error(`Status no 200 => ${response.status}`);
        }
    } catch (error) {
        console.error(`[Webhook] Error al enviar ${data.data.txID} => ${callbackUrl}:`, (error as Error).message);

        // Manejo de reintentos
        const fallback = { confirmations: 0, attempts: 0, confirmed: false };
        const cachedData = cached ? JSON.parse(cached) : fallback;
        const attempts = cachedData.attempts + 1;

        if (attempts <= MAX_RETRIES) {
            console.log(`[Webhook] Reintento ${attempts}/${MAX_RETRIES} para ${data.data.txID} => ${callbackUrl}`);
            await cache.set(
                cacheKey,
                JSON.stringify({ confirmations: data.data.confirmations, attempts, confirmed: false }),
                3600,
            );

            // Agregamos a la cola de reintentos un ítem **por callbackUrl**.
            // Notar que en data.callbackUrl guardamos el “callbackUrl” que falló.
            retryQueue.push({ ...data, callbackUrl });

            if (!isRetrying) {
                void processRetryQueue();
            }
        } else {
            console.error(`[Webhook] Se alcanzó el máximo de reintentos para ${data.data.txID} => ${callbackUrl}`);
        }
    }
}

/**
 * Envía webhooks a **todas** las URL suscritas para la wallet dada.
 * - Cada URL se maneja de forma independiente: si falla una, no bloquea a las demás.
 */
export async function send(data: Pick<WebhookData, 'wallet' | 'data'>) {
    // Obtener la(s) URL(s) de callback específicas, o la genérica .env
    let callbackUrls: string[] = [];
    try {
        let callbackUrls = JSON.parse(await cache.get(`wallet:${data.wallet}:callback`)??'[]'); ;
     } catch {
        // Si falla la lectura del cache, no bloqueamos, pero continuamos
        callbackUrls = [];
    }

    if (!callbackUrls.length) {
        if (process.env.WEBHOOK_URL) {
            callbackUrls = [process.env.WEBHOOK_URL];
        } else {
            console.warn('[Webhook] No hay callbackUrls configuradas');
            return;
        }
    }

    // Dispara sendToCallback para cada endpoint
    for (const url of callbackUrls) {
        await sendToCallback({ ...data, callbackUrl: url }, url);
    }
}

/**
 * Procesa la cola de reintentos de manera secuencial (uno tras otro).
 * - Si quieres procesar en paralelo, puedes modificar este bloque,
 *   pero normalmente es más seguro en secuencia para no saturar tu servicio.
 */
async function processRetryQueue() {
    isRetrying = true;
    while (retryQueue.length > 0) {
        const queuedItem = retryQueue.shift() as WebhookData;
        if (!queuedItem.callbackUrl) continue; // sanity check

        console.log(`[Webhook] Reintentando envío -> ${queuedItem.data.txID} => ${queuedItem.callbackUrl}`);
        await sendToCallback(queuedItem, queuedItem.callbackUrl);

        // Espera un tiempo antes de reintentar el siguiente (para no saturar)
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    }
    isRetrying = false;
}

export default {
    send,
    wasSent,
};
