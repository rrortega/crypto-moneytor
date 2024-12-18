const axios = require('axios');
const redis = require('../config/redis');

class ConversionService {
    constructor() {
        this.cacheTTL = 3600; // 1 hora de caché en segundos
    }

    /**
     * Convierte cualquier moneda a USD
     * @param {string} currency - Moneda origen (e.g., BTC, USDT, EUR)
     * @param {number} amount - Cantidad a convertir
     * @param {boolean} ignoreCache - Ignorar caché
     * @returns {Promise<number>} - Monto convertido a USD
     */
    async convertToUSD(currency, amount = 1, ignoreCache = false) {
        if (!amount || currency.toUpperCase() === 'USD') return amount;

        const cacheKey = `${currency}-USD-${amount}`;
        if (!ignoreCache) {
            const cachedRate = await redis.get(cacheKey);
            if (cachedRate) {
                return parseFloat(cachedRate) * amount;
            }
        }

        try {
            let rate = await this.getRateToUSD(currency);
            if (rate) {
                await redis.set(cacheKey, rate, 'EX', this.cacheTTL); // Guardar en caché
                return rate * amount;
            }
        } catch (error) {
            console.error(`Error obteniendo la tasa de cambio a USD: ${error.message}`);
        }

        return 0; // Retornar 0 en caso de fallo
    }

    /**
     * Obtiene la tasa de cambio hacia USD desde APIs externas
     * @param {string} currency - Moneda origen
     * @returns {Promise<number|null>} - Tasa de cambio hacia USD
     */
    async getRateToUSD(currency) {
        currency = currency.toUpperCase();

        // Caso USDT
        if (currency === 'USDT') {
            return 1; // USDT está 1:1 con USD
        }

        // Caso BTC
        if (currency === 'BTC') {
            return await this.getBTCToUSD();
        }

        // Caso general (otras monedas fiat o cripto)
        return await this.getFiatOrCryptoToUSD(currency);
    }

    /**
     * Tasa de cambio de BTC a USD
     * @returns {Promise<number|null>} - Tasa de cambio BTC a USD
     */
    async getBTCToUSD() {
        const url = `https://blockchain.info/ticker`;
        try {
            const response = await axios.get(url);
            if (response.data && response.data.USD && response.data.USD.last) {
                return response.data.USD.last;
            }
        } catch (error) {
            console.error(`Error obteniendo tasa de BTC a USD: ${error.message}`);
        }
        return null;
    }

    /**
     * Tasa de cambio de monedas fiat o cripto a USD
     * @param {string} currency - Moneda origen
     * @returns {Promise<number|null>} - Tasa de cambio hacia USD
     */
    async getFiatOrCryptoToUSD(currency) {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${currency.toLowerCase()}&vs_currencies=usd`;
        try {
            const response = await axios.get(url);
            if (response.data && response.data[currency.toLowerCase()] && response.data[currency.toLowerCase()].usd) {
                return response.data[currency.toLowerCase()].usd;
            }
        } catch (error) {
            console.error(`Error obteniendo tasa de ${currency} a USD: ${error.message}`);
        }
        return null;
    }
}

module.exports = new ConversionService();
