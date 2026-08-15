/* Derived operational indicators for SPPG monitoring.
 * Master Unit values are the baseline/target. Monitoring fields are the
 * dated realization. The baseline is snapshotted into form_json so later
 * Master Unit edits do not rewrite historical percentages.
 */

const PORTION_ROWS = ['siswa', 'ibuhamil', 'balita', 'guru', 'posyandu'];
const SCHOOL_ROWS = ['paud', 'tk', 'sd', 'smp', 'sma'];

function numberOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumRows(object, keys) {
  const values = keys.map(key => numberOrNull(object?.[key])).filter(value => value !== null);
  return values.length ? Number(values.reduce((sum, value) => sum + value, 0).toFixed(6)) : null;
}

function percent(actual, target) {
  if (actual === null || target === null || target <= 0) return null;
  return Number((actual / target * 100).toFixed(2));
}

function pctText(value) { return value === null ? '—' : `${Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 })}%`; }
function gapText(value) { return value === null ? '—' : Number(value).toLocaleString('id-ID', { maximumFractionDigits: 2 }); }

export function captureSppgBaseline(unit, tgl = '') {
  return {
    kapasitas: numberOrNull(unit?.kapasitas),
    sekolah: numberOrNull(unit?.sekolah),
    capturedAt: tgl || new Date().toISOString().slice(0, 10)
  };
}

export function deriveSppgAnalytics(form, unit, baseline = null) {
  const fields = form?.fields || form || {};
  const b = baseline || captureSppgBaseline(unit);
  const actualPorsi = numberOrNull(fields.sp201?.total) ?? sumRows(fields.sp201, PORTION_ROWS);
  const actualSekolah = numberOrNull(fields.sp202?.total) ?? sumRows(fields.sp202, SCHOOL_ROWS);
  const utilization = percent(actualPorsi, b.kapasitas);
  const schoolCoverage = percent(actualSekolah, b.sekolah);
  const hasObservation = actualPorsi !== null || actualSekolah !== null;
  let status = 'belum-dihitung';
  if (hasObservation) {
    if ((utilization !== null && utilization > 100) || (schoolCoverage !== null && schoolCoverage > 100)) status = 'diatas-target';
    else if ((utilization !== null && utilization < 80) || (schoolCoverage !== null && schoolCoverage < 80)) status = 'perlu-perhatian';
    else status = 'sesuai-target';
  }
  return {
    version: 'sppg-operational-v1',
    targetPorsi: b.kapasitas,
    actualPorsi,
    utilization,
    gapPorsi: actualPorsi !== null && b.kapasitas !== null ? Number((actualPorsi - b.kapasitas).toFixed(6)) : null,
    targetSekolah: b.sekolah,
    actualSekolah,
    schoolCoverage,
    gapSekolah: actualSekolah !== null && b.sekolah !== null ? Number((actualSekolah - b.sekolah).toFixed(6)) : null,
    status,
    calculatedAt: new Date().toISOString()
  };
}

export function attachSppgAnalytics(record, unit) {
  if (!record || (record.formType && record.formType !== 'SPPG') || record.jenis === 'KDMP') return record;
  const baseline = record.form?.baseline || captureSppgBaseline(unit, record.tgl);
  const analytics = deriveSppgAnalytics(record.form, unit, baseline);
  return Object.assign({}, record, { form: Object.assign({}, record.form || {}, { baseline, analytics }) });
}

export function getSppgAnalytics(record, unit) {
  if (record?.form?.analytics) return record.form.analytics;
  if (!record || record.formType === 'NAKER' || record.jenis === 'KDMP') return null;
  return deriveSppgAnalytics(record.form, unit, record.form?.baseline || captureSppgBaseline(unit, record.tgl));
}

export function formatSppgAnalytics(analytics) {
  if (!analytics) return '';
  return {
    actualPorsi: analytics.actualPorsi, targetPorsi: analytics.targetPorsi, actualSekolah: analytics.actualSekolah, targetSekolah: analytics.targetSekolah,
    utilization: pctText(analytics.utilization), schoolCoverage: pctText(analytics.schoolCoverage),
    gapPorsi: gapText(analytics.gapPorsi), gapSekolah: gapText(analytics.gapSekolah)
  };
}

export { PORTION_ROWS, SCHOOL_ROWS, numberOrNull, sumRows, percent, pctText, gapText };
