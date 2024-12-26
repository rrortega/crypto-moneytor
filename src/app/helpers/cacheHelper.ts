import redis from '../config/redis.js'; 
class CacheHelper {
  inMemoryCache: { [key: string]: { value: any, expiration: number } } | undefined;
  useRedis: boolean | undefined;
  constructor() {
    if (CacheHelper.instance) {
      return CacheHelper.instance; // Devuelve la instancia existente
    }
    // Inicializa la instancia si no existe
    this.inMemoryCache = {}; // Manejador en memoria como fallback
    this.useRedis = !!redis; // Verifica si Redis está disponible 
    CacheHelper.instance = this;
  }
  static instance: CacheHelper | null = null;


  async set(key: string, value: any, expiration = 3600):Promise<void> {
    if (this.useRedis) {
      try {
        await redis.set(key, JSON.stringify(value), { EX: expiration });
      } catch (error) {
        console.error('Error al guardar en Redis:', (error as Error).message);
        this.useRedis = false;
        if (this.inMemoryCache) {
          this.inMemoryCache[key] = { value, expiration: Date.now() + expiration * 1000 };
        }
      }
    } else {
      if (this.inMemoryCache)
        this.inMemoryCache[key] = { value, expiration: Date.now() + expiration * 1000 };
    }
  }

  async get(key: string): Promise<any> {
    if (this.useRedis) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Error al obtener de Redis:', (error as Error).message);
        this.useRedis = false;
        return this._getFromMemory(key);
      }
    } else {
      return this._getFromMemory(key);
    }
  }

  async del(key: string): Promise<void> {
    if (this.useRedis) {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('Error al eliminar de Redis:', (error as Error).message);
        this.useRedis = false;
        if (this.inMemoryCache) {
          delete this.inMemoryCache[key];
        }
      }
    } else {
      if (this.inMemoryCache)
        delete this.inMemoryCache[key];
    }
  }

  async smembers(key: string): Promise<any[]> {
    if (this.useRedis) {
      try {
        const members = await redis.sMembers(key);
        return members || [];
      } catch (error) {
        console.error('Error al obtener miembros de Redis:', (error as Error).message);
        this.useRedis = false;
        return this._getArrayFromMemory(key);
      }
    } else {
      return this._getArrayFromMemory(key);
    }
  }

  async sadd(key: string, value: any): Promise<number|void> {
    if (this.useRedis) {
      try {
        return await redis.sAdd(key, value);
      } catch (error) {
        console.error('Error al agregar a Redis:', (error as Error).message);
        this.useRedis = false;
        this._addToMemoryArray(key, value);
        return 1;
      }
    } else {
      this._addToMemoryArray(key, value);
      return 1;
    }
  }

  async srem(key: string, value: any): Promise<number> {
    if (this.useRedis) {
      try {
        return await redis.sRem(key, value);
      } catch (error) {
        console.error('Error al eliminar miembro de Redis:', (error as Error).message);
        this.useRedis = false;
        this._removeFromMemoryArray(key, value);
        return 1;
      }
    } else {
      this._removeFromMemoryArray(key, value); 
      return 1;
    }
  }

  async incr(key: string): Promise<number> {
    if (this.useRedis) {
      try {
        return await redis.incr(key);
      } catch (error) {
        console.error('Error al incrementar en Redis:', (error as Error).message);
        this.useRedis = false;
        return this._incrementInMemory(key);
      }
    } else {
      return this._incrementInMemory(key);
    }
  }

  async expire(key: string, seconds: number): Promise<void> {
    if (this.useRedis) {
      try {
        await redis.expire(key, seconds);
      } catch (error) {
        console.error('Error al establecer expiración en Redis:', (error as Error).message);
        this.useRedis = false;
        if (this.inMemoryCache && this.inMemoryCache[key]) {
          this.inMemoryCache[key].expiration = Date.now() + seconds * 1000;
        }
      }
    } else {
      if (this.inMemoryCache && this.inMemoryCache[key]) {
        this.inMemoryCache[key].expiration = Date.now() + seconds * 1000;
      }
    }
  }

  _getFromMemory(key: string): any {
    const data = this.inMemoryCache ? this.inMemoryCache[key] ?? null : null;
    if (data && data.expiration > Date.now()) {
      return data.value;
    } else {
      if (this.inMemoryCache)
        delete this.inMemoryCache[key];
      return null;
    }
  }

  _getArrayFromMemory(key: string) {
    return this.inMemoryCache ? this.inMemoryCache[key]?.value || [] : [];
  }

  _addToMemoryArray(key: string, value: any): void {
    if (!this.inMemoryCache || !this.inMemoryCache[key]) {
      if (this.inMemoryCache)
        this.inMemoryCache[key] = { value: [], expiration: Date.now() + 3600 * 1000 };
    }
    if (this.inMemoryCache && !this.inMemoryCache[key].value.includes(value)) {
      this.inMemoryCache[key].value.push(value);
    }
  }

  _removeFromMemoryArray(key: string, value: any): void {
    if (this.inMemoryCache && this.inMemoryCache[key]) {
      const index = this.inMemoryCache[key].value.indexOf(value);
      if (index !== -1) {
        this.inMemoryCache[key].value.splice(index, 1);
      }
    }
  }

  _incrementInMemory(key: string): number {
    if (this.inMemoryCache && !this.inMemoryCache[key]) {
      this.inMemoryCache[key] = { value: 0, expiration: Date.now() + 3600 * 1000 };
    }
    if (this.inMemoryCache && this.inMemoryCache[key]) {
      this.inMemoryCache[key].value += 1;
      return this.inMemoryCache[key].value;
    }
    return 0;
  }
}

// Exporta una única instancia de la clase
export default new CacheHelper();
