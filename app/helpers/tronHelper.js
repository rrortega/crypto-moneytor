const axios = require('axios');
const CurrencyHelper = require('./currencyHelper'); // Servicio de conversión 
const ApiKeyHelper = require('./apiKeyHelper'); // Manejador de API Keys


class TronHelper {
  constructor() { 
    if (TronHelper.instance) {
      return TronHelper.instance; // Devuelve la instancia existente
    }


    this.apiKeyTrongridManager = new ApiKeyHelper('trongrid', process.env.TRONGRID_API_KEYS.split(',')); // TronGrid API Keys
    this.apiKeyTronscanManager = new ApiKeyHelper('tronscan', process.env.TRONSCAN_API_KEYS.split(',')); // TronScan API Keys

    this.tronGridBaseURL = 'https://api.trongrid.io';
    this.tronScanBaseURL = 'https://apilist.tronscanapi.com';

    this.currentBlockCache = {
      blockNumber: null,
      timestamp: null,
    };

    TronHelper.instance = this; // Guarda la instancia para futuros usos
  }
  static transactionInfo = {};
  static instance = null; 

  /**
   * Procesa transacciones usando TronScan como preferencia y TronGrid como respaldo.
   * @param {string} walletAddress Dirección de la billetera.
   * @returns {Promise<Array>} Lista de transacciones procesadas.
   */
  async getIncomingTransactions(walletAddress) {
    try {
      const transactions = await this.getIncomingTransactionsFromTronScan(walletAddress);
      return transactions;
    } catch (tronScanError) {
      console.warn('Fallo TronScan, intentando con TronGrid...', tronScanError);
      const transactions = await this.getIncomingTransactionsFromTronGrid(walletAddress);
      return transactions;
    }
  }

  /**
   * Obtiene transacciones de TronScan, con lógica recursiva para manejar solicitudes públicas y con `apiKey`.
   * @param {string} walletAddress Dirección de la billetera.
   * @param {boolean} useApiKey Si debe usar `apiKey` en la solicitud (por defecto, false).
   * @returns {Promise<object[]>} Lista de transacciones transformadas de TronScan.
   */
  async getIncomingTransactionsFromTronScan(walletAddress, useApiKey = false) {
    const headers = { 'Content-Type': 'application/json' };
    let apiKey;

    // Agregar apiKey si se requiere
    if (useApiKey) {
      apiKey = await this.apiKeyTronscanManager.getAvailableKey();
      headers['TRON-PRO-API-KEY'] = apiKey;
    }

    try {
      const response = await axios.get(`${this.tronScanBaseURL}/api/token_trc20/transfers`, {
        headers,
        params: {
          sort: '-timestamp',
          count: true,
          limit: 20,
          start: 0,
          toAddress: walletAddress,
          confirm: false, // Devolver todas, no solo confirmadas
        },
      });

      if (response.status >= 400) {
        throw new Error(response.statusText);
      }

      // Incrementar el uso de la clave solo si se usó
      if (useApiKey) {
        this.apiKeyTronscanManager.incrementKeyUsage(apiKey);
      }
      if (!response?.data?.token_transfers) {
        throw new Error(`TronScan ha respondido con :\n${response.data}`);
      }
      // Transformar y devolver las transacciones
      const list = [];
      for (let i in response.data.token_transfers) {
        const tx = await this._transformTronScanTransaction(response.data.token_transfers[i]);
        list.push(tx);
      };
      return list;
    } catch (error) {
      // Si falla sin apiKey, intentar nuevamente con apiKey
      if (!useApiKey) {
        console.warn('La solicitud pública falló, intentando con apiKey:', error.message);
        return this.getIncomingTransactionsFromTronScan(walletAddress, true);
      }

      // Si falla incluso con apiKey, lanzar el error
      throw new Error(`Error al obtener transacciones de TronScan: ${error.message}`);
    }
  }

  /**
   * Obtiene transacciones de TronGrid.
   * @param {string} walletAddress Dirección de la billetera.
   * @returns {Promise<object>} Respuesta de TronGrid con las transacciones.
   */
  async getIncomingTransactionsFromTronGrid(walletAddress) {
    const apiKey = await this.apiKeyTrongridManager.getAvailableKey();
    try {
      const response = await axios.get(
        `${this.tronGridBaseURL}/v1/accounts/${walletAddress}/transactions/trc20`,
        {
          headers: { 'TRON-PRO-API-KEY': apiKey },
          params: { limit: 50, only_to: true },
        }
      );
      this.apiKeyTrongridManager.incrementKeyUsage(apiKey);
      return response.data.map(this._transformTronGridTransaction);
    } catch (error) {
      throw new Error(`Error al obtener transacciones de TronGrid: ${error.message}`);
    }
  }



  /**
 * Obtiene el bloque más reciente, usando fallback entre TronScan y TronGrid con caching temporal.
 * @returns {Promise<number>} El número del bloque más reciente.
 */
  async getCurrentBlock() {
    const CACHE_DURATION = 60 * 1000; // 1 minuto en milisegundos

    // Verificar si el bloque en caché es reciente
    if (
      this.currentBlockCache.blockNumber &&
      Date.now() - this.currentBlockCache.timestamp < CACHE_DURATION
    ) {
      return this.currentBlockCache.blockNumber;
    }

    try {
      // Intentar primero con TronScan
      const tronScanResponse = await axios.get('https://apilist.tronscanapi.com/api/block', {
        params: {
          sort: '-timestamp',
          start: 0,
          limit: 1,
        },
      });

      const latestBlock = tronScanResponse.data.data[0]?.number;
      if (latestBlock) {
        // Actualizar el caché con el bloque de TronScan
        this.currentBlockCache = {
          blockNumber: latestBlock,
          timestamp: Date.now(),
        };
        return latestBlock;
      }
    } catch (tronScanError) {
      console.warn('Error al obtener bloque de TronScan, intentando con TronGrid:', tronScanError.message);
    }

    // Si TronScan falla, intentar con TronGrid
    try {
      const apiKey = await this.apiKeyTrongridManager.getAvailableKey();
      const tronGridResponse = await axios.get(`${this.tronGridBaseURL}/wallet/getnowblock`, {
        headers: { 'TRON-PRO-API-KEY': apiKey },
      });

      const latestBlock = tronGridResponse.data.block_header.raw_data.number;
      if (latestBlock) {
        // Actualizar el caché con el bloque de TronGrid
        this.currentBlockCache = {
          blockNumber: latestBlock,
          timestamp: Date.now(),
        };

        this.apiKeyTrongridManager.incrementKeyUsage(apiKey);
        return latestBlock;
      }
    } catch (tronGridError) {
      throw new Error(`Error al obtener el bloque actual: ${tronGridError.message}`);
    }

    throw new Error('No se pudo obtener el bloque más reciente de ninguna API.');
  }

  async getTransactionInfo(txID) {
    if (TronHelper.transactionInfo[txID] ?? false)
      return TronHelper.transactionInfo[txID];

    const apiKey = await this.apiKeyTrongridManager.getAvailableKey();
    try {
      const response = await axios.post(`${this.tronGridBaseURL}/wallet/gettransactioninfobyid`,
        { value: txID }, // Asegúrate de enviar el JSON correcto
        {
          headers: {
            'TRON-PRO-API-KEY': apiKey,
            'Content-Type': 'application/json'
          },
        });
      this.apiKeyTrongridManager.incrementKeyUsage(apiKey);
      TronHelper.transactionInfo[txID] = response.data;
      return TronHelper.transactionInfo[txID];
    } catch (error) {
      throw new Error(`Error al obtener el bloque actual: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
 * Calcula el fee en la moneda de la transacción.
 * @param {object} txInfo Información de la transacción proporcionada por getTransactionInfo.
 * @param {string} targetCoin La moneda objetivo (por ejemplo, 'USDT', 'TRX').
 * @returns {Promise<number>} Fee en la moneda objetivo.
 */
  async calculateFee(txInfo, targetCoin) {
    try {
      // Obtener el fee en TRX
      const netFeeInTRX = txInfo.fee / 1e6; // Convertir de Sun a TRX
      const energyPenaltyInTRX = (txInfo.receipt.energy_penalty_total || 0) / 1e6; // Penalización de energía, si aplica

      // Fee total en TRX
      const totalFeeInTRX = netFeeInTRX + energyPenaltyInTRX;

      if (targetCoin === 'TRX') {
        // Si la moneda objetivo es TRX, no es necesario convertir
        return totalFeeInTRX;
      }

      // Convertir el fee total a la moneda objetivo
      const feeInTargetCoin = await CurrencyHelper.convert('TRX', targetCoin, totalFeeInTRX);
      return feeInTargetCoin ?? 0;
    } catch (error) {
      console.error(`Error calculando el fee hacia ${targetCoin}:`, error.message);
      return 0;
    }
  }

  /**
   * Calcula las confirmaciones de una transacción.
   * @param {number} txID El número del bloque de la transacción.
   * @returns {Promise<number>} La cantidad de confirmaciones.
   */
  async getConfirmations(txID) {
    const info = await this.getTransactionInfo(txID);
    const currentBlockNumber = await this.getCurrentBlock();
    return currentBlockNumber - info.blockNumber;
  }




  /**
   * Procesa las transacciones relacionadas con una billetera.
   * @param {Array} transactions Lista de transacciones.
   * @returns {Promise<Array>} Lista de transacciones con confirmaciones calculadas.
   */
  async processTransactions(transactions) {
    const transformedTransactions = [];
    for (const tx of transactions) {
      const txID = tx.transaction_id ?? tx.txID ?? tx.id;
      const info = await this.getTransactionInfo(txID);
      const fee = await this.calculateFee(info, tx?.token_info?.symbol ?? 'USDT');
      const confirmations = await this.getConfirmations(txID);
      transformedTransactions.push({
        ...tx,
        txID: txID,
        fee: fee,
        blockNumber: info.blockNumber,
        confirmations: confirmations,
        confirmed: (tx.confirmed ?? false) ? true : confirmations >= (process.env.TRON_MAX_CONFIRMATIONS || 30)
      });
    }
    return transformedTransactions;
  }
  /**
   * Transforma la estructura de una transacción de TronScan.
   * @param {object} transaction Transacción de TronScan.
   * @returns {object} Transacción normalizada.
   */
  async _transformTronScanTransaction(transaction) {

    let confirmations = 0;
    try {
      const currentBlockNumber = await this.getCurrentBlock(); // Obtener el bloque más reciente
      confirmations = Math.max(0, currentBlockNumber - transaction.block); // Calcular confirmaciones
    } catch (error) {
      console.error('Error al calcular confirmaciones:', error.message);
    }
    let fee = 0;
    try {
      const info = await this.getTransactionInfo(transaction.transaction_id);
      fee = await this.calculateFee(info, transaction?.tokenInfo?.tokenAbbr ?? 'USDT');
    } catch (error) {
      console.error('Error al calcular fees:', error.message);
    }

    return {
      id: transaction.transaction_id,
      block: transaction.block,
      from: transaction.from_address,
      to: transaction.to_address,
      amount: parseFloat(transaction.quant) / Math.pow(10, transaction.tokenInfo.tokenDecimal), // Calcular cantidad basada en decimales
      currency: transaction.tokenInfo.tokenAbbr,
      fee: fee, // No hay datos para calcular el fee
      confirmed: transaction.confirmed,
      confirmations: confirmations, // Las confirmaciones se deben calcular por separado
      timestamp: transaction.block_ts,
    };
  }

  /**
   * Transforma la estructura de una transacción de TronGrid.
   * @param {object} transaction Transacción de TronGrid.
   * @returns {object} Transacción normalizada.
   */
  _transformTronGridTransaction(transaction) {
    return {
      id: transaction.transaction_id,
      block: transaction.block_timestamp,
      from: transaction.from,
      to: transaction.to,
      amount: transaction.value / Math.pow(10, transaction.token_info.decimals),
      currency: transaction.token_info.symbol,
      fee: transaction.receipt.net_fee + transaction.receipt.energy_penalty_total,
      confirmed: true, // TronGrid siempre confirma antes de listar
      timestamp: transaction.block_timestamp,
    };
  }
}

module.exports = new TronHelper();
