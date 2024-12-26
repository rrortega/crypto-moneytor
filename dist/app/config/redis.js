import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();
const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT || '6379';
const password = process.env.REDIS_PASSWORD;
const url = password
    ? `redis://:${password}@${host}:${port}`
    : `redis://${host}:${port}`;
let redis = null, errorInformed = false;
let onError = () => {
    if (!errorInformed)
        console.warn('Error al conectar con Redis:', url);
    errorInformed = true;
    redis = null;
};
try {
    redis = createClient({ url: url });
    redis.on('error', onError);
    // Intentamos conectar de forma no bloqueante
    redis.connect().catch(onError);
}
catch (error) {
    onError();
}
// Exportamos una interfaz que maneja el caso de redis null
export default {
    async set(key, value, options) {
        throw new Error('Redis not connected');
    },
    async get(key) {
        throw new Error('Redis not connected');
    },
    async del(key) {
        throw new Error('Redis not connected');
    },
    async sAdd(key, value) {
        throw new Error('Redis not connected');
    },
    async sRem(key, value) {
        throw new Error('Redis not connected');
    },
    async sMembers(key) {
        throw new Error('Redis not connected');
    },
    async incr(key) {
        throw new Error('Redis not connected');
    },
    async expire(key, seconds) {
        throw new Error('Redis not connected');
    }
};
