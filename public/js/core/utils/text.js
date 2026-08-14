export function safeString(value) {
  return String(value == null ? '' : value);
}

export function escapeHtml(value) {
  return safeString(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

export function normalizeSearch(value) {
  return safeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearch(haystack, query) {
  const normalizedHaystack = normalizeSearch(haystack);
  const tokens = normalizeSearch(query).split(' ').filter(Boolean);
  return !tokens.length || tokens.every(token => normalizedHaystack.includes(token));
}
