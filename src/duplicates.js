const Url = require('url-parse');
const $ = require('cheerio');

const Duplicates = class {

  /**
   * Class constructor.
   */
  constructor() {
    // Remove duplicated content across pages.
    this.elementHashCodes = {};
  }

  /**
   * Generate a unique hash for a string.
   *
   * @param {String} source
   * @return {number}
   */
  hashString(source) {
    let hash = 0, i, chr;

    if (source.length === 0) return hash;

    // Remove whitespace to normalise the strings.
    source = source.replace(/\s/g,'');

    for (i = 0; i < source.length; i++) {
      chr   = source.charCodeAt(i);
      hash  = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
    return hash;
  }

  /**
   * Generate and save a hash of the current element.
   *
   * @param {number} index
   * @param {Element} element
   */
  hashElements(index, element) {
    if ($(element).html().length < 100) {
      return;
    }
    let hash = this.hashString($(element).html());
    if (this.elementHashCodes[hash]) {
      this.elementHashCodes[hash]++;
    } else {
      this.elementHashCodes[hash] = 1;
    }
  }

  removeElements(index, element) {
    let hash = this.hashString($(element).html());

    if ($(element).html().length < 30) {
      return;
    }

    if (this.elementHashCodes[hash] >= (this.tolerance)) {
      $(element).remove();
    }
  }

  /**
   * Remove duplicated element clusters from a set of pages.
   * @param {Array} pages
   * - Each page has a body element.
   */
  removeDuplicates(pages) {
    // Calculate hashes from page nodes.
    let page = 0,
        body = '';

    this.tolerance = Math.max(pages.length / 2, 4);

    for (page in pages) {
      body = pages[page].body;

      $('div, section, article', body).each( this.hashElements.bind(this) );
    }

    // Remove duplicates above a threshhold.
    for (page in pages) {
      body = pages[page].body;

      let $main = $.load(body);
      $main('div, section, article').each( this.removeElements.bind(this) );

      // If there is a main region, jump to it.
      let $sub = $main('[role=main], main');
      if ($sub.length) {
        $main = $sub;
      } else {
        // Fallback to the html body.
        $sub = $main('body');
        if ($sub.length) {
          $main = $sub;
        }
      }

      body = $main.html();
      pages[page].body = body;
    }
  }
};

module.exports = Duplicates;
