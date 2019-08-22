const Crawler = require("./crawler");
const process = require("process");
const parseArgs = require('minimist');


// Command line only.
if (typeof window == 'undefined') {

  // Read and check the command line arguments.
  let argv = parseArgs(process.argv.slice(3));
  let startUrl = process.argv.slice(2, 3);

  // No unsual arguments please.
  delete argv._;
  let i = 0;
  for (i in argv) {
    if (argv[i] == 'false') {
      argv[i] = false;
    }
  }

  // Crawl the site. Output will be saved to the public/sites folder.
  try {
    let dhcrawl = new Crawler(startUrl, argv);
    dhcrawl.startCrawl();
  } catch (ex) {
    console.log(ex.message);
  }
}
