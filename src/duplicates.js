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
    if ($(element).html().length < 20) {
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

    if ($(element).html().length < 10) {
      return;
    }

    if (this.elementHashCodes[hash] >= (this.tolerance)) {
      $(element).remove();
    }
  }

  /**
   * Remove duplicated prefix or suffix from a list of titles.
   *
   * @param {Array} pages
   * - Each page has a title element.
   */
  removeDuplicateTitles(pages) {
    // Calculate hashes from page nodes.
    let page,
        titles = [];

    for (page in pages) {
      if (!pages[page].search) {
        titles.push(pages[page].title);
      }
    }
    if (titles.length < 2) {
      return;
    }

    let suffix = this.findSuffix(titles);
    if (suffix) {
      for (page in pages) {
        if (!pages[page].search) {
          pages[page].title = pages[page].title.slice(0, -suffix.length);
        }
      }
    }

    let prefix = this.findPrefix(titles);
    if (prefix) {
      for (page in pages) {
        if (!pages[page].search) {
          pages[page].title = pages[page].title.slice(prefix.length);
        }
      }
    }
  }

  /**
   * Given an array of strings, find the common suffix for all the elements.
   *
   * This is done by sorting the array and then comparing the first and last elements.
   *
   * @param {array} strings
   * @return string
   */
  findSuffix(strings) {
    if(!strings.length) {
      return ''; // or null or undefined; your choice
    }

    var sorted = strings.slice(0).sort(), // copy the array before sorting!
        string1 = sorted[0],
        string2 = sorted[sorted.length-1],
        i = 0,
        l = Math.min(string1.length, string2.length);

    while(i < l && string1[string1.length - i - 1] === string2[string2.length - i - 1]) {
      i++;
    }

    return string1.slice(-i);
  }

  /**
   * Given an array of strings, find the common prefix for all the elements.
   *
   * This is done by sorting the array and then comparing the first and last elements.
   *
   * @param {array} strings
   * @return string
   */
  findPrefix(strings) {
    if(!strings.length) {
      return ''; // or null or undefined; your choice
    }

    var sorted = strings.slice(0).sort(), // copy the array before sorting!
        string1 = sorted[0],
        string2 = sorted[sorted.length-1],
        i = 0,
        l = Math.min(string1.length, string2.length);

    while(i < l && string1[i] === string2[i]) {
      i++;
    }

    return string1.slice(0, i);
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

      $('div, header, footer, section, article', body).each( this.hashElements.bind(this) );
    }

    // Remove duplicates above a threshhold.
    for (page in pages) {
      body = pages[page].body;

      let $main = $.load(body);
      $main('div, header, footer, section, article').each( this.removeElements.bind(this) );

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
