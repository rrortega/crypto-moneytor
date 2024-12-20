import { expect } from 'chai';
import sinon from 'sinon';
import axios from 'axios';
import cache from '../../app/helpers/cacheHelper.js';
import webhook from '../../app/services/webhook.js';
import http from 'http';

// Configuración del entorno de pruebas
const TEST_WEBHOOK_URL = 'http://localhost:9999/fake-webhook';
process.env.WEBHOOK_URL = TEST_WEBHOOK_URL;

let server;
let requests = [];

describe('Servicio de Webhook', () => {
  let cacheGetStub;
  let cacheSetStub;
  let postStub;

  before((done) => {
    server = http.createServer((req, res) => {
      if (req.url === '/fake-webhook' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          requests.push(JSON.parse(body));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    }).listen(9999, done);
  });

  after((done) => {
    server.close(done);
  });

  beforeEach(() => {
    requests = [];
    cacheGetStub = sinon.stub(cache, 'get');
    cacheSetStub = sinon.stub(cache, 'set').resolves();
    postStub = sinon.stub(axios, 'post');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('debería enviar un webhook correctamente', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves(null);

    postStub.resolves({ status: 200 });

    await webhook.send(data);

    expect(requests).to.have.lengthOf(1);
    expect(requests[0]).to.deep.equal(data);
    sinon.assert.calledOnceWithExactly(
      cacheSetStub,
      `webhook:${data.wallet}:${data.data.txID}`,
      JSON.stringify({ confirmations: 1, attempts: 1 }),
      3600
    );
  });
  it('debería manejar un error al enviar un webhook', async () => {

    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    }; 
    
//preparando para que falle
process.env.MAX_RETRIES = 1;
await cache.set(`wallet:${data.wallet}:callback`,'http://localhost:9999/error-webhook');
    


    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves('http://localhost:9999/error-webhook');

    // Asegúrate de interceptar todas las llamadas a axios.post
    postStub.callsFake(async () => {
      throw new Error('Error al enviar el webhook');
    });

    await webhook.send(data);

    // Confirmar que axios.post fue llamado
    sinon.assert.calledOnce(postStub);

    // Confirmar que no hubo solicitudes reales al servidor de prueba
    expect(requests).to.have.lengthOf(0);

    // Confirmar que la caché fue actualizada
    sinon.assert.calledOnceWithExactly(
      cacheSetStub,
      `webhook:${data.wallet}:${data.data.txID}`,
      JSON.stringify({ confirmations: 1, attempts: 1 }),
      3600
    );
  });

  it('debería reintentar si el webhook falla', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}`).resolves(null);
    cacheGetStub.withArgs(`wallet:${data.wallet}:callback`).resolves(null);

    postStub
      .onFirstCall().rejects(new Error('Error al enviar el webhook'))
      .onSecondCall().resolves({ status: 200 });

    await webhook.send(data);

    expect(requests).to.have.lengthOf(1);
    expect(requests[0]).to.deep.equal(data);
  });

  it('debería evitar duplicados si los datos ya están en caché', async () => {
    const data = {
      wallet: 'billetera-prueba',
      data: { txID: '1234', confirmations: 1 },
    };

    const cachedValue = JSON.stringify({ confirmations: 1, attempts: 3 });
    cacheGetStub.withArgs(`webhook:${data.wallet}:${data.data.txID}`).resolves(cachedValue);

    await webhook.send(data);

    expect(requests).to.have.lengthOf(0);
    sinon.assert.notCalled(cacheSetStub);
  });
});
