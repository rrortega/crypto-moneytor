import { createClient } from 'redis';
import dotenv from 'dotenv'; 
dotenv.config();

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT || '6379';
const password = process.env.REDIS_PASSWORD;

const url = password
  ? `redis://:${password}@${host}:${port}`
  : `redis://${host}:${port}`;

let redis: any = null,
  errorInformed = false;
let onError = () => {
  if (!errorInformed && 'REDIS' == (process.env.CACHE_MODE || 'MEMORY'))
    console.warn('Error al conectar con Redis:', url);
  errorInformed = true;
  redis = null;
}

try {
  redis = createClient({ url: url });
  redis.on('error', onError);
  // Intentamos conectar de forma no bloqueante
  redis.connect().catch(onError);

} catch (error) {
  onError();
}

// Exportamos una interfaz que maneja el caso de redis null
export default {
  async set(key: string, value: any, options?: any) {
    throw new Error('Redis not connected');
  },
  async get(key: string) {
    throw new Error('Redis not connected');
  },
  async del(key: string) {
    throw new Error('Redis not connected');
  },
  async sAdd(key: string, value: any) {
    throw new Error('Redis not connected');
  },
  async sRem(key: string, value: any) {
    throw new Error('Redis not connected');
  },
  async sMembers(key: string) {
    throw new Error('Redis not connected');
  },
  async incr(key: string) {
    throw new Error('Redis not connected');
  },
  async expire(key: string, seconds: number) {
    throw new Error('Redis not connected');
  }
};