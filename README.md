
# 🚀 **CryptoMoneytor**

### 🧐 **El Vigilante de Pagos en Criptomonedas**
**CryptoMoneytor** es un servicio modular, escalable y de alto rendimiento diseñado para monitorear transacciones entrantes en múltiples redes blockchain en tiempo real. Su misión es ayudarte a **rastrear fondos**, **detectar eventos clave** y **recibir notificaciones precisas** con un esquema uniforme y flexible. Este servicio permite construir el mecanismo para el IPN (Instant Payment Notifications) para construir un gateway de pagos con criptomonedas. 

Con soporte para redes como **TRON (TRX, USDT)**, **Ethereum (ERC20)**, **Polygon (USDT)**, **Ripple (XRP)**, **BNB Smart Chain**, **Arbitrum**, y **Bitcoin (BTC)**, **CryptoMoneytor** es la herramienta que necesitas para mantener tus transacciones bajo control.

---

## 📋 **Tabla de Contenidos**

1. [Descripción General](#descripción-general)
2. [Características Principales](#características-principales)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Configuración y Ejecución](#configuración-y-ejecución)
5. [Soporte de Redes Blockchain](#soporte-de-redes-blockchain)
6. [Optimización y Uso de Recursos](#optimización-y-uso-de-recursos)
7. [Documentación Swagger](#documentación-swagger)
8. [Contribuciones](#contribuciones)
9. [Licencia](#licencia)

---

## 🧐 **Descripción General**

**CryptoMoneytor** hace honor a su nombre al actuar como un **vigilante de tus transacciones cripto**. Diseñado con una arquitectura modular, permite monitorear wallets en tiempo real y enviar notificaciones mediante webhooks cuando ocurren eventos importantes como:
- **Nuevas transacciones** (`new_transaction`).
- **Actualizaciones de confirmaciones** (`update_transaction`).
- **Confirmaciones completas** (`confirmed_transaction`).

Este servicio es altamente **escalable** y puede integrarse fácilmente en aplicaciones financieras, exchanges y plataformas de monitoreo.

---

## 🌟 **Características Principales**

- **Soporte Multi-Blockchain:**
  - Redes soportadas: **TRON (TRX, USDT)**, **Ethereum (ERC20)**, **Polygon (USDT)**, **Ripple (XRP)**, **BNB Smart Chain**, **Arbitrum**, y **Bitcoin (BTC)**.

- **Esquema Uniforme de Webhooks:**
  Permite definir un callback URL específico al suscribir una wallet o usar una URL genérica del entorno.

  Payload del Webhook:
  ```json
  {
    "wallet": "0xTuWallet",
    "event": "new_transaction",
    "data": {
      "txID": "abcd1234",
      "amount": "10",
      "amountUSD": "20",
      "coin": "USDT",
      "coinfirmed": false,
      "confirmations": 2,
      "address": "0xFromAddress",
      "fee": "0.001",
      "network": "TRON",
      "sowAt": "2024-12-18T10:00:00.000Z",
      "type": "CRD"
    }
  }
  ```

- **Conversión a USD en Tiempo Real:**
  Calcula automáticamente el equivalente en USD para cada transacción utilizando APIs externas.

- **Optimización con Redis:**
  - Caché en Redis para compartir entre instancias.
  - Fallback en memoria local para resiliencia.

- **Suscripción WebSocket para BTC:**
  Monitoreo en tiempo real, con fallback a polling si se pierde la conexión WebSocket.

---

## 📂 **Estructura del Proyecto**

```plaintext
CryptoMoneytor/
│
├── app/                     # Código principal de la aplicación
│   └── index.js             # Punto de entrada del servidor
│
├── config/                  # Configuración de la aplicación
│   ├── redis.js             # Configuración de Redis
│   ├── apiKeys.js           # Claves API para redes blockchain
│   └── swagger.json          # Definicion de la API
│
├── helpers/                 # Utilidades y funciones auxiliares
│   ├── apiKeyHelper.js      # Manejador de claves API
│   ├── cacheHelper.js       # Funciones de caché (Redis y fallback)
│   ├── currencyHelper.js    # Conversión de monedas a USD
│   └── tronHelper.js        # Conexión con TronGrid/TronScan
│
├── routes/                  # Endpoints de la API REST
│   ├── walletSubscribe.js   # Suscripción de wallets
│   ├── walletSubscriptions.js # Listado de wallets suscritas
│   └── walletUnsubscribe.js # Desuscripción de wallets
│
├── services/                # Lógica de negocio principal
│   ├── monitor.js           # Servicio general de monitoreo
│   ├── webhook.js           # Manejador de notificaciones webhook
│   ├── multiChainService.js # Servicios relacionados con múltiples redes
│   ├── handlers/            # Manejadores específicos por red/moneda
│   │   ├── arbitrumUsdt.js  # Manejador de Arbitrum USDT
│   │   ├── bnbUsdt.js       # Manejador de BNB Smart Chain USDT
│   │   ├── btc.js           # Manejador de Bitcoin
│   │   ├── ethereumEth.js   # Manejador de Ethereum (ETH)
│   │   ├── ethereumUsdt.js  # Manejador de USDT en Ethereum (ERC20)
│   │   ├── polygonUsdt.js   # Manejador de USDT en Polygon
│   │   ├── rippleXrp.js     # Manejador de Ripple (XRP)
│   │   ├── tronTrx.js       # Manejador de TRON (TRX)
│   │   ├── tronUsdt.js      # Manejador de USDT en TRON
│
├── scripts/                 # Scripts útiles para despliegue/automatización
│   └── build.sh             # Script para construir el proyecto
├── tests/
│   └── setup.mjs             # Setup de las pruebas con Mocha
│   ├── unit/
│   │   ├── redis.spec.mjs
│   │   ├── cache.spec.mjs
│   │   ├── webhook.spec.mjs
│   │   └── ...
│   └── integration/
│       ├── walletSubscribe.spec.mjs
│       ├── walletUnsubscribe.spec.mjs
│       └── walletSubscriptions.spec.mjs
│
├── docker-compose.yml       # Configuración de Docker Compose
├── Dockerfile               # Dockerfile principal
├── LICENSE                  # Licencia del proyecto
└── README.md                # Documentación principal
```

---

## ⚙️ **Configuración y Ejecución**

### **1. Configurar Variables de Entorno**
Crea un archivo **`.env`** basado en este ejemplo:

```dotenv
# Configuración general
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379

# Redes soportadas y confirmaciones máximas
TRON_MAX_CONFIRMATIONS=41
ERC20_MAX_CONFIRMATIONS=12
POLYGON_MAX_CONFIRMATIONS=12
XRP_MAX_CONFIRMATIONS=6
BEP20_MAX_CONFIRMATIONS=12
ARBITRUM_MAX_CONFIRMATIONS=12
BTC_MAX_CONFIRMATIONS=6

# Claves API para servicios multi-chain
MULTICHAIN_API_KEYS=your_multichain_api_keys_comma_separated

#Claves API para servicios de TRONGRID
TRONGRID_API_KEYS=your_trongrid_api_keys_comma_separated
#Claves API para servicios de TRONSCAN
TRONSCAN_API_KEYS=your_tronscan_api_keys_comma_separated 

# Dirección del contrato para USDT (Ethereum y compatibles)
USDT_CONTRACT_ADDRESS=0xdac17f958d2ee523a2206206994597c13d831ec7

# Intervalos de sondeo (en milisegundos)
POLLING_INTERVAL_ACTIVE=30000
POLLING_INTERVAL_IDLE=3600000

# Duración de la caché de monedas (en minutos)
CURRENCY_CACHE_MINUTE_DURACTION=60

# Otras configuraciones opcionales
LOG_LEVEL=info

#Url webhook a donde se deben enviar las notificaciones
WEBHOOK_URL=https://your-webhook-url.com
```

### **2. Construir y Levantar el Proyecto**
Usa Docker Compose para iniciar el servicio:
```bash
docker-compose up --build
```

### **3. Comenzar a Monitorear una Wallets**
Haz una solicitud `POST` al endpoint:
```json
curl -X POST http://localhost:3000/api/subscribe 
-H "Content-Type: application/json" 
-d '{
       "network": "tron",
       "coin": "trx",
       "wallet": "TXYZ1234567890",
       "callbackUrl": "https://your-callback-url.com"
    }'
```
### **4. Listar Wallets a Monitoreadas**
Haz una solicitud `GET` al endpoint:
```json
curl -X GET http://localhost:3000/api/subscribtions
```
### **5. Dejar de Monitoriar una Wallet**
Haz una solicitud `DELETE` al endpoint pasando en el path el address de la wallet:
```json
curl -X DELETE http://localhost:3000/api/:walletAddress 
```

---

## 🌐 **Documentación Swagger**

Accede a la documentación completa de la API en Swagger visitando:
```
http://localhost:3000/api-docs
```

---
---

## 📊 **Flujo del Sistema**

Para entender mejor el flujo del servicio, consulta el siguiente diagrama:

![Flujo del Servicio](diagram.png)

---

## 🤝 **Contribuciones**

¡Las contribuciones son bienvenidas! Si deseas agregar soporte para nuevas redes o mejorar la lógica existente, siéntete libre de abrir un **issue** o enviar un **pull request**.

---

## 📝 **Licencia**

Este proyecto está bajo la licencia **MIT**.

------
TAMBIÉN PUEDES REGÁLAME UN CAFECITO 
👉 [https://ko-fi.com/rrortega](https://ko-fi.com/rrortega)