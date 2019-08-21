const expect = require('expect.js');
const crawler = require('../src/crawler');
const $ = require('cheerio');

describe('Crawler', function() {
  it('Constructor should create an instance', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
    };
    let instance = new crawler.Crawler('http://localhost/', settings);

    expect(instance).to.be.a(crawler.Crawler);
  });

  it('URL Filter includes and excludes should work', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
      urlFilter: 'http://example.org/',
      excludeFilter: 'no-thanks',
    };
    let instance = new crawler.Crawler('http://localhost/', settings);

    expect(instance.urlFilter('http://example.edu')).not.to.be.ok();
    expect(instance.urlFilter('http://example.org/all-good')).to.be.ok();
    expect(instance.urlFilter('http://example.org/no-thanks/more')).not.to.be.ok();
    expect(instance.urlFilter('http://example.edu/no-thanks/more')).not.to.be.ok();
  });

  it('extractContent should remove clean the content', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
      downloadImages: true,
      removeEmptyNodes: true,
      removeAttributes: true,
      trimWhitespace: true,
      simplifyStructure: true,
    };
    let instance = new crawler.Crawler('http://localhost/', settings);

    let source = $.load('<html><body>' + 
      '<div role="main">' +
      'Stuff to keep.' +
      '<a href="#goodbye">Link to remove</a>' +
      '<span remove-attribute="remove attribute"><img src="http://localhost/img" title="Image is ok" other="remove me"></span>' +
      'More stuff to keep.' +
      '</div>' +
      '<div>Also keep me div</div>' +
      '</body></html>'
      )('html');

    let content = $.html(instance.extractContent(source));

    expect(content).not.to.contain('Remove');
    expect(content).not.to.contain('remove');
    expect(content).to.contain('Stuff to keep');
    expect(content).to.contain('More stuff to keep');
    expect(content).to.contain('Image is ok');
  });

  it('images should be extracted from content', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
      downloadImages: true,
    };
    let instance = new crawler.Crawler('http://localhost/', settings);

    let source = '<html><body>' + 
      '<div role="main">' +
      'Stuff to keep.' +
      '<img src="http://localhost/img" title="Image is ok" other="remove me">' +
      'More stuff to keep.' +
      '</div>';

    let context = {
      url: 'http://localhost/',
      body: source,
      contentType: 'text/html'
    };

    let images = instance.getImages(context);

    expect(images['http://localhost/img'].url).to.contain('localhost');
  });
});
