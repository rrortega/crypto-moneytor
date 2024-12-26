import * as chai from 'chai';
import { beforeEach, afterEach } from 'node:test';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
chai.use(sinonChai);
global.expect = chai.expect;
global.sinonInstance = sinon;
// Desactiva logs de consola durante las pruebas para evitar ruido
beforeEach(() => {
    sinon.stub(console, 'log');
    sinon.stub(console, 'error');
});
afterEach(() => {
    sinon.restore();
});
