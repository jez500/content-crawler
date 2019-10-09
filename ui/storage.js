
/**
 * Simple class to read/write browser local storage.
 */
const Storage = class {

  /**
   * Class constructor.
   */
  constructor(jsonDir) {
    this.jsonDir = jsonDir;
  }

  /**
   * Read objects from local storage with this "key".
   *
   * @param {string} key
   * @param {object} target
   * @return void
   */
  getStorage(key, target) {
    let request = window.indexedDB.open('crawler');
    request.onupgradeneeded = function() {
      this.result.createObjectStore('files');
    }.bind(request);

    request.onsuccess = function() {
      let db = request.result;
      let tx = db.transaction('files', 'readonly');
      let st = tx.objectStore('files');
      let getRequest = st.get(this.jsonDir + key);

      getRequest.onsuccess = function() {
        let site = getRequest.result;

        this.results = site;
        this.rawJSON = JSON.stringify(this.results);
        // We could include this properly now.
        this.rawHTML = jsonToHtml(this.results);
        this.pages = site.pages;
        this.images = site.images;
        this.documents = site.documents;
        this.forms = site.forms;
        this.getOverview();
        this.siteLoaded = true;
        this.clientLoaded = false;
        this.isServer = false;
        this.resolveImages();
        this.selectDefaultTab();

        let settingsRequest = st.get(this.jsonDir + 'settings-' + key);
        settingsRequest.onsuccess = function() {
          let settings = settingsRequest.result;

          this.url = settings.startUrl.href;
          this.downloadImages = settings.downloadImages;
          this.runScripts = settings.runScripts;
          this.urlFilter = settings.urlFilter;
          this.excludeFilter = settings.excludeFilter;
          this.proxy = settings.proxy;
          this.delay = settings.delay;
          this.searchString = settings.searchString;
          this.replaceString = settings.replaceString;
          this.redirectScript = settings.redirectScript;
          this.scriptExtensions = settings.scriptExtensions;
          this.robots = settings.robots;
          this.simplifyStructure = settings.simplifyStructure;
          this.removeDuplicates = settings.removeDuplicates;
          this.contentMapping = settings.contentMapping;
          this.removeElements = settings.removeElements;
        }.bind(target);
      }.bind(target);
    }.bind(target);
  }

  removeStorage(key, target) {
    let request = window.indexedDB.open('crawler');

    request.onsuccess = function() {
      let db = request.result;
      let tx = db.transaction('files', 'readwrite');
      let st = tx.objectStore('files');
      let deleteRequest = st.delete(target.jsonDir + key);

      deleteRequest.onsuccess = function() {
        delete this.storage[key];

        // Save the storage array.
        let putRequest = st.put(this.storage, this.jsonDir + this.authKey + '-index.json');

        putRequest.onsuccess = function() {
          this.authenticate();
        }.bind(this);
      }.bind(this);
    }.bind(target);
  }
};

module.exports = Storage;
