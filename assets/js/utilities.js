const FIELD_LIMIT = 2000;
const JSON_LIMIT = 50000;

const escapeMarkup = (value) => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

function urlValue(value, label, required = false) {
  const trimmed = value.trim();
  if (!trimmed) {
    if (required) throw new Error(`${label} is required.`);
    return '';
  }
  if (!/^https?:\/\//i.test(trimmed) || /[\s\u0000-\u001f\u007f\\]/.test(trimmed)) {
    throw new Error(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  try {
    const url = new URL(trimmed);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname ||
        url.username || url.password) throw new Error();
  } catch {
    throw new Error(`${label} must be a valid HTTP or HTTPS URL.`);
  }
  return trimmed;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function field(parent, labelText, options = {}) {
  const label = element('label', 'utility-field');
  label.appendChild(element('span', 'utility-label', labelText));
  const input = element(options.multiline ? 'textarea' : 'input', 'utility-input');
  if (!options.multiline) input.type = options.type || 'text';
  input.maxLength = options.limit || FIELD_LIMIT;
  if (options.placeholder) input.placeholder = options.placeholder;
  if (options.value) input.value = options.value;
  if (options.multiline) input.rows = options.rows || 4;
  label.appendChild(input);
  parent.appendChild(label);
  return input;
}

function choice(parent, labelText, choices) {
  const label = element('label', 'utility-field');
  label.appendChild(element('span', 'utility-label', labelText));
  const select = element('select', 'utility-input');
  for (const [value, text] of choices) {
    const option = element('option', '', text);
    option.value = value;
    select.appendChild(option);
  }
  label.appendChild(select);
  parent.appendChild(label);
  return select;
}

function value(input) {
  return input.value.slice(0, input.maxLength);
}

function section(root, title, description) {
  const panel = element('section', 'utility');
  panel.appendChild(element('h3', 'utility-title', title));
  if (description) panel.appendChild(element('p', 'utility-help', description));
  root.appendChild(panel);
  return panel;
}

function result(panel, inputs, generate) {
  const label = element('label', 'utility-field');
  label.appendChild(element('span', 'utility-label', 'Output'));
  const output = element('textarea', 'utility-output');
  output.readOnly = true;
  output.rows = 5;
  label.appendChild(output);
  panel.appendChild(label);
  const status = element('p', 'utility-status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  panel.appendChild(status);
  const copy = element('button', 'utility-copy', 'Copy output');
  copy.type = 'button';
  panel.appendChild(copy);

  const update = () => {
    try {
      output.value = generate();
      status.textContent = '';
    } catch (error) {
      output.value = '';
      status.textContent = error.message;
    }
    copy.disabled = !output.value;
  };
  for (const input of inputs) {
    input.addEventListener('input', update);
    input.addEventListener('change', update);
  }
  copy.addEventListener('click', async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard &&
          typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(output.value);
      } else {
        output.focus();
        output.select();
        if (!document.execCommand || !document.execCommand('copy')) throw new Error();
      }
      status.textContent = 'Copied.';
    } catch {
      status.textContent = 'Copy failed. Select and copy the output manually.';
    }
  });
  update();
}

function counter(root, title, labelText, multiline) {
  const panel = section(root, title, 'Character count only; search engines may display text differently.');
  const input = field(panel, labelText, { multiline });
  const count = element('p', 'utility-count');
  count.setAttribute('aria-live', 'polite');
  panel.appendChild(count);
  const update = () => { count.textContent = `${value(input).length} characters`; };
  input.addEventListener('input', update);
  update();
}

function tag(attribute, name, content) {
  return `<meta ${attribute}="${escapeMarkup(name)}" content="${escapeMarkup(content)}">`;
}

/** Build the independent secondary SEO tools in the supplied container. */
export function initUtilities(container) {
  const root = element('div', 'utilities');
  counter(root, 'Meta title counter', 'Title', false);
  counter(root, 'Meta description counter', 'Description', true);

  {
    const panel = section(root, 'Open Graph generator', 'Enter the properties you want to include.');
    const title = field(panel, 'Title');
    const description = field(panel, 'Description', { multiline: true });
    const url = field(panel, 'Page URL', { type: 'url' });
    const image = field(panel, 'Image URL', { type: 'url' });
    result(panel, [title, description, url, image], () => {
      const properties = [
        ['og:title', value(title).trim()],
        ['og:description', value(description).trim()],
        ['og:url', urlValue(value(url), 'Page URL')],
        ['og:image', urlValue(value(image), 'Image URL')],
      ];
      return properties.filter(([, content]) => content)
        .map(([name, content]) => tag('property', name, content)).join('\n');
    });
  }

  {
    const panel = section(root, 'Twitter card generator');
    const card = choice(panel, 'Card type', [['summary', 'Summary'], ['summary_large_image', 'Summary with large image']]);
    const title = field(panel, 'Title');
    const description = field(panel, 'Description', { multiline: true });
    const image = field(panel, 'Image URL', { type: 'url' });
    const site = field(panel, 'Site handle', { placeholder: '@example' });
    result(panel, [card, title, description, image, site], () => {
      const properties = [
        ['twitter:card', card.value],
        ['twitter:title', value(title).trim()],
        ['twitter:description', value(description).trim()],
        ['twitter:image', urlValue(value(image), 'Image URL')],
        ['twitter:site', value(site).trim()],
      ];
      return properties.filter(([, content]) => content)
        .map(([name, content]) => tag('name', name, content)).join('\n');
    });
  }

  {
    const panel = section(root, 'Canonical URL');
    const url = field(panel, 'Canonical URL', { type: 'url' });
    result(panel, [url], () => `<link rel="canonical" href="${escapeMarkup(urlValue(value(url), 'Canonical URL', true))}">`);
  }

  {
    const panel = section(root, 'Robots meta');
    const index = choice(panel, 'Indexing', [['index', 'Index'], ['noindex', 'Do not index']]);
    const follow = choice(panel, 'Links', [['follow', 'Follow'], ['nofollow', 'Do not follow']]);
    result(panel, [index, follow], () => tag('name', 'robots', `${index.value}, ${follow.value}`));
  }

  {
    const panel = section(root, 'HTML sitemap link');
    const url = field(panel, 'Page URL', { type: 'url' });
    const text = field(panel, 'Link text');
    result(panel, [url, text], () => {
      const href = urlValue(value(url), 'Page URL', true);
      const linkText = value(text).trim();
      if (!linkText) throw new Error('Link text is required.');
      return `<a href="${escapeMarkup(href)}">${escapeMarkup(linkText)}</a>`;
    });
  }

  {
    const panel = section(root, 'XML sitemap URL entry', 'Add this entry inside a sitemap urlset.');
    const url = field(panel, 'Page URL', { type: 'url' });
    result(panel, [url], () => `<url>\n  <loc>${escapeMarkup(urlValue(value(url), 'Page URL', true))}</loc>\n</url>`);
  }

  {
    const panel = section(root, 'robots.txt', 'Leave the disallowed path empty to allow all paths.');
    const agent = field(panel, 'User-agent', { value: '*' });
    const disallow = field(panel, 'Disallowed path', { placeholder: '/private/' });
    const sitemap = field(panel, 'Sitemap URL (optional)', { type: 'url' });
    result(panel, [agent, disallow, sitemap], () => {
      const userAgent = value(agent).trim();
      const path = value(disallow).trim();
      if (!userAgent || /[\s:#\u0000-\u001f\u007f]/.test(userAgent)) {
        throw new Error('Enter a single valid user-agent.');
      }
      if (path && (!path.startsWith('/') || /[\r\n\u0000-\u001f\u007f#]/.test(path))) {
        throw new Error('Disallowed path must start with / and contain no line breaks or #.');
      }
      const sitemapUrl = urlValue(value(sitemap), 'Sitemap URL');
      if (sitemapUrl.includes('#')) throw new Error('Sitemap URL must not contain a fragment.');
      return `User-agent: ${userAgent}\nDisallow: ${path}${sitemapUrl ? `\nSitemap: ${sitemapUrl}` : ''}`;
    });
  }

  {
    const panel = section(root, 'JSON formatter / validator', 'Enter JSON to validate and format it.');
    const input = field(panel, 'JSON', { multiline: true, limit: JSON_LIMIT, rows: 8 });
    result(panel, [input], () => {
      const source = value(input);
      if (!source.trim()) return '';
      try {
        return JSON.stringify(JSON.parse(source), null, 2);
      } catch {
        throw new Error('Invalid JSON. Check the syntax and try again.');
      }
    });
  }

  container.replaceChildren(root);
}
