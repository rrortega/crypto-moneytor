const redis = require('../config/redis'); // Tu configuración existente de Redis

class CacheHelper {
  constructor() {
    if (CacheHelper.instance) {
      return CacheHelper.instance; // Devuelve la instancia existente
    }

    // Inicializa la instancia si no existe
    this.inMemoryCache = {}; // Manejador en memoria como fallback
    this.useRedis = !!redis; // Verifica si Redis está disponible

    CacheHelper.instance = this; // Guarda la instancia para futuros usos
  }
  static instance = null;


  async set(key, value, expiration = 3600) {
    if (this.useRedis) {
      try {
        await redis.set(key, JSON.stringify(value), 'EX', expiration);
      } catch (error) {
        console.error('Error al guardar en Redis:', error.message);
        this.useRedis = false;
        this.inMemoryCache[key] = { value, expiration: Date.now() + expiration * 1000 };
      }
    } else {
      this.inMemoryCache[key] = { value, expiration: Date.now() + expiration * 1000 };
    }
  }

  async get(key) {
    if (this.useRedis) {
      try {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Error al obtener de Redis:', error.message);
        this.useRedis = false;
        return this._getFromMemory(key);
      }
    } else {
      return this._getFromMemory(key);
    }
  }

  async del(key) {
    if (this.useRedis) {
      try {
        await redis.del(key);
      } catch (error) {
        console.error('Error al eliminar de Redis:', error.message);
        this.useRedis = false;
        delete this.inMemoryCache[key];
      }
    } else {
      delete this.inMemoryCache[key];
    }
  }

  async smembers(key) {
    if (this.useRedis) {
      try {
        const members = await redis.smembers(key);
        return members || [];
      } catch (error) {
        console.error('Error al obtener miembros de Redis:', error.message);
        this.useRedis = false;
        return this._getArrayFromMemory(key);
      }
    } else {
      return this._getArrayFromMemory(key);
    }
  }

  async sadd(key, value) {
    if (this.useRedis) {
      try {
        await redis.sadd(key, value);
      } catch (error) {
        console.error('Error al agregar a Redis:', error.message);
        this.useRedis = false;
        this._addToMemoryArray(key, value);
      }
    } else {
      this._addToMemoryArray(key, value);
    }
  }

  async srem(key, value) {
    if (this.useRedis) {
      try {
        await redis.srem(key, value);
      } catch (error) {
        console.error('Error al eliminar miembro de Redis:', error.message);
        this.useRedis = false;
        this._removeFromMemoryArray(key, value);
      }
    } else {
      this._removeFromMemoryArray(key, value);
    }
  }

  async incr(key) {
    if (this.useRedis) {
      try {
        return await redis.incr(key);
      } catch (error) {
        console.error('Error al incrementar en Redis:', error.message);
        this.useRedis = false;
        return this._incrementInMemory(key);
      }
    } else {
      return this._incrementInMemory(key);
    }
  }

  async expire(key, seconds) {
    if (this.useRedis) {
      try {
        await redis.expire(key, seconds);
      } catch (error) {
        console.error('Error al establecer expiración en Redis:', error.message);
        this.useRedis = false;
        if (this.inMemoryCache[key]) {
          this.inMemoryCache[key].expiration = Date.now() + seconds * 1000;
        }
      }
    } else {
      if (this.inMemoryCache[key]) {
        this.inMemoryCache[key].expiration = Date.now() + seconds * 1000;
      }
    }
  }

  _getFromMemory(key) {
    const data = this.inMemoryCache[key];
    if (data && data.expiration > Date.now()) {
      return data.value;
    } else {
      delete this.inMemoryCache[key];
      return null;
    }
  }

  _getArrayFromMemory(key) {
    return this.inMemoryCache[key]?.value || [];
  }

  _addToMemoryArray(key, value) {
    if (!this.inMemoryCache[key]) {
      this.inMemoryCache[key] = { value: [], expiration: Date.now() + 3600 * 1000 };
    }
    if (!this.inMemoryCache[key].value.includes(value)) {
      this.inMemoryCache[key].value.push(value);
    }
  }

  _removeFromMemoryArray(key, value) {
    if (this.inMemoryCache[key]) {
      const index = this.inMemoryCache[key].value.indexOf(value);
      if (index !== -1) {
        this.inMemoryCache[key].value.splice(index, 1);
      }
    }
  }

  _incrementInMemory(key) {
    if (!this.inMemoryCache[key]) {
      this.inMemoryCache[key] = { value: 0, expiration: Date.now() + 3600 * 1000 };
    }
    this.inMemoryCache[key].value += 1;
    return this.inMemoryCache[key].value;
  }
}

// Exporta una única instancia de la clase
module.exports = new CacheHelper();
