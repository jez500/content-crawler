const crawler = require("./crawler");

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
 * @param {function} completeHandler
 */
window.crawl = function(url,
                        downloadImages,
                        urlFilter,
                        excludeFilter,
                        proxy,
                        delay,
                        robots,
                        authKey,
                        completeHandler) {
  let instance = new crawler.Crawler(url, {
    downloadImages: downloadImages,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    proxy: proxy,
    delay: delay,
    robots: robots,
    authKey: authKey,
  });

  // Do something when we finish.
  instance.setCompleteHandler( completeHandler);
  instance.startCrawl();
};
