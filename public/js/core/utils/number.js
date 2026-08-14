export function toFiniteNumber(value, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const number = Number(String(value).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(number) ? number : fallback;
}

export function percentage(part, total) {
  return total ? (toFiniteNumber(part) / toFiniteNumber(total)) * 100 : 0;
}

export function formatNumber(value, maximumFractionDigits = 0) {
  return toFiniteNumber(value).toLocaleString('id-ID', { maximumFractionDigits });
}
