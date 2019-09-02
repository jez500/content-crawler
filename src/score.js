const $ = require('cheerio');

const Score = class {

  /**
   * Class constructor.
   */
  constructor() {
  }

  splitAndScoreLines(content, maxLen) {
    let c, index, inTag = false, len = 0, line = '',
        whitespaceTest = /\s/, isWhitespace = false, lines = [],
        chars = 0, tags = 0, score = 0;

    for (index in content) {
      c = content.charAt(index);
      line += c;
      len++;

      if (!inTag && c == '<') {
        inTag = true;
        tags++;
      }
      else if (inTag && c == '>') { 
        inTag = false;
      }
      isWhitespace = whitespaceTest.test(c);

      if (!inTag) {
        chars++;
      }

      if (len >= maxLen && !inTag && isWhitespace) {
        if (tags == 0) {
          score = chars;
        } else {
          score = chars / tags;
        }

        lines[lines.length] = {
          line: line,
          chars: chars,
          tags: tags,
          score: score
        };
        line = '';
        len = 0;
        chars = 0;
        tags = 0;
      }
    }
    return lines;
  }

  /**
   * The first standard score we will consider is the
   * text to tag ratio.
   *
   * https://www.computer.org/csdl/proceedings-article/dexa/2008/3299a023/12OmNyoAA4f
   *
   * Remove all script, remark tags and newlines.
   * Split content into lines based on 100 character lines (and not breaking tags). 
   * foreach line
   *   x = non-tag-chars
   *   y = tags
   *   if (y == 0)
   *     linescore = x
   *   else
   *     linescore = x / y
   * return mean
   *
   * @param {string} content
   * @return {number}
   *   The score ranges from 0 to 100.
   */
  textToTagRatio(content) {
    let lines = this.splitAndScoreLines(content, 100),
        index = 0, total = 0;

        let debug = '';

    for (index in lines) {
      total += lines[index].score;
    }

    return Math.floor(Math.min(total / lines.length, 100));
  }

  /**
   * Examine the given text and produce a score
   *
   * The score represents how likely it is that this is the raw
   * content from the website.
   *
   * @param {string} content
   * @return {number}
   *   The score ranges from 0 to 100.
   */
  scoreContent(content) {
    let ttr = 0;

    ttr = this.textToTagRatio(content);

    return ttr;
  }

};

module.exports = Score;
