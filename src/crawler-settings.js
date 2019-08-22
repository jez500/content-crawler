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
    let propKey = null;

    // Ensure there is a valid url to crawl.
    if (!startUrl) {
      throw new Error('You must provide a start url.');
    }

    // Settings.
    this.defaultSettings(startUrl);

    for (propKey in settings) {
      if (Object.prototype.hasOwnProperty.call(settings, propKey)) {
        if (!Object.prototype.hasOwnProperty.call(this, propKey)) {
          throw new Error('Invalid property passed to settings: ' + propKey);
        }
      }
    }

    // Merge the default settings with those passed to the constructor.
    Object.assign(this, settings);

    // Verify there is a valid auth key.
    if (!this.authKey) {
      // Report an error so it is shown in the page.
      throw new Error('Auth key is required.');
    } else {
      // Only allow valid filename characters.
      this.authKey = this.authKey.replace(/[^A-Za-z0-9]/g, "");
    }
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
    this.delay = 5;
    this.concurrentRequestsLimit = 1;
    this.saveDir = './public/sites';
    this.urlFilter = '';
    this.excludeFilter = '';
    this.proxy = '';
    this.downloadImages = false;
    this.removeEmptyNodes = true;
    this.removeAttributes = true;
    this.trimWhitespace = true;
    this.simplifyStructure = true;
    this.removeDuplicates = true;
    this.contentMapping = '';
    this.robots = true;
    this.authKey = '';
    this.interval = 1000 * this.delay;
  }

  /**
   * Filter urls that contain a string and don't contain another string.
   * @param {String} url
   * @param {String} context_url
   * return {boolean}
   *  - Use this URL if true.
   */
  filterUrl(url, context_url) {
    // If urlFilter settings exists, check url contains it.
    let valid = !(this.urlFilter && url.indexOf(this.urlFilter) === -1);

    // If excludeFilter exists, check we don't have it.
    if (this.excludeFilter) {
      valid = valid && (url.indexOf(this.excludeFilter) === -1);
    }

    return valid;
  }

};

module.exports = CrawlerSettings;
