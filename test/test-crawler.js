const expect = require('expect.js');
const Crawler = require('../src/crawler');
const $ = require('cheerio');

describe('Crawler', function() {
  it('Constructor should create an instance', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
    };
    let instance = new Crawler('http://localhost/', settings);

    expect(instance).to.be.a(Crawler);
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
    let instance = new Crawler('http://localhost/', settings);

    let source = $.load('<html><body>' + 
      '<div role="main">' +
      '<div><span>Stuff to keep.</span></div>' +
      '<article></article>' +
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
    let instance = new Crawler('http://localhost/', settings);

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

    let images = instance.getImages(source);

    expect(images['http://localhost/img'].url).to.contain('localhost');
  });

  it('content type mapping with wildcards should be correct', function() {
    let settings = {
      saveDir: 'test',
      authKey: 'test',
      downloadImages: true,
      contentMapping: (
        "  \thttp://example.com/2/*|other2\r\n" +
        "http://example.com|example|article \n" +
        "\n" +
        "http://other.co*|other \n" +
        "\n"
      ) 
    };
    let instance = new Crawler('http://localhost/', settings);

    expect(instance.mapContentType('http://other.com/')[0].type).to.be('other');
    expect(instance.mapContentType('http://example.com/2/something')[0].type).to.be('other2');
    expect(instance.mapContentType('http://another.com/')[0].type).to.be('page');
    expect(instance.mapContentType('http://example.com/')[0].type).to.be('example');
    expect(instance.mapContentType('http://example.com/')[0].search).to.be('article');
  });
});
