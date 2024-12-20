import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

global.expect = chai.expect;
global.sinon = sinon;

// Desactiva logs de consola durante las pruebas para evitar ruido
beforeEach(() => {
  sinon.stub(console, 'log');
  sinon.stub(console, 'error');
});

afterEach(() => {
  sinon.restore();
});
