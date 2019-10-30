const Vue = require('vue');
const VueMaterial = require('vue-material');
const VuejsPaginate = require('vuejs-paginate');
const axios = require('axios');
const _ = require('lodash');
const Storage = require('./storage');

/**
 * Simple class to create a Vue app.
 */
const UI = class {

  /**
   * Class constructor.
   */
  constructor() {
    Vue.use(VueMaterial.default);
    Vue.component('paginate', VuejsPaginate);

    new Vue({
      el: '#app',
      data: {
        menuVisible: false,
        jsonDir: '/sites/',
        indexLoaded: false,
        siteLoaded: false,
        clientLoaded: false,
        isServer: false,
        results: {},
        pages: [],
        overview: [],
        images: [],
        index: {},
        storage: {},
        localStorage: new Storage('/sites/'),
        clients: [],
        url: '',
        proxy: 'https://cors-anywhere.herokuapp.com/',
        downloadImages: false,
        runScripts: false,
        urlFilter: '',
        excludeFilter: '',
        delay: 5,
        urlLimit: 0,
        searchString: '',
        replaceString: '',
        redirectScript: '',
        scriptExtensions: '',
        robots: true,
        crawling: false,
        indexMaster: false,
        removeEmptyNodes: true,
        removeAttributes: true,
        trimWhitespace: true,
        simplifyStructure: false,
        removeDuplicates: true,
        authKey: '',
        rawJSON: '',
        contentMapping: '',
        contentTypes: [],
        removeElements: 'nav, aside, .navbar, .Breadcrumbs, header, head, footer, script, oembed, noscript, style, iframe, object',
        process: '',
        domainToLoad: '',
        perPage: 10,
        pagesCurrentPage: 0,
        imagesCurrentPage: 0,
        documentsCurrentPage: 0,
        formsCurrentPage: 0,
        activeTab: 'overview',
        firstName: '',
        lastName: '',
        company: '',
        email: '',
        phone: '',
        client: {},
        clientNotesSaved: false,
        newClientResponse: '',

        countSites: 0,
        localMax: 3
      },
      computed: {
        paginatedPages: function() {
          let start = (this.pagesCurrentPage * this.perPage);
          if (start > this.pages.length) {
            this.pagesCurrentPage = 0;
          }
          return this.pages.slice(
            this.pagesCurrentPage * this.perPage,
            (this.pagesCurrentPage + 1) * this.perPage
          );
        },
        paginatedImages: function() {
          let start = (this.imagesCurrentPage * this.perPage);
          if (start > this.images.length) {
            this.imagesCurrentPage = 0;
          }
          return this.images.slice(
            this.imagesCurrentPage * this.perPage,
            (this.imagesCurrentPage + 1) * this.perPage
          );
        },
        paginatedForms: function() {
          let start = (this.formsCurrentPage * this.perPage);
          if (start > this.forms.length) {
            this.formsCurrentPage = 0;
          }
          return this.forms.slice(
            this.formsCurrentPage * this.perPage,
            (this.formsCurrentPage + 1) * this.perPage
          );
        },
        paginatedDocuments: function() {
          let start = (this.documentsCurrentPage * this.perPage);
          if (start > this.documents.length) {
            this.documentsCurrentPage = 0;
          }
          return this.documents.slice(
            this.documentsCurrentPage * this.perPage,
            (this.documentsCurrentPage + 1) * this.perPage
          );
        },
      },
      methods: {
        setPagesCurrentPage: function(page) {
          this.pagesCurrentPage = page - 1;
        },
        setImagesCurrentPage: function(page) {
          this.imagesCurrentPage = page - 1;
        },
        setFormsCurrentPage: function(page) {
          this.formsCurrentPage = page - 1;
        },
        setDocumentsCurrentPage: function(page) {
          this.documentsCurrentPage = page - 1;
        },
        getOverview: function() {
          this.overview = [
            { title: 'Pages', count: this.results.pages.length, id: 'pages' },
            { title: 'Images', count: this.results.images.length, id: 'images' },
            { title: 'Documents', count: this.results.documents.length, id: 'documents' },
            { title: 'Forms', count: this.results.forms.length, id: 'forms' },
          ];
        },
        updateJSON: function() {
          setTimeout(function() {
            // Attach the JSON to the page.
            let raw = document.getElementById('rawHTML');
            if (raw) {
              while (raw.firstChild) {
                raw.removeChild(raw.firstChild);
              }
              raw.appendChild(this.rawHTML);
            }

          }.bind(this), 500);

          return '';
        },
        removeClient: function(key) {
          if (!this.indexMaster) {
            return [];
          }

          let params = new URLSearchParams();

          params.append('action', 'remove_client');
          params.append('key', key);
          params.append('authKey', this.authKey);

          axios.post('persist.php', params).then(() => {
            this.listClients();
          });

        },
        addClient: function() {
          if (!this.indexMaster) {
            return [];
          }

          let baseKey = prompt("Please enter the client ID", "client");

          if (!baseKey) {
            return [];
          }

          // Append a random string to the base key.
          let params = new URLSearchParams(),
              key = baseKey + '-' + Math.random().toString(36).substring(2, 8);

          params.append('action', 'add_client');
          params.append('key', key);
          params.append('authKey', this.authKey);

          axios.post('persist.php', params).then(() => {
            this.listClients();
          });

        },
        listClients: function() {
          if (!this.indexMaster) {
            return [];
          }

          let params = new URLSearchParams();

          params.append('action', 'list');
          params.append('authKey', this.authKey);

          axios.post('persist.php', params).then((data) => {
            this.clients = data.data;
          });

        },
        moveSiteToServer: function() {
          let params = new URLSearchParams();

          params.append('action', 'add');
          params.append('authKey', this.authKey);
          params.append('domain', this.results.domain);
          params.append('title', this.results.domain);
          params.append('json', this.rawJSON);
          this.siteCount += 1;

          let settings = {
            startUrl: this.url,
            downloadImages: this.downloadImages,
            runScripts: this.runScripts,
            urlFilter: this.urlFilter,
            excludeFilter: this.excludeFilter,
            proxy: this.proxy,
            delay: this.delay,
            urlLimit: this.urlLimit,
            searchString: this.searchString,
            replaceString: this.replaceString,
            redirectScript: this.redirectScript,
            scriptExtensions: this.scriptExtensions,
            robots: this.robots,
            simplifyStructure: this.simplifyStructure,
            removeDuplicates: this.removeDuplicates,
            contentMapping: this.contentMapping,
            removeElements: this.removeElements,
            process: this.process,
            removeAttributes: this.removeAttributes,
            removeEmptyNodes: this.removeEmptyNodes,
          };
          params.append('settings', JSON.stringify(settings));

          axios.post('persist.php', params).then(() => {
            let site = this.results.domain;
            this.localStorage.removeStorage(site, this);
            this.getSite(site + '.json');
          });
        },
        removeSite(site) {
          let params = new URLSearchParams();

          params.append('authKey', this.authKey);
          params.append('remove', this.results.domain);
          params.append('action', 'remove');

          axios.post('persist.php', params).then(() => {
            this.authenticate();
          });

        },
        loadClient(authKey) {
          let timestamp = (new Date()).getTime();
          return axios.get(this.jsonDir + authKey + '-info.json?' + timestamp, {});
        },
        login() {
          this.authenticate().then(() => {
            this.loadClient(this.authKey)
              .then((response) => {
                 this.firstName = response.data.firstName;
                 this.notes = response.data.notes;
                 this.lastName = response.data.lastName;
                 this.company = response.data.company;
                 this.phone = response.data.phone;
                 this.email = response.data.email;
              }).catch((ex) => {
                let message = 'Not specified';
                this.notes = '';
                this.firstName = message;
                this.lastName = message;
                this.company = message;
                this.phone = message;
                this.email = message;
              });
          });
        },
        newClient() {
          // Append a random string to the base key.
          let params = new URLSearchParams();

          params.append('action', 'new_client');
          params.append('firstName', this.firstName);
          params.append('lastName', this.lastName);
          params.append('company', this.company);
          params.append('email', this.email);
          params.append('phone', this.phone);

          axios.post('persist.php', params).then(() => {
            this.newClientResponse = true;
          });
          return false;
        },
        authenticate() {
          if (!this.authKey) {
            return;
          }

          // Santize the key before we fetch it.
          this.authKey = this.authKey.replace(/[^A-Za-z0-9\-]/g, "");
          let timestamp = (new Date()).getTime();

          return axios.get(this.jsonDir + this.authKey + '-index.json?' + timestamp, {})
            .then((data) => {
              this.indexLoaded = true;
              this.index = _.toArray(data.data);
              this.menuVisible = true;

              // The key was valid,
              // get the sites from local storage.
              let request = window.indexedDB.open('crawler');
              request.onupgradeneeded = function() {
                this.result.createObjectStore('files');
              }.bind(request);

              request.onsuccess = function() {
                let db = request.result;
                let tx = db.transaction('files', 'readonly');
                let st = tx.objectStore('files');
                let getRequest = st.get(this.jsonDir + this.authKey + '-index.json');

                getRequest.onsuccess = function() {
                  this.storage = getRequest.result;
                  if (this.domainToLoad) {
                    this.localStorage.getStorage(this.domainToLoad, this);
                    this.domainToLoad = '';
                  }
                }.bind(this);
              }.bind(this);
            }).then(() => {
              axios.get(this.jsonDir + this.authKey + '-index.json.master?' + timestamp, {})
              .then((data) => {
                this.indexMaster = true;
                this.listClients();
              }).catch((ex) => {
                this.indexMaster = false;
                // Not an error.
              });
            }).catch((ex) => {
              this.indexLoaded = false;
              this.index = [];
              alert('The login code was not correct. Please check it and try again.');
            });

        },
        toggleMenu() {
          this.menuVisible = !this.menuVisible;
        },
        beginCrawl() {
          if (this.storage && Object.keys(this.storage).length >= this.localMax && !this.indexMaster) {
            return false;
          }
          this.crawling = true;

          if (this.url.substring(0, 4) != 'http') {
            this.url = 'http://' + this.url;
          }

          this.contentMapping = this.localStorage.implodeContentMap(this.contentTypes);

          window.crawl(this.url,
              this.authKey,
              this.proxy,
              this.urlFilter,
              this.excludeFilter,
              this.delay,
              this.urlLimit,
              this.searchString,
              this.replaceString,
              this.redirectScript,
              this.scriptExtensions,
              this.runScripts,
              this.downloadImages,
              this.robots,
              this.removeEmptyNodes,
              this.removeAttributes,
              this.trimWhitespace,
              this.simplifyStructure,
              this.removeDuplicates,
              this.contentMapping,
              this.removeElements,
              this.process,
              this.shortenUrl,
              this.crawlComplete);
        },
        // Implement java hashcode to get unique(ish) number from string.
        hash(src) {
          let hash = 0, i = 0, c = 0;
          if (src.length == 0) {
            return hash;
          }
          for (i = 0; i < src.length; i++) {
            c = src.charCodeAt(i);
            hash = ((hash<<5)-hash)+c;
            hash = hash & hash; // Convert to 32bit integer
          }
          return hash;
        },
        /**
         * If url is long, generate a short redirect version.
         */
        shortenUrl(url) {
          // Shorter than 128 to be safe.
          if (url.length > 124) {
            console.log('Shorten this: ' + url);
            let params = new URLSearchParams();
            let token = this.hash(url);
            params.append('url', url);
            params.append('token', token);

            axios.post('shorten.php', params);
            url = new URL('shorten.php?token=' + token, document.location).href;
            console.log('Result: ' + url);
          }

          return url + '';
        },
        crawlComplete() {
          this.crawling = false;
          let url = new URL(this.url);
          this.domainToLoad = url.hostname + '.json';
          this.authenticate();
        },
        getStorage(key) {
          return this.localStorage.getStorage(key, this);
        },
        removeStorage(key) {
          return this.localStorage.removeStorage(key, this);
        },
        getClient(key) {
          this.loadClient(key).then((response) => {
            this.client.firstName = response.data.firstName;
            this.client.lastName = response.data.lastName;
            this.client.company = response.data.company;
            this.client.phone = response.data.phone;
            this.client.email = response.data.email;
            this.client.key = response.data.key;
            this.client.notes = response.data.notes;
            this.clientNotesSaved = false;
            this.clientLoaded = true;
            this.siteLoaded = false;

            let timestamp = (new Date()).getTime();

            return axios.get(this.jsonDir + key + '-index.json?' + timestamp, {})
              .then((data) => {
                this.indexLoaded = true;
                this.index = _.toArray(data.data);
                this.menuVisible = true;
              });

          }).catch((ex) => {
            // No info file for this client.
            let message = 'Not specified';
            this.client.firstName = message;
            this.client.lastName = message;
            this.client.company = message;
            this.client.phone = message;
            this.client.email = message;
            this.client.key = key;
            this.clientNotesSaved = false;
            this.clientLoaded = true;
            this.siteLoaded = false;

            let timestamp = (new Date()).getTime();

            return axios.get(this.jsonDir + key + '-index.json?' + timestamp, {})
              .then((data) => {
                this.indexLoaded = true;
                this.index = _.toArray(data.data);
                this.menuVisible = true;
              });
          });

        },
        getSite(file) {
          axios.get(this.jsonDir + file, {})
            .then((data) => {
              this.results = data.data;
              this.rawJSON = '';
              this.rawHTML = null;

              try {
                this.rawJSON = JSON.stringify(this.results);
                this.rawHTML = jsonToHtml(this.results);

              } catch (ex) { }

              this.pages = this.results.pages;
              this.images = this.results.images;
              this.documents = this.results.documents;
              this.forms = this.results.forms;
              this.getOverview();
              this.siteLoaded = true;
              this.clientLoaded = false;
              this.isServer = true;

              this.resolveImages();
              this.selectDefaultTab();

              axios.get(this.jsonDir + 'settings-' + file, {})
                .then((data) => {
                  let settings = data.data;
                  this.url = settings.startUrl;
                  this.downloadImages = settings.downloadImages;
                  this.runScripts = settings.runScripts;
                  this.urlFilter = settings.urlFilter;
                  this.excludeFilter = settings.excludeFilter;
                  this.proxy = settings.proxy;
                  this.delay = settings.delay;
                  this.urlLimit = settings.urlLimit;
                  this.searchString = settings.searchString;
                  this.replaceString = settings.replaceString;
                  this.redirectScript = settings.redirectScript;
                  this.scriptExtensions = settings.scriptExtensions;
                  this.robots = settings.robots;
                  this.simplifyStructure = settings.simplifyStructure;
                  this.removeDuplicates = settings.removeDuplicates;
                  this.contentMapping = settings.contentMapping;
                  this.removeElements = settings.removeElements;
                  this.process = settings.process;

                  this.contentTypes = this.localStorage.explodeContentMap(this.contentMapping);
                });


            });
        },
        tabChanged: function(id) {
          this.activeTab = id;
        },
        selectDefaultTab() {
          setTimeout(function() {
            this.activeTab = 'overview';
            // We want to trigger a change, so the pages are updated.
            this.pagesCurrentPage = 10;
            this.imagesCurrentPage = 10;
            this.documentsCurrentPage = 10;
            this.formsCurrentPage = 10;
            this.pagesCurrentPage = 0;
            this.imagesCurrentPage = 0;
            this.documentsCurrentPage = 0;
            this.formsCurrentPage = 0;
          }.bind(this), 200);
        },
        resolveImages() {
          let index, img, loaded = 0;

          for (index in this.images) {
            img = this.images[index];

            // We would DOS the proxy if we load too many images at once.
            if (img.data.substring(0, 5) == 'data:') {
              img.proxyUrl = img.data;
            } else {
              loaded++;
              img.proxyUrl = this.proxy + img.data;
            }
          }
        },
        saveClientNotes: function() {
          if (!this.indexMaster) {
            return;
          }
          let params = new URLSearchParams();

          params.append('action', 'save_notes');
          params.append('notes', this.client.notes);
          params.append('clientKey', this.client.key);
          params.append('authKey', this.authKey);

          axios.post('persist.php', params).then(() => {
            this.clientNotesSaved = true;
          });
        },
        copyJsonToClipboard: function() {
          var source = document.createElement("textarea");
          document.body.appendChild(source);
          source.value = JSON.stringify(JSON.parse(this.rawJSON), null, 2);
          source.select();
          document.execCommand("copy");
          document.body.removeChild(source);
        },
        copyContentToClipboard: function(content) {
          var source = document.createElement("textarea");
          document.body.appendChild(source);
          source.value = content;
          source.select();
          document.execCommand("copy");
          document.body.removeChild(source);
        },
        addContentType: function() {
          this.contentTypes.push( { name: '', url: '', search: '', fields: [] } );
        },
        removeContentType: function() {
          this.contentTypes.pop();
        },
        addField: function(index) {
          this.contentTypes[index].fields.push( { start: '', end: '', name: '', dateformat: '' } );
        },
        removeField: function(index) {
          this.contentTypes[index].fields.pop();
        },
        homePage() {
          this.results.domain = '';
          this.siteLoaded = false;
          this.clientLoaded = false;
        },
      }
    });
  }
};

module.exports = UI;
window.crawlerUI = UI;
