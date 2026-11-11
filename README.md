# SMMpro Schema Generator

A dependency-free, browser-based tool for creating structured data for websites without a paid SEO plugin.

**Site:** https://smmpro-pk.github.io/seo-schema-generator/

## Toolkit

The generator supports Organization, LocalBusiness, Restaurant, Person, WebSite, WebPage, Article, BlogPosting, NewsArticle, Product, Service, FAQPage, HowTo, BreadcrumbList, Event, Recipe, VideoObject, JobPosting, SoftwareApplication, Course, Review, Book, and Custom schemas. Its local validation is advisory and does not check the complete vocabulary or Google rich-result eligibility.

Alongside the JSON-LD generator, the toolkit includes meta title and description counters; Open Graph, Twitter card, canonical URL, and robots meta tag generators; HTML sitemap link, XML sitemap URL entry, and robots.txt generators; and a JSON formatter and syntax validator. Review generated snippets before adding them to your site.

## Getting started

Open the site, choose the schema that fits your content, enter the relevant details, and use the generated JSON-LD on the matching page of your website. Review the output before publishing: the generated data must describe content that is visible and accurate on that page.

For local development, clone the repository and serve its root with any static HTTP server. For example, if Python 3 is installed:

```sh
git clone https://github.com/SMMpro-pk/SEO-Schema-Generator.git
cd SEO-Schema-Generator
python3 -m http.server 8000
```

Then visit `http://localhost:8000/`. Python is only an example server; the application itself does not require Python or a package installation.

## Validate before publishing

Use the [Schema Markup Validator](https://validator.schema.org/) to check structured data and Google's [Rich Results Test](https://search.google.com/test/rich-results) to check supported rich-result types. Valid markup does not guarantee indexing or a rich result. Follow the relevant [Google structured data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies).

See [usage and deployment](docs/usage.md), [contributing](CONTRIBUTING.md), and [security reporting](SECURITY.md).

## License

[MIT](LICENSE).
