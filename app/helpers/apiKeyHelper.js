const cache = require('./cacheHelper'); 
const axios = require('axios');



class ApiKeyHelper {
    constructor(serviceName, apiKeys, maxRequests, resetInterval) {
        if(ApiKeyHelper.instances[serviceName]){ 
            ApiKeyHelper.instances[serviceName].apiKeys=apiKeys;
            ApiKeyHelper.instances[serviceName].maxRequests=maxRequests;
            ApiKeyHelper.instances[serviceName].resetInterval=resetInterval;
            return ApiKeyHelper.instances[serviceName];
        }
        this.serviceName = serviceName;
        this.apiKeys = apiKeys;
        this.maxRequests = maxRequests;
        this.resetInterval = resetInterval; // En segundos
        this.keyUsage = `${serviceName}_key_usage`; // Prefijo en la cache

        ApiKeyHelper.instances[serviceName]=this;
    }
    static instances={};

    async getAvailableKey() {
        for (const apiKey of this.apiKeys) {
            const usage = await cache.get(`${this.keyUsage}:${apiKey}`);
            if (!usage || parseInt(usage, 10) < this.maxRequests) {
                return apiKey;
            }
        }
        throw new Error(`All API keys for ${this.serviceName} have reached their limit`);
    }

    async incrementKeyUsage(apiKey) {
        const usageKey = `${this.keyUsage}:${apiKey}`;
        const usage = await cache.incr(usageKey);

        // Establecer TTL para reiniciar el contador
        if (usage === 1) {
            await cache.expire(usageKey, this.resetInterval);
        }
        return usage;
    }

    async fetchFromService(baseUrl, params) {
        try {
            const apiKey = await this.getAvailableKey();
            const response = await axios.get(baseUrl, {
                params: {
                    ...params,
                    apikey: apiKey,
                },
            });

            // Incrementar el uso de la clave
            await this.incrementKeyUsage(apiKey);

            return response.data;
        } catch (error) {
            console.error(`Error fetching data from ${apiManager.serviceName}:`, error.message);
            throw error;
        }
    }

}

module.exports = ApiKeyHelper;