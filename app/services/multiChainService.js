const axios = require('axios');
const networks = require('../config/networks.json');
const ApiKeyHelper = require('../helpers/apiKeyHelper');

class MultiChainService {
    constructor(serviceName, apiKeys, maxRequests, resetInterval) {
        // Inicia el manejador de claves API para el servicio específico
        this.ApiKeyHelper = new ApiKeyHelper(serviceName, apiKeys, maxRequests, resetInterval);
    }
    static ETHEREUM_MAINNET = 1;
    static POLYGON_MAINNET = 137;
    static BNB_SMART_CHAIN_MAINNET = 56;
    static ARBITRUM_ONE_MAINNET = 42161;

    async getNetworkConfig(chainId) {
        const network = networks.find(net => net.chainid === chainId.toString());
        if (!network) {
            throw new Error(`No network configuration found for chainId: ${chainId}`);
        }
        return network;
    }

    async getTransactions(chainId, walletAddress, startBlock = 0, endBlock = 99999999, sort = 'asc') {
        const network = await this.getNetworkConfig(chainId);
        const apiKey = await this.ApiKeyHelper.getAvailableKey(); // Obtiene una clave disponible

        try {
            const response = await axios.get(network.apiurl, {
                params: {
                    chainid: chainId,
                    apikey: apiKey,
                    address: walletAddress,
                    module: 'account',
                    action: 'txlist',
                    startblock: startBlock,
                    endblock: endBlock,
                    sort: sort,
                },
            });

            if (response.data && response.data.status === '1') {
                // Incrementar el contador de uso de la clave
                await this.ApiKeyHelper.incrementKeyUsage(apiKey);
                return response.data.result; // Retorna las transacciones
            } else {
                throw new Error(response.data.message || 'Failed to fetch transactions');
            }
        } catch (error) {
            console.error(`Error fetching transactions for chainId ${chainId}:`, error.message);
            throw error;
        }
    }
}

module.exports = MultiChainService;
