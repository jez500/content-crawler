const expect = require('expect.js');
const storage = require('../src/storage');

describe('Storage', function() {
  it('Constructor should create an instance', function() {
    let instance = new storage.Storage('test');

    expect(instance).to.be.a(storage.Storage);
  });

  it('isWeb should test if the browser is available', function() {
    let instance = new storage.Storage('test');
    
    expect(instance.isWeb()).to.be.ok();
  });

  it('prepareContainer should return true', function() {
    let instance = new storage.Storage('test');
    
    expect(instance.prepareContainer()).to.be.ok();
  });

  it('writeJson read and write a json object', async function() {
    let instance = new storage.Storage('test'),
      fetch,
      result,
      json = { 'abc': 'def' };

    instance.prepareContainer();
    
    instance.writeJson('test', json).then(() => {
      instance.readJson('test').then(function(fetch) {
        expect(fetch).to.eql(json);
      });
    });
  });

  it('writeJson to refuse to write when unprepared', function() {
    let instance = new storage.Storage('test');

    expect(instance.writeJson.bind(instance, 'test', { 'abc': 1 }), 'to throw', /must be prepared/);
  });
});
