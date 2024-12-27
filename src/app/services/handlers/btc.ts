import WebSocket from 'ws';
import axios from 'axios';
import webhook from '../webhook.js';
import CurrencyHelper from '../../helpers/currencyHelper.js';

const MAX_CONFIRMATIONS = Number(process.env.BTC_MAX_CONFIRMATIONS) || 4;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL || 30000;
const WS_RECONNECT_DELAY = 5000;

let ws: WebSocket;
let wsConnected = false;
let pollingActive = false;
const walletsSubscribed = new Set();

/**
 * Conecta al WebSocket y suscribe las wallets.
 * @param {string[]} wallets Lista de wallets a suscribir.
 */
async function connectWebSocket(wallets:string[]) {
    ws = new WebSocket('wss://ws.blockchain.info/inv');

    ws.on('open', () => {
        console.log('Conexión WebSocket abierta');
        wsConnected = true;
        pollingActive = false;

        // Suscribir las wallets al WebSocket
        wallets.forEach(wallet => {
            if (!walletsSubscribed.has(wallet)) {
                ws.send(JSON.stringify({ op: 'addr_sub', addr: wallet }));
                walletsSubscribed.add(wallet);
                console.log(`Wallet suscrita a WebSocket: ${wallet}`);
            }
        });
    });

    ws.on('message', (data:any) => {
        const event = JSON.parse(data);
        if (event.op === 'utx') {
            const tx = event.x;
            handleTransaction(tx);
        }
    });

    ws.on('error', (error) => {
        console.error('Error en WebSocket:', (error as Error).message);
        wsConnected = false;
    });

    ws.on('close', () => {
        console.log('Conexión WebSocket cerrada, intentando reconectar...');
        wsConnected = false;
        walletsSubscribed.clear();
        setTimeout(() => connectWebSocket(wallets), WS_RECONNECT_DELAY);
    });
}

/**
 * Maneja una transacción recibida por WebSocket.
 * Solo se procesan las transacciones entrantes.
 * @param {object} tx Transacción recibida.
 */
async function handleTransaction(tx:any) {
    const isIncoming = tx.out.some((output: { addr: unknown; }) => walletsSubscribed.has(output.addr));
    if (!isIncoming) return; // Ignorar transacciones salientes

    const wallet = tx.out.find((output: { addr: unknown; }) => walletsSubscribed.has(output.addr)).addr;
    const latestBlockHeight = await getLatestBlockHeight();
    const confirmations = tx.block_height ? latestBlockHeight - tx.block_height : 0; 

    if (confirmations < MAX_CONFIRMATIONS+1) { 
        const amount = tx.out.reduce((sum: any, output: { addr: unknown; value: any; }) => walletsSubscribed.has(output.addr) ? sum + output.value : sum, 0) / 1e8;
        const amountUSD = await CurrencyHelper.convertToUSD('BTC', amount); 
        const webhookData = {
            wallet,
            event: 'new_transaction',
            data: {
                txID: tx.hash,
                amount,
                amountUSD,
                coin: 'BTC',
                confirmations,
                confirmed: confirmations >= MAX_CONFIRMATIONS,
                fee: tx.fee / 1e8,
                network: 'BTC',
                sowAt: new Date(tx.time * 1000).toISOString(),
                type: 'CRD',
            },
        };
    
        if (webhookData.data.confirmed) {
            webhookData.event = 'confirmed_transaction';
        } 
        await webhook.send(webhookData);
    }


}

/**
 * Obtiene el número del bloque más reciente.
 * @returns {Promise<number>} Altura del bloque más reciente.
 */
async function getLatestBlockHeight() {
    try {
        const response = await axios.get('https://blockchain.info/latestblock');
        return response.data.height;
    } catch (error) {
        console.error('Error al obtener el último bloque:', (error as Error).message);
        throw error;
    }
}

/**
 * Realiza polling para monitorear wallets en caso de que falle WebSocket.
 * @param {string[]} wallets Lista de wallets a monitorear.
 */
async function pollWallets(wallets: any[]) {
    if (pollingActive) return;

    pollingActive = true;

    try {
        const response = await axios.get(`https://blockchain.info/multiaddr?active=${wallets.join('|')}`);
        const transactions = response.data.txs;

        for (const tx of transactions) {
            const isIncoming = tx.out.some((output: { addr: any; }) => wallets.includes(output.addr));
            if (!isIncoming) continue; // Ignorar transacciones salientes

            await handleTransaction(tx);
        }
    } catch (error) {
        console.error('Error en el polling:', (error as Error).message);
    } finally {
        pollingActive = false;
    }
}

/**
 * Monitorea las wallets, utilizando WebSocket o polling como respaldo.
 * @param {string[]} wallets Lista de wallets a monitorear.
 */
async function  monitor(wallet: string | string[]) {
    
    if (!wsConnected) {
        console.log('Intentando conectar WebSocket...');
        connectWebSocket(!Array.isArray(wallet)?[wallet]:wallet);
    }

    if (!wsConnected || pollingActive) {
        console.log('WebSocket desconectado, iniciando polling...');
        await pollWallets(!Array.isArray(wallet)?[wallet]:wallet);
    }
} 
export default { monitor }; 