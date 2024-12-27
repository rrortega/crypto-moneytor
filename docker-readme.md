# 🚀 CryptoMoneytor

A modular, scalable, and high-performance service designed to monitor incoming transactions across multiple blockchain networks in real-time. Perfect for building Instant Payment Notification (IPN) systems and cryptocurrency payment gateways.

## 🌟 Key Features

- **Multi-Blockchain Support**: 
  - TRON (TRX, USDT)
  - Ethereum (ERC20)
  - Polygon (USDT)
  - Ripple (XRP)
  - BNB Smart Chain
  - Arbitrum
  - Bitcoin (BTC)

- **Uniform Webhook Schema**
  ```json
  {
    "wallet": "0xYourWallet",
    "event": "new_transaction",
    "data": {
      "txID": "abcd1234",
      "amount": "10",
      "amountUSD": "20",
      "coin": "USDT",
      "confirmed": false,
      "confirmations": 2,
      "address": "0xFromAddress",
      "fee": "0.001",
      "network": "TRON",
      "sowAt": "2024-12-18T10:00:00.000Z",
      "type": "CRD"
    }
  }
  ```

- **Real-time USD Conversion**
- **Redis Caching with Local Memory Fallback**
- **BTC WebSocket Subscription with Polling Fallback**
- **Swagger Documentation**

## 🚀 Quick Start

### Using Docker Compose

```yaml
version: '3.7'

services:
  observer:
    image: rrortega/cryptomoneytor:latest
    restart: always
    ports:
      - "3000:3000"
    environment:
      PORT: 3000
      REDIS_HOST: redis
      REDIS_PORT: 6379
      TRON_MAX_CONFIRMATIONS: 41
      ERC20_MAX_CONFIRMATIONS: 12
      POLYGON_MAX_CONFIRMATIONS: 12
      XRP_MAX_CONFIRMATIONS: 6
      BEP20_MAX_CONFIRMATIONS: 12
      ARBITRUM_MAX_CONFIRMATIONS: 12
      BTC_MAX_CONFIRMATIONS: 6
      MULTICHAIN_API_KEYS: "apikey1,apikey2"
      TRONGRID_API_KEYS: "trongridkey1,trongridkey2"
      TRONSCAN_API_KEYS: "tronscankey1,tronscankey2"
      USDT_CONTRACT_ADDRESS: "0xdac17f958d2ee523a2206206994597c13d831ec7"
      CACHE_MODE: REDIS
      POLLING_INTERVAL_ACTIVE: 30000
      POLLING_INTERVAL_IDLE: 3600000
      WEBHOOK_URL: "https://your-webhook-url.com"
    depends_on:
      - redis

  redis:
    image: redis:alpine
    restart: always
```

## 📡 API Usage

### 1. Monitor a Wallet
```bash
curl -X POST http://localhost:3000/api/subscribe \
-H "Content-Type: application/json" \
-d '{
       "network": "tron",
       "coin": "trx",
       "wallet": "TXYZ1234567890",
       "callbackUrl": "https://your-callback-url.com"
    }'
```

### 2. List Monitored Wallets
```bash
curl -X GET http://localhost:3000/api/subscriptions
```

### 3. Stop Monitoring
```bash
curl -X DELETE http://localhost:3000/api/:walletAddress
```

## 📚 Documentation

Access the complete Swagger documentation at:
```
http://localhost:3000/api-docs
```

## 💡 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| REDIS_HOST | Redis host | redis |
| REDIS_PORT | Redis port | 6379 |
| CACHE_MODE | Cache mode (REDIS/MEMORY) | REDIS |
| WEBHOOK_URL | Default webhook URL | - |
| POLLING_INTERVAL_ACTIVE | Active polling interval (ms) | 30000 |
| POLLING_INTERVAL_IDLE | Idle polling interval (ms) | 3600000 |

## 🤝 Support

- GitHub Issues: [CryptoMoneytor Issues](https://github.com/rrortega/crypto-moneytor/issues)
- Buy me a coffee: [Ko-fi](https://ko-fi.com/rrortega)

## 📄 License

MIT License

