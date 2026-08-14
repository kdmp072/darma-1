import { getAppContext } from '../../core/context.js';
import { normalizeTOptimalBundle } from '../../domain/imports/t-optimal-map.js';

const { repositories } = getAppContext();
const unitsRepository = repositories.units;
const monitoringRepository = repositories.monitoring;

let importState = { bundle: null, rows: [], filters: {} };

function norm(value) {
  return String(value == null ? '' : value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/kabupaten/g, 'kab.').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function dateOnly(value, fallback) {
  const raw = String(value == null ? '' : value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const dmY = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmY) return `${dmY[3]}-${dmY[2].padStart(2, '0')}-${dmY[1].padStart(2, '0')}`;
  const d = raw ? new Date(raw) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : fallback;
}

function number(value, fallback = 0) {
  const n = Number(String(value == null ? '' : value).replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

function stableId(prefix, value) {
  let h = 2166136261;
  for (const ch of String(value)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return `${prefix}${(h >>> 0).toString(36)}`;
}

function sourceKey(item) { return `toptimal:${item.sheetName}:${item.sourceId}`; }

function naturalUnitKey(item) {
  const unit = findUnit(item.identity);
  if (unit) return unit.id;
  const identity = item.identity || {};
  return `name:${norm(identity.name)}|kab:${norm(identity.kab)}|kec:${norm(identity.kec)}|desa:${norm(identity.desa)}`;
}

function naturalKey(item) {
  if (item.formType !== 'SPPG' || !item.tgl || !item.identity?.name) return '';
  return `natural:sppg:${naturalUnitKey(item)}:${item.tgl}`;
}

function findUnit(identity) {
  const name = norm(identity?.name), kab = norm(identity?.kab);
  if (!name) return null;
  const units = unitsRepository.getAll().filter(unit => unit.jenis === 'SPPG');
  return units.find(unit => norm(unit.nama) === name && (!kab || norm(unit.kab) === kab))
    || units.find(unit => norm(unit.nama) === name)
    || units.find(unit => name.length > 5 && norm(unit.nama).includes(name));
}

function makeUnit(item) {
  const identity = item.identity || {};
  const raw = item.raw || {};
  const name = identity.name || `SPPG T-OPTIMAL ${item.sourceId}`;
  return {
    id: stableId('topt-unit-', `${name}|${identity.kab}|${identity.kec}`), jenis: 'SPPG', nama: name,
    ref: `T-OPTIMAL:${item.sourceId}`, status: String(raw.q104_beroperasi || '').toLowerCase().includes('tidak') ? 'kendala' : 'aktif',
    kab: identity.kab || '', kec: identity.kec || '', desa: identity.desa || '', alamat: '',
    lat: number(identity.lat), lng: number(identity.lng), pic: '', telp: '',
    note: `Unit dibuat saat impor T-OPTIMAL (${item.sheetName}, respons ${item.sourceId}). Periksa master unit.`,
    yayasan: '', kapasitas: 0, sekolah: 0, slhs: 'belum', mulai: '', anggota: 0, peran: '', usaha: ''
  };
}

function makeMonitoring(item, unit, bundle) {
  const raw = item.raw || {};
  const fallbackDate = dateOnly(bundle?.exportedAt, new Date().toISOString().slice(0, 10));
  return {
    id: sourceKey(item), unitId: unit.id, tgl: dateOnly(item.tgl, fallbackDate),
    petugas: item.petugas || bundle?.scope?.email || 'T-OPTIMAL', jenis: 'SPPG', formType: item.formType,
    form: {
      version: item.formType === 'SPPG' ? 'SPPG-2026-08' : 'NAKER-REMOTE',
      fields: item.fields, raw,
      _source: { system: 'T-OPTIMAL', responseId: item.sourceId, sheetName: item.sheetName,
        importedAt: new Date().toISOString(), normalizationVersion: 't-optimal-darma-currency-v1', scope: bundle?.scope || {} }
    },
    hasil: 'sudah', kebersihan: '', gizi: '', distribusi: '', dok: item.fileUrl ? 'baik' : '',
    temuan: String(raw.analisisSurveyor || '').trim() || `Respons ${item.formType} diimpor dari T-OPTIMAL.`, rekom: ''
  };
}

function rowStatus(item, existingIds) {
  if (!item.sourceId) return 'invalid';
  if (existingIds.has(sourceKey(item))) return 'sudah-ada';
  if (!item.identity?.name) return 'tanpa-unit';
  return findUnit(item.identity) ? 'baru' : 'unit-baru';
}

function statusLabel(status) {
  return ({ baru: 'Data baru', 'sudah-ada': 'Sudah ada', 'duplikat-hari': 'Duplikat SPPG/hari', 'duplikat-file': 'Duplikat dalam file', 'unit-baru': 'Unit belum ada', 'tanpa-unit': 'Nama unit kosong', invalid: 'Tidak valid' })[status] || status;
}

function coordinateValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hasValidCoordinates(identity) {
  const lat = coordinateValue(identity?.lat), lng = coordinateValue(identity?.lng);
  return lat !== null && lng !== null && lat !== 0 && lng !== 0 && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function coordinateText(value) {
  const n = coordinateValue(value);
  return n === null ? '—' : n.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
}

function coordinateCell(row) {
  const incoming = row.item.identity || {};
  const unit = findUnit(incoming);
  const incomingText = hasValidCoordinates(incoming) ? `${coordinateText(incoming.lat)}, ${coordinateText(incoming.lng)}` : 'Tidak tersedia';
  const existingText = unit && hasValidCoordinates(unit) ? `${coordinateText(unit.lat)}, ${coordinateText(unit.lng)}` : 'Master kosong';
  return `<div><small>JSON: ${esc(incomingText)}</small><small>Master: ${esc(existingText)}</small></div>`;
}

function getFilters() {
  return {
    form: document.getElementById('toptFilterForm')?.value || '',
    status: document.getElementById('toptFilterStatus')?.value || '',
    kab: document.getElementById('toptFilterKab')?.value || '',
    search: (document.getElementById('toptFilterSearch')?.value || '').toLowerCase().trim(),
    start: document.getElementById('toptFilterStart')?.value || '',
    end: document.getElementById('toptFilterEnd')?.value || ''
  };
}

function visibleRows() {
  const f = getFilters();
  return importState.rows.filter(row => {
    const item = row.item, identity = item.identity || {};
    if (f.form && item.formType !== f.form) return false;
    if (f.status && row.status !== f.status) return false;
    if (f.kab && identity.kab !== f.kab) return false;
    if (f.start && row.tgl < f.start) return false;
    if (f.end && row.tgl > f.end) return false;
    if (f.search) {
      const hay = [identity.name, identity.kab, identity.kec, identity.desa, item.sourceId, item.formType].join(' ').toLowerCase();
      if (!hay.includes(f.search)) return false;
    }
    return true;
  });
}

function renderImportSummary() {
  const all = importState.rows;
  const visible = visibleRows();
  const selected = all.filter(row => row.selected).length;
  const counts = all.reduce((out, row) => { out[row.status] = (out[row.status] || 0) + 1; return out; }, {});
  const meta = document.getElementById('toptImportMeta');
  const coordinateCount = all.filter(row => hasValidCoordinates(row.item.identity)).length;
  if (meta) meta.innerHTML = `<b>${all.length}</b> respons dibaca · tampil <b>${visible.length}</b> · dipilih <b>${selected}</b> · baru <b>${counts.baru || 0}</b> · sudah ada <b>${counts['sudah-ada'] || 0}</b> · duplikat hari <b>${counts['duplikat-hari'] || 0}</b> · duplikat file <b>${counts['duplikat-file'] || 0}</b> · unit belum ada <b>${counts['unit-baru'] || 0}</b> · koordinat valid <b>${coordinateCount}</b>`;
  const body = document.getElementById('toptImportRows');
  if (!body) return;
  body.innerHTML = visible.length ? visible.map((row, index) => {
    const item = row.item, id = `topt-row-${index}-${String(item.sourceId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const identity = item.identity || {};
    return `<tr>
      <td><input type="checkbox" ${row.selected ? 'checked' : ''} data-import-key="${esc(row.key)}" onchange="toggleTOptimalRow(this.dataset.importKey,this.checked)"></td>
      <td><span class="import-type-chip ${item.formType === 'NAKER' ? 'naker' : 'sppg'}">${item.formType}</span></td>
      <td><b>${esc(identity.name || '—')}</b><small>${esc(identity.kab || '')} · ${esc(identity.kec || '')}</small></td>
      <td>${esc(row.tgl || '—')}</td>
      <td>${esc(item.sourceId)}</td>
      <td>${coordinateCell(row)}</td>
      <td><span class="import-status ${row.status}">${statusLabel(row.status)}</span></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="text-center text-muted py-3">Tidak ada data yang cocok dengan filter.</td></tr>';
  const commit = document.getElementById('toptImportCommit');
  if (commit) commit.disabled = selected === 0;
}

function toggleTOptimalRow(key, checked) {
  const row = importState.rows.find(item => item.key === key);
  if (row) row.selected = checked;
  renderImportSummary();
}

function filterTOptimalPreview() { renderImportSummary(); }
function selectAllTOptimal(checked) {
  visibleRows().forEach(row => {
    const safeForNewImport = !['invalid', 'sudah-ada', 'duplikat-hari', 'duplikat-file'].includes(row.status);
    row.selected = checked && safeForNewImport;
  });
  renderImportSummary();
}

function resetTOptimalFilters() {
  ['toptFilterForm', 'toptFilterStatus', 'toptFilterKab', 'toptFilterSearch', 'toptFilterStart', 'toptFilterEnd'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  renderImportSummary();
}

function openImportModal() { document.getElementById('mTOptimalImport')?.classList.remove('hidden'); }
function closeImportModal() { document.getElementById('mTOptimalImport')?.classList.add('hidden'); }

function importTOptimal(event) {
  const file = event?.target?.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const bundle = JSON.parse(reader.result);
      if (bundle?.source !== 'T-OPTIMAL' || !Array.isArray(bundle.records)) throw new Error('Format file bukan ekspor T-OPTIMAL yang valid.');
      const existingRecords = monitoringRepository.getAll();
      const existingIds = new Set(existingRecords.map(record => record.id));
      const existingNatural = new Map();
      existingRecords.forEach(record => {
        if (record.formType !== 'SPPG' || !record.unitId || !record.tgl) return;
        existingNatural.set(`natural:sppg:${record.unitId}:${record.tgl}`, record.id);
      });
      const seenSources = new Set();
      const mapped = normalizeTOptimalBundle(bundle);
      const rows = mapped.map(item => {
        const tgl = dateOnly(item.tgl, dateOnly(bundle.exportedAt, ''));
        const prepared = Object.assign({}, item, { tgl });
        const key = sourceKey(prepared);
        const duplicateSource = seenSources.has(key);
        seenSources.add(key);
        const nKey = naturalKey(prepared);
        const existingId = nKey ? existingNatural.get(nKey) || '' : '';
        const status = duplicateSource ? 'sudah-ada' : existingId ? 'duplikat-hari' : rowStatus(prepared, existingIds);
        return { key, item: prepared, naturalKey: nKey, existingId, sourceUpdatedAt: prepared.sourceUpdatedAt || tgl, status, tgl, selected: status === 'baru' };
      });
      const naturalGroups = new Map();
      rows.filter(row => row.naturalKey).forEach(row => {
        const list = naturalGroups.get(row.naturalKey) || [];
        list.push(row); naturalGroups.set(row.naturalKey, list);
      });
      naturalGroups.forEach(list => {
        if (list.length < 2) return;
        list.sort((a, b) => String(b.sourceUpdatedAt).localeCompare(String(a.sourceUpdatedAt)) || String(b.tgl).localeCompare(String(a.tgl)));
        list.slice(1).forEach(row => { row.status = 'duplikat-file'; row.selected = false; });
      });
      importState = { bundle, rows, filters: {} };
      const kabSelect = document.getElementById('toptFilterKab');
      if (kabSelect) {
        const values = [...new Set(importState.rows.map(row => row.item.identity?.kab).filter(Boolean))].sort();
        kabSelect.innerHTML = '<option value="">Semua Kabupaten/Kota</option>' + values.map(value => `<option>${esc(value)}</option>`).join('');
      }
      resetTOptimalFilters(); openImportModal(); renderImportSummary();
    } catch (error) { toast(`File T-OPTIMAL tidak valid: ${error.message || error}`, 'e'); }
    finally { event.target.value = ''; }
  };
  reader.readAsText(file);
}

function commitTOptimalImport() {
  if (!CU) { toast('Silakan masuk ke DARMA-1 terlebih dahulu.', 'e'); return; }
  if (CU.role !== 'admin') { toast('Impor T-OPTIMAL hanya dapat dilakukan oleh Admin.', 'e'); return; }
  const selected = importState.rows.filter(row => row.selected && row.status !== 'invalid');
  const autoCreate = Boolean(document.getElementById('toptAutoCreateUnits')?.checked);
  const updateCoordinates = Boolean(document.getElementById('toptUpdateCoordinates')?.checked);
  const replaceSameDay = Boolean(document.getElementById('toptReplaceSameDay')?.checked);
  if (!selected.length) { toast('Pilih minimal satu respons.', 'e'); return; }
  const fileDuplicates = selected.filter(row => row.status === 'duplikat-file');
  if (fileDuplicates.length) { toast('Respons duplikat dalam file tidak dapat disimpan sebagai respons baru. Pilih baris terbaru saja.', 'e'); return; }
  const sameDayDuplicates = selected.filter(row => row.status === 'duplikat-hari');
  if (sameDayDuplicates.length && !replaceSameDay) { toast('Ada respons SPPG dengan unit dan tanggal yang sudah ada. Centang opsi perbarui rekaman tanggal sama jika ingin menggantinya.', 'e'); return; }
  const missing = selected.filter(row => !findUnit(row.item.identity));
  if (missing.length && (!autoCreate || CU.role !== 'admin')) {
    toast('Ada unit belum cocok. Centang pembuatan unit otomatis dan gunakan akun Admin, atau hilangkan pilihan unit tersebut.', 'e'); return;
  }
  const coordinateRows = selected.filter(row => hasValidCoordinates(row.item.identity));
  const coordinateNote = updateCoordinates
    ? `\nKoordinat Master Unit akan diperbarui untuk ${new Set(coordinateRows.map(row => row.item.identity?.name).filter(Boolean)).size} unit (koordinat respons terbaru yang terpilih digunakan).`
    : '';
  const replaceNote = replaceSameDay && sameDayDuplicates.length ? `\n${sameDayDuplicates.length} rekaman SPPG dengan tanggal sama akan diperbarui.` : '';
  if (!window.confirm(`Simpan ${selected.length} respons terpilih ke DARMA-1?\n\nNilai keuangan akan dinormalisasi: Rupiah penuh → Rp Juta/Rp Ribu sesuai form DARMA-1.${replaceNote}${coordinateNote}`)) return;

  let imported = 0, skipped = 0, createdUnits = 0;
  const resolved = [];
  selected.forEach(row => {
    let unit = findUnit(row.item.identity);
    if (!unit && autoCreate && CU.role === 'admin') { unit = makeUnit(row.item); unitsRepository.save(unit); createdUnits += 1; }
    if (!unit) { skipped += 1; return; }
    resolved.push({ row, unit });
    const record = makeMonitoring(row.item, unit, importState.bundle);
    if (replaceSameDay && row.status === 'duplikat-hari' && row.existingId) record.id = row.existingId;
    monitoringRepository.save(record); imported += 1;
  });

  let updatedCoordinates = 0;
  if (updateCoordinates) {
    const latestByUnit = new Map();
    resolved.forEach(({ row, unit }) => {
      if (!hasValidCoordinates(row.item.identity)) return;
      const previous = latestByUnit.get(unit.id);
      if (!previous || String(row.tgl || '').localeCompare(String(previous.row.tgl || '')) >= 0) latestByUnit.set(unit.id, { row, unit });
    });
    latestByUnit.forEach(({ row, unit }) => {
      const identity = row.item.identity;
      unitsRepository.save(Object.assign({}, unit, { lat: coordinateValue(identity.lat), lng: coordinateValue(identity.lng) }));
      updatedCoordinates += 1;
    });
  }

  if (typeof renderAll === 'function') renderAll();
  closeImportModal();
  toast(`✅ Impor selesai: ${imported} respons, ${createdUnits} unit baru, ${sameDayDuplicates.length && replaceSameDay ? sameDayDuplicates.length : 0} rekaman SPPG diperbarui, ${updatedCoordinates} koordinat diperbarui, ${skipped} dilewati.`);
}

Object.assign(globalThis, {
  importTOptimal, openImportModal, closeImportModal, filterTOptimalPreview,
  resetTOptimalFilters, selectAllTOptimal, toggleTOptimalRow, commitTOptimalImport
});
