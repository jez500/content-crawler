# Content Crawler

Crawl a site to get a count of the pages, images, documents and forms it contains. This is ideal if you intend to
migrate a site and want to get an overview its content.

## Installation

Run `npm install` to include dependencies.

## Building

Run `npm run build` to build the site. This includes all the node packages in a single file at `public/bundle.js`. You must build the site as part of install.

## Testing

Run `npm run test` to run javascript tests with "Mocha" against the site.

## Starting a crawl

Run `npm run crawl FULL_URL_OF_SITE_TO_CRAWL CLIENT_SECRET_KEY` replacing `FULL_URL_OF_SITE_TO_CRAWL` with the start url of the site
you want to crawl and CLIENT_SECRET_KEY with a unique string shared with this client. eg `npm run crawl http://example.com/ SECRET`.

Full command line usage can be seen with: `npm run crawl -- --help`.

## Starting a crawl from the site.

The website can also run crawls directly. This will require a "Cross Origin Request Proxy" to be running so that you can make HTTP requests from a browser. The publically available CORS-Anywhere proxy has been tested as a working proxy.

https://github.com/Rob--W/cors-anywhere

To run it from the command line:

export CORSANYWHERE_RATELIMIT="30 1"
export HOST=192.168.88.88

node server.js

(Change the rate limit values and server IP as needed).

There is a public version of this CORS proxy that can be accessed at

https://cors-anywhere.herokuapp.com/

Use of the public proxy would be subject to their own rate limits and restrictions.

## Viewing crawl results

After a crawl is complete, visit `/public/index.html` to browse the crawl results in a web browser. You will need to enter the same SECRET value to see the results.

## Crawl data

Crawl data is saved as a JSON file in `/public/sites`. This data may be useful for ingesting into other applications 
or migrations. A unique unidex of the crawled sites is at "/public/sites/SECRET-index.json".

## Author

[Jeremy Graham](https://jez.me)
