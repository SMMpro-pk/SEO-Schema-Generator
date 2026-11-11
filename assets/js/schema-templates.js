const field = (key, label, kind = 'text', required = false, help, options) => ({
  key, label, kind, ...(required ? { required: true } : {}),
  ...(help ? { help } : {}), ...(options ? { options } : {}),
});

const name = () => field('name', 'Name', 'text', true);
const description = () => field('description', 'Description', 'textarea');
const url = () => field('url', 'URL', 'url');
const image = () => field('image', 'Image URL', 'url');
const sameAs = () => field('sameAs', 'Social/profile URLs', 'lines', false, 'One URL per line.');
const address = () => [
  field('address.streetAddress', 'Street address'),
  field('address.addressLocality', 'City'),
  field('address.addressRegion', 'Region'),
  field('address.postalCode', 'Postal code'),
  field('address.addressCountry', 'Country'),
];
const articleFields = () => [
  field('headline', 'Headline', 'text', true), description(), url(), image(),
  field('datePublished', 'Published date', 'date'),
  field('dateModified', 'Modified date', 'date'),
  field('author.name', 'Author name'),
  field('publisher.name', 'Publisher name'),
  field('publisher.logo.url', 'Publisher logo URL', 'url'),
];
const businessFields = () => [
  name(), description(), url(), image(), field('telephone', 'Telephone'),
  field('email', 'Email', 'email'), field('priceRange', 'Price range'),
  ...address(), field('geo.latitude', 'Latitude', 'number'),
  field('geo.longitude', 'Longitude', 'number'),
  field('openingHours', 'Opening hours', 'lines', false, 'One Schema.org opening-hours string per line, e.g. Mo-Fr 09:00-17:00.'),
  sameAs(),
];

export const schemas = [
  { type: 'Organization', category: 'Business', fields: [
    name(), description(), url(), field('logo', 'Logo URL', 'url'),
    field('telephone', 'Telephone'), field('email', 'Email', 'email'), ...address(), sameAs(),
  ] },
  { type: 'LocalBusiness', category: 'Business', fields: businessFields() },
  { type: 'Restaurant', category: 'Business', fields: [
    ...businessFields(), field('servesCuisine', 'Cuisine', 'lines', false, 'One cuisine per line.'),
    field('menu', 'Menu URL', 'url'),
  ] },
  { type: 'Person', category: 'People', fields: [
    name(), description(), url(), image(), field('jobTitle', 'Job title'),
    field('email', 'Email', 'email'), field('telephone', 'Telephone'),
    field('worksFor.name', 'Organization'), sameAs(),
  ] },
  { type: 'WebSite', category: 'Web', fields: [
    name(), url(), description(), field('inLanguage', 'Language'),
  ] },
  { type: 'WebPage', category: 'Web', fields: [
    name(), url(), description(), field('inLanguage', 'Language'),
    field('datePublished', 'Published date', 'date'), field('dateModified', 'Modified date', 'date'),
  ] },
  { type: 'Article', category: 'Content', fields: articleFields() },
  { type: 'BlogPosting', category: 'Content', fields: articleFields() },
  { type: 'NewsArticle', category: 'Content', fields: articleFields() },
  { type: 'Product', category: 'Commerce', fields: [
    name(), description(), image(), field('sku', 'SKU'), field('brand.name', 'Brand'),
    field('offers.url', 'Offer URL', 'url'), field('offers.price', 'Price', 'number'),
    field('offers.priceCurrency', 'Currency (ISO 4217)'),
    field('offers.availability', 'Availability', 'select', false, undefined,
      ['https://schema.org/InStock', 'https://schema.org/OutOfStock', 'https://schema.org/PreOrder']),
    field('aggregateRating.ratingValue', 'Average rating', 'number'),
    field('aggregateRating.reviewCount', 'Review count', 'number'),
  ] },
  { type: 'Service', category: 'Business', fields: [
    name(), description(), url(), field('serviceType', 'Service type'),
    field('provider.name', 'Provider'), field('areaServed', 'Area served'),
  ] },
  { type: 'FAQPage', category: 'Content', fields: [
    field('mainEntity', 'Questions and answers', 'lines', true, 'One question | answer per line.'),
  ] },
  { type: 'HowTo', category: 'Content', fields: [
    name(), description(), image(), field('totalTime', 'Total time', 'text', false, 'ISO 8601 duration, e.g. PT30M.'),
    field('step', 'Steps', 'lines', true, 'One step per line.'),
  ] },
  { type: 'BreadcrumbList', category: 'Web', fields: [
    field('itemListElement', 'Breadcrumbs', 'lines', true, 'One name | URL per line, in order.'),
  ] },
  { type: 'Event', category: 'Events', fields: [
    name(), description(), url(), image(), field('startDate', 'Start date and time', 'datetime', true),
    field('endDate', 'End date and time', 'datetime'),
    field('location.name', 'Location name'), field('location.address', 'Location address'),
    field('organizer.name', 'Organizer'), field('organizer.url', 'Organizer URL', 'url'),
    field('offers.url', 'Ticket URL', 'url'), field('offers.price', 'Price', 'number'),
    field('offers.priceCurrency', 'Currency (ISO 4217)'),
  ] },
  { type: 'Recipe', category: 'Content', fields: [
    name(), description(), image(), field('author.name', 'Author'),
    field('datePublished', 'Published date', 'date'), field('prepTime', 'Prep time'),
    field('cookTime', 'Cook time'), field('recipeYield', 'Yield'),
    field('recipeIngredient', 'Ingredients', 'lines', false, 'One ingredient per line.'),
    field('recipeInstructions', 'Instructions', 'lines', false, 'One instruction per line.'),
  ] },
  { type: 'VideoObject', category: 'Media', fields: [
    name(), field('description', 'Description', 'textarea', true),
    field('thumbnailUrl', 'Thumbnail URLs', 'lines', true, 'One URL per line.'),
    field('uploadDate', 'Upload date', 'date', true), field('contentUrl', 'Content URL', 'url'),
    field('embedUrl', 'Embed URL', 'url'), field('duration', 'Duration', 'text', false, 'ISO 8601 duration, e.g. PT2M30S.'),
  ] },
  { type: 'JobPosting', category: 'Jobs', fields: [
    field('title', 'Job title', 'text', true), field('description', 'Description', 'textarea', true),
    field('datePosted', 'Date posted', 'date', true), field('validThrough', 'Valid through', 'datetime'),
    field('employmentType', 'Employment type'), field('hiringOrganization.name', 'Hiring organization', 'text', true),
    field('hiringOrganization.sameAs', 'Organization URL', 'url'),
    field('jobLocation.address.streetAddress', 'Street address'),
    field('jobLocation.address.addressLocality', 'City'),
    field('jobLocation.address.addressRegion', 'Region'),
    field('jobLocation.address.postalCode', 'Postal code'),
    field('jobLocation.address.addressCountry', 'Country'),
    field('baseSalary.currency', 'Salary currency'),
    field('baseSalary.value.value', 'Salary amount', 'number'),
    field('baseSalary.value.unitText', 'Salary period', 'select', false, undefined, ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR']),
  ] },
  { type: 'SoftwareApplication', category: 'Software', fields: [
    name(), description(), url(), field('applicationCategory', 'Application category'),
    field('operatingSystem', 'Operating system'), field('offers.price', 'Price', 'number'),
    field('offers.priceCurrency', 'Currency (ISO 4217)'),
    field('aggregateRating.ratingValue', 'Average rating', 'number'),
    field('aggregateRating.ratingCount', 'Rating count', 'number'),
  ] },
  { type: 'Course', category: 'Education', fields: [
    name(), description(), field('provider.name', 'Provider'), field('provider.sameAs', 'Provider URL', 'url'),
    url(),
  ] },
  { type: 'Review', category: 'Commerce', fields: [
    field('itemReviewed.name', 'Reviewed item', 'text', true),
    field('itemReviewed.@type', 'Reviewed item type', 'text', true),
    field('author.name', 'Author', 'text', true),
    field('reviewRating.ratingValue', 'Rating', 'number', true),
    field('reviewRating.bestRating', 'Best rating', 'number'),
    field('reviewBody', 'Review', 'textarea'), field('datePublished', 'Published date', 'date'),
  ] },
  { type: 'Book', category: 'Content', fields: [
    name(), description(), url(), image(), field('author.name', 'Author'),
    field('isbn', 'ISBN'), field('datePublished', 'Published date', 'date'),
  ] },
  { type: 'Custom', category: 'Advanced', fields: [
    field('@type', 'Schema type', 'text', true),
    field('properties', 'Properties (JSON object)', 'json', false, 'Enter a JSON object with additional Schema.org properties.'),
  ] },
];

// A starting point only: complete this editable organization with your own details.
export const smmproPreset = { '@context': 'https://schema.org', '@type': 'Organization', name: 'SMMpro' };
