const Crawler = require("./crawler");

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
 * @param {number} delay
 * @param {string} searchString
 * @param {string} replaceString
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
 * @param {function} completeHandler
 */
window.crawl = function(url,
                        authKey,
                        proxy,
                        urlFilter,
                        excludeFilter,
                        delay,
                        searchString,
                        replaceString,
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
                        shortenUrl,
                        completeHandler) {
  let instance = new Crawler(url, {
    downloadImages: downloadImages,
    runScripts: runScripts,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    proxy: proxy,
    delay: delay,
    searchString: searchString,
    replaceString: replaceString,
    redirectScript: redirectScript,
    scriptExtensions: scriptExtensions,
    robots: robots,
    authKey: authKey,
    simplifyStructure: simplifyStructure,
    removeDuplicates: removeDuplicates,
    contentMapping: contentMapping,
    removeElements: removeElements,
    removeEmptyNodes: removeEmptyNodes,
    removeAttributes: removeAttributes,
    trimWhitespace: trimWhitespace,
    shortenUrl: shortenUrl,
  });

  // Do something when we finish.
  instance.setCompleteHandler( completeHandler);
  instance.startCrawl();
};
