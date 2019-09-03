const $ = require('cheerio');

const Score = class {

  /**
   * Class constructor.
   */
  constructor() {
  }

  /**
   * Break the content into lines of max length.
   *
   * Some lines will be longer, because we don't split in the middle of tags.
   *
   * @param {string} content
   * @param {number} maxLen
   * @return {array} lines
   */
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

      // In the middle (closing tags affects the next char).
      if (!inTag) {
        chars++;
      }

      if (inTag && c == '>') {
        inTag = false;
      }
      isWhitespace = whitespaceTest.test(c);

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
   * Calculate a moving average score for each line.
   *
   * @param {array} lines
   * @return {array} lines
   */
  smoothScores(lines) {
    let index = 0, radius = 5, sweep = 0, average = 0, sweepCount = 0;

    for (index in lines) {
      index = parseInt(index, 10);
      average = 0;
      sweepCount = 0;
      for (sweep = (index - radius); sweep <= index + radius; sweep++) {
        if ((index + sweep) >= 0 && (index + sweep) < lines.length) {
          average += lines[index + sweep].score;
          sweepCount++;
        }
      }
      lines[index].smoothScore = average / sweepCount;
    }
  }

  /**
   * Now we have smooth scores, we can use them to filter lines.
   *
   * https://pdfs.semanticscholar.org/88a8/db54bc099ce7ca91bcfd451b9b6627e80e73.pdf
   *
   * @param {array} lines
   * @return {array} lines
   */
  filterContent(lines) {
    let index = 0,
      cutoff = 15,
      charIndex = 0,
      inTag = 0,
      newLine = '',
      newContent = '',
      exportContent = '',
      exporter = null,
      c = '',
      lastWhitespace = false,
      isWhitespace = false,
      whitespaceTest = /\s/;

    for (index in lines) {
      if (lines[index].smoothScore < cutoff) {
        // Chop it!
        // Since we have at least some tags in the string,
        // but the string has too high a text/tag ratio,
        // Lets trim all tags here.
        newLine = '';
        inTag = false;
        for (charIndex in lines[index].line) {
          c = lines[index].line.charAt(charIndex);

          if (!inTag && c == '<') {
            inTag = true;
          }

          isWhitespace = whitespaceTest.test(c);

          // This needs to go in the middle.
          // Closing a tag affects the next character.
          if (!inTag) {
            // Since we are chopping, collapse the whitespace.
            if (!isWhitespace || !lastWhitespace) {
              newLine += c;
              lastWhitespace = isWhitespace;
            }
          }

          if (inTag && c == '>') {
            inTag = false;
          }
        }

        lines[index].line = newLine;
      }
      newContent += lines[index].line;
    }

    // Because we cut text, we need to load and export the string to make
    // sure the remaining tags are balanced.
    newContent = $.load(newContent)('body').html();

    return newContent;
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
   * @return {score: number, content: string}
   *   The score ranges from 0 to 100. The content has been filtered.
   */
  textToTagRatio(content) {
    let lines = this.splitAndScoreLines(content, 100),
        index = 0, total = 0, score = 0, newContent = '';

    // Now lets work on it!
    this.smoothScores(lines);

    // Chop chop!
    newContent = this.filterContent(lines);
    // Rescore it (should be higher).
    lines = this.splitAndScoreLines(newContent, 100);

    for (index in lines) {
      total += lines[index].score;
    }

    if (total) {
      score = Math.floor(Math.min(total / lines.length, 100));
    }

    return {
      score: score,
      content: newContent
    };
  }

  /**
   * Examine the given text and produce a score
   *
   * The score represents how likely it is that this is the raw
   * content from the website.
   *
   * @param {string} content
   * @return {score: number, content: string}
   *   The score ranges from 0 to 100.
   */
  scoreContent(content, focus) {
    let result = {
      score: 0,
      content: ''
    };

    result = this.textToTagRatio(content);

    // We could apply additional scores here.

    return result;
  }

};

module.exports = Score;
