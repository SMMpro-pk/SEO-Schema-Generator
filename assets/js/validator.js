import { schemas } from './schema-templates.js';

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const urlKeys = new Set(['url', 'sameAs', 'contentUrl', 'embedUrl', 'thumbnailUrl', 'image', 'logo', 'menu']);
const dateKeys = new Set(['datePublished', 'dateModified', 'startDate', 'endDate', 'uploadDate', 'datePosted', 'validThrough']);
const numberKeys = new Set(['price', 'latitude', 'longitude', 'ratingValue', 'bestRating', 'worstRating', 'reviewCount', 'ratingCount', 'position']);
const knownTypes = new Set([
  ...schemas.map(schema => schema.type), 'Question', 'Answer', 'ListItem', 'HowToStep',
  'PostalAddress', 'GeoCoordinates', 'ImageObject', 'Brand', 'Offer', 'AggregateRating',
  'Place', 'MonetaryAmount', 'QuantitativeValue', 'Rating', 'VirtualLocation',
]);

function present(value) {
  return value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
}

function getPath(object, path) {
  return path.split('.').reduce((value, part) => value != null && Object.hasOwn(value, part) ? value[part] : undefined, object);
}

function validDate(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute, second, zone] = match;
  const date = new Date(0);
  date.setUTCFullYear(Number(year), Number(month) - 1, Number(day));
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return false;
  if (hour !== undefined && (Number(hour) > 23 || Number(minute) > 59 || Number(second || 0) > 59)) return false;
  if (zone && zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return false;
  return true;
}

export function validateSchema(value) {
  const messages = [];
  const add = (level, message) => messages.push({ level, message });
  if (!isObject(value) && !Array.isArray(value)) {
    add('error', 'Schema must be a JSON object or an array of objects.');
    return messages;
  }
  const roots = Array.isArray(value) ? value : [value];
  if (!roots.length) add('error', 'Schema array is empty.');
  const seen = new WeakSet();

  function walk(node, path) {
    if (node === null || typeof node !== 'object') return;
    if (seen.has(node)) {
      add('error', `${path} contains a circular or repeated object reference; JSON-LD should be serializable.`);
      return;
    }
    seen.add(node);
    if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
      seen.delete(node);
      return;
    }
    if (Object.hasOwn(node, '@type')) {
      const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
      if (!types.length || types.some(type => typeof type !== 'string' || !type.trim())) {
        add('error', `${path}.@type must be a non-empty string or array of strings.`);
      } else {
        for (const type of types) {
          if (!knownTypes.has(type)) add('info', `${path}: type "${type}" is not in this tool's local type list; it may still be valid Schema.org vocabulary.`);
        }
      }
    }
    for (const [key, child] of Object.entries(node)) {
      const childPath = `${path}.${key}`;
      const items = Array.isArray(child) ? child : [child];
      if (urlKeys.has(key)) {
        for (const item of items) {
          if (typeof item !== 'string' || !item.trim()) continue;
          try {
            const parsed = new URL(item);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
          } catch { add('warning', `${childPath} should be an absolute HTTP(S) URL.`); }
        }
      }
      if (dateKeys.has(key) && present(child) && !validDate(child)) {
        add('warning', `${childPath} should be a valid ISO 8601 date or date-time.`);
      }
      if (numberKeys.has(key) && present(child) &&
          (typeof child !== 'number' && (typeof child !== 'string' || !child.trim() || !Number.isFinite(Number(child))))) {
        add('warning', `${childPath} should be numeric.`);
      } else if (numberKeys.has(key) && typeof child === 'number' && !Number.isFinite(child)) {
        add('error', `${childPath} must be a finite number.`);
      }
      if (key === 'email' && typeof child === 'string' && child && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(child)) {
        add('warning', `${childPath} does not look like an email address.`);
      }
      walk(child, childPath);
    }
    seen.delete(node);
  }

  function checkRoot(root, path, inheritedContext = false) {
    if (!isObject(root)) {
      add('error', `${path} must be an object.`);
      return;
    }
    const context = root['@context'];
    if (!present(context) && !inheritedContext) add('warning', `${path} has no @context; Schema.org JSON-LD usually uses https://schema.org.`);
    if (typeof context === 'string' && !/^https?:\/\/schema\.org\/?$/.test(context)) {
      add('info', `${path} uses a context other than https://schema.org; this tool does not verify external contexts.`);
    }
    if (Object.hasOwn(root, '@graph')) {
      if (!Array.isArray(root['@graph'])) add('error', `${path}.@graph must be an array.`);
      else root['@graph'].forEach((item, index) => checkRoot(item, `${path}.@graph[${index}]`, present(context) || inheritedContext));
      return;
    }
    if (!present(root['@type'])) add('error', `${path} needs an @type.`);
    const type = Array.isArray(root['@type']) ? root['@type'][0] : root['@type'];
    const definition = schemas.find(item => item.type === type);
    if (definition && type !== 'Custom') {
      for (const field of definition.fields) {
        if (field.required && !present(getPath(root, field.key))) {
          add('warning', `${path}: ${field.label} is missing for ${type}.`);
        }
      }
    }
    if (type === 'FAQPage') {
      const questions = Array.isArray(root.mainEntity) ? root.mainEntity : root.mainEntity ? [root.mainEntity] : [];
      questions.forEach((question, index) => {
        if (!isObject(question) || !present(question.name) || !present(question.acceptedAnswer?.text)) {
          add('warning', `${path}.mainEntity[${index}] needs a question and an accepted answer.`);
        }
      });
      add('info', 'Google FAQ rich results are limited to eligible authoritative government and health sites; markup alone does not ensure display.');
    }
    if (type === 'HowTo') add('info', 'Google no longer shows HowTo rich results; Schema.org markup can still have other uses.');
    if (type === 'BreadcrumbList') {
      const items = Array.isArray(root.itemListElement) ? root.itemListElement : [];
      items.forEach((item, index) => {
        if (!isObject(item) || !present(item.name) || !present(item.position)) {
          add('warning', `${path}.itemListElement[${index}] should have a name and position.`);
        }
        if (index < items.length - 1 && !present(item?.item)) add('warning', `${path}.itemListElement[${index}] should have an item URL.`);
        if (typeof item?.item === 'string') {
          try {
            const parsed = new URL(item.item);
            if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
          } catch { add('warning', `${path}.itemListElement[${index}].item should be an absolute HTTP(S) URL.`); }
        }
      });
    }
    if (type === 'Product' && !present(root.offers) && !present(root.review) && !present(root.aggregateRating)) {
      add('warning', `${path}: Google product snippets generally require an offer, review, or aggregate rating.`);
    }
    if (type === 'Event' && !present(root.location)) add('warning', `${path}: event location is normally required for Google event experiences.`);
    if (type === 'JobPosting' && !present(root.jobLocation) && !present(root.jobLocationType)) {
      add('warning', `${path}: provide a job location or appropriate remote-work location details.`);
    }
    if (type === 'VideoObject' && !present(root.contentUrl) && !present(root.embedUrl)) {
      add('warning', `${path}: provide a content URL or embed URL for video discovery.`);
    }
    if (type === 'Recipe' && !present(root.recipeIngredient)) add('warning', `${path}: recipe ingredients are recommended.`);
    if (present(root.startDate) && present(root.endDate) && validDate(root.startDate) && validDate(root.endDate) &&
        Date.parse(root.endDate) < Date.parse(root.startDate)) {
      add('warning', `${path}: endDate is earlier than startDate.`);
    }
  }

  roots.forEach((root, index) => {
    const path = Array.isArray(value) ? `$[${index}]` : '$';
    checkRoot(root, path);
    walk(root, path);
  });
  add('info', 'Checks are local and incomplete; they do not verify Schema.org vocabulary, live URLs, page content, Google eligibility, or rich-result display.');
  return messages;
}
