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

  it('URL Filter includes and excludes should work', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
      urlFilter: 'http://example.org/',
      excludeFilter: 'no-thanks,another',
      downloadImages: true,
    };
    let instance = new CrawlerSettings('http://localhost/', settings);

    expect(instance.filterUrl('http://example.edu')).not.to.be.ok();
    expect(instance.filterUrl('http://example.org/all-good')).to.be.ok();
    expect(instance.filterUrl('http://example.org/no-thanks/more')).not.to.be.ok();
    expect(instance.filterUrl('http://example.edu/no-thanks/more')).not.to.be.ok();
    expect(instance.filterUrl('http://another.com/')).not.to.be.ok();
    expect(instance.filterUrl('/image.png')).not.to.be.ok();
    // Images are not downloaded during a crawl.
    expect(instance.filterUrl('/image.png', 'http://example.org')).not.to.be.ok();
  });


});
