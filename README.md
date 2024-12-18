
# 🚀 **CryptoMoneytor**

### **Monitoreo de Transacciones Cripto en Tiempo Real con Node.js, Redis y TronGrid**

---

### 📋 **Descripción del Proyecto**

**Crypto Monitor Service** es un servicio modular escrito en **Node.js** que permite monitorear wallets en múltiples redes blockchain (como **TRON/TRC20**, **Bitcoin**, **Ethereum/ERC20**) de manera eficiente utilizando **polling manual**.  

Este servicio:
- **Monitorea direcciones** con intervalos inteligentes:
   - **30 segundos** si hay facturas activas (vivas).
   - **1 hora** si no hay facturas activas.
- **Envia webhooks** ante los siguientes eventos:
   - Detección de una nueva transacción.
   - Actualización de confirmaciones hasta el límite configurado.
- Es **escalable**, ya que utiliza **Redis** como sistema de almacenamiento y caché compartida.
- Tiene un diseño **extensible** que soporta múltiples redes mediante **manejadores específicos**.

---

### 🔧 **Características Principales**

1. **Monitoreo Inteligente**:
   - Intervalos dinámicos según el estado de las wallets.

2. **Modularidad por Red**:
   - Cada red blockchain tiene su propio manejador (`TRON/TRC20`, `Bitcoin`, `Ethereum`).

3. **Integración con Redis**:
   - Uso eficiente de memoria y estado compartido.

4. **Webhook Integrado**:
   - Notifica a un endpoint externo cuando detecta eventos importantes.

5. **Configuración Flexible**:
   - Personalizable mediante un archivo **`.env`**.

6. **Listo para Producción**:
   - Configurado para ser escalable con **Docker Compose** y balanceo de carga.

---

### 📂 **Estructura del Proyecto**

\`\`\`plaintext
crypto-monitor/
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
│   │   ├── webhook.js         # Webhook sender
│   │   ├── handlers/          # Manejadores específicos por red
│   │   │   ├── tron-usdt.js   # Manejador TRC20
│   │   │   ├── btc.js         # Manejador Bitcoin
│   │   │   └── eth-erc20.js   # Manejador Ethereum
└── package.json               # Dependencias
\`\`\`

---

### ⚙️ **Configuración y Ejecución Local**

1. **Clonar el repositorio**:
   \`\`\`bash
   git clone https://github.com/tuusuario/crypto-monitor.git
   cd crypto-monitor
   \`\`\`

2. **Instalar dependencias**:
   \`\`\`bash
   npm install
   \`\`\`

3. **Configurar las variables de entorno**:
   Crea un archivo **`.env`** en la raíz del proyecto con el siguiente contenido:

   \`\`\`dotenv
   # Configuración general
   PORT=3000
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379

   # TRC20 Configuración
   TRON_MAX_CONFIRMATIONS=41
   TRON_FULL_NODE=https://api.trongrid.io

   # Intervalos de monitoreo
   POLLING_INTERVAL_ACTIVE=30000   # 30 segundos
   POLLING_INTERVAL_IDLE=3600000   # 1 hora

   # Webhook
   WEBHOOK_URL=http://localhost:4000/webhook
   \`\`\`

4. **Iniciar Redis en local**:
   Asegúrate de tener Redis instalado y corriendo:

   \`\`\`bash
   redis-server
   \`\`\`

5. **Iniciar el servicio**:
   \`\`\`bash
   node index.js
   \`\`\`

6. **Agregar wallets a monitorear**:

   - **POST** \`http://localhost:3000/api/wallets\`
   - **Body JSON**:
     \`\`\`json
     {
       "network": "tron",
       "coin": "usdt",
       "wallet": "TXYZ1234567890"
     }
     \`\`\`

---

### 🐳 **Despliegue con Docker Compose**

Si prefieres desplegarlo usando Docker:

1. **Construir y levantar los contenedores**:
   \`\`\`bash
   docker-compose up --build
   \`\`\`

2. **Agregar wallets** usando el mismo endpoint.

---

### 🔗 **Endpoints API**

| Método | Ruta             | Descripción                           |
|--------|------------------|---------------------------------------|
| POST   | \`/api/wallets\`   | Agregar una wallet a monitorear.      |

---

### 🚦 **Flujo de Ejecución**

1. Se agrega una wallet mediante el **endpoint API**.
2. El sistema inicia el **polling** para monitorear la red correspondiente.
3. Detecta eventos como:
   - **Nueva transacción**.
   - **Confirmaciones** de la transacción.
4. Envía un **webhook** al servicio configurado con los datos del evento.
5. Si no hay wallets activas, el polling se ajusta a **1 hora**.

---

### 📜 **Ejemplo de Webhook**

El servicio enviará un JSON similar a este:

\`\`\`json
{
  "wallet": "TXYZ1234567890",
  "event": "new_transaction",
  "data": {
    "txID": "abcd1234",
    "amount": "10 USDT",
    "confirmations": 1
  }
}
\`\`\`

---

### 🛠️ **Tecnologías Utilizadas**

- **Node.js**: Lógica principal.
- **Redis**: Almacenamiento temporal y estado compartido.
- **TronGrid**: API para TRC20 (TRON).
- **Docker**: Contenerización del servicio.
- **Docker Compose**: Escalabilidad horizontal.

---

### 🤝 **Contribuciones**

¡Las contribuciones son bienvenidas! Siéntete libre de abrir un **issue** o enviar un **Pull Request**.

---

### 📝 **Licencia**

Este proyecto está bajo la licencia **MIT**. Consulta el archivo \`LICENSE\` para más detalles.

---

### 📧 **Contacto**

Si tienes alguna duda o sugerencia, contáctame en:

- **GitHub**: [https://github.com/rrortega](https://github.com/rrortega)
- **Email**: rolymayo11@gmail.com
