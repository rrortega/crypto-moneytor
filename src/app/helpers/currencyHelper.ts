import axios from 'axios';

class CurrencyHelper {
    cacheTTL: number | undefined;
    rateCache: { [key: string]: { rate: number, timestamp: number } } | undefined;
    constructor() {
        if (CurrencyHelper.instance) {
            return CurrencyHelper.instance;
        }
        this.cacheTTL = 3600; // 1 hora de caché en segundos 
        this.rateCache = {};
        CurrencyHelper.instance = this;
    }
    static instance: CurrencyHelper | null = null;
    async convert(from: string, to: string, amount: number = 1) {
        if (from === to) return amount;
        // Realiza la llamada a un servicio de precios en tiempo real, por ejemplo, CoinGecko
        const rate = await this.getRate(from, to); // Obtén la tasa de cambio desde una API
        return amount * rate;
    }

    async getRate(from: string, to: string) {
        const CACHE_DURATION = parseInt(process.env.CURRENCY_CACHE_MINUTE_DURACTION || '60') * 1000; // 1 minuto en milisegundos 
        const fromFixed = from.toLowerCase()
            .replace('usdt', 'tether')
            .replace('trx', 'tron')
            .replace('xrp', 'ripple');
        const toFixed = to.toLowerCase()
            .replace(/tether|usdt|usdc/, 'usd');
        const cacheKey = `${fromFixed}2${toFixed}`;

        if (this.rateCache && this.rateCache[cacheKey]
            && Date.now() - this.rateCache[cacheKey].timestamp < CACHE_DURATION) {
            return this.rateCache[cacheKey].rate;
        }
        // Lógica para obtener la tasa de cambio desde CoinGecko, Binance, etc.
        const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
            params: { ids: fromFixed, vs_currencies: toFixed },
        });
        this.rateCache = this.rateCache || {};
        this.rateCache[`${fromFixed}2${toFixed}`] = {
            rate: response?.data[fromFixed][toFixed] || 1,// Default: 1 si no hay tasa de cambio
            timestamp: Date.now(),
        };
        return this.rateCache[cacheKey].rate;
    }
    /**
     * Convierte cualquier moneda a USD
     * @param {string} currency - Moneda origen (e.g., BTC, USDT, EUR)
     * @param {number} amount - Cantidad a convertir
     * @returns {Promise<number>} - Monto convertido a USD
     */
    async convertToUSD(currency: string, amount: number = 1) {
        if (!amount || currency.toUpperCase() === 'USD') return amount;



        try {
            let rate = await this.getRateToUSD(currency);
            if (rate) {
                return rate * amount;
            }
        } catch (error) {
            console.error(`Error obteniendo la tasa de cambio a USD: ${(error as Error).message}`);
        }

        return 0; // Retornar 0 en caso de fallo
    }

    /**
     * Obtiene la tasa de cambio hacia USD desde APIs externas
     * @param {string} currency - Moneda origen
     * @returns {Promise<number|null>} - Tasa de cambio hacia USD
     */
    async getRateToUSD(currency: string) {
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
            console.error(`Error obteniendo tasa de BTC a USD: ${(error as Error).message}`);
        }
        return null;
    }

    /**
     * Tasa de cambio de monedas fiat o cripto a USD
     * @param {string} currency - Moneda origen
     * @returns {Promise<number|null>} - Tasa de cambio hacia USD
     */
    async getFiatOrCryptoToUSD(currency: string) {
        const url = `https://api.coingecko.com/api/v3/simple/price?ids=${currency.toLowerCase()}&vs_currencies=usd`;
        try {
            const response = await axios.get(url);
            if (response.data && response.data[currency.toLowerCase()] && response.data[currency.toLowerCase()].usd) {
                return response.data[currency.toLowerCase()].usd;
            }
        } catch (error) {
            console.error(`Error obteniendo tasa de ${currency} a USD: ${(error as Error).message}`);
        }
        return null;
    }
}
export default new CurrencyHelper();
