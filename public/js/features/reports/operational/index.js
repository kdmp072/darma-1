/* ============================================================
   DARMA-1 — Laporan Operasional Admin
   - Daftar unit belum dimonitor (target kunjungan)
   - Rekap rinci kunjungan/respons yang sudah tersimpan
   - Filter periode, unit, formulir, wilayah, status, pencarian
   - PDF + Excel tanpa menambah field database
   ============================================================ */
import { createRuntimeAdapter } from '../../../adapters/runtime-adapter.js';
import { escapeHtml, normalizeSearch, safeString } from '../../../core/utils/text.js';
import {
  buildOperationalRows,
  classifyUnit,
  qualifies,
  recordStatus as recStatus,
  recordType
} from './domain.js';

const global = window;
const runtime = createRuntimeAdapter(global);

  let reportSection = 'managerial';
  let operationalInitialized = false;
  let renderTimer = null;
  let lastData = null;
  let operationalEventsBound = false;

  const RESULT_LABEL = {
    baik: 'Baik', perbaikan: 'Perlu Perbaikan', kritis: 'Kritis',
    noresult: 'Belum Dinilai', naker: 'Respons Naker'
  };

  function dbNow() {
    return runtime.getDatabase();
  }
  function isAdmin() {
    return runtime.getCurrentUser()?.role === 'admin';
  }
  function toastMsg(text, type) {
    runtime.showToast(text, type);
  }
  const safe = safeString;
  const html = escapeHtml;
  const norm = normalizeSearch;
  function val(id) { const e = document.getElementById(id); return e ? safe(e.value).trim() : ''; }
  function selectedText(id) { const e = document.getElementById(id); return e && e.selectedIndex >= 0 ? safe(e.options[e.selectedIndex].text) : ''; }
  function fmt(v, dec) {
    return Number(v || 0).toLocaleString('id-ID', { maximumFractionDigits: dec == null ? 0 : dec });
  }
  function pct(a, b) { return b ? (a / b) * 100 : 0; }
  function fmtPct(v) { return fmt(v, 1) + '%'; }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T00:00:00');
    return isNaN(d) ? iso : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function localIso(d) {
    const x = d || new Date();
    return [x.getFullYear(), String(x.getMonth() + 1).padStart(2, '0'), String(x.getDate()).padStart(2, '0')].join('-');
  }
  function getConfig() {
    return {
      section: reportSection,
      scope: val('op-scope') || 'period',
      type: val('op-type') || 'all',
      formScope: val('op-form-scope') || 'main',
      region: val('op-region') || 'all',
      start: val('op-start'),
      end: val('op-end'),
      status: val('op-status') || 'all',
      search: norm(val('op-search')),
      note: val('op-note')
    };
  }
  function periodLabel(cfg) {
    return cfg.scope === 'all' ? 'Sepanjang waktu' : `${fmtDate(cfg.start)} s.d. ${fmtDate(cfg.end)}`;
  }
  function formScopeLabel(cfg) {
    return cfg.formScope === 'main' ? 'Monitoring utama (SPPG/KDMP)' : 'Semua respons terkait, termasuk Naker';
  }
  function buildOperationalData() {
    const cfg = getConfig(), db = dbNow();
    if (cfg.scope === 'period' && cfg.start && cfg.end && cfg.start > cfg.end) {
      throw new Error('Tanggal awal tidak boleh melewati tanggal akhir.');
    }
    const units = (db.units || []).filter(unit =>
      (cfg.type === 'all' || unit.jenis === cfg.type) &&
      (cfg.region === 'all' || unit.kab === cfg.region)
    );
    const records = db.monitoring || [];
    const result = buildOperationalRows({ units, records, config: cfg });
    return {
      cfg,
      db,
      units,
      records,
      classes: result.classes,
      rows: result.rows,
      matchedUnits: result.matchedUnits,
      generatedAt: new Date()
    };
  }

  function populateRegions() {
    const el = document.getElementById('op-region'); if (!el) return;
    const current = el.value || 'all';
    const regions = [...new Set((dbNow().units || []).map(u => safe(u.kab).trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
    el.innerHTML = '<option value="all">Semua wilayah</option>' + regions.map(x => `<option value="${html(x)}">${html(x)}</option>`).join('');
    el.value = regions.includes(current) || current === 'all' ? current : 'all';
  }
  function updateStatusOptions() {
    const el = document.getElementById('op-status'); if (!el) return;
    const current = el.value || 'all', scope = val('op-scope') || 'period', formScope = val('op-form-scope') || 'main';
    let opts;
    if (reportSection === 'unmonitored') {
      opts = [['all', 'Semua status belum dimonitor'], ['never', 'Belum pernah dimonitor']];
      if (scope === 'period') opts.push(['period_gap', 'Belum pada periode ini']);
      if (formScope === 'main') opts.push(['naker_only', 'Hanya ada respons Naker']);
    } else {
      opts = [['all', 'Semua hasil kunjungan'], ['kritis', 'Kritis'], ['perbaikan', 'Perlu perbaikan'], ['baik', 'Baik'], ['noresult', 'Belum dinilai']];
      if (formScope === 'any') opts.push(['naker', 'Respons Naker']);
    }
    el.innerHTML = opts.map(x => `<option value="${x[0]}">${html(x[1])}</option>`).join('');
    el.value = opts.some(x => x[0] === current) ? current : 'all';
  }
  function updateScopeFields() {
    const all = val('op-scope') === 'all';
    document.querySelectorAll('#op-report-panel .op-period-field').forEach(x => { x.style.display = all ? 'none' : ''; });
  }
  function updateScopeNote(cfg) {
    const el = document.getElementById('op-scope-note'); if (!el) return;
    if (cfg.section === 'unmonitored') {
      el.innerHTML = cfg.scope === 'all'
        ? `<b>Sepanjang waktu:</b> daftar hanya berisi unit yang belum pernah memiliki ${cfg.formScope === 'main' ? 'monitoring utama' : 'respons terkait'}.`
        : `<b>Klasifikasi periode:</b> “Belum pernah dimonitor” berarti tidak ada ${cfg.formScope === 'main' ? 'monitoring utama' : 'respons terkait'} sepanjang waktu; “Belum pada periode ini” berarti pernah tercatat, tetapi tidak pada ${html(periodLabel(cfg))}.`;
    } else {
      el.innerHTML = cfg.formScope === 'main'
        ? `<b>Monitoring utama:</b> respons Naker tidak dihitung sebagai kunjungan operasional SPPG. Setiap baris merepresentasikan satu catatan monitoring utama pada ${html(periodLabel(cfg))}.`
        : `<b>Semua respons terkait:</b> respons Naker ikut ditampilkan, tetapi selalu diberi label khusus dan tidak disamakan dengan monitoring utama.`;
    }
  }

  function kpiCard(value, label, cls) {
    return `<div class="rpt-kpi ${cls || ''}"><b>${html(value)}</b><span>${html(label)}</span></div>`;
  }
  function renderKpis(data) {
    const el = document.getElementById('op-kpis'); if (!el) return;
    const rows = data.rows;
    if (data.cfg.section === 'unmonitored') {
      const never = rows.filter(r => r.category === 'never').length;
      const periodGap = rows.filter(r => r.category === 'period_gap').length;
      const active = rows.filter(r => r.u.status === 'aktif').length;
      const p1 = rows.filter(r => r.priority === 'P1').length;
      const geo = rows.filter(r => Number.isFinite(Number(r.u.lat)) && Number.isFinite(Number(r.u.lng)) && Number(r.u.lat) !== 0 && Number(r.u.lng) !== 0).length;
      el.innerHTML = kpiCard(rows.length, 'Target kunjungan') + kpiCard(never, 'Belum pernah', 'k2') + kpiCard(periodGap, 'Belum periode ini', 'k3') + kpiCard(active, 'Unit aktif', 'k4') + kpiCard(p1, 'Prioritas P1', 'k5') + kpiCard(geo, 'Koordinat siap', 'k6');
    } else {
      const unitIds = new Set(rows.map(r => r.u.id));
      const latestRows = [...unitIds].map(id => rows.filter(r => r.u.id === id).sort((a, b) => safe(b.m.tgl).localeCompare(safe(a.m.tgl)))[0]).filter(Boolean);
      const critical = latestRows.filter(r => r.status === 'kritis').length;
      const improvement = latestRows.filter(r => r.status === 'perbaikan').length;
      const follow = latestRows.filter(r => !/Selesai|Respons Naker/.test(r.followUp)).length;
      const coverage = pct(unitIds.size, data.units.length);
      el.innerHTML = kpiCard(unitIds.size, 'Unit tercakup') + kpiCard(rows.length, 'Kunjungan / respons', 'k2') + kpiCard(fmtPct(coverage), 'Cakupan unit', 'k3') + kpiCard(critical, 'Hasil kritis', 'k4') + kpiCard(improvement, 'Perlu perbaikan', 'k5') + kpiCard(follow, 'Perlu tindak lanjut', 'k6');
    }
  }

  function resultBadge(status) {
    const color = status === 'kritis' ? '#b91c1c' : status === 'perbaikan' ? '#d97706' : status === 'baik' ? '#15803d' : status === 'naker' ? '#7c3aed' : '#64748b';
    return `<span class="op-badge" style="background:${color}18;color:${color}">${html(RESULT_LABEL[status] || status)}</span>`;
  }
  function renderTable(data) {
    const wrap = document.getElementById('op-table-wrap'); if (!wrap) return;
    const count = document.getElementById('op-row-count'); if (count) count.textContent = `${fmt(data.rows.length)} baris`;
    const title = document.getElementById('op-table-title');
    if (title) title.textContent = data.cfg.section === 'unmonitored' ? 'Target Kunjungan Belum Dimonitor' : 'Rekap Rinci Monitoring Selesai';
    if (!data.rows.length) {
      wrap.innerHTML = '<div class="op-empty"><i class="fas fa-inbox" style="font-size:28px;margin-bottom:10px;display:block"></i>Tidak ada data yang sesuai dengan seluruh filter.</div>';
      return;
    }
    if (data.cfg.section === 'unmonitored') {
      wrap.innerHTML = `<table class="op-table"><thead><tr><th>No.</th><th>Prioritas</th><th>Unit</th><th>Wilayah</th><th>Alasan</th><th>Monitoring Terakhir</th><th>PIC / Kontak</th><th>Alamat</th><th>Rencana Tindakan</th><th>Aksi</th></tr></thead><tbody>${data.rows.map((r, i) => {
        const u = r.u, lm = r.lastAll;
        return `<tr><td>${i + 1}</td><td><span class="op-priority ${r.priority.toLowerCase()}">${r.priority}</span><br>${html(safe(u.status || '—').toUpperCase())}</td><td><span class="op-badge ${safe(u.jenis).toLowerCase()}">${html(u.jenis)}</span><div class="op-unit-name">${html(u.nama)}</div><small>${html(u.ref || 'Tanpa ID referensi')}</small></td><td>${html(u.desa || '—')}<br>${html(u.kec || '—')}<br>${html(u.kab || '—')}</td><td>${html(r.reason)}</td><td>${lm ? `${html(fmtDate(lm.tgl))}<br>${resultBadge(recStatus(lm, u))}` : 'Belum ada'}${r.gapDays != null ? `<br><small>${fmt(r.gapDays)} hari lalu</small>` : ''}</td><td>${html(u.pic || '—')}<br><small>${html(u.telp || '—')}</small></td><td>${html(u.alamat || '—')}</td><td>${html(r.action)}</td><td><div class="op-actions"><button class="btn bs" data-unit-id="${html(u.id)}" data-op-action="monitor"><i class="fas fa-clipboard-check"></i> Monitoring</button><button class="btn bx" data-unit-id="${html(u.id)}" data-op-action="route"><i class="fas fa-route"></i> Rute</button></div></td></tr>`;
      }).join('')}</tbody></table>`;
    } else {
      wrap.innerHTML = `<table class="op-table"><thead><tr><th>No.</th><th>Tanggal / Form</th><th>Unit</th><th>Wilayah</th><th>Petugas</th><th>Hasil</th><th>Temuan</th><th>Rekomendasi</th><th>Status Tindak Lanjut</th><th>Frekuensi</th><th>Aksi</th></tr></thead><tbody>${data.rows.map((r, i) => {
        const u = r.u, m = r.m;
        return `<tr><td>${i + 1}</td><td><b>${html(fmtDate(m.tgl))}</b><br><span class="op-badge">${html(recordType(m, u))}</span></td><td><span class="op-badge ${safe(u.jenis).toLowerCase()}">${html(u.jenis)}</span><div class="op-unit-name">${html(u.nama)}</div><small>${html(u.ref || 'Tanpa ID referensi')}</small></td><td>${html(u.desa || '—')}<br>${html(u.kec || '—')}<br>${html(u.kab || '—')}</td><td>${html(m.petugas || '—')}</td><td>${resultBadge(r.status)}</td><td>${html(m.temuan || '—')}</td><td>${html(m.rekom || '—')}</td><td>${html(r.followUp)}</td><td>${fmt(r.c.selected.length)} dalam cakupan<br><small>${fmt(r.c.qualifyingAll.length)} sepanjang waktu</small></td><td><div class="op-actions"><button class="btn bs" data-unit-id="${html(u.id)}" data-op-action="monitor"><i class="fas fa-plus"></i> Kunjungan</button><button class="btn bx" data-unit-id="${html(u.id)}" data-op-action="route"><i class="fas fa-route"></i> Rute</button></div></td></tr>`;
      }).join('')}</tbody></table>`;
    }
  }

  function renderOperationalReport() {
    if (!isAdmin()) { toastMsg('Modul Laporan hanya dapat diakses Admin / Koordinator.', 'e'); return null; }
    try {
      populateRegions(); updateScopeFields(); updateStatusOptions();
      const data = buildOperationalData(); lastData = data;
      updateScopeNote(data.cfg); renderKpis(data); renderTable(data);
      const st = document.getElementById('op-status-text');
      if (st) st.innerHTML = `<i class="fas fa-check-circle" style="color:#16a34a"></i> Siap · ${html(periodLabel(data.cfg))} · ${html(formScopeLabel(data.cfg))} · ${fmt(data.rows.length)} baris.`;
      return data;
    } catch (e) {
      const st = document.getElementById('op-status-text'); if (st) st.innerHTML = `<i class="fas fa-exclamation-circle" style="color:#b91c1c"></i> ${html(e.message)}`;
      toastMsg(e.message, 'e'); return null;
    }
  }
  function scheduleOperationalRender() {
    clearTimeout(renderTimer); renderTimer = setTimeout(renderOperationalReport, 180);
  }
  function handleOperationalFilterChange() {
    updateScopeFields(); updateStatusOptions(); renderOperationalReport();
  }

  function bindOperationalEvents() {
    if (operationalEventsBound) return;
    const root = document.getElementById('tab-laporan');
    if (!root) return;
    operationalEventsBound = true;

    root.addEventListener('click', event => {
      const reportCard = event.target.closest('[data-report-section]');
      if (reportCard && root.contains(reportCard)) {
        selectReportSection(reportCard.dataset.reportSection);
        return;
      }
      const action = event.target.closest('[data-op-action]');
      if (!action || !root.contains(action)) return;
      const unitId = action.dataset.unitId || '';
      if (action.dataset.opAction === 'refresh') renderOperationalReport();
      else if (action.dataset.opAction === 'excel') exportOperationalExcel();
      else if (action.dataset.opAction === 'pdf') exportOperationalPdf();
      else if (action.dataset.opAction === 'monitor') opOpenMonitoring(unitId);
      else if (action.dataset.opAction === 'route') opOpenRoute(unitId);
    });

    root.addEventListener('keydown', event => {
      const card = event.target.closest('[data-report-section]');
      if (!card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      selectReportSection(card.dataset.reportSection);
    });

    root.addEventListener('change', event => {
      if (event.target.matches('[data-op-filter="change"]')) handleOperationalFilterChange();
    });
    root.addEventListener('input', event => {
      if (event.target.matches('[data-op-filter="search"]')) scheduleOperationalRender();
    });
  }

  function initOperationalPanel() {
    bindOperationalEvents();
    if (!operationalInitialized) {
      const today = new Date(), start = new Date(today.getFullYear(), today.getMonth(), 1);
      const s = document.getElementById('op-start'), e = document.getElementById('op-end');
      if (s && !s.value) s.value = localIso(start);
      if (e && !e.value) e.value = localIso(today);
      operationalInitialized = true;
    }
    populateRegions(); updateScopeFields(); updateStatusOptions();
    if (reportSection !== 'managerial') renderOperationalReport();
  }

  function selectReportSection(section) {
    if (!isAdmin()) { toastMsg('Modul Laporan hanya dapat diakses Admin / Koordinator.', 'e'); return; }
    reportSection = section === 'unmonitored' || section === 'monitored' ? section : 'managerial';
    document.querySelectorAll('#tab-laporan .rpt-report-card').forEach(x => x.classList.toggle('active', x.dataset.reportSection === reportSection));
    document.querySelectorAll('#tab-laporan .rpt-managerial-only').forEach(x => { x.style.display = reportSection === 'managerial' ? '' : 'none'; });
    const op = document.getElementById('op-report-panel'); if (op) op.classList.toggle('show', reportSection !== 'managerial');
    const heroTitle = document.querySelector('#tab-laporan .rpt-hero h3'), heroText = document.querySelector('#tab-laporan .rpt-hero p');
    if (heroTitle && heroText) {
      if (reportSection === 'managerial') {
        heroTitle.innerHTML = '<i class="fas fa-chart-line"></i> Laporan Manajemen Otomatis';
        heroText.textContent = 'Rekap, peta analitis, rasio wilayah, grafik donut/kolom/garis/radar, narasi kondisi lapangan, unit prioritas, dan rekomendasi disusun otomatis menjadi PowerPoint modern untuk pengambilan keputusan.';
      } else if (reportSection === 'unmonitored') {
        heroTitle.innerHTML = '<i class="fas fa-calendar-check"></i> Laporan Unit Belum Dimonitor';
        heroText.textContent = 'Daftar kerja prioritas untuk penjadwalan kunjungan, lengkap dengan klasifikasi periode, alamat, PIC, koordinat, rute, PDF, dan Excel.';
      } else {
        heroTitle.innerHTML = '<i class="fas fa-clipboard-check"></i> Laporan Unit Sudah Dimonitor';
        heroText.textContent = 'Rekap rinci setiap monitoring atau respons yang selesai, hasil, temuan, rekomendasi, frekuensi, dan status tindak lanjut.';
      }
    }
    initOperationalPanel();
  }

  function ensureFreshData() {
    const data = buildOperationalData(); lastData = data; return data;
  }
  function excelSafe(v) {
    if (typeof v === 'number') return v;
    const s = safe(v); return /^[=+\-@]/.test(s) ? "'" + s : s;
  }
  function filenamePart(v) { return safe(v).replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 42) || 'semua'; }
  function excelRows(data) {
    if (data.cfg.section === 'unmonitored') return data.rows.map((r, i) => ({
      'No.': i + 1, 'Prioritas': r.priority, 'Jenis Unit': r.u.jenis, 'ID Referensi': excelSafe(r.u.ref), 'Nama Unit': excelSafe(r.u.nama),
      'Status Unit': r.u.status, 'Kabupaten/Kota': r.u.kab, 'Kecamatan': r.u.kec, 'Desa/Kelurahan': r.u.desa,
      'Alasan Belum Dimonitor': excelSafe(r.reason), 'Tanggal Monitoring Terakhir': r.lastAll ? r.lastAll.tgl : '',
      'Hasil Terakhir': r.lastAll ? RESULT_LABEL[recStatus(r.lastAll, r.u)] : '', 'Jeda (hari)': r.gapDays == null ? '' : r.gapDays,
      'PIC': excelSafe(r.u.pic), 'Telepon': excelSafe(r.u.telp), 'Alamat': excelSafe(r.u.alamat), 'Latitude': Number(r.u.lat) || '', 'Longitude': Number(r.u.lng) || '',
      'Rencana Tindakan': excelSafe(r.action), 'Catatan Unit': excelSafe(r.u.note),
      'Tautan Rute': Number(r.u.lat) && Number(r.u.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.u.lat + ',' + r.u.lng)}` : ''
    }));
    return data.rows.map((r, i) => ({
      'No.': i + 1, 'Tanggal': r.m.tgl, 'Jenis Form': recordType(r.m, r.u), 'Jenis Unit': r.u.jenis, 'ID Referensi': excelSafe(r.u.ref), 'Nama Unit': excelSafe(r.u.nama),
      'Kabupaten/Kota': r.u.kab, 'Kecamatan': r.u.kec, 'Desa/Kelurahan': r.u.desa, 'Petugas': excelSafe(r.m.petugas),
      'Hasil': RESULT_LABEL[r.status] || r.status, 'Temuan': excelSafe(r.m.temuan), 'Rekomendasi': excelSafe(r.m.rekom), 'Status Tindak Lanjut': excelSafe(r.followUp),
      'Frekuensi dalam Cakupan': r.c.selected.length, 'Frekuensi Sepanjang Waktu': r.c.qualifyingAll.length,
      'PIC': excelSafe(r.u.pic), 'Telepon': excelSafe(r.u.telp), 'Alamat': excelSafe(r.u.alamat), 'Latitude': Number(r.u.lat) || '', 'Longitude': Number(r.u.lng) || '',
      'Tautan Rute': Number(r.u.lat) && Number(r.u.lng) ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(r.u.lat + ',' + r.u.lng)}` : ''
    }));
  }
  function exportOperationalExcel() {
    if (!isAdmin()) { toastMsg('Ekspor hanya dapat dilakukan Admin / Koordinator.', 'e'); return; }
    if (!global.XLSX) { toastMsg('Library Excel belum termuat.', 'e'); return; }
    try {
      const data = ensureFreshData(); if (!data.rows.length) throw new Error('Tidak ada baris sesuai filter untuk diekspor.');
      const wb = global.XLSX.utils.book_new();
      const title = data.cfg.section === 'unmonitored' ? 'Laporan Belum Dimonitor' : 'Laporan Sudah Dimonitor';
      const summary = [
        ['DARMA-1 — ' + title], ['Dibuat', new Date().toLocaleString('id-ID')], ['Periode', periodLabel(data.cfg)],
        ['Jenis unit', data.cfg.type === 'all' ? 'Semua unit' : data.cfg.type], ['Wilayah', data.cfg.region === 'all' ? 'Semua wilayah' : data.cfg.region],
        ['Cakupan formulir', formScopeLabel(data.cfg)], ['Status detail', selectedText('op-status') || data.cfg.status], ['Pencarian', val('op-search') || '—'],
        ['Jumlah baris', data.rows.length], ['Jumlah unit unik', data.matchedUnits.size], ['Catatan umum', excelSafe(data.cfg.note || '—')], [],
        ['Definisi'],
        ['Belum pernah dimonitor', 'Tidak ada catatan yang memenuhi cakupan formulir sepanjang waktu.'],
        ['Belum pada periode ini', 'Pernah tercatat sepanjang waktu, tetapi tidak pada periode terpilih.'],
        ['Respons Naker', 'Tidak disamakan dengan monitoring utama SPPG.']
      ];
      const wsSummary = global.XLSX.utils.aoa_to_sheet(summary); wsSummary['!cols'] = [{ wch: 29 }, { wch: 90 }];
      global.XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan');
      const detailRows = excelRows(data), ws = global.XLSX.utils.json_to_sheet(detailRows);
      const headers = Object.keys(detailRows[0] || {}), cols = headers.map(k => ({ wch: Math.min(55, Math.max(12, k.length + 2)) })); ws['!cols'] = cols;
      if (ws['!ref']) ws['!autofilter'] = { ref: ws['!ref'] };
      const routeCol = headers.indexOf('Tautan Rute');
      if (routeCol >= 0) detailRows.forEach((r, i) => { const address = global.XLSX.utils.encode_cell({ r: i + 1, c: routeCol }); if (ws[address] && r['Tautan Rute']) ws[address].l = { Target: r['Tautan Rute'], Tooltip: 'Buka rute Google Maps' }; });
      global.XLSX.utils.book_append_sheet(wb, ws, data.cfg.section === 'unmonitored' ? 'Target Kunjungan' : 'Rekap Monitoring');
      const name = `DARMA-1_${data.cfg.section === 'unmonitored' ? 'Belum_Dimonitor' : 'Sudah_Dimonitor'}_${filenamePart(data.cfg.scope === 'all' ? 'Sepanjang_Waktu' : data.cfg.start + '_' + data.cfg.end)}.xlsx`;
      global.XLSX.writeFile(wb, name);
      const st = document.getElementById('op-status-text'); if (st) st.innerHTML = `<i class="fas fa-check-circle" style="color:#16a34a"></i> ${html(name)} berhasil diunduh.`;
      toastMsg('📗 Excel laporan operasional berhasil dibuat');
    } catch (e) { toastMsg(e.message, 'e'); }
  }

  function pdfText(v) {
    return safe(v).replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim() || '-';
  }
  function exportOperationalPdf() {
    if (!isAdmin()) { toastMsg('Ekspor hanya dapat dilakukan Admin / Koordinator.', 'e'); return; }
    if (!global.jspdf || !global.jspdf.jsPDF) { toastMsg('Library PDF belum termuat.', 'e'); return; }
    try {
      const data = ensureFreshData(); if (!data.rows.length) throw new Error('Tidak ada baris sesuai filter untuk diekspor.');
      const doc = new global.jspdf.jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      if (typeof doc.autoTable !== 'function') throw new Error('Plugin tabel PDF belum termuat.');
      const title = data.cfg.section === 'unmonitored' ? 'LAPORAN UNIT BELUM DIMONITOR' : 'LAPORAN UNIT SUDAH DIMONITOR';
      doc.setFillColor(11, 31, 58); doc.rect(0, 0, 297, 31, 'F');
      doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.text(title, 12, 11);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
      doc.text(`Periode: ${pdfText(periodLabel(data.cfg))} | Unit: ${pdfText(data.cfg.type === 'all' ? 'Semua' : data.cfg.type)} | Wilayah: ${pdfText(data.cfg.region === 'all' ? 'Semua wilayah' : data.cfg.region)}`, 12, 18);
      doc.text(`Cakupan: ${pdfText(formScopeLabel(data.cfg))} | Jumlah baris: ${data.rows.length} | Unit unik: ${data.matchedUnits.size}`, 12, 23);
      doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')} | Penyusun: ${pdfText(runtime.getCurrentUser()?.nama || 'Admin DARMA-1')}`, 12, 28);
      let head, body, widths;
      if (data.cfg.section === 'unmonitored') {
        head = [['No.', 'Prioritas', 'Unit / ID', 'Wilayah', 'Alasan', 'Terakhir', 'PIC / Kontak', 'Alamat', 'Rencana Tindakan']];
        body = data.rows.map((r, i) => [i + 1, `${r.priority}\n${safe(r.u.status).toUpperCase()}`, `${r.u.jenis} | ${r.u.nama}\n${r.u.ref || '-'}`, `${r.u.desa || '-'}, ${r.u.kec || '-'}\n${r.u.kab || '-'}`, r.reason, r.lastAll ? `${fmtDate(r.lastAll.tgl)}\n${RESULT_LABEL[recStatus(r.lastAll, r.u)]}` : 'Belum ada', `${r.u.pic || '-'}\n${r.u.telp || '-'}`, r.u.alamat || '-', r.action]);
        widths = { 0: 8, 1: 15, 2: 38, 3: 31, 4: 39, 5: 25, 6: 31, 7: 51, 8: 38 };
      } else {
        head = [['No.', 'Tanggal / Form', 'Unit / Wilayah', 'Petugas', 'Hasil', 'Temuan', 'Rekomendasi', 'Tindak Lanjut', 'Frekuensi']];
        body = data.rows.map((r, i) => [i + 1, `${fmtDate(r.m.tgl)}\n${recordType(r.m, r.u)}`, `${r.u.jenis} | ${r.u.nama}\n${r.u.desa || '-'}, ${r.u.kec || '-'}, ${r.u.kab || '-'}`, r.m.petugas || '-', RESULT_LABEL[r.status] || r.status, r.m.temuan || '-', r.m.rekom || '-', r.followUp, `${r.c.selected.length} cakupan\n${r.c.qualifyingAll.length} total`]);
        widths = { 0: 8, 1: 23, 2: 41, 3: 25, 4: 20, 5: 51, 6: 51, 7: 43, 8: 21 };
      }
      body = body.map(row => row.map(pdfText));
      doc.autoTable({ startY: 35, head, body, theme: 'grid', margin: { left: 7, right: 7, bottom: 14 },
        styles: { font: 'helvetica', fontSize: 5.8, cellPadding: 1.5, valign: 'top', overflow: 'linebreak', textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: .15 },
        headStyles: { fillColor: [21, 52, 91], textColor: 255, fontStyle: 'bold', fontSize: 6.2 }, alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: Object.fromEntries(Object.entries(widths).map(([k, w]) => [k, { cellWidth: w }])) });
      let y = (doc.lastAutoTable && doc.lastAutoTable.finalY || 35) + 5;
      if (data.cfg.note) {
        if (y > 190) { doc.addPage(); y = 15; }
        doc.setTextColor(15, 23, 42); doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.text('Catatan umum:', 10, y);
        doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(pdfText(data.cfg.note), 270), 31, y);
      }
      const pages = doc.getNumberOfPages();
      for (let p = 1; p <= pages; p++) {
        doc.setPage(p); doc.setDrawColor(203, 213, 225); doc.line(8, 202, 289, 202);
        doc.setTextColor(100, 116, 139); doc.setFontSize(6.5); doc.text('DARMA-1 - dokumen laporan operasional berbasis data tersimpan', 9, 207); doc.text(`Halaman ${p} dari ${pages}`, 288, 207, { align: 'right' });
      }
      const name = `DARMA-1_${data.cfg.section === 'unmonitored' ? 'Belum_Dimonitor' : 'Sudah_Dimonitor'}_${filenamePart(data.cfg.scope === 'all' ? 'Sepanjang_Waktu' : data.cfg.start + '_' + data.cfg.end)}.pdf`;
      doc.save(name);
      const st = document.getElementById('op-status-text'); if (st) st.innerHTML = `<i class="fas fa-check-circle" style="color:#16a34a"></i> ${html(name)} berhasil diunduh.`;
      toastMsg('📄 PDF laporan operasional berhasil dibuat');
    } catch (e) { console.error(e); toastMsg(e.message, 'e'); }
  }

  function opOpenMonitoring(unitId) {
    if (!isAdmin()) return;
    if (typeof global.addMonitorFor === 'function') global.addMonitorFor(unitId);
  }
  function opOpenRoute(unitId) {
    if (!isAdmin()) return;
    const u = (dbNow().units || []).find(x => x.id === unitId); if (!u) return;
    if (!Number.isFinite(Number(u.lat)) || !Number.isFinite(Number(u.lng)) || Number(u.lat) === 0 || Number(u.lng) === 0) { toastMsg('Koordinat unit belum tersedia.', 'e'); return; }
    global.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(u.lat + ',' + u.lng)}`, '_blank', 'noopener');
  }

  const managementInit = global.initReportPanel;
  global.initReportPanel = function () {
    if (typeof managementInit === 'function') managementInit();
    initOperationalPanel();
    selectReportSection(reportSection);
  };
  global.selectReportSection = selectReportSection;
  global.renderOperationalReport = renderOperationalReport;
  global.scheduleOperationalRender = scheduleOperationalRender;
  global.handleOperationalFilterChange = handleOperationalFilterChange;
  global.exportOperationalExcel = exportOperationalExcel;
  global.exportOperationalPdf = exportOperationalPdf;
  global.opOpenMonitoring = opOpenMonitoring;
  global.opOpenRoute = opOpenRoute;
  global.DarmaOperationalReport = { buildOperationalData, classifyUnit, recordType, qualifies };

export { buildOperationalData, classifyUnit, qualifies, recordType };
