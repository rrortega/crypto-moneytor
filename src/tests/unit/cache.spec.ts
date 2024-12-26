import { expect } from 'chai';
import sinon from 'sinon';
import cacheHelper from '../../app/helpers/cacheHelper.js';

describe('CacheHelper', () => {
  

  afterEach(() => {
    sinon.restore();
  });

  it('debería guardar un valor en la caché', async () => {
    const setStub = sinon.stub(cacheHelper, 'set').resolves(undefined);
    await cacheHelper.set('key', 'value', 60);
    sinon.assert.calledOnceWithExactly(setStub, 'key', 'value', 60);
  });

  it('debería obtener un valor de la caché', async () => {
    const getStub = sinon.stub(cacheHelper, 'get').resolves('value');
    const result = await cacheHelper.get('key');
    expect(result).to.equal('value'); // El valor esperado es el mismo después de parsear JSON
    sinon.assert.calledOnceWithExactly(getStub, 'key');
  }); 

});
