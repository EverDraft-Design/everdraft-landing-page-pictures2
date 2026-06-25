const ALLOWED_TAGS = new Set(['P', 'BR', 'STRONG', 'EM', 'U', 'S', 'BLOCKQUOTE', 'HR']);
const DROP_WITH_CONTENT = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'APPLET', 'SVG', 'MATH', 'FORM']);
const BLOCK_TAGS = new Set(['P', 'BLOCKQUOTE', 'BR', 'HR']);
const SAFE_ALIGNMENTS = new Set(['left', 'center', 'right']);

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function hasHtmlTag(value) {
  return /<\s*\/?\s*[a-z][^>]*>/i.test(String(value || ''));
}

export function plainTextToChapterHtml(value) {
  const paragraphs = String(value || '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return paragraphs
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

function sanitizeNode(node, outputDocument) {
  if (node.nodeType === Node.TEXT_NODE) {
    return outputDocument.createTextNode(node.textContent || '');
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return outputDocument.createDocumentFragment();
  }

  if (DROP_WITH_CONTENT.has(node.tagName)) {
    return outputDocument.createDocumentFragment();
  }

  if (!ALLOWED_TAGS.has(node.tagName)) {
    const fragment = outputDocument.createDocumentFragment();
    for (const child of node.childNodes) {
      fragment.append(sanitizeNode(child, outputDocument));
    }
    return fragment;
  }

  const cleanElement = outputDocument.createElement(node.tagName.toLowerCase());

  if (node.tagName === 'P') {
    const textAlign = String(node.style?.textAlign || '').toLowerCase();
    if (SAFE_ALIGNMENTS.has(textAlign)) {
      cleanElement.style.textAlign = textAlign;
    }
  }

  for (const child of node.childNodes) {
    cleanElement.append(sanitizeNode(child, outputDocument));
  }

  return cleanElement;
}

export function sanitizeChapterHtml(value) {
  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return plainTextToChapterHtml(String(value || '').replace(/<[^>]*>/g, ' '));
  }

  const parsed = new DOMParser().parseFromString(String(value || ''), 'text/html');
  const output = document.implementation.createHTMLDocument('');

  for (const child of parsed.body.childNodes) {
    output.body.append(sanitizeNode(child, output));
  }

  return output.body.innerHTML;
}

export function normalizeChapterContent(value) {
  const content = String(value || '');
  return sanitizeChapterHtml(hasHtmlTag(content) ? content : plainTextToChapterHtml(content));
}

function collectText(node, parts) {
  if (node.nodeType === Node.TEXT_NODE) {
    parts.push(node.textContent || '');
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  if (BLOCK_TAGS.has(node.tagName)) parts.push('\n');
  for (const child of node.childNodes) collectText(child, parts);
  if (BLOCK_TAGS.has(node.tagName)) parts.push('\n');
}

export function chapterContentToText(value) {
  const normalized = normalizeChapterContent(value);

  if (typeof DOMParser === 'undefined') {
    return normalized.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const parsed = new DOMParser().parseFromString(normalized, 'text/html');
  const parts = [];
  for (const child of parsed.body.childNodes) collectText(child, parts);
  return parts.join('').replace(/\s+/g, ' ').trim();
}

export function chapterContentHasText(value) {
  return Boolean(chapterContentToText(value));
}

