const supercrawler = require("supercrawler");
const extend = require('extend');
const fs = require('fs-extra');
const Url = require('url-parse');
const _ = require('lodash');
const $ = require('cheerio');

const app = class {

  /**
   * Class constructor.
   */
  constructor(settings = {}) {
    // Ensure a url to parse
    const startUrl = process.argv[2];
    if (!startUrl) {
      console.error('You must provide a start url as the first argument!');
      return;
    }

    // Settings.
    this.startUrl = new Url(startUrl);
    this.settings = {
      domain: this.startUrl.hostname,
      protocol: this.startUrl.protocol,
      interval: 1000,
      saveDir: './public/sites',
      urlFilter: '',
    };
    this.settings = extend(this.settings, settings);

    // Url filter.
    if (process.argv[3]) {
      this.settings.urlFilter = process.argv[3];
      console.log('Filtering urls to only those containing "' + this.settings.urlFilter + '"');
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
      this.db.images = _.keys(this.db.images);
      this.db.documents = _.keys(this.db.documents);
      this.db.forms = _.keys(this.db.forms);
      // Save db to JSON.
      this.saveDb();
      this.updateIndex();
      console.log('Crawl complete!', this.db.pages.length + ' pages', this.db.images.length + ' images',
        this.db.documents.length + ' documents', this.db.forms.length + ' forms');
      // Stop crawling.
      this.crawler.stop();
    })
  }

  /**
   * Return instance of crawler.
   */
  getCrawler() {
    return new supercrawler.Crawler({
      interval: this.settings.interval,
      concurrentRequestsLimit: 5,
      userAgent: "Mozilla/5.0 (compatible; supercrawler/1.0; +https://github.com/brendonboshell/supercrawler)",
      request: {
        headers: {
          'x-custom-header': 'example'
        }
      }
    });
  }

  /**
   * Start a new crawl.
   */
  startCrawl() {
    let filter = (this.settings.urlFilter ? this.settings.urlFilter : this.settings.domain);

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

    // Start crawl.
    console.log('Starting crawl from: ' + this.startUrl.href);
    this.crawler.getUrlList()
      .insertIfNotExists(new supercrawler.Url(this.startUrl.href))
      .then(() => {
        return this.crawler.start();
      });
  }

  /**
   * Filter urls that contain a string.
   */
  urlFilter(url, context_url) {
    // If urlFilter settings exists, check url contains it.
    return !(this.settings.urlFilter && url.indexOf(this.settings.urlFilter) === -1);
  }

  /**
   * Handle text mime types (normal html pages).
   */
  textHander(context) {
    // Handler for each page. Add results to db.
    console.log("Processed", context.url);
    let res = {
      title: context.$('title').text(),
      url: context.url,
      contentType: context.contentType,
      size: Math.round((Buffer.byteLength(context.body) / 1024)),
      forms: this.getForms(context),
      images: this.getImages(context),
      body: context.$('body').text(),
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
    let images = [];
    context.$('img').each((i ,d) => {
      let imgUrl = context.$(d).attr('src');
      this.db.images[ imgUrl ] = 'image';
      images.push(imgUrl);
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
    if (!fs.existsSync(this.settings.saveDir)){
      fs.mkdirSync(this.settings.saveDir);
    }
  }

  /**
   * Save all the crawled data.
   */
  saveDb() {
    this.prepareSaveDir();
    let fileName = this.settings.saveDir + '/' + this.settings.domain + '.json';
    fs.writeJson(fileName, this.db, {spaces: 2})
      .then(() => { console.log('Database updated'); })
      .catch(err => { console.log(err); })
  }

  /**
   * Updates the index of all crawled sites.
   */
  updateIndex() {
    this.prepareSaveDir();
    let fileName = this.settings.saveDir + '/index.json';
    let obj = fs.readJsonSync(fileName, { throws: false });
    if (!obj) {
      obj = {};
    }
    obj[this.settings.domain] = {title: this.settings.domain, file: this.settings.domain + '.json'};
    fs.writeJson(fileName, obj, {spaces: 2})
      .then(() => { console.log('Index updated'); })
      .catch(err => { console.log(err); })
  }

};

// Start new crawl.
let dhcrawl = new app({});
dhcrawl.startCrawl();

