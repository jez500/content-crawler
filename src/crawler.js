const supercrawler = require("supercrawler");
const extend = require('extend');
const storage = require('./storage');
const Url = require('url-parse');
const _ = require('lodash');
const $ = require('cheerio');

const Crawler = class {

  /**
   * Class constructor.
   */
  constructor(startUrl = '', settings = {}) {
    // Ensure a url to parse
    if (!startUrl) {
      console.error('You must provide a start url as the first argument!');
      return;
    }

    // Settings.
    this.startUrl = new Url(startUrl);
    this.settings = {
      domain: this.startUrl.hostname,
      protocol: this.startUrl.protocol,
      delay: 5,
      concurrentRequestsLimit: 1,
      saveDir: './public/sites',
      urlFilter: '',
      proxy: '',
      downloadImages: false,
      removeEmptyNodes: true,
      removeAttributes: true,
      trimWhitespace: true,
      simplifyStructure: true,
      robots: true,
      authKey: '',
    };
    this.settings = extend(this.settings, settings);
    this.settings.interval = 1000 * this.settings.delay;
    this.storage = new storage.Storage(this.settings.saveDir);

    if (!this.settings.authKey) {
      this.log('Auth key is required.');
      return;
    } else {
      // Only allow valid filename characters.
      this.settings.authKey = this.settings.authKey.replace(/[^A-Za-z0-9]/g, "");
    }

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
    this.crawler.on('urllistcomplete', () => {
      // Turn assets into arrays.
      this.db.images = _.values(this.db.images);
      this.db.documents = _.keys(this.db.documents);
      this.db.forms = _.keys(this.db.forms);
      // Save db to JSON.
      if (this.db.pages.length > 0) {
        this.saveDb();
        this.updateIndex();
        this.log('Crawl complete!', this.db.pages.length + ' pages', this.db.images.length + ' images',
        this.db.documents.length + ' documents', this.db.forms.length + ' forms');
      } else {
        this.log('Crawl failed! Could not download ' + this.startUrl);
        this.completeHandler(false);
      }
      // Stop crawling.
      this.crawler.stop();
    });

    this.completeHandler = this.log;
  }

  setCompleteHandler(handler) {
    this.completeHandler = handler;
  }

  /**
   * Return instance of crawler.
   */
  getCrawler() {
    let agent = "Mozilla/5.0 (compatible; supercrawler/1.0; +https://github.com/brendonboshell/supercrawler)";

    let instance = new supercrawler.Crawler({
      interval: this.settings.interval,
      concurrentRequestsLimit: 1,
      userAgent: agent,
      robotsEnabled: this.settings.robots,
      request: {
        gzip: false
      }
    });

    // Patch the downloader to allow CORS requests using a proxy.
    instance._proxyUrl = this.settings.proxy;
    instance._downloadUrlRaw = instance._downloadUrl;
    instance._downloadUrl = function(url, followRedirect) {
      return this._downloadUrlRaw(this._proxyUrl + url, followRedirect);
    }.bind(instance);
    instance.on('crawledurl', (url, errorCode, statusCode) => {
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
        return this.urlFilter(url, context_url);
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

    this.crawler.addHandler("image", (context) => {
      let buffer = new Buffer(context.body);
      this.db.images[context.url] = {
        data: 'data:' + context.contentType + ';base64,' + buffer.toString('base64'),
        url: context.url
      };
      this.log("Image retrieved");
    });

    // Start crawl.
    this.log('Starting crawl from: ' + this.startUrl.href);
    this.crawler.getUrlList()
      .insertIfNotExists(new supercrawler.Url(this.startUrl.href))
      .then(() => {
        return this.crawler.start();
      }).catch(console.log);
  }

  /**
   * Filter urls that contain a string.
   */
  urlFilter(url, context_url) {
    // If urlFilter settings exists, check url contains it.
    let valid = !(this.settings.urlFilter && url.indexOf(this.settings.urlFilter) === -1);

    // If excludeFilter exists, check we don't have it.
    if (this.settings.excludeFilter) {
      valid = valid && (url.indexOf(this.settings.excludeFilter) === -1);
    }

    return valid;
  }

  /**
   * Walk the DOM and remove all empty nodes.
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
        let common = ['href', 'src', 'alt', 'role', 'name', 'value', 'type'];

        for (name in attributes) {
          if (!common.includes(name)) {
            node.removeAttr(name);
          } else if (node.attr(name)[0] == '#') {
            // Node is a relative in page link. Remove it.
            node.remove();
          }
        }
      }

      let childIndex = 0,
          child = null,
          children = node.children();

      children.each(function(index, child) {
        this.extractContent($(child));
      }.bind(this));
    }

    if (this.settings.simplifyStructure) {
      if ((node[0].tagName == 'div' || node[0].tagName == 'span') && node.parent().length != 0) {
        node.replaceWith(node.children());
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
    main.find('nav').remove();
    main.find('header').remove();
    main.find('footer').remove();
    main.find('script').remove();
    main.find('noscript').remove();
    main.find('style').remove();

    // If there is a main region, jump to it.
    let sub = main.find('[role=main]');
    if (sub.length) {
      main = sub;
    }

    let mainText = this.extractContent(main).html();

    let res = {
      title: context.$('title').text(),
      url: context.url,
      contentType: context.contentType,
      size: Math.round((Buffer.byteLength(context.body) / 1024)),
      forms: this.getForms(context),
      images: this.getImages(context),
      body: mainText,
    };
    this.db.pages.push(res);
  }

  /**
   * Handle application mime types.
   */
  applicationHandler(context) {
    this.db.documents[context.url] = 'document';
  }

  /**
   * Get the images found on the page.
   */
  getImages(context) {
    let images = {}, count = 0, dataUrl = 0;

    context.$('img').each((i ,d) => {
      let imgUrl = context.$(d).attr('src');

      if (!imgUrl) {
        return;
      }

      imgUrl.trim();
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
        if (imgUrl.slice(0, 4) != 'http') {
          if (imgUrl[0] == '/') {
            imgUrl = imgUrl.slice(1);
          }
          imgUrl = this.startUrl + imgUrl;
        } 

        imgUrl.substring(imgUrl.indexOf("?") + 1);

        let allow = this.urlFilter(imgUrl, null);

        if (allow) {
          this.log('Image discovered: ' + imgUrl);
          if (this.settings.downloadImages) {
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
    let fileName = this.settings.saveDir + '/' + this.settings.authKey + '-index.json';
    let request = this.storage.readJson(fileName);
    request.then(function (result) {
      if (!result) {
        result = {};
      }

      result[this.settings.domain] = {title: this.settings.domain, file: this.settings.domain + '.json'};
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

  log() {
    if (this.isWeb()) {
      let element = document.getElementById('console');
      let args = Array.prototype.slice.call(arguments);
      let message = document.createTextNode(args.join(', '));
      let line = document.createElement('p');
      let code = document.createElement('code');
      code.appendChild(message);
      line.appendChild(code);
      element.appendChild(line);
      element.scrollTop = element.scrollHeight;
      console.debug.apply(this, arguments);
    } else {
      console.log.apply(this, arguments);
    }
  }

};

module.exports.Crawler = Crawler;
