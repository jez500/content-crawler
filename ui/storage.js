
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
   * Collapse the contentTypes into a string.
   */
  implodeContentMap(contentTypes = []) {
    let index = 0,
        contentType = null,
        map = '',
        fieldIndex = 0,
        field = null;

    for (index in contentTypes) {
      contentType = contentTypes[index];

      map += contentType.urlpattern;
      map += '|';
      map += contentType.name;
      map += '|';
      map += contentType.search;

      for (fieldIndex in contentType.fields) {
        field = contentType.fields[fieldIndex];

        map += '|';
        map += field.start;
        map += '|';
        map += field.end;
        map += '|';
        map += field.name;
        map += '|';
        map += field.dateformat;
      }

      map += "\n";

    }
    return map;
  }

  /**
   * Expand the contentMap into a set of nested objects.
   */
  explodeContentMap(contentMapping = '') {
    // Explode the contentMapping into nested objects.
    let maps = contentMapping.split(/\r?\n/);
    let contentTypes = [];
    let index = 0, line = '', urlPattern = null, i = 0, name = '', search = '';
    for (index in maps) {
      line = maps[index].split('|');
      if (line.length > 2) {
        urlPattern = line[0];
        name = line[1];
        search = line[2];
        let fields = [];
        let fieldname = '', fieldstart = '', fieldend = '', fielddateformat = '';
        for (i = 3; i < (line.length - 3); i+= 4) {
          fieldstart = line[i].trim();
          fieldend = line[i+1].trim();
          fieldname = line[i+2].trim();
          fielddateformat = line[i+3].trim();

          fields.push({ start: fieldstart, end: fieldend, name: fieldname, dateformat: fielddateformat });
        }

        contentTypes.push({ name: name, urlpattern: urlPattern, search: search, fields: fields });
      }
    }
    return contentTypes;
  }

  /**
   * Read objects from local storage with this "key".
   *
   * @param {string} key
   * @param {object} target
   * @return void
   */
  getStorage(key, target) {
    let storage = this;
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
          this.excludeTitleString = settings.excludeTitleString;
          this.proxy = settings.proxy;
          this.delay = settings.delay;
          this.urlLimit = settings.urlLimit;
          this.searchReplace = settings.searchReplace;
          this.redirectScript = settings.redirectScript;
          this.scriptExtensions = settings.scriptExtensions;
          this.robots = settings.robots;
          this.simplifyStructure = settings.simplifyStructure;
          this.trimWhitespace = settings.trimWhitespace;
          this.removeDuplicates = settings.removeDuplicates;
          this.removeAttributes = settings.removeAttributes;
          this.removeEmptyNodes = settings.removeEmptyNodes;
          this.contentMapping = settings.contentMapping;
          this.defaultContentType = settings.defaultContentType;
          this.removeElements = settings.removeElements;
          this.process = settings.process;

          this.contentTypes = storage.explodeContentMap(this.contentMapping);

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
