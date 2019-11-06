const supercrawler = require("supercrawler");
const extend = require('extend');
const Storage = require('./storage');
const moment = require('moment');
const Duplicates = require('./duplicates');
const Url = require('url-parse');
const Buffer = require('buffer').Buffer;
const _ = require('lodash');
const $ = require('cheerio');
const jsdom = require('jsdom');
const CrawlerSettings = require('./crawler-settings');
const Score = require('./score');

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

    // Allow forms to be queued in a process step.
    this.formQueue = [];

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
      redirects: [],
    };

    // Get an instance of the crawler.
    this.crawler = this.getCrawler();

    // When no more urls to parse.
    this.crawler.on('urllistcomplete', this.crawlComplete.bind(this));

    // Default the completeHandler to the log function.
    this.completeHandler = this.log;
  }

  decodeEntities(src) {
    let e = document.createElement('textarea');
    e.innerHTML = src;

    return e.childNodes.length == 0 ? '' : e.childNodes[0].nodeValue;
  }

  scorePages() {
    let i = 0,
        page = {},
        instance = new Score(),
        result = {};

    for (i in this.db.pages) {
      page = this.db.pages[i];
      result = instance.scoreContent(page.body);
      page.score = result.score;

      if (this.settings.removeEmptyNodes) {
        page.body = result.content;
      }
    }
  }

  /**
   * Turn this: "/cheese/burger" into this: "Cheese Burger".
   */
  sanitiseTitle(path) {
    let all = [], i, clean = [];

    path = path.replace(/_/g, ' ');
    path = path.replace(/\//g, ' ');
    all = path.split(' ');

    for (i = 0; i < all.length; i++) {
      all[i] = all[i].charAt(0).toUpperCase() + all[i].substring(1);
    }

    return all.join(' ').trim();
  }

  /**
   * Urls have finished loading, post process the content.
   */
  crawlComplete() {
    // We are not downloading images, just add it.
    let links = this.settings.getImageLinks(),
      url = '',
      link = null,
      i = 0,
      page = null,
      pattern = null,
      valid = true,
      pages = [];

    for (url in links) {
      this.db.images[url] = links[url];
    }
    links = this.settings.getDocumentLinks();

    for (url in links) {
      link = links[url];
      let alias = this.generateAlias(link.url);
      // Link it to the page.
      for (i in this.db.pages) {
        if (this.db.pages[i].url.replace(/#.*/, '') == link.contextUrl) {
          this.db.pages[i].documents[link.url] = { url: link.url, id: link.url, alias: alias };

          break;
        }
      }

      // Remove the context url and add it to the global list.
      this.db.documents[url] = { url: link.url, id: link.url, alias: alias };
    }

    // Turn assets into arrays.
    this.db.images = _.values(this.db.images);
    this.db.imagesSkipped = _.values(this.db.imagesSkipped);
    this.db.documents = _.values(this.db.documents);
    this.db.forms = _.values(this.db.forms);
    for (i in this.db.pages) {
      this.db.pages[i].documents = _.values(this.db.pages[i].documents);
    }
    // Save db to JSON.
    if (this.db.pages.length > 0) {
      let duplicates = new Duplicates(),
        genericTitle = '',
        genericUrl = '';

      if (this.settings.removeDuplicates) {
        duplicates.removeDuplicates(this.db.pages);
        duplicates.removeDuplicateTitles(this.db.pages);
      }

      // OK - final cleaning things.
      // 1. Global string replacements on URLs and body text.
      for (i in this.db.pages) {
        page = this.db.pages[i];
        valid = true;
        if (!genericTitle) {
          genericTitle = this.db.pages[i].title;
          genericUrl = this.db.pages[i].url;
        }

        pattern = new RegExp(this.settings.searchString, 'g');
        let replacements = this.settings.searchReplace.split('\n'),
          index = 0,
          replacement = [];

        for (index = 0; index < replacements.length; index++) {
          replacement = replacements[index].split('|');

          page.body = page.body.split(replacement[0]).join(replacement[1]);
          page.url = page.url.split(replacement[0]).join(replacement[1]);
        }

        // 2. Clean the URL parameters
        // Trailing slashes removed.
        page.url = page.url.replace(/\/$/g, '');

        // Query string removed.
        page.url = page.url.replace(/\?.*$/g, '');

        // Multiple slashes that is not a URL removed.
        page.url = page.url.replace(/([^:])\/\//, '$1/');

        // 4. Clean nasty redirect scripts from URLs and body text.
        if (this.settings.redirectScript) {
          pattern = new RegExp(this.settings.redirectScript, 'g');
          if (pattern.test(page.url)) {
            // Nuke it.
            valid = false;
          }
          // Replace redirect links in the body.
          page.body = page.body.replace(pattern, function(match, p1) {
            return this.decodeEntities(p1);
          });
        }

        // 5. Kill pages from a 404.
        if (page.title.toLowerCase().includes('page not found') ||
            page.title.toLowerCase().includes('page missing')) {
          valid = false;
          this.log('Page not found: ' + page.url);
        }
        // 6. Kill bogus file extensions from webpages and urls.
        let all = this.settings.scriptExtensions.split(','),
          extIndex;

        for (extIndex in all) {
          if (all[extIndex]) {
            page.url = page.url.replace(new RegExp('.' + all[extIndex], 'g'), '');
            page.body = page.body.replace(new RegExp('.' + all[extIndex], 'g'), '');
          }
        }

        // 3. Generate Aliases
        // Generate a relative link from the URL.
        page.alias = this.generateAlias(page.url);

        // 7. Some pages have MULTIPLE h1s (really!?). We will take the last one if it happens.

        pattern = /<h1>([^<]*)<\/h1>/g;
        let matches = page.body.matchAll(pattern);
        for (let match of matches) {
          page.title = match[1];
        }

        // 8. Kill %20 invalid urls.
        page.alias = this.decodeEntities(page.alias);

        // 10. Generate Parents for the menu.

        let parentPage = page.alias;
        // Remove trailing slashes.
        parentPage = parentPage.replace(/\/$/g, '');

        // Get path sections.
        parentPage = parentPage.split('/');
        // Remove the last one.
        parentPage.pop();
        // Build a string again.
        page.parent = parentPage.join('/');

        // 11. For pages with a generic title, make a new one from the alias.
        if (page.title == genericTitle && i > 0) {
          page.title = this.sanitiseTitle(page.alias);
        }
        if (this.settings.excludeTitleString) {
          page.title = page.title.replace(new RegExp(this.settings.excludeTitleString, 'gi'), '');
        }

        // 12. For listing pages, keep the first page content but add a comment.
        if (pages[page.alias]) {
          valid = false;
          pages[page.alias].body += '<!-- Listing page -->';
        }

        // 13. Decode entities in titles.
        page.title = this.decodeEntities(page.title);

        // 14. Remove titles from the body content.
        pattern = /<h1>([^<]*)<\/h1>/g;
        page.body = page.body.replace(pattern, '');

        // All pages must have a title.
        if (page.title.trim() == '') {
          valid = false;
        }

        if (valid) {
          // No duplicate aliases.

          let j = 0;
          for (j = 0; j < i; j++) {
            // Non empty text that duplicates an existing page.
            if (this.db.pages[j].body == this.db.pages[i].body && this.db.pages[j].body.length > 256) {
              this.db.redirects.push({
                from: this.db.pages[i].alias.substr(1),
                to: 'internal:' + this.db.pages[j].alias
              });
              valid = false;
              j = i;
            }
          }

          if (valid) {
            pages[page.alias] = page;
          }
        }
      }

      let doitagain = true;
      let alias1 = '', alias2 = '', found = false;
      while (doitagain) {
        doitagain = false;

        for (alias1 in pages) {
          found = false;
          page = pages[alias1];

          for (alias2 in pages) {
            if (page.parent == pages[alias2].alias) {
              found = true;
            }
          }

          if (!found && page.parent) {
            let newpage = {};
            newpage.url = genericUrl + page.parent;
            newpage.alias = page.parent;
            newpage.images = [];
            newpage.documents = [];
            newpage.forms = [];
            newpage.body = '';
            newpage.mediaType = 'text/html';
            newpage.contentType = 'govcms_standard_page';
            newpage.fields = [];
            let parentPage = page.parent.split('/');
            let title = parentPage.pop();
            newpage.parent = parentPage.join('/');
            newpage.title = this.sanitiseTitle(title);
            pages[newpage.alias] = newpage;
            this.log('Generate parent for page: ' + newpage.alias);

            doitagain = true;
          }
        }
      }

      // 15. Generate blank intermediate pages for the menu that are missing.
      this.db.pages = _.values(pages);

      this.saveDb();
      this.updateIndex();

      this.scorePages();
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
    let self = this;

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
    instance.dynamicForms = [];
    // Patch the downloader to allow CORS requests using a proxy.
    instance._proxyUrl = this.settings.proxy;
    instance._runScripts = this.settings.runScripts;
    instance._process = this.settings.process;

    // We are monkey patching the download function.
    instance._downloadUrlRaw = instance._downloadUrl;
    instance._downloadUrl = function(url, followRedirect) {
      self.log('Download URL Raw: ' + url);
      if (!self.settings.filterUrl(url)) {
        throw new Error('URL is filtered:' + url);
      }

      self.settings.urlCount++;

      if (self.settings.urlLimit > 0 && (self.settings.urlCount > self.settings.urlLimit)) {
        let err = 'URL limit reached: ' + self.settings.urlCount;
        // Stop crawling.
        instance._urlList._nextIndex = instance._urlList._list.length;
        instance.emit("urllistcomplete");

        throw new Error(err);
      }

      if (this.dynamicForms[url]) {
        this._request = {
          method: 'POST',
          form: this.dynamicForms[url]
        };
      } else {
        this._request = {};
      }

      let raw = this._downloadUrlRaw(this._proxyUrl + url, followRedirect);
      let pageUrl = url;

      return raw.then(function (param) {
        let response = param;
        let buffer = Buffer.from(response.body);
        let html = buffer.toString();
        let scan = $.load(html);

        if (this._process) {
          /*jshint -W054 */
          let invoke = new Function('query', 'pageUrl', 'supercrawler', 'crawler', this._process).bind(this);
          invoke(scan, pageUrl, supercrawler, self);
        }

        if (!this._runScripts) {
          return param;
        }
        // What we are doing here is running the javascript in a virtual DOM
        // after loading the page. This allows content to be updated by js
        // before we look at it.
        let loader = new jsdom.ResourceLoader();
        let proxyUrl = this._proxyUrl;

        // Monkey patch again!
        loader.fetchRaw = loader.fetch;
        loader.fetch = function(urlString, options = {}) {
          urlString = proxyUrl + urlString;
          return this._downloadUrl(urlString, options);
        }.bind(loader);

        let client = new jsdom.JSDOM(html, {
          url: pageUrl,
          referrer: pageUrl,
          runScripts: "dangerously",
          resources: loader,
        });

        return new Promise(function(resolve) {
          // 5 seconds should be enough for anyone.
          setTimeout(resolve.bind(this), 5000);
        }.bind(this)).then(function(client, response) {
          let q = client.serialize();
          response.body = Buffer.from(q);

          return response;
        }.bind(this, client, response));
      }.bind(this));
    }.bind(instance);

    instance.on('crawledurl', (url, errorCode, statusCode) => {
      // Report failed downloads.
      if (errorCode) {
        self.log('Error fetching URL: ' + url + ' => ' + errorCode);
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
      this.log("Document retrieved: " + context.url);
      this.applicationHandler(context);
    });

    // Handle images.
    this.crawler.addHandler("image", (context) => {
      let buffer = Buffer.from(context.body);
      this.db.images[context.url] = {
        data: 'data:' + context.contentType + ';base64,' + buffer.toString('base64'),
        url: context.url
      };
      this.log("Image retrieved: " + context.url);
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
    let valid = [
      'img', 'input', 'select', 'textarea',
      'button', 'canvas', 'map', 'svg', 'picture', 'source',
      'time', 'video', 'object', 'audio', 'a'
    ];

    if (this.settings.removeEmptyNodes &&
        node.text().trim() === '' &&
        node.children().length == 0 &&
        !valid.includes(node[0].tagName)) {

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
      let attributes = node[0].attribs;
      let name = '';

      if (this.settings.removeAttributes) {
        let common = [
          'href', 'src', 'alt', 'role', 'name', 'value',
          'type', 'title', 'width', 'height', 'rows', 'cols',
          'size', 'for', 'method', 'action', 'placeholder',
          'colspan', 'rowspan', 'id'
        ];

        for (name in attributes) {
          if (!common.includes(name)) {
            node.removeAttr(name);
          }
        }
      }

      // Change some links to relative.
      let urlAttributes = ['href', 'src', 'action'];
      for (name in attributes) {
        if (urlAttributes.includes(name)) {
          let domainUrl = new URL(this.settings.startUrl);
          domainUrl = domainUrl.protocol + '//' + domainUrl.hostname;
          let relative = node.attr(name);
          let source = relative;
          relative = relative.replace(new RegExp(domainUrl, 'gi'), '');
          if (relative != source) {
            node.attr('data-js-crawler-url', source);
          }
          node.attr(name, relative);
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
    let all = this.crawler.getUrlList(),
        total = all._list.length,
        current = all._nextIndex,
        progress = Math.floor((current*current) * 100 / (total*total));

    // We squared the components because the list gets longer as we crawl new pages.

    if (this.settings.urlLimit && this.settings.urlCount > this.settings.urlLimit) {
      this.log('Url limit reached: ' + this.settings.urlLimit);
      return;
    }
    this.log(current + ' complete of ' + total + ' urls ( ' + progress + ' % ).');

    let main = context.$('body');

    if (main.length == 0) {
      return;
    }

    // Strip some common things.
    if (this.settings.simplifyStructure) {
      let removeList = this.settings.removeElements.split('|'),
          search,
          index;

      for (index in removeList) {
        search = removeList[index].trim();

        main.find(search).remove();
      }
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

    // Only process web page responses (xhtml is included).
    if (context.contentType.indexOf('html') == -1) {
      return;
    }

    // Perform deep cleaning on the content.
    let contentTypeList = this.mapContentType(context.url),
        contentCount = 0,
        contentType = null,
        article = '',
        articles = [],
        contentTypeIndex = 0,
        matchingType = null;

    for (contentTypeIndex = 0; contentTypeIndex < contentTypeList.length; contentTypeIndex++) {
      contentType = contentTypeList[contentTypeIndex];
      if (contentType.search) {
        articles = main.find(contentType.search);
        if (articles.length) {
          matchingType = contentType;
          break;
        }

        // The url matched, but there were no matching dom elements.
      } else {
        matchingType = contentType;
        articles = $(main);
        break;
      }
    }
    if (!matchingType) {
      matchingType = contentType;
    }

    articles.each(function(contentCount, article) {
      let mainText = $.html($(article));
      let forms = this.getForms(mainText, context.url);
      let imageResult = this.getImages(mainText, context.url);
      let images = imageResult.images;
      let bodyText = $.html(this.extractContent($(imageResult.content)));

      let res = {
        title: context.$('title').text(),
        url: context.url,
        mediaType: context.contentType,
        contentType: matchingType.type,
        size: Math.round((Buffer.byteLength(context.body) / 1024)),
        forms: forms,
        images: images,
        body: bodyText,
        search: '',
        score: 0,
        documents: {}
      };

      // Loop over custom fields for this contentType and extract them.
      matchingType.fields.forEach(function(field) {
        let all = $.load(mainText),
          start = null,
          valueText = '',
          matches = null,
          container = $.load(''),
          end = null;

        if (field.start == '[parent]') {
          let alias = this.decodeEntities(this.generateAlias(res.url)).replace(/\/$/g, '');
          let parents = alias.split('/');
          if (parents.length > 1) {
            // Skip current page.
            parents.pop();

            valueText = this.sanitiseTitle(parents.pop());
          }
        } else {
          start = all(field.start);
          end = start;
          if (field.end) {
            matches = start.nextUntil(field.end);
            matches.each(function(index, node) {
              if (field.field.includes('end')) {
                // Only look at the last matching field.
                end = $(node);
              }
              container('body').append($(node).clone());
            });
            valueText = container('body').html();
          } else {
            valueText = start.text();
          }
        }

        let fieldName = 'field_' + field.field.trim();
        let fieldValue = valueText.trim();

        if (field.dateformat) {
          if (field.field.includes('end')) {
            fieldValue = end.text();
          } else {
            fieldValue = start.text();
          }
          let parser = moment(fieldValue, field.dateformat);
          if (parser.isValid()) {
            fieldValue = parser.format(moment.HTML5_FMT.DATETIME_LOCAL) + ':00';
          } else {
            fieldValue = '';
          }
        }

        res[fieldName] = fieldValue;
        this.log('Field: ' + fieldName + ' => ' + fieldValue);
      }.bind(this));
      let heading = $('h1', mainText).first().text();
      if (heading) {
        res.title = heading;
      }
      if (!res.title) {
        res.title = res.url;
      }
      if (contentType.search) {
        res.search = contentType.search;
        res.url += '#' + contentCount;

        let title = $('h1, h2, h3, h4', mainText).first().text();
        if (title) {
          title = title.trim();
          res.title = title;
        }
      }
      // Turn images into array.
      res.images = _.values(res.images);

      // The result of the page cleaning is pushed to the db pages array.
      this.log('Content: ' + contentType.type + ' url: ' + res.url + ' search: ' + contentType.search);
      this.log('Title: ' + res.title);
      this.db.pages.push(res);
    }.bind(this));
  }

  /**
   * Look at the url and try to map to a content type.
   *
   * The default type is page.
   * @param {string} url
   * @return [{object}]
   *  - A list of objects containing 'search' and 'contentType'
   */
  mapContentType(url) {
    let maps = this.settings.contentMapping.split(/\r?\n/),
        index,
        map,
        line,
        search = '',
        type,
        valid = [];

    for (index in maps) {
      line = maps[index].split('|');
      if (line.length > 1) {
        map = new RegExp('^' + line[0].trim().replace(/\*/g, '.*') + '/?$');

        if (map.test(url)) {
          this.log('Match url pattern: ' + '^' + line[0].trim().replace(/\*/g, '.*') + '/?$');
          type = line[1].trim();
          if (line.length > 2) {
            search = line[2].trim();
          }

          let fields = [], i = 0;

          // Extract fields for this content type.
          for (i = 3; (i + 3) < line.length; i += 4) {
            fields.push({
              start: line[i],
              end: line[i+1],
              field: line[i+2],
              dateformat: line[i+3]
            });
          }

          // Dont return, we want a list of all possible matches.
          valid.push({
            search: search,
            type: type,
            fields: fields
          });
        }
      }
    }
    // Fallback - always include it last.
    valid.push({ search: '', type: 'govcms_standard_page', fields: [] });

    return valid;
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
   * @param {String} pageUrl
   * @return {Object}
   *   - An object with the urls as an array named 'images' and the modified source text as 'content'
   */
  getImages(context, pageUrl) {
    let images = {}, count = 0, dataUrl = 0;
    let source = $.load(context);
    let tags = source('img');

    tags.each((i, d) => {
      let imgUrl = $(d).attr('src');

      if (!imgUrl) {
        return;
      }

      imgUrl.trim();

      // Data urls don't need to be downloaded, just save them now.
      if (imgUrl.slice(0, 5) === 'data:') {
        dataUrl = pageUrl + '#data' + (count++);
        // data:
        this.db.images[dataUrl] = {
          data: imgUrl.slice(5),
          url: dataUrl,
          id: dataUrl
        };
        images[dataUrl] = this.db.images[dataUrl];
        this.log('Image data shortcut:', this.db.images[dataUrl]);
      }
      else {
        // Relative urls need to be made full.
        let url = new URL(imgUrl, pageUrl);
        let imgOrigin = url.origin;
        imgUrl = url.href;

        // Apply same url filtering to images.
        let allow = this.settings.filterUrl(imgUrl, null);

        if (allow) {
          if (imgUrl != allow) {
            $(d).attr('src', imgOrigin + '/' + allow.split('/').pop());
            imgUrl = allow;
          } else {
            // Query strings for images are likely duplicates.
            if (imgUrl.includes("?")) {
              imgUrl = imgUrl.substring(0, imgUrl.indexOf("?"));
              $(d).attr('src', imgUrl);
            }
          }

          if (this.settings.downloadImages) {
            // Queue it.
            this.crawler.getUrlList().insertIfNotExists(new supercrawler.Url(imgUrl));
          } else {
            let proxyDownload = this.settings.proxy + imgUrl;
            this.db.images[imgUrl] = { url: imgUrl, id: imgUrl, proxyUrl: proxyDownload, data: imgUrl};
          }
          images[imgUrl] = { url: imgUrl, id: imgUrl };
        } else {
          // Url was filtered but was from the same domain - remove the tag.
          let hostUrl = new URL(pageUrl);
          let url = new URL(imgUrl, pageUrl);
          if (hostUrl.origin == url.origin) {
            $(d).remove();
          }
        }
      }
    });

    context = source.html();

    return {
      images: images,
      content: context
    };
  }

  /**
   * Get the forms found on the page.
   * @param {Object} context
   * @return {Array}
   */
  getForms(context, pageUrl) {
    let forms = {};
    if (this.formQueue) {
      forms = this.formQueue;
      Object.assign(this.db.forms, forms);
      this.formQueue = [];
      return _.values(forms);
    }
    $('form', context).each((count, d) => {
      let actionUrl = (new URL($(d).attr('action'), pageUrl)).href,
        id = $(d).attr('id');

      actionUrl = actionUrl.replace(/#.*$/, '');

      let form = {
        action: actionUrl,
        form: $.html(d),
      };
      // Identify forms by the action Url and prevent duplicates.
      this.db.forms[actionUrl] = form;
      forms[actionUrl] = form;
    });
    return _.values(forms);
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
      .then(() => {
        this.log('Database updated');
      })
      .catch(err => { this.log(err); });

    this.settings.shortenUrl = false;
    fileName = this.settings.saveDir + '/settings-' + this.settings.domain + '.json';
    this.storage.writeJson(fileName, this.settings)
      .then(() => { this.log('Settings updated'); })
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
   * Generate an alias url.
   *
   * @param string url
   * @return string
   */
  generateAlias(url) {
    let fullUrl = new URL(url);
    let path = fullUrl.pathname;

    if (path.length > 220) {
      path = path.substr(0, 220) + '...';
    }

    return path;
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
