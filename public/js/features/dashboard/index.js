/* ============================================================
   RENDER: DASHBOARD
============================================================ */
function applyRBAC() {
  const isAdmin = CU && CU.role === 'admin';
  const els = ['btnAddUnit', 'btnBackup', 'btnRestore', 'btnImportTOptimal', 'dtDelBtn', 'dtEditBtn', 'btnClearMon'];
  els.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = isAdmin ? 'inline-flex' : 'none';
  });
  const rptTab=document.getElementById('btnReportTab');if(rptTab)rptTab.style.display=isAdmin?'flex':'none';
  const rptDash=document.getElementById('btnDashReport');if(rptDash)rptDash.style.display=isAdmin?'inline-flex':'none';
}
function renderAll(){renderMap();renderDash();renderUnitList();renderHist();refreshUnitSelect();applyRBAC();}
function renderDash(){
  const list = filteredUnits();
  const dbBanner=document.getElementById('dashBanner');
  if(dbBanner)dbBanner.innerHTML=(API.mode==='cloud'&&CU&&CU.role==='admin'&&DB.units.length===0)?'<button class="btn bp bblk" style="margin-bottom:10px" onclick="loadSampleCloud()"><i class="fas fa-cloud-upload-alt"></i> Database cloud masih kosong — Muat Data Contoh</button>':'';
  const s=list.filter(u=>u.jenis==='SPPG').length;
  const k=list.filter(u=>u.jenis==='KDMP').length;
  const oper=list.filter(u=>u.status==='aktif');
  const prep=list.filter(u=>u.status==='persiapan');
  const plan=list.filter(u=>u.status==='rencana');
  document.getElementById('stSPPG').textContent=s;
  document.getElementById('stKDMP').textContent=k;
  document.getElementById('stMon').textContent=DB.monitoring.filter(m=>list.some(u=>u.id===m.unitId)).length;
  document.getElementById('stOper').textContent=oper.length;
  const operSub=document.getElementById('stOperSub');if(operSub)operSub.textContent=`${oper.filter(u=>u.jenis==='SPPG').length} SPPG · ${oper.filter(u=>u.jenis==='KDMP').length} KDMP`;
  const prepEl=document.getElementById('stPrep');if(prepEl)prepEl.textContent=prep.length;
  const prepSub=document.getElementById('stPrepSub');if(prepSub)prepSub.textContent=`${prep.filter(u=>u.jenis==='SPPG').length} SPPG · ${prep.filter(u=>u.jenis==='KDMP').length} KDMP`;
  const planEl=document.getElementById('stPlan');if(planEl)planEl.textContent=plan.length;
  const planSub=document.getElementById('stPlanSub');if(planSub)planSub.textContent=`${plan.filter(u=>u.jenis==='SPPG').length} SPPG · ${plan.filter(u=>u.jenis==='KDMP').length} KDMP`;

  // progres cakupan
  const sppgAll = list.filter(u=>u.jenis==='SPPG'), sppgMon = sppgAll.filter(u=>monsOf(u.id).length>0);
  const kdmpAll = list.filter(u=>u.jenis==='KDMP'), kdmpMon = kdmpAll.filter(u=>monsOf(u.id).length>0);
  const totAll = list.length || 1, totMon = list.filter(u=>monsOf(u.id).length>0).length;
  const pSPPG = Math.round(sppgMon.length/(sppgAll.length||1)*100);
  const pKDMP = Math.round(kdmpMon.length/(kdmpAll.length||1)*100);
  const pTot = Math.round(totMon/totAll*100);

  document.getElementById('hasilBars').innerHTML = `
    <div class="hrow" onclick="setMapView('progres','SPPG','mon',null)"><div class="hl" style="width:115px">🍳 SPPG Dimonitor</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pSPPG,2)}%;background:var(--sppg)"></div></div><div class="hv">${sppgMon.length}/${sppgAll.length}</div></div>
    <div class="hrow" onclick="setMapView('progres','KDMP','mon',null)"><div class="hl" style="width:115px">🏪 KDMP Dimonitor</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pKDMP,2)}%;background:var(--kdmp)"></div></div><div class="hv">${kdmpMon.length}/${kdmpAll.length}</div></div>
    <div class="hrow" onclick="setMapView('progres','','mon',null)"><div class="hl" style="width:115px">🟢 Total Cakupan</div><div class="hbar-wrap"><div class="hbar" style="width:${Math.max(pTot,2)}%;background:var(--ok)"></div></div><div class="hv">${pTot}%</div></div>
  `;

  // kabupaten bars
  const kabs=Object.entries(KABUPATEN).map(([kab])=>{
    const us=list.filter(u=>u.kab===kab);
    return {kab,n:us.length,mon:DB.monitoring.filter(m=>us.some(u=>u.id===m.unitId)).length};
  });
  const maxK=Math.max(1,...kabs.map(x=>x.n));
  document.getElementById('kabBars').innerHTML=kabs.map(x=>`
    <div class="hrow" style="cursor:pointer" onclick="pickKab('${x.kab.replace(/'/g,"\\'")}')">
      <div class="hl" style="width:110px">📍 ${x.kab}</div>
      <div class="hbar-wrap"><div class="hbar" style="width:${Math.max(Math.round(x.n/maxK*100),2)}%;background:linear-gradient(90deg,#1D4ED8,#60A5FA)"></div></div>
      <div class="hv">${x.n}</div>
    </div>`).join('');

  // target sasaran unit belum dimonitor (0 kunjungan)
  const unmon = list.filter(u=>monsOf(u.id).length === 0)
     .sort((a,b)=> (a.jenis==='SPPG'?-1:1) || a.nama.localeCompare(b.nama)).slice(0,6);
  document.getElementById('attnList').innerHTML=unmon.length?unmon.map(u=>{
    return `<div class="krow" onclick="openDetail('${u.id}')">
      <div class="kbadge ${u.jenis.toLowerCase()} belum">${u.jenis==='SPPG'?'S':'K'}</div>
      <div class="kinfo"><div class="kname">${esc(u.nama)}</div><div class="ksub">${esc(u.desa)}, Kec. ${esc(u.kec)}, ${esc(u.kab)} · <b style="color:var(--brand)">Belum Kunjungan</b></div></div>
      <div class="kchip belum">⚪ Belum Dimonitor</div>
    </div>`;
  }).join(''):'<div class="empty"><i class="fas fa-check-circle"></i><p>Semua unit sudah dimonitor 🎉</p></div>';

  // recent monitoring
  const rec=[...DB.monitoring].sort((a,b)=>b.tgl.localeCompare(a.tgl)).slice(0,5);
  document.getElementById('recentMon').innerHTML=rec.length?rec.map(m=>{
    const u=unitById(m.unitId);if(!u)return '';
    return `<div class="krow" onclick="openDetail('${u.id}')">
      <div class="kbadge ${u.jenis.toLowerCase()} baik">${u.jenis==='SPPG'?'S':'K'}</div>
      <div class="kinfo"><div class="kname">${esc(u.nama)}</div><div class="ksub">${fmtD(m.tgl)} · oleh ${esc(m.petugas)}</div></div>
      <div class="kchip baik">🟢 Sudah Dimonitor</div>
    </div>`;
  }).join(''):'<div class="empty"><i class="fas fa-inbox"></i><p>Belum ada monitoring</p></div>';
}
function pickKab(k){document.getElementById('fdKab').value=k;onFilterChange();fitAll();}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { applyRBAC, renderAll, renderDash, pickKab });
