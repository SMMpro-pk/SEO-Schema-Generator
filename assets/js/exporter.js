export function scriptSnippet(value) {
  return `<script type="application/ld+json">\n${JSON.stringify(value, null, 2).replace(/</g, '\\u003c')}\n</script>`;
}

export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
