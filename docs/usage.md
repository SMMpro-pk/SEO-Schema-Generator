# Usage and deployment

## Using generated markup

Choose a schema appropriate to the page and supply accurate information. Copy the generated JSON-LD into the HTML of the page it describes, following your site's publishing process. Review the result on the published page, especially when a content management system modifies HTML. Do not mark up content that is absent or misleading.

For FAQ entries, use one `question | answer` pair per line; for breadcrumbs, use one `name | URL` pair per line. Enter HowTo and recipe steps one per line. The local validator provides advisory checks, not complete Schema.org or Google eligibility validation.

The SMMpro preset starts as an editable Organization with only its name; add the details appropriate to your page. Raw JSON may contain additional properties, but conversion back to the form covers only defined fields.

Check the result with the [Schema Markup Validator](https://validator.schema.org/) and, where applicable, the [Rich Results Test](https://search.google.com/test/rich-results). A successful validation is not a guarantee of search engine display.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` uploads the repository's static files as a Pages artifact and deploys the default branch. In the repository's **Settings → Pages**, select **GitHub Actions** as the build and deployment source. A default-branch push or a manual workflow dispatch on the default branch can then initiate deployment. Check the Actions run and Pages settings for its actual status; the presence of the workflow alone does not mean the site has been deployed.

The intended URL is https://smmpro-pk.github.io/seo-schema-generator/. If deploying under a different URL, update the canonical URL in the site and the references in `robots.txt` and `sitemap.xml` accordingly.

Search engines normally read `robots.txt` only from the host root, so a `robots.txt` under this project site's `/seo-schema-generator/` path may not be honored. Submit the project sitemap directly to the relevant search engine if needed.
