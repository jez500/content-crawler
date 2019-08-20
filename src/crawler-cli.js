const crawler = require("./crawler");
const process = require("process");

// Command line only.
if (typeof window == 'undefined') {
  // Start new crawl.
  let startUrl = '';
  let settings = {};
  let authKey = '';
  if (process.argv[2]) {
    startUrl = process.argv[2];
  }
  if (process.argv[3]) {
    settings = {
      authKey: process.argv[3],
    };
  }
  if (process.argv[4]) {
    settings = {
      urlFilter: process.argv[4],
    };
  }
  let dhcrawl = new crawler.Crawler(startUrl, settings);
  dhcrawl.startCrawl();
}
