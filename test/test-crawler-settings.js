const expect = require('expect.js');
const CrawlerSettings = require('../src/crawler-settings');

describe('CrawlerSettings', function() {
  it('Constructor should set default values', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
    };
    let instance = new CrawlerSettings('http://localhost/', settings);

    expect(instance).to.be.a(CrawlerSettings);
  });

  it('Invalid settings should throw an Error', function() {
    let settings = {
      something: 'test',
      authKey: 'test',
    };

    let createInstance = function () {
      new CrawlerSettings('http://localhost/', settings); 
    };
    expect(createInstance).to.throwError();

  });

});
