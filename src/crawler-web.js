const crawler = require("./crawler");

// We expose this function globally so it can be called inline from the Vue.js page
// when the button is clicked.
window.crawl = function(url, downloadImages, urlFilter, excludeFilter, proxy, delay, robots, authKey) {
  let instance = new crawler.Crawler(url, {
    downloadImages: downloadImages,
    urlFilter: urlFilter,
    excludeFilter: excludeFilter,
    proxy: proxy,
    delay: delay,
    robots: robots,
    authKey: authKey,
  });

  let element = document.getElementById('progress');
  element.style.display = 'inline';

  element = document.getElementById('crawl');
  element.style.display = 'none';

  instance.setCompleteHandler( (success) => {
      if (success) {
        setTimeout( function() { location.reload(); }, 4000);
      } 
    }
  );
  instance.startCrawl();
};
