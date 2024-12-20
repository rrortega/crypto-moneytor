import { expect } from 'chai';
import sinon from 'sinon';
import ApiKeyHelper from '../../app/helpers/apiKeyHelper.js';  
const apiKeys=new ApiKeyHelper('test',['apiKey1','apiKey2'],100 );


describe('ApiKeyHelper', () => { 
  

  afterEach(() => {
    sinon.restore();
  });

  it('debería obtener el apiKey1', async () => {
    const getStub = sinon.stub(apiKeys, 'getAvailableKey').resolves('apiKey1');
    const result=await apiKeys.getAvailableKey();
    expect(result).to.equal('apiKey1'); // El valor esperado es el mismmo
    sinon.assert.calledOnceWithExactly(getStub );
  }); 

  it('debería incrementar un uso al apiKey1', async () => {
    const fn = sinon.stub(apiKeys, 'incrementKeyUsage').resolves(1);
    const usage=await apiKeys.incrementKeyUsage("apiKey1");
    expect(usage).to.equal(1); // El valor esperado es el mismmo
    sinon.assert.calledOnceWithExactly(fn,'apiKey1' );
  });

  it('debería obtener el apiKey2', async () => {
    const getStub = sinon.stub(apiKeys, 'getAvailableKey').resolves('apiKey2');
    const result=await apiKeys.getAvailableKey();
    expect(result).to.equal('apiKey2'); // El valor esperado es el mismmo
    sinon.assert.calledOnceWithExactly(getStub );
  });
 
  it('debería incrementar un uso al apiKey2', async () => {
    const fn = sinon.stub(apiKeys, 'incrementKeyUsage').resolves(1); 
    const usage=await apiKeys.incrementKeyUsage("apiKey2");
    expect(usage).to.equal(1); // El valor esperado es el mismmo
    sinon.assert.calledOnceWithExactly(fn,'apiKey2' );  
  });  
   
  it('debería obtener el apiKey1', async () => {
    const getStub = sinon.stub(apiKeys, 'getAvailableKey').resolves('apiKey1');
    const result=await apiKeys.getAvailableKey();
    expect(result).to.equal('apiKey1'); // El valor esperado es el mismmo
    sinon.assert.calledOnceWithExactly(getStub );
  });
});
