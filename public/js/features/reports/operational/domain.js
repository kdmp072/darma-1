import { daysSince, formatIndonesianDate, isDateInRange, localIsoDate } from '../../../core/utils/date.js';
import { matchesSearch, normalizeSearch, safeString } from '../../../core/utils/text.js';

export function recordType(record, unit) {
  const explicit = safeString(record && record.formType).toUpperCase();
  if (explicit) return explicit;
  const stored = safeString(record && record.jenis).toUpperCase();
  if (stored === 'KDMP') return 'KDMP';
  return unit && unit.jenis === 'KDMP' ? 'KDMP' : 'SPPG';
}

export function qualifies(record, unit, formScope) {
  return formScope === 'any' || recordType(record, unit) === safeString(unit && unit.jenis).toUpperCase();
}

export function recordStatus(record, unit) {
  if (recordType(record, unit) === 'NAKER') return 'naker';
  const result = safeString(record && record.hasil).toLowerCase();
  return ['baik', 'perbaikan', 'kritis'].includes(result) ? result : 'noresult';
}

export function latestRecord(records) {
  return records.slice().sort((a, b) =>
    safeString(b.tgl).localeCompare(safeString(a.tgl)) ||
    safeString(b.id).localeCompare(safeString(a.id))
  )[0] || null;
}

function isSelectedDate(date, config) {
  if (config.scope === 'all') return true;
  return isDateInRange(date, config.start, config.end);
}

export function classifyUnit(unit, records, config, today = localIsoDate()) {
  const unitRecords = records.filter(record => record.unitId === unit.id);
  const qualifyingAll = unitRecords.filter(record => qualifies(record, unit, config.formScope));
  const selected = qualifyingAll.filter(record => isSelectedDate(record.tgl, config));
  const mainAll = unitRecords.filter(record => qualifies(record, unit, 'main'));
  const nakerAll = unitRecords.filter(record => recordType(record, unit) === 'NAKER');
  const lastAll = latestRecord(qualifyingAll);
  const lastMain = latestRecord(mainAll);
  const never = qualifyingAll.length === 0;
  const monitored = selected.length > 0;
  const nakerOnly = config.formScope === 'main' && mainAll.length === 0 && nakerAll.length > 0;
  const category = monitored ? 'monitored' : (never ? 'never' : 'period_gap');
  const gapDays = daysSince(lastAll && lastAll.tgl, today);

  return {
    u: unit,
    unitRecords,
    qualifyingAll,
    selected,
    mainAll,
    nakerAll,
    lastAll,
    lastMain,
    never,
    monitored,
    nakerOnly,
    category,
    gapDays
  };
}

export function priorityOf(classification) {
  const unit = classification.u;
  const lastResult = recordStatus(classification.lastAll, unit);
  if (
    (classification.never && (unit.status === 'aktif' || unit.status === 'kendala')) ||
    (classification.gapDays != null && classification.gapDays >= 90) ||
    lastResult === 'kritis'
  ) return 'P1';
  if (
    classification.never || unit.status === 'aktif' ||
    (classification.gapDays != null && classification.gapDays >= 30) ||
    lastResult === 'perbaikan'
  ) return 'P2';
  return 'P3';
}

export function unmonitoredReason(classification, config) {
  if (classification.nakerOnly) return 'Belum pernah monitoring utama; hanya ada respons Naker';
  if (classification.never) {
    return config.formScope === 'main'
      ? 'Belum pernah monitoring utama'
      : 'Belum pernah memiliki respons terkait';
  }
  return `Belum dimonitor pada periode ini; terakhir ${formatIndonesianDate(classification.lastAll && classification.lastAll.tgl)}`;
}

export function followUpFor(record, unit) {
  const status = recordStatus(record, unit);
  const recommendation = normalizeSearch(record && record.rekom);
  if (status === 'naker') return 'Respons Naker — bukan monitoring utama';
  if (status === 'kritis') return 'Segera ditindaklanjuti (maks. 7 hari)';
  if (status === 'perbaikan') return 'Perlu tindak lanjut (maks. 14 hari)';
  if (recommendation && recommendation !== '-' && recommendation !== 'tidak ada') return 'Pantau pelaksanaan rekomendasi';
  if (status === 'baik') return 'Selesai / pemantauan rutin';
  return 'Verifikasi hasil dan tindak lanjut';
}

export function targetAction(classification) {
  if (classification.nakerOnly) return 'Jadwalkan pengisian monitoring utama';
  if (classification.never) return 'Jadwalkan kunjungan pertama';
  if (recordStatus(classification.lastAll, classification.u) === 'kritis') return 'Kunjungan ulang prioritas';
  return 'Masukkan ke jadwal periode berjalan';
}

function unitSearchText(unit) {
  return [unit.nama, unit.ref, unit.jenis, unit.status, unit.kab, unit.kec, unit.desa, unit.alamat, unit.pic, unit.telp, unit.note].join(' ');
}

function recordSearchText(record) {
  return [record.tgl, record.petugas, record.hasil, record.temuan, record.rekom, record.formType].join(' ');
}

export function buildOperationalRows({ units, records, config, today = localIsoDate() }) {
  const classes = units.map(unit => classifyUnit(unit, records, config, today));
  let rows;

  if (config.section === 'unmonitored') {
    rows = classes.filter(item => !item.monitored);
    if (config.status === 'never') rows = rows.filter(item => item.category === 'never');
    else if (config.status === 'period_gap') rows = rows.filter(item => item.category === 'period_gap');
    else if (config.status === 'naker_only') rows = rows.filter(item => item.nakerOnly);
    if (config.search) {
      rows = rows.filter(item => matchesSearch(
        `${unitSearchText(item.u)} ${recordSearchText(item.lastAll || {})}`,
        config.search
      ));
    }
    rows = rows.map(item => Object.assign(item, {
      priority: priorityOf(item),
      reason: unmonitoredReason(item, config),
      action: targetAction(item)
    })).sort((a, b) =>
      a.priority.localeCompare(b.priority) ||
      Number(b.u.status === 'aktif') - Number(a.u.status === 'aktif') ||
      safeString(a.u.nama).localeCompare(safeString(b.u.nama))
    );
  } else {
    rows = [];
    classes.filter(item => item.monitored).forEach(item => {
      item.selected.forEach(record => rows.push({
        c: item,
        u: item.u,
        m: record,
        status: recordStatus(record, item.u),
        followUp: followUpFor(record, item.u)
      }));
    });
    if (config.status !== 'all') rows = rows.filter(row => row.status === config.status);
    if (config.search) {
      rows = rows.filter(row => matchesSearch(
        `${unitSearchText(row.u)} ${recordSearchText(row.m)}`,
        config.search
      ));
    }
    rows.sort((a, b) =>
      safeString(b.m.tgl).localeCompare(safeString(a.m.tgl)) ||
      safeString(a.u.nama).localeCompare(safeString(b.u.nama))
    );
  }

  return {
    classes,
    rows,
    matchedUnits: new Set(rows.map(row => row.u.id))
  };
}
