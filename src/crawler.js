const supercrawler = require("supercrawler");
const extend = require('extend');
const Storage = require('./storage');
const Duplicates = require('./duplicates');
const Url = require('url-parse');
const _ = require('lodash');
const $ = require('cheerio');
const CrawlerSettings = require('./crawler-settings');

const Crawler = class {

  /**
   * Class constructor.
   * @param string startUrl
   *  - The url to start crawling from
   * @param {Object} settings
   *  - The list of settings to apply to this web crawl.
   */
  constructor(startUrl = '', settings = {}) {

    // Settings.
    this.settings = new CrawlerSettings(startUrl, settings);

    // Remove duplicated content across pages.
    this.elementHashCodes = {};

    // Get the instance of the storage for this class instance.
    this.storage = new Storage(this.settings.saveDir);

    // Url filter.
    if (this.settings.urlFilter) {
      this.log('Filtering urls to only those containing "' + this.settings.urlFilter + '"');
    }

    // Exclude filter.
    if (this.settings.excludeFilter) {
      this.log('Filtering urls to only those not containing "' + this.settings.excludeFilter + '"');
    }

    // Structure for JSON.
    this.db = {
      domain: this.settings.domain,
      pages: [],
      images: {},
      documents: {},
      forms: {},
    };

    // Get an instance of the crawler.
    this.crawler = this.getCrawler();

    // When no more urls to parse.
    this.crawler.on('urllistcomplete', this.crawlComplete.bind(this));

    // Default the completeHandler to the log function.
    this.completeHandler = this.log;
  }

  /**
   * Urls have finished loading, post process the content.
   */
  crawlComplete() {
    // Turn assets into arrays.
    this.db.images = _.values(this.db.images);
    this.db.documents = _.keys(this.db.documents);
    this.db.forms = _.keys(this.db.forms);
    // Save db to JSON.
    if (this.db.pages.length > 0) {
      if (this.settings.removeDuplicates) {
        let duplicates = new Duplicates();

        duplicates.removeDuplicates(this.db.pages);
      }

      this.saveDb();
      this.updateIndex();
      this.log('Crawl complete!', this.db.pages.length + ' pages', this.db.images.length + ' images',
      this.db.documents.length + ' documents', this.db.forms.length + ' forms');
    } else {
      this.log('Crawl failed! Could not download ' + this.settings.startUrl);
      this.completeHandler(false);
    }
    // Stop crawling.
    this.crawler.stop();
  }

  /**
   * Set a function to call when the crawl is complete.
   *
   * @param {Function} handler
   */
  setCompleteHandler(handler) {
    this.completeHandler = handler;
  }

  /**
   * Return instance of crawler (the supercrawler).
   *
   * @return {supercrawler.Crawler}
   */
  getCrawler() {
    let agent = "Mozilla/5.0 (compatible; supercrawler/1.0; +https://github.com/brendonboshell/supercrawler)";

    // Create an instance using as many of our settings as possible.
    let instance = new supercrawler.Crawler({
      interval: this.settings.interval,
      concurrentRequestsLimit: 1,
      userAgent: agent,
      robotsEnabled: this.settings.robots,
      request: {
        gzip: false  // Disable gzip compression because it's unreliable in the web version.
      }
    });

    // Patch the downloader to allow CORS requests using a proxy.
    instance._proxyUrl = this.settings.proxy;

    // We are monkey patching the download function.
    instance._downloadUrlRaw = instance._downloadUrl;
    instance._downloadUrl = function(url, followRedirect) {
      return this._downloadUrlRaw(this._proxyUrl + url, followRedirect);
    }.bind(instance);

    instance.on('crawledurl', (url, errorCode, statusCode) => {
      // Report failed downloads.
      if (errorCode) {
        this.log('Error fetching URL: ' + url + ' => ' + errorCode);
      }
    });

    return instance;
  }

  /**
   * Start a new crawl.
   */
  startCrawl() {
    // Restrict to this domain only.
    this.crawler.addHandler("text", supercrawler.handlers.htmlLinkParser({
      hostnames: [this.settings.domain],
      urlFilter: (url, context_url) => {
        return this.settings.filterUrl(url, context_url);
      }
    }));

    // Handle links.
    this.crawler.addHandler("text", (context) => {
      this.textHander(context);
    });

    // Handle documents.
    this.crawler.addHandler("application", (context) => {
      this.applicationHandler(context);
    });

    // Handle images.
    this.crawler.addHandler("image", (context) => {
      let buffer = Buffer.from(context.body);
      this.db.images[context.url] = {
        data: 'data:' + context.contentType + ';base64,' + buffer.toString('base64'),
        url: context.url
      };
      this.log("Image retrieved");
    });

    // Start crawl.
    this.log('Starting crawl from: ' + this.settings.startUrl.href);
    this.crawler.getUrlList()
      .insertIfNotExists(new supercrawler.Url(this.settings.startUrl.href))
      .then(() => {
        return this.crawler.start();
      }).catch(this.log);
  }

  /**
   * Apply some cleaning logic to the content.
   *
   * We want to separate the actual content from the structure of the site.
   *
   * @param {jQuery}
   *   node to process.
   * @return {jQuery}
   */
  extractContent(node) {
    if (this.settings.removeEmptyNodes &&
        node.text().trim() === '' &&
        node.children().length == 0 &&
        node[0].tagName != 'img') {

      // Node has no text and no children. Remove it.
      node.remove();
      if (node.parent().length) {
        // Because we removed this leaf, walk up the parents so see if they can be removed.
        this.extractContent(node.parent());
      }
    } else {
      // Remove whitespace overload.
      if (node[0].type == 'text' && this.settings.trimWhitespace) {
        node.text(node[0].data.replace(/\s+/g, ' '));
      }
      // Remove attributes from most tags.
      if (this.settings.removeAttributes) {
        let attributes = node[0].attribs;
        let name = '';
        let common = ['href', 'src', 'alt', 'role', 'name', 'value', 'type', 'title', 'width', 'height'];

        for (name in attributes) {
          if (!common.includes(name)) {
            node.removeAttr(name);
          } else if (name == 'href' && node.attr(name)[0] == '#') {
            // Node is a relative in page link. Remove it.
            node.remove();
          }
        }
      }

      // We are walking the tree, cleaning one element at a time.
      let childIndex = 0,
          child = null,
          children = node.children();

      children.each(function(index, child) {
        this.extractContent($(child));
      }.bind(this));
    }

    // Deeply nested divs and span with no meaning to the structure are hard to deal with.
    if (this.settings.simplifyStructure) {
      if ((node[0].tagName == 'div' || node[0].tagName == 'span') &&
          node.parent().length != 0 && 
          (node.parent()[0].tagName == 'div' || node.parent()[0].tagName == 'span')) {
        let innerHTML = node.html();
        node.replaceWith(innerHTML);

      }
    }

    return node;
  }

  /**
   * Handle text mime types (normal html pages).
   */
  textHander(context) {
    // Handler for each page. Add results to db.
    this.log("Processed", context.url);

    let main = context.$('body');

    if (main.length == 0) {
      return;
    }

    // Strip some common things.
    if (this.settings.simplifyStructure) {
      main.find('nav').remove();
      main.find('aside').remove();
      // Common navigation elements.
      main.find('.navbar').remove();
      main.find('.Breadcrumbs').remove();
      main.find('header').remove();
      main.find('head').remove();
      main.find('footer').remove();
      main.find('script').remove();
      main.find('noscript').remove();
      main.find('style').remove();
      main.find('iframe').remove();
      main.find('object').remove();
    }

    // If there is a main region, jump to it.
    let sub = main.find('[role=main], main');
    if (sub.length) {
      main = sub;
    } else {
      // Fallback to the html body.
      sub = main.find('body');
      if (sub.length) {
        main = sub;
      }
    }

    // Perform deep cleaning on the content.
    let mainText = $.html(this.extractContent(main));

    let res = {
      title: context.$('title').text(),
      url: context.url,
      mediaType: context.contentType,
      contentType: this.mapContentType(context.url),
      size: Math.round((Buffer.byteLength(context.body) / 1024)),
      forms: this.getForms(context),
      images: this.getImages(context),
      body: mainText,
    };

    // The result of the page cleaning is pushed to the db pages array.
    this.db.pages.push(res);
  }

  /**
   * Look at the url and try to map to a content type.
   *
   * The default type is page.
   * @param {string} url
   * @return {string}
   */
  mapContentType(url) {
    let maps = this.settings.contentMapping.split(/\r?\n/),
        index,
        map,
        line;

    for (index in maps) {
      line = maps[index].split('|');
      if (line.length > 1) {
        map = new RegExp('^' + line[0].trim().replace(/\*/g, '.*') + '/?$');

        if (map.test(url)) {
          return line[1].trim();
        }
      }
    }
    return 'page';
  }

  /**
   * Handle application mime types.
   */
  applicationHandler(context) {
    // An example is a feed url.
    this.db.documents[context.url] = 'document';
  }

  /**
   * Get the images found on the page. This walks the DOM and appends images
   * to the list of urls to fetch.
   *
   * @param {Object} context
   * @return {Array}
   *   - An array with the urls as keys and metadata as values.
   */
  getImages(context) {
    let images = {}, count = 0, dataUrl = 0;

    let buffer = Buffer.from(context.body);
    buffer = buffer.toString();

    $('img', buffer).each((i, d) => {
      let imgUrl = $(d).attr('src');

      if (!imgUrl) {
        return;
      }

      imgUrl.trim();

      // Data urls don't need to be downloaded, just save them now.
      if (imgUrl.slice(0, 5) === 'data:') {
        dataUrl = context.url + '#data' + (count++);
        // data:
        this.db.images[dataUrl] = {
          data: imgUrl.slice(5),
          url: dataUrl
        };
        this.log('Image data shortcut:', this.db.images[dataUrl]);
      }
      else {
        // Relative urls need to be made full.
        if (imgUrl.slice(0, 4) != 'http') {
          if (imgUrl[1] == '/') {
            imgUrl = 'http:' + imgUrl;
          } else {
            if (imgUrl[0] == '/') {
              imgUrl = imgUrl.slice(1);
            }
            imgUrl = this.settings.startUrl + imgUrl;
          }
        }

        // Query strings for images are likely duplicates.
        imgUrl.substring(imgUrl.indexOf("?") + 1);

        // Apply same url filtering to images.
        let allow = this.settings.filterUrl(imgUrl, null);

        if (allow) {
          this.log('Image discovered: ' + imgUrl);
          if (this.settings.downloadImages) {
            // Queue it.
            this.crawler.getUrlList().insertIfNotExists(new supercrawler.Url(imgUrl));
            images[imgUrl] = { url: imgUrl };
          } else {
            // We are not downloading images, just add it.
            this.db.images[imgUrl] = {
              data: imgUrl,
              url: imgUrl
            };
          }
        }
      }
    });
    return images;
  }

  /**
   * Get the forms found on the page.
   * @param {Object} context
   * @return {Array}
   */
  getForms(context) {
    let forms = [];
    context.$('form').each((i ,d) => {
      let formKey = $(d).html();
      this.db.forms[ formKey ] = 'form';
      forms.push($(d).attr('action') + ' - Key: ' + formKey);
    });
    return forms;
  }

  /**
   * Prepare a dir to save crawled data.
   */
  prepareSaveDir() {
    this.storage.prepareContainer();
  }

  /**
   * Save all the crawled data.
   */
  saveDb() {
    this.prepareSaveDir();
    let fileName = this.settings.saveDir + '/' + this.settings.domain + '.json';
    this.storage.writeJson(fileName, this.db)
      .then(() => { this.log('Database updated'); })
      .catch(err => { this.log(err); });
  }

  /**
   * Updates the index of all crawled sites.
   */
  updateIndex() {
    this.prepareSaveDir();
    // The authKey is used in the index path so different clients only see their own sites.
    let fileName = this.settings.saveDir + '/' + this.settings.authKey + '-index.json';
    let request = this.storage.readJson(fileName);
    request.then(function (result) {
      if (!result) {
        result = {};
      }

      result[this.settings.domain] = {title: this.settings.domain, file: this.settings.domain + '.json'};
      // Write the new list of sites.
      this.storage.writeJson(fileName, result)
        .then(() => {
          this.log('Index updated');
          if (this.completeHandler) {
            this.completeHandler(true);
          }
        })
        .catch(err => { this.log(err); });
    }.bind(this))
    .catch(err => { this.log(err); });
  }

  /**
   * Is this running in a web browser or node?
   * @return bool
   */
  isWeb() {
    return (typeof window != 'undefined');
  }

  /**
   * Log a message.
   *
   * This log function works like console.log, except for the web version it
   * will write the content directly to the page.
   */
  log() {
    let element = null,
      args = [],
      event = null;

    if (this.isWeb()) {
      if (this.settings.saveDir != 'test') {
        args = Array.prototype.slice.call(arguments);

        event = new CustomEvent('log--crawler', { bubbles: false, cancellable: false });

        event.message = args.join(', ');
        window.dispatchEvent(event);

        console.debug.apply(this, arguments);
      }
    } else {
      console.log.apply(this, arguments);
    }
  }

};

module.exports = Crawler;
