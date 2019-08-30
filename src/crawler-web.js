const Crawler = require("./crawler");

// We expose this function globally so it can be called inline from the Vue.js page
// when the button is clicked.
/**
 * Crawl a single website and save the result to browser storage.
 *
 * @param {string} url
 * @param {boolean} downloadImages
 * @param {string} urlFilter
 * @param {string} excludeFilter
 * @param {string} proxy
 * @param {number} delay
 * @param {boolean} robots
 * @param {string} authKey
 * @param {boolean} removeDuplicates
 * @param {string} contentMapping
 * @param {string} removeElements
 * @param {function} completeHandler
 */
window.crawl = function(url,
                        downloadImages,
                        runScripts,
                        urlFilter,
                        excludeFilter,
                        proxy,
                        delay,
                        robots,
                        authKey,
                        simplifyStructure,
                        removeDuplicates,
                        contentMapping,
                        removeElements,
                        completeHandler) {
  let instance = new Crawler(url, {
    downloadImages: downloadImages,
    runScripts: runScripts,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    proxy: proxy,
    delay: delay,
    robots: robots,
    authKey: authKey,
    simplifyStructure: simplifyStructure,
    removeDuplicates: removeDuplicates,
    contentMapping: contentMapping,
    removeElements: removeElements,
  });

  // Do something when we finish.
  instance.setCompleteHandler( completeHandler);
  instance.startCrawl();
};
