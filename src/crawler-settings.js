const Url = require('url-parse');

const CrawlerSettings = class {
  /**
   * Class constructor.
   * @param string startUrl
   *  - The url to start crawling from
   * @param {Object} settings
   *  - The list of settings to apply to this web crawl.
   */
  constructor(startUrl = '', settings = {}) {
    let propKey = null, showHelp = false;

    // Ensure there is a valid url to crawl.
    if (!startUrl) {
      throw new Error('You must provide a start url.');
    }

    // Settings.
    this.defaultSettings(startUrl);
    if (startUrl == '--help') {
      throw new Error(this.generateHelp());
    }

    for (propKey in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, propKey)) {
        if (!Object.prototype.hasOwnProperty.call(this, propKey) ||
            propKey == 'help') {

          let usage = this.generateHelp();

          throw new Error('Invalid argument passed to settings: ' + propKey + usage);
        }
      }
    }

    // Don't set undefined values.
    for (propKey in settings) {
      if (typeof (settings[propKey]) == 'undefined') {
        delete settings[propKey];
      }
    }

    // Merge the default settings with those passed to the constructor.
    Object.assign(this, settings);
    this.interval = 1000 * this.delay;

    // Verify there is a valid auth key.
    if (!this.authKey) {
      // Report an error so it is shown in the page.
      throw new Error('Auth key is required.');
    } else {
      // Only allow valid filename characters.
      this.authKey = this.authKey.replace(/[^A-Za-z0-9\-]/g, "");
    }
  }

  /**
   * Generate CLI usage instructions.
   * @return {string}
   */
  generateHelp() {
    let usage = "\n\n  Valid arguments are:\n\n",
        key = '',
        exclude = ['domain', 'protocol', 'proxy', 'imageLinks'];

    Object.keys(this).forEach(key => {
      if (!exclude.includes(key)) {
        usage += '   --' + key + ' \'' + this[key] + "'\n";
      }
    });

    return usage;
  }

  /**
   * Set all the default settings for this crawler.
   *
   * @param {string} startUrl
   */
  defaultSettings(startUrl) {
    let url = new Url(startUrl);

    this.startUrl = url;
    this.domain = url.hostname;
    this.protocol = url.protocol;
    this.concurrentRequestsLimit = 1;
    this.saveDir = './public/sites';
    this.urlFilter = '';
    this.excludeFilter = '';
    this.excludeTitleString = '';
    this.delay = 5;
    this.urlLimit = 0;
    this.urlCount = 0;
    this.searchReplace = '';
    this.redirectScript = '';
    this.scriptExtensions = '';
    this.proxy = '';
    this.downloadImages = false;
    this.runScripts = false;
    this.removeEmptyNodes = true;
    this.removeAttributes = true;
    this.trimWhitespace = true;
    this.simplifyStructure = true;
    this.removeDuplicates = true;
    this.contentMapping = '';
    this.removeElements = 'nav, [role=navigation], aside, .navbar, .Breadcrumbs, header, head, footer, script, oembed, noscript, style, iframe, object';
    this.process = '';
    this.robots = true;
    this.authKey = '';
    this.imageLinks = [];
    this.documentLinks = [];
    this.interval = 1000 * this.delay;
    this.shortenUrl = false;
  }

  /**
   * Filter urls that contain a string and don't contain another string.
   * @param {String} url
   * @param {String} context_url
   * return {boolean}
   *  - Use this URL if true.
   */
  filterUrl(url, context_url) {
    if (!context_url) {
      context_url = this.startUrl;
    }
    url = new URL(url, context_url).href;
    let valid = false;

    // If urlFilter settings exists, check url contains any.
    if (this.urlFilter) {
      let filters = this.urlFilter.split('|');
      let index = 0;
      for (index = 0; index < filters.length; index++) {
        valid = valid || (url.indexOf(filters[index]) !== -1);
      }
    } else {
      valid = true;
    }

    // If excludeFilter exists, check we don't have it.
    if (this.excludeFilter) {
      let excluded = this.excludeFilter.split(','),
          index;
      
      for (index in excluded) {
        valid = valid && (url.indexOf(excluded[index]) === -1);
      }
    }

    // Does this string end with any of the array elements?
    let endsWith = function(suffix) {
      return this.endsWith(suffix);
    }.bind(url);

    if (this.urlLimit && this.urlCount > this.urlLimit) {
      valid = false;
    }

    let imageSuffixes = ['.jpg', '.jpeg', '.png', '.svg', '.bmp', '.gif'];

    if (imageSuffixes.some(endsWith)) {
      // We just want images from the same domain.
      if ((new Url(url)).hostname == (new URL(this.startUrl)).hostname) {
        if (this.shortenUrl) {
          url = this.shortenUrl(url);
        }
        // Don't download, just remember it.
        this.imageLinks[url] = {
          url: url,
          data: url,
          id: url,
        };
      }
      valid = false;
    }
    if (valid) {
      let documentSuffixes = ['.doc', '.docx', '.dot', '.pdf', '.xls', '.xlsx', '.ps', '.eps', '.rtf', '.ppt', '.pptx', '.odt'];

      if (documentSuffixes.some(endsWith)) {
        // We just want documents from the same domain.
        if ((new Url(url)).hostname == (new URL(this.startUrl)).hostname) {
          // Don't download, just remember it.
          if (this.shortenUrl) {
            url = this.shortenUrl(url);
          }
          this.documentLinks[url] = {
            url: url,
            contextUrl: context_url,
            id: url,
          };
        }
        valid = false;
      }
    }

    if (valid) {
      if (this.shortenUrl) {
        url = this.shortenUrl(url);
      }
      return url;
    }
    return false;
  }

  /**
   * Report about any image links we found and skipped.
   */
  getImageLinks() {
    let links = this.imageLinks;

    // Reset the list to empty.
    this.imageLinks = [];
    return links;
  }

  /**
   * Report about any document links we found and skipped.
   */
  getDocumentLinks() {
    let links = this.documentLinks;

    // Reset the list to empty.
    this.documentLinks = [];
    return links;
  }
};

module.exports = CrawlerSettings;
