const SPPG_411_ROWS = Object.freeze(['pokok', 'lauk', 'sayur', 'buah', 'minum', 'lain']);

function numberValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

export function shouldShowConditionalField(value, contains) {
  return String(value == null ? '' : value).includes(String(contains == null ? '' : contains));
}

export function calculateSppg411Totals(table = {}) {
  return {
    dalam: SPPG_411_ROWS.reduce((total, row) => total + numberValue(table[row] && table[row].dalam), 0),
    luar: SPPG_411_ROWS.reduce((total, row) => total + numberValue(table[row] && table[row].luar), 0)
  };
}

export function normalizeSppg204Fields(fields = {}) {
  if (/\>\s*30/.test(String(fields.sp204 == null ? '' : fields.sp204))) return fields;
  return { ...fields, sp204_detail: '' };
}

export { SPPG_411_ROWS };
