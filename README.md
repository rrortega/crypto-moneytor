
# 🚀 **CryptoMoneytor**

### 🧐 **El Gran Vigilante de Criptomonedas**
**CryptoMoneytor** es un servicio modular, escalable y de alto rendimiento diseñado para monitorear transacciones en múltiples redes blockchain en tiempo real. Su misión es ayudarte a **rastrear fondos**, **detectar eventos clave** y **recibir notificaciones precisas** con un esquema uniforme y flexible.

Con soporte para redes como **TRON (TRX, USDT)**, **Ethereum (ERC20)**, **Polygon (USDT)**, **Ripple (XRP)** y **Bitcoin (BTC)**, **CryptoMoneytor** es la herramienta que necesitas para mantener tus transacciones bajo control.

---

## 📋 **Tabla de Contenidos**

1. [Descripción General](#descripción-general)
2. [Características Principales](#características-principales)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Configuración y Ejecución](#configuración-y-ejecución)
5. [Soporte de Redes Blockchain](#soporte-de-redes-blockchain)
6. [Pruebas](#pruebas)
7. [Contribuciones](#contribuciones)
8. [Licencia](#licencia)

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
  - Redes soportadas: **TRON (TRX, USDT)**, **Ethereum (ERC20)**, **Polygon (USDT)**, **Ripple (XRP)** y **Bitcoin (BTC)**.
  
- **Esquema Uniforme de Webhooks:**
  Cada evento incluye datos como:
  ```json
  {
    "wallet": "0xTuWallet",
    "event": "new_transaction",
    "data": {
      "txID": "abcd1234",
      "amount": "10",
      "amountUSD": "20",
      "coin": "USDT",
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
  Implementa un caché para reducir solicitudes redundantes y optimizar el rendimiento.

- **Configuración Flexible:**
  Personalizable mediante un archivo `.env`.

- **Despliegue Escalable:**
  Listo para producción con **Docker Compose**.

---

## 📂 **Estructura del Proyecto**

```plaintext
CryptoMoneytor/
│
├── .env                       # Variables de entorno
├── docker-compose.yml         # Configuración Docker
├── Dockerfile                 # Dockerfile principal
├── README.md                  # Documentación del proyecto
│
├── app/
│   ├── index.js               # Punto de entrada del servidor
│   ├── config/
│   │   └── redis.js           # Configuración de Redis
│   ├── helpers/
│   │   └── tronweb.js         # Conexión con TronGrid
│   ├── routes/
│   │   └── wallet.js          # Endpoint API para agregar wallets
│   ├── services/
│   │   ├── monitor.js         # Servicio general de monitoreo
│   │   ├── conversion.js      # Servicio de conversión de monedas
│   │   ├── webhook.js         # Servicio de notificaciones webhook
│   │   ├── handlers/          # Manejadores específicos por red
│   │   │   ├── tron-trx.js    # Manejador TRX
│   │   │   ├── tron-usdt.js   # Manejador TRC20 USDT
│   │   │   ├── eth-erc20.js   # Manejador ERC20 USDT
│   │   │   ├── polygon-usdt.js# Manejador Polygon USDT
│   │   │   └── ripple-xrp.js  # Manejador Ripple XRP
└── package.json               # Dependencias
```

---

## ⚙️ **Configuración y Ejecución**

### **Requisitos Previos**
1. Node.js (v16+)
2. Redis
3. Docker y Docker Compose

### **1. Configurar Variables de Entorno**
Crea un archivo **`.env`** basado en este ejemplo:

```dotenv
# Configuración general
PORT=3000
REDIS_HOST=redis
REDIS_PORT=6379

# Redes soportadas
TRON_MAX_CONFIRMATIONS=41
ERC20_MAX_CONFIRMATIONS=12
POLYGON_MAX_CONFIRMATIONS=12
XRP_MAX_CONFIRMATIONS=6
ETHERSCAN_API_KEY=your_etherscan_api_key
POLYGONSCAN_API_KEY=your_polygonscan_api_key
USDT_CONTRACT_ADDRESS=0xdac17f958d2ee523a2206206994597c13d831ec7
```

### **2. Construir y Levantar el Proyecto**
Usa Docker Compose para iniciar el servicio:
```bash
docker-compose up --build
```

### **3. Agregar Wallets a Monitorear**
Haz una solicitud `POST` al endpoint:
```bash
curl -X POST http://localhost:3000/api/wallets -H "Content-Type: application/json" -d '{"network": "tron", "coin": "trx", "wallet": "TXYZ1234567890"}'
```

---

## 🌐 **Soporte de Redes Blockchain**

| Red       | Moneda   | Confirmaciones Máximas | API Utilizada       |
|-----------|----------|------------------------|---------------------|
| TRON      | TRX, USDT| 41                     | TronGrid            |
| Ethereum  | USDT     | 12                     | Etherscan           |
| Polygon   | USDT     | 12                     | PolygonScan         |
| Ripple    | XRP      | 6                      | Ripple Data API     |
| Bitcoin   | BTC      | 6                      | Blockchain.info     |

---

## 🧪 **Pruebas**

### **1. Transacciones Nuevas**
Verifica que el webhook reciba eventos `new_transaction` para nuevas transacciones.

### **2. Confirmaciones Progresivas**
Asegúrate de que los eventos `update_transaction` se envían al aumentar las confirmaciones.

### **3. Confirmaciones Completas**
Comprueba que el evento `confirmed_transaction` se envía cuando se alcanzan las confirmaciones máximas.

---

## 🤝 **Contribuciones**

¡Las contribuciones son bienvenidas! Si deseas agregar soporte para nuevas redes o mejorar la lógica existente, siéntete libre de abrir un **issue** o enviar un **pull request**.

---

## 📝 **Licencia**

Este proyecto está bajo la licencia **MIT**.
