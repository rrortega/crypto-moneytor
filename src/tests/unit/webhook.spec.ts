import { expect } from 'chai';
import sinon from 'sinon';
import axios, { AxiosRequestConfig } from 'axios';
import http, { Server } from 'http';

import cache from '../../app/helpers/cacheHelper.js';
import webhook from '../../app/services/webhook.js';

// Configuración del entorno de pruebas
const TEST_PORT = 9999;
const TEST_WEBHOOK_URL = `http://localhost:${TEST_PORT}/fake-webhook`;

// Sobrescribimos la URL genérica de .env con la de pruebas
process.env.WEBHOOK_URL = TEST_WEBHOOK_URL;

let server: Server | null = null;
let requests: Array<any> = [];

// Stubs de cache
let cacheGetStub: sinon.SinonStub<[key: string], Promise<any>>;
let cacheSetStub: sinon.SinonStub<[key: string, value: any, expiration?: number], Promise<void>>;
// Stub de axios.post
let postStub: sinon.SinonStub<[url: string, data?: unknown, config?: AxiosRequestConfig], Promise<unknown>>;

describe('Servicio de Webhook', function () {
  // Opcional: Desactiva la ejecución en paralelo en Mocha (si estás usando Mocha >= v10 con el flag --parallel)
  // this.parallel(false);

  before(async () => {
    // Creamos el servidor de pruebas
    server = http.createServer((req, res) => {
      if (req.url === '/fake-webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            requests.push(JSON.parse(body));
          } catch (error) {
            console.error('Error parseando body en el servidor de prueba:', error);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    // Esperamos a que el servidor levante realmente
    await new Promise<void>((resolve) => {
      server!.listen(TEST_PORT, () => {
        console.log(`(Test) Servidor escuchando en puerto ${TEST_PORT}`);
        resolve();
      });
    });
  });

  after(async () => {
    // Cerramos el servidor al final
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => {
          console.log('(Test) Servidor cerrado');
          resolve();
        });
      });
    }
  });

  beforeEach(() => {
    // Reiniciamos el array de requests y creamos stubs limpios
    requests = [];
    cacheGetStub = sinon.stub(cache, 'get');
    cacheSetStub = sinon.stub(cache, 'set').resolves();
    postStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    // Restauramos todos los stubs/spies a su comportamiento original
    sinon.restore();
  });

  it('debería enviar un webhook correctamente', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    // Al no existir nada en cache, get() retornará null
    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves(null);

    postStub.resolves({ status: 200 });

    await webhook.send(data);

    // Verificamos que se hizo 1 request al servidor
    expect(requests).to.have.lengthOf(1);
    // El body del POST debe coincidir con 'data'
    expect(requests[0]).to.deep.equal(data);

    // Verificamos que se haya guardado en cache
    sinon.assert.calledOnceWithExactly(
      cacheSetStub,
      `webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`,
      JSON.stringify({ confirmations: 1, attempts: 1 }),
      3600
    );
  });

  it('debería manejar un error al enviar un webhook', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves(null);

    // Forzamos un error en axios.post
    postStub.rejects(new Error('Error al enviar el webhook'));

    await webhook.send(data);

    // Se llamó una sola vez a axios.post
    sinon.assert.calledOnce(postStub);

    // Como falló el envío, el servidor de prueba no recibió nada
    expect(requests).to.have.lengthOf(0);

    // Verificamos que se actualizó la cache con attempts=1
    sinon.assert.calledOnceWithExactly(
      cacheSetStub,
      `webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`,
      JSON.stringify({ confirmations: 1, attempts: 1 }),
      3600
    );
  });

  it('debería reintentar si el webhook falla en la primera llamada y tiene éxito en la segunda', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves(null);

    // Simulamos que la primera llamada falla y la segunda es exitosa
    postStub
      .onFirstCall().rejects(new Error('Error al enviar el webhook'))
      .onSecondCall().resolves({ status: 200 });

    await webhook.send(data);

    // Tras los reintentos, debe haber 1 request exitosa
    expect(requests).to.have.lengthOf(1);
    expect(requests[0]).to.deep.equal(data);
  });

  it('debería evitar duplicados si los datos ya están en caché', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    // Simulamos que en cache existe la info con attempts=3
    const cachedValue = JSON.stringify({ confirmations: 1, attempts: 3 });
    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}:${TEST_WEBHOOK_URL}`).resolves(cachedValue);

    await webhook.send(data);

    // Como ya llegó al límite (o se considera duplicado), no debe haber requests
    expect(requests).to.have.lengthOf(0);
    // Ni tampoco se setea nada en cache
    sinon.assert.notCalled(cacheSetStub);
  });
});
