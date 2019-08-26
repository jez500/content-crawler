/* global window */
const fs = (typeof window == 'undefined')?require('fs-extra'):false;

const Storage = class {
  /**
   * Class constructor.
   * @param string saveDir - The folder to save data.
   */
  constructor(saveDir) {
    this.saveDir = saveDir;
    this.prepared = false;
    this.mockStorage = {};
    // IndexedDB?
    if (this.isWeb() && !this.isTest()) {
      let request = window.indexedDB.open('crawler');
      request.onupgradeneeded = function() {
        request.result.createObjectStore('files');
      };
    }
  }

  /**
   * Is this a test excuting in mocha.js?
   * @return bool
   */
  isTest() {
    return this.saveDir == 'test';
  }

  /**
   * Is this running in a web browser or node?
   * @return bool
   */
  isWeb() {
    return (typeof window != 'undefined');
  }

  /**
   * Does the data folder exist?
   *
   * @return bool
   */
  prepareContainer() {
    if (this.isWeb()) {
      // We do not need to touch the container.
    } else {
      if (!fs.existsSync(this.saveDir)){
        fs.mkdirSync(this.saveDir);
      }
    }
    this.prepared = true;

    return true;
  }

  cleanLocalStorageKey(key) {
    return key.replace(/^\.\/public/, '');
  }

  /**
   * Write a single json object.
   *
   * @param string fileName
   *   The filename to store the object in.
   * @param {Object} json
   *   The json object to store.
   * @return bool
   */
  writeJson(fileName, json) {
    if (!this.prepared) {
      throw new Error('The container must be prepared before writing');
    }
    if (this.isTest()) {
      this.mockStorage[fileName] = json;
      return Promise.resolve(true);
    }
    else if(this.isWeb()) {
      fileName = this.cleanLocalStorageKey(fileName);
      console.log(fileName);

      return new Promise((resolve, reject) => {
        let request = window.indexedDB.open('crawler');
        request.onsuccess = function() {
          let db = request.result;
          let tx = db.transaction('files', 'readwrite');
          let st = tx.objectStore('files');
          let putRequest = st.put(json, fileName);

          putRequest.onsuccess = function() {
            resolve(true);
          };
          putRequest.onerror = function() {
            reject(getRequest.error);
          };
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    }
    else {
      return fs.writeJson(fileName, json, {spaces: 2});
    }
  }

  /**
   * Read a single json object from the store.
   *
   * @param string fileName
   *   The filename to retrieve the object from.
   * @return {Promise}
   */
  readJson(fileName) {
    let obj = false;
    if (!this.prepared) {
      throw new Error('The container must be prepared before reading');
    }
    if (this.isTest()) {
      if (typeof this.mockStorage[fileName] != 'undefined') {
        obj = this.mockStorage[fileName];
      }
    } else if (this.isWeb()) {
      fileName = this.cleanLocalStorageKey(fileName);

      return new Promise((resolve, reject) => {
        let request = window.indexedDB.open('crawler');
        request.onsuccess = function() {
          let db = request.result;
          let tx = db.transaction('files', 'readonly');
          let st = tx.objectStore('files');
          let getRequest = st.get(fileName);

          getRequest.onsuccess = function() {
            resolve(getRequest.result);
          };
          getRequest.onerror = function() {
            reject(getRequest.error);
          };
        };
        request.onerror = function() {
          reject(request.error);
        };
      });
    } else {
      obj = fs.readJsonSync(fileName, { throws: false });
    }
    if (!obj) {
      obj = {};
    }
    return new Promise((resolve, reject) => { resolve(obj); });
  }
};

module.exports = Storage;
