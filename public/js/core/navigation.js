/* ============================================================
   TABS
============================================================ */
function goTab(t){
  if(t==='laporan'&&(!CU||CU.role!=='admin')){toast('Modul Laporan hanya dapat diakses Admin / Koordinator.','e');return;}
  document.querySelectorAll('.tbtn').forEach(b=>b.classList.toggle('on',b.dataset.t===t));
  document.querySelectorAll('.tcont').forEach(c=>c.classList.remove('on'));
  document.getElementById('tab-'+t).classList.add('on');
  if(t==='dash')renderDash();
  if(t==='unit')renderUnitList();
  if(t==='hist')renderHist();
  if(t==='rekam')refreshUnitSelect();
  if(t==='laporan'&&typeof initReportPanel==='function')initReportPanel();
}
function toggleSB(force){
  const sb=document.getElementById('sidebar');
  if(force===false){sb.classList.remove('visible');return;}
  sb.classList.toggle('visible');
  setTimeout(()=>map.invalidateSize(),380);
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { goTab, toggleSB });
