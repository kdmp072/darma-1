const IDR_INTEGER = new Intl.NumberFormat('id-ID', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

export function parseRupiahAmount(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const source = String(value).trim();
  const negative = /^\s*-/.test(source);
  const digits = source.replace(/[^0-9]/g, '');
  if (!digits) return null;
  const amount = Number(digits);
  if (!Number.isFinite(amount)) return null;
  return negative ? -amount : amount;
}

export function formatRupiahAmount(amount) {
  if (amount === null || amount === undefined || amount === '' || !Number.isFinite(Number(amount))) return '';
  return `Rp${IDR_INTEGER.format(Math.round(Number(amount)))},-`;
}

export function currencyScaleForField(field, parentField = null) {
  const scale = field && field.currencyScale != null
    ? Number(field.currencyScale)
    : parentField && parentField.currencyScale != null
      ? Number(parentField.currencyScale)
      : 0;
  return Number.isFinite(scale) && scale > 0 ? scale : 0;
}

export function displayUnitForField(field, parentField = null) {
  return field && field.currencyDisplayUnit
    || parentField && parentField.currencyDisplayUnit
    || field && field.unit
    || parentField && parentField.unit
    || '';
}

export function formatStoredCurrency(storedValue, scale) {
  if (storedValue === null || storedValue === undefined || storedValue === '') return '';
  const value = Number(storedValue);
  if (!Number.isFinite(value)) return '';
  return formatRupiahAmount(value * scale);
}

export function parseCurrencyToStored(displayValue, scale) {
  if (displayValue === null || displayValue === undefined || String(displayValue).trim() === '') return '';
  const amount = parseRupiahAmount(displayValue);
  if (amount === null || !scale) return '';
  const stored = amount / scale;
  return Number.isInteger(stored) ? stored : Number(stored.toFixed(6));
}

export function storedCurrencyToAbsolute(storedValue, scale) {
  if (storedValue === null || storedValue === undefined || storedValue === '') return '';
  const value = Number(storedValue);
  return Number.isFinite(value) ? Math.round(value * scale) : '';
}
