import { schemas, smmproPreset } from './schema-templates.js';
import { buildSchema, schemaToValues } from './schema-engine.js';
import { validateSchema } from './validator.js';
import { read, write, clearData } from './storage.js';
import { download, scriptSnippet } from './exporter.js';
import { initUtilities } from './utilities.js';

const $ = id => document.getElementById(id);
const MAX_SIZE = 1024 * 1024;
const examples = {
  'Small business': { '@type': 'LocalBusiness', name: 'Example Shop', url: 'https://example.com/' },
  'Digital marketing agency': { '@type': 'Organization', name: 'Example Agency', url: 'https://example.com/' },
  'SEO company': { '@type': 'ProfessionalService', name: 'Example SEO Company', url: 'https://example.com/' },
  'Personal portfolio': { '@type': 'Person', name: 'Example Person', url: 'https://example.com/' },
  Blog: { '@type': 'BlogPosting', headline: 'Example article', url: 'https://example.com/article' },
  'E-commerce store': { '@type': 'Product', name: 'Example Product', url: 'https://example.com/product' },
  Restaurant: { '@type': 'LocalBusiness', name: 'Example Restaurant', url: 'https://example.com/' },
  'Educational institute': { '@type': 'Course', name: 'Example Course', provider: { '@type': 'Organization', name: 'Example School' } },
  'Software application': { '@type': 'SoftwareApplication', name: 'Example App', applicationCategory: 'BusinessApplication' },
  'Professional service': { '@type': 'ProfessionalService', name: 'Example Service', url: 'https://example.com/' },
};
const editor = $('json-editor');
const form = $('schema-form');
let currentType = 'Organization';
let validObject = null;
let dirty = false;
let favorites = read('favorites', []);
let recent = read('recent', []);
let drafts = read('drafts', {});
let templates = read('templates', {});
if (!Array.isArray(favorites)) favorites = [];
if (!Array.isArray(recent)) recent = [];
if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) drafts = {};
if (!templates || typeof templates !== 'object' || Array.isArray(templates)) templates = {};

function toast(message) {
  $('toast').textContent = message;
}

function save(key, value) {
  if (!write(key, value)) toast('Could not save locally. Check browser storage availability.');
}

function options(select, entries, placeholder) {
  select.replaceChildren();
  if (placeholder) select.add(new Option(placeholder, ''));
  entries.forEach(([value, label]) => select.add(new Option(label, value)));
}

function definition() {
  return schemas.find(item => item.type === currentType) || schemas.find(item => item.type === 'Custom');
}

function refreshLists() {
  const search = $('schema-search').value.toLowerCase();
  const category = $('category-filter').value;
  const matches = schemas.filter(item => (!category || item.category === category) && item.type.toLowerCase().includes(search));
  options($('schema-select'), matches.map(item => [item.type, `${favorites.includes(item.type) ? '★ ' : ''}${item.type}`]));
  if (matches.some(item => item.type === currentType)) $('schema-select').value = currentType;
  else $('schema-select').selectedIndex = -1;
  $('favorite').textContent = favorites.includes(currentType) ? '★ Remove favorite' : '☆ Favorite';
  options($('recent'), recent.map(type => [type, type]), 'Recently used');
  options($('drafts'), Object.keys(drafts).map(name => [name, name]), 'Select a draft');
  options($('template-select'), [
    ...Object.keys(examples).map(name => [`example:${name}`, `Example: ${name}`]),
    ...Object.keys(templates).map(name => [`saved:${name}`, `Saved: ${name}`]),
  ], 'Select a template');
}

function setDirty(value) {
  dirty = value;
  $('unsaved').textContent = value ? 'Unsaved changes' : 'No unsaved changes';
}

function confirmReplace() {
  return !dirty || window.confirm('Replace the current work? Save a draft first if you need it.');
}

function renderFields(values = {}) {
  const container = $('form-fields');
  container.replaceChildren();
  for (const field of definition().fields) {
    const group = document.createElement('div');
    group.className = 'field';
    const id = `field-${field.key}`;
    const label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = `${field.label}${field.required ? ' *' : ' (optional)'}`;
    let input;
    if (field.kind === 'textarea' || field.kind === 'lines' || field.kind === 'json') {
      input = document.createElement('textarea');
      input.rows = field.kind === 'json' ? 5 : 3;
    } else if (field.kind === 'select') {
      input = document.createElement('select');
      input.add(new Option('Select…', ''));
      (field.options || []).forEach(option => input.add(new Option(option, option)));
    } else {
      input = document.createElement('input');
      input.type = field.kind === 'datetime' ? 'datetime-local' : (['url', 'email', 'date', 'number'].includes(field.kind) ? field.kind : 'text');
      if (field.kind === 'number') input.step = 'any';
    }
    input.id = id;
    input.name = field.key;
    input.maxLength = 100000;
    input.value = values[field.key] ?? '';
    if (field.required) input.required = true;
    group.append(label, input);
    if (field.help) {
      const help = document.createElement('small');
      help.textContent = field.help;
      group.append(help);
    }
    if (currentType === 'FAQPage' && field.key === 'mainEntity') {
      const note = document.createElement('small');
      note.textContent = 'Google restricts FAQ rich results primarily to authoritative government and health sites.';
      group.append(note);
    }
    if ((currentType === 'FAQPage' && field.key === 'mainEntity') ||
        (currentType === 'BreadcrumbList' && field.key === 'itemListElement')) {
      const actions = document.createElement('div');
      actions.className = 'repeat-actions';
      for (const [label, action] of [['Add item', 'add'], ['Remove current', 'remove'], ['Move up', 'up'], ['Move down', 'down']]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', () => {
          const rows = input.value.split('\n');
          let index = input.value.slice(0, input.selectionStart).split('\n').length - 1;
          if (action === 'add') { rows.splice(index + 1, 0, ''); index++; }
          if (action === 'remove') rows.splice(index, 1);
          if (action === 'up' && index > 0) { [rows[index - 1], rows[index]] = [rows[index], rows[index - 1]]; index--; }
          if (action === 'down' && index < rows.length - 1) { [rows[index + 1], rows[index]] = [rows[index], rows[index + 1]]; index++; }
          input.value = rows.join('\n');
          const position = rows.slice(0, index).reduce((length, row) => length + row.length + 1, 0);
          input.focus();
          input.setSelectionRange(position, position);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
        actions.append(button);
      }
      group.append(actions);
    }
    container.append(group);
  }
}

function showValidation(text) {
  const container = $('validation');
  container.replaceChildren();
  const add = (level, message) => {
    const item = document.createElement('p');
    item.className = `validation-${level}`;
    item.textContent = message;
    container.append(item);
  };
  $('line-numbers').textContent = text.split('\n').map((_, index) => index + 1).join('\n');
  try {
    if (text.length > MAX_SIZE) throw new Error('Input exceeds the 1 MB limit.');
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('The root must be a JSON object.');
    validObject = parsed;
    const results = validateSchema(parsed);
    if (!results.some(result => result.level === 'error')) add('success', 'JSON syntax is valid. Review guidance below.');
    results.forEach(result => add(result.level, result.message));
    $('summary').textContent = `Type: ${Array.isArray(parsed['@type']) ? parsed['@type'].join(', ') : parsed['@type'] || 'not specified'} · ${Object.keys(parsed).length} top-level properties`;
    [...form.elements].forEach(element => { element.disabled = false; });
    return parsed;
  } catch (error) {
    validObject = null;
    add('error', `JSON error: ${error.message}. Your text has been preserved; fix it before editing the form.`);
    $('summary').textContent = 'No valid schema to summarize.';
    [...form.elements].forEach(element => { element.disabled = true; });
    return null;
  }
}

function setObject(object, clean = false) {
  editor.value = JSON.stringify(object, null, 2);
  syncFromEditor();
  setDirty(!clean);
}

function syncFromEditor() {
  const object = showValidation(editor.value);
  if (!object) return;
  const next = schemas.some(item => item.type === object['@type']) ? object['@type'] : 'Custom';
  currentType = next;
  renderFields(schemaToValues(object, definition()));
  refreshLists();
}

function removePath(object, path) {
  const parts = path.split('.');
  let node = object;
  const parents = [];
  for (const part of parts.slice(0, -1)) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    parents.push([node, part]);
    node = node[part];
  }
  if (node && typeof node === 'object') delete node[parts.at(-1)];
  for (const [parent, key] of parents.reverse()) {
    const child = parent[key];
    if (child && typeof child === 'object' && !Array.isArray(child) &&
        Object.keys(child).every(name => name === '@type')) delete parent[key];
    else break;
  }
}

function mergeObjects(base, generated) {
  for (const [key, value] of Object.entries(generated)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (value && typeof value === 'object' && !Array.isArray(value) &&
        base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) {
      mergeObjects(base[key], value);
    } else {
      Object.defineProperty(base, key, { value, writable: true, enumerable: true, configurable: true });
    }
  }
  return base;
}

form.addEventListener('input', event => {
  if (!validObject) return;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    buildSchema(currentType, values);
    const base = structuredClone(validObject);
    const key = event.target.name;
    if (key === 'properties' && currentType === 'Custom') {
      for (const name of Object.keys(base)) {
        if (name !== '@context' && name !== '@type') delete base[name];
      }
    } else if (key !== '@type') {
      removePath(base, key);
    }
    const changed = buildSchema(currentType, { [key]: values[key] });
    if (key !== '@type') delete changed['@type'];
    delete changed['@context'];
    if (key === 'properties' && currentType === 'Custom') {
      delete changed['@type'];
      delete changed['@context'];
    }
    editor.value = JSON.stringify(mergeObjects(base, changed), null, 2);
    showValidation(editor.value);
    setDirty(true);
  } catch (error) {
    $('validation').textContent = `Form error: ${error.message}. Your input has been preserved.`;
  }
});

editor.addEventListener('input', () => {
  syncFromEditor();
  setDirty(true);
});
editor.addEventListener('scroll', () => { $('line-numbers').scrollTop = editor.scrollTop; });
$('schema-search').addEventListener('input', refreshLists);
$('category-filter').addEventListener('change', refreshLists);
$('schema-select').addEventListener('change', event => {
  const type = event.target.value;
  if (!type || type === currentType) return;
  if (!confirmReplace()) return refreshLists();
  currentType = type;
  recent = [type, ...recent.filter(item => item !== type)].slice(0, 8);
  save('recent', recent);
  setObject(buildSchema(type, {}), true);
});
$('favorite').addEventListener('click', () => {
  favorites = favorites.includes(currentType) ? favorites.filter(type => type !== currentType) : [...favorites, currentType];
  save('favorites', favorites);
  refreshLists();
});
$('recent').addEventListener('change', event => {
  if (!event.target.value || !confirmReplace()) return;
  currentType = event.target.value;
  setObject(buildSchema(currentType, {}), true);
});
$('preset').addEventListener('click', () => {
  if (confirmReplace()) setObject(smmproPreset);
});
$('format').addEventListener('click', () => {
  const parsed = showValidation(editor.value);
  if (parsed) { editor.value = JSON.stringify(parsed, null, 2); syncFromEditor(); setDirty(true); }
});
$('select-all').addEventListener('click', () => { editor.focus(); editor.select(); });
$('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(editor.value); toast('JSON-LD copied.'); }
  catch { toast('Copy unavailable. Select the text and copy it manually.'); }
});
$('download-json').addEventListener('click', () => {
  if (!showValidation(editor.value)) return toast('Fix JSON errors before downloading.');
  download('schema-markup.json', editor.value, 'application/json');
});
$('download-html').addEventListener('click', () => {
  const object = showValidation(editor.value);
  if (!object) return toast('Fix JSON errors before downloading.');
  download('schema-markup.html', scriptSnippet(object), 'text/html');
});
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await editor.parentElement.requestFullscreen();
  } catch { toast('Fullscreen is unavailable in this browser.'); }
});
$('reset').addEventListener('click', () => {
  if (window.confirm('Reset the current schema? Unsaved changes will be lost.')) setObject(buildSchema(currentType, {}), true);
});
$('import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || !confirmReplace()) return;
  if (file.size > MAX_SIZE) return toast('File exceeds the 1 MB limit.');
  try {
    editor.value = await file.text();
    syncFromEditor();
    setDirty(true);
    toast('File imported. Review the validation messages.');
  } catch { toast('Could not read the file.'); }
});
$('save-draft').addEventListener('click', () => {
  const name = window.prompt('Name this draft:');
  if (!name || !name.trim()) return;
  if (Object.hasOwn(drafts, name) && !window.confirm('Replace this draft?')) return;
  Object.defineProperty(drafts, name, { value: editor.value, writable: true, enumerable: true, configurable: true });
  if (write('drafts', drafts)) { setDirty(false); refreshLists(); toast('Draft saved locally.'); }
  else toast('Could not save draft locally.');
});
$('load-draft').addEventListener('click', () => {
  const name = $('drafts').value;
  if (!name || !Object.hasOwn(drafts, name) || !confirmReplace()) return;
  editor.value = drafts[name];
  syncFromEditor();
  setDirty(false);
});
$('delete-draft').addEventListener('click', () => {
  const name = $('drafts').value;
  if (name && window.confirm(`Delete draft "${name}"?`)) { delete drafts[name]; save('drafts', drafts); refreshLists(); }
});
$('save-template').addEventListener('click', () => {
  const object = showValidation(editor.value);
  if (!object) return toast('Fix JSON errors before saving a template.');
  const name = window.prompt('Name this template:');
  if (!name || !name.trim()) return;
  if (Object.hasOwn(templates, name) && !window.confirm('Replace this template?')) return;
  Object.defineProperty(templates, name, { value: object, writable: true, enumerable: true, configurable: true });
  save('templates', templates);
  refreshLists();
});
$('load-template').addEventListener('click', () => {
  const selection = $('template-select').value;
  if (!selection || !confirmReplace()) return;
  const [kind, ...parts] = selection.split(':');
  const name = parts.join(':');
  const value = kind === 'example' ? examples[name] : templates[name];
  if (value) setObject({ '@context': 'https://schema.org', ...value });
});
$('clear-data').addEventListener('click', () => {
  if (!window.confirm('Delete all data saved by this tool in this browser?')) return;
  if (!clearData()) return toast('Could not clear local data.');
  favorites = []; recent = []; drafts = {}; templates = {};
  document.body.dataset.theme = 'light';
  refreshLists();
  toast('Local data cleared.');
});
$('theme-toggle').addEventListener('click', () => {
  document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  save('theme', document.body.dataset.theme);
});
$('nav-toggle').addEventListener('click', () => {
  const expanded = $('nav-toggle').getAttribute('aria-expanded') === 'true';
  $('nav-toggle').setAttribute('aria-expanded', String(!expanded));
  $('nav-links').classList.toggle('open', !expanded);
});
document.body.dataset.theme = read('theme', 'light') === 'dark' ? 'dark' : 'light';
options($('category-filter'), [...new Set(schemas.map(item => item.category))].map(category => [category, category]), 'All categories');
initUtilities($('utilities'));
setObject(buildSchema(currentType, {}), true);
