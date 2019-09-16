const expect = require('expect.js');
const Score = require('../src/score');

describe('Score', function() {
  it('Score should reflect the source', function() {
    let words = ['Shark', 'Bay', 'Western', 'Australia'],
        tags = ['object', 'div', 'span', 'style'],
        target = 100,
        i = 0,
        page1 = '',
        page2 = '',
        page3 = '';

    for (i = 0; i < target; i++) {
      page1 += ' ' + words[i % words.length];
      page2 += ' <' + tags[i % words.length] + '>' + 
        '</' + tags[i % words.length] + '>';
      page3 += ' <' + tags[i % words.length] + '>' +
        words[i % words.length] +
        '</' + tags[i % words.length] + '>';
    }

    let instance = new Score();
    let result = {};

    result = instance.scoreContent(page1);
    expect(result.content.trim()).to.be(page1.trim());
    expect(result.score).to.be.above(50);
    result = instance.scoreContent(page2);
    expect(result.content.length).to.be.below(page2.length);
    expect(result.score).to.be.below(50);
    result = instance.scoreContent(page3);
    expect(result.content.length).to.be.below(page3.length);
    expect(result.score).to.be.above(40);
  });

});
