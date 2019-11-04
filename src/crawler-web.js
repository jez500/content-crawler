const Crawler = require("./crawler");
const CrawlerSettings = require("./crawler-settings");

// We expose this function globally so it can be called inline from the Vue.js page
// when the button is clicked.
/**
 * Crawl a single website and save the result to browser storage.
 *
 * @param {string} url
 * @param {string} authKey
 * @param {string} proxy
 * @param {string} urlFilter
 * @param {string} excludeFilter
 * @param {string} excludeTitleString
 * @param {number} delay
 * @param {number} urlLimit
 * @param {string} searchReplace
 * @param {string} redirectScript
 * @param {string} scriptExtensions
 * @param {boolean} runScripts
 * @param {boolean} downloadImages
 * @param {boolean} robots
 * @param {boolean} removeEmptyNodes
 * @param {boolean} removeAttributes
 * @param {boolean} trimWhitespace
 * @param {boolean} simplifyStructure
 * @param {boolean} removeDuplicates
 * @param {string} contentMapping
 * @param {string} removeElements
 * @param {string} process
 * @param {function} shortenUrl
 * @param {function} completeHandler
 */
window.crawl = function(url,
                        authKey,
                        proxy,
                        urlFilter,
                        excludeFilter,
                        excludeTitleString,
                        delay,
                        urlLimit,
                        searchReplace,
                        redirectScript,
                        scriptExtensions,
                        runScripts,
                        downloadImages,
                        robots,
                        removeEmptyNodes,
                        removeAttributes,
                        trimWhitespace,
                        simplifyStructure,
                        removeDuplicates,
                        contentMapping,
                        removeElements,
                        process,
                        shortenUrl,
                        completeHandler) {
  let instance = new Crawler(url, {
    downloadImages: downloadImages,
    runScripts: runScripts,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    excludeTitleString: excludeTitleString,
    proxy: proxy,
    delay: delay,
    urlLimit: urlLimit,
    searchReplace: searchReplace,
    redirectScript: redirectScript,
    scriptExtensions: scriptExtensions,
    robots: robots,
    authKey: authKey,
    simplifyStructure: simplifyStructure,
    removeDuplicates: removeDuplicates,
    contentMapping: contentMapping,
    removeElements: removeElements,
    process: process,
    removeEmptyNodes: removeEmptyNodes,
    removeAttributes: removeAttributes,
    trimWhitespace: trimWhitespace,
    shortenUrl: shortenUrl,
  });

  // Do something when we finish.
  instance.setCompleteHandler( completeHandler);
  instance.startCrawl();
};

/**
 * Force a json file download for the current settings.
 *
 * @param {string} url
 * @param {string} proxy
 * @param {string} urlFilter
 * @param {string} excludeFilter
 * @param {string} excludeTitleString
 * @param {number} delay
 * @param {number} urlLimit
 * @param {string} searchReplace
 * @param {string} redirectScript
 * @param {string} scriptExtensions
 * @param {boolean} runScripts
 * @param {boolean} downloadImages
 * @param {boolean} robots
 * @param {boolean} removeEmptyNodes
 * @param {boolean} removeAttributes
 * @param {boolean} simplifyStructure
 * @param {boolean} removeDuplicates
 * @param {string} contentMapping
 * @param {string} removeElements
 * @param {string} process
 */
window.saveSettings = function(url,
                        proxy,
                        urlFilter,
                        excludeFilter,
                        excludeTitleString,
                        delay,
                        urlLimit,
                        searchReplace,
                        redirectScript,
                        scriptExtensions,
                        runScripts,
                        downloadImages,
                        robots,
                        removeEmptyNodes,
                        removeAttributes,
                        simplifyStructure,
                        removeDuplicates,
                        contentMapping,
                        removeElements,
                        process) {

  let settings = {
    startUrl: url,
    proxy: proxy,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    excludeTitleString: excludeTitleString,
    delay: delay,
    urlLimit: urlLimit,
    searchReplace: searchReplace,
    redirectScript: redirectScript,
    scriptExtensions: scriptExtensions,
    runScripts: runScripts,
    downloadImages: downloadImages,
    robots: robots,
    removeEmptyNodes: removeEmptyNodes,
    removeAttributes: removeAttributes,
    simplifyStructure: simplifyStructure,
    removeDuplicates: removeDuplicates,
    contentMapping: contentMapping,
    removeElements: removeElements,
    process: process,
  };
  let element = document.createElement('a');

  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(settings, null, 2)));
  element.setAttribute('download', 'settings.json');
  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};
