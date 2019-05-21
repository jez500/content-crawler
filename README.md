# Content Crawler

Crawl a site to get a count of the pages, images, documents and forms it contains. This is ideal if you intend to
migrate a site and want to get an overview its content.

## Installation

Run `npm install` to include dependencies.

## Starting a crawl

Run `npm run crawl FULL_URL_OF_SITE_TO_CRAWL` replacing `FULL_URL_OF_SITE_TO_CRAWL` with the start url of the site
you want to crawl. eg `npm run crawl http://example.com/`.

You can optionally pass a second argument that will filter only urls that contain this string. eg
`npm run crawl http://example.com/foo example.com/foo`

## Viewing crawl results

After a crawl is complete, visit `/public/index.html` to browse the crawl results in a web browser.

## Crawl data

Crawl data is saved as a JSON file in `/public/sites`. This data may be useful for ingesting into other applications 
or migrations.

## Author

[Jeremy Graham](https://jez.me)
