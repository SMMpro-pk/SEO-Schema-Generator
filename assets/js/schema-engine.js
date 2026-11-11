import { schemas } from './schema-templates.js';

const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

function assertSafe(value) {
  if (Array.isArray(value)) {
    value.forEach(assertSafe);
  } else if (isObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (blockedKeys.has(key)) throw new Error(`Unsafe property: ${key}`);
      assertSafe(child);
    }
  }
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let node = target;
  for (const part of parts.slice(0, -1)) {
    if (blockedKeys.has(part)) throw new Error(`Unsafe property: ${part}`);
    if (!isObject(node[part])) node[part] = {};
    node = node[part];
  }
  const last = parts[parts.length - 1];
  if (blockedKeys.has(last)) throw new Error(`Unsafe property: ${last}`);
  node[last] = value;
}

function getPath(target, path) {
  return path.split('.').reduce((value, part) => (
    value != null && !blockedKeys.has(part) && Object.hasOwn(value, part) ? value[part] : undefined
  ), target);
}

function lines(value) {
  return (Array.isArray(value) ? value : String(value).split(/\r?\n/))
    .map(item => typeof item === 'string' ? item.trim() : item)
    .filter(item => item !== '');
}

function typedLines(type, key, value) {
  return lines(value).map((line, index) => {
    if (typeof line !== 'string') return line;
    if (type === 'FAQPage' && key === 'mainEntity') {
      const separator = line.indexOf('|');
      return {
        '@type': 'Question',
        name: (separator < 0 ? line : line.slice(0, separator)).trim(),
        acceptedAnswer: { '@type': 'Answer', text: separator < 0 ? '' : line.slice(separator + 1).trim() },
      };
    }
    if (type === 'BreadcrumbList' && key === 'itemListElement') {
      const separator = line.indexOf('|');
      const item = separator < 0 ? '' : line.slice(separator + 1).trim();
      return {
        '@type': 'ListItem', position: index + 1,
        name: (separator < 0 ? line : line.slice(0, separator)).trim(),
        ...(item ? { item } : {}),
      };
    }
    if ((type === 'HowTo' && key === 'step') || (type === 'Recipe' && key === 'recipeInstructions')) {
      return { '@type': 'HowToStep', text: line };
    }
    return line;
  });
}

function parseField(type, field, value) {
  if (field.kind === 'lines') return typedLines(type, field.key, value);
  if (field.kind === 'json') {
    let result = value;
    if (typeof value === 'string') {
      try { result = JSON.parse(value); } catch { throw new Error(`${field.label} must be valid JSON.`); }
    }
    assertSafe(result);
    return result;
  }
  if (field.kind === 'number') {
    const number = typeof value === 'number' ? value : Number(String(value).trim());
    if (!Number.isFinite(number)) throw new Error(`${field.label} must be a finite number.`);
    return number;
  }
  return typeof value === 'string' ? value.trim() : value;
}

function addTypes(schema) {
  const types = {
    address: 'PostalAddress', geo: 'GeoCoordinates', author: 'Person',
    publisher: 'Organization', 'publisher.logo': 'ImageObject', brand: 'Brand',
    offers: 'Offer', aggregateRating: 'AggregateRating', worksFor: 'Organization',
    provider: 'Organization', organizer: 'Organization', location: 'Place',
    hiringOrganization: 'Organization', jobLocation: 'Place',
    'jobLocation.address': 'PostalAddress', baseSalary: 'MonetaryAmount',
    'baseSalary.value': 'QuantitativeValue', reviewRating: 'Rating',
  };
  for (const [path, type] of Object.entries(types)) {
    const value = getPath(schema, path);
    if (isObject(value) && !value['@type']) value['@type'] = type;
  }
}

export function buildSchema(type, values = {}) {
  const definition = schemas.find(item => item.type === type);
  if (!definition) throw new Error(`Unknown schema type: ${type}`);
  if (!isObject(values)) throw new Error('Values must be an object.');
  const result = { '@context': 'https://schema.org', '@type': type };
  for (const field of definition.fields) {
    const value = values[field.key];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) continue;
    const parsed = parseField(type, field, value);
    if (Array.isArray(parsed) && parsed.length === 0) continue;
    if (type === 'Custom' && field.key === 'properties') {
      if (!isObject(parsed)) throw new Error('Properties must be a JSON object.');
      Object.assign(result, parsed);
    } else {
      setPath(result, field.key, parsed);
    }
  }
  addTypes(result);
  return result;
}

function displayLines(type, key, value) {
  const list = Array.isArray(value) ? value : [value];
  return list.map(item => {
    if (!isObject(item)) return String(item);
    if (type === 'FAQPage' && key === 'mainEntity') {
      return `${item.name ?? ''} | ${item.acceptedAnswer?.text ?? ''}`;
    }
    if (type === 'BreadcrumbList' && key === 'itemListElement') {
      return `${item.name ?? ''} | ${typeof item.item === 'string' ? item.item : item.item?.['@id'] ?? ''}`;
    }
    return item.text ?? item.name ?? JSON.stringify(item);
  }).join('\n');
}

export function schemaToValues(schema, definition) {
  if (!isObject(schema)) throw new Error('Schema must be an object.');
  const resolved = typeof definition === 'string'
    ? schemas.find(item => item.type === definition)
    : definition || schemas.find(item => item.type === schema['@type']);
  if (!resolved || !Array.isArray(resolved.fields)) throw new Error('A schema definition is required.');
  const values = {};
  for (const field of resolved.fields) {
    let value = getPath(schema, field.key);
    if (resolved.type === 'Custom' && field.key === 'properties') {
      const { '@context': context, '@type': type, ...properties } = schema;
      value = properties;
    }
    if (value === undefined || value === null) continue;
    if (field.kind === 'lines') values[field.key] = displayLines(resolved.type, field.key, value);
    else if (field.kind === 'json') values[field.key] = JSON.stringify(value, null, 2);
    else values[field.key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  }
  return values;
}
