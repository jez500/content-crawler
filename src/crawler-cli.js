const crawler = require("./crawler");
const process = require("process");

// Command line only.
if (typeof window == 'undefined') {

  // Read and check the command line arguments.
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

  // Crawl the site. Output will be saved to the public/sites folder.
  let dhcrawl = new crawler.Crawler(startUrl, settings);
  dhcrawl.startCrawl();
}
