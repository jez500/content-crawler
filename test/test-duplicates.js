const expect = require('expect.js');
const Duplicates = require('../src/duplicates');

describe('Duplicates', function() {
  it('Duplicate content should be removed.', function() {
    let page1 = '<html><body><div><h1>This is the same title. Some text to make it longer.</h1></div><div>The first content. Some text to make it longer.</div><footer>The footer is the same. Some text to make it longer.</footer></body></html>',
        page2 = '<html><body><div><h1>This is the same title. Some text to make it longer.</h1></div><div>The second content. Some text to make it longer.</div><footer>The footer is the same. Some text to make it longer.</footer></body></html>',
        page3 = '<html><body><div><h1>This is the same title. Some text to make it longer.</h1></div><div>The third content. Some text to make it longer.</div><footer>The footer is the same. Some text to make it longer.</footer></body></html>',
        page4 = '<html><body><div><h1>This is the same title. Some text to make it longer.</h1></div><div>The fourth content. Some text to make it longer.</div><footer>The footer is the same. Some text to make it longer.</footer></body></html>';

    let pages = [
      { body: page1 },
      { body: page2 },
      { body: page3 },
      { body: page4 },
    ];

    let instance = new Duplicates();
    let clean = instance.removeDuplicates(pages);

    expect(pages[0].body).not.to.contain('same');
    expect(pages[1].body).not.to.contain('same');
    expect(pages[2].body).not.to.contain('same');
    expect(pages[3].body).not.to.contain('same');
    expect(pages[0].body).to.contain('first');
    expect(pages[1].body).to.contain('second');
    expect(pages[2].body).to.contain('third');
    expect(pages[3].body).to.contain('fourth');

    let titles = [
      'Prefix 1 Suffix',
      'Prefix 2 Suffix',
      'Prefix 3 Suffix',
      'Prefix 4 Suffix'
    ];

    let prefix = instance.findPrefix(titles);
    let suffix = instance.findSuffix(titles);
    expect(prefix).to.be('Prefix ');
    expect(suffix).to.be(' Suffix');

    titles = [
      'List 2 Finally',
      'Long 1 y',
      'Long 3 ally',
      'Unique 4 And Finally'
    ];

    prefix = instance.findPrefix(titles);
    suffix = instance.findSuffix(titles);
    expect(prefix).to.be('');
    expect(suffix).to.be('y');
  });

});
