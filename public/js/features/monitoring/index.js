import { getAppContext } from '../../core/context.js';

const monitoringRepository = getAppContext().repositories.monitoring;

/* ============================================================
   MONITORING (REKAM)
============================================================ */
let monitoringUnitResultIndex=-1;
function monitoringSearchNorm(v){return String(v==null?'':v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
function closeMonitoringUnitResults(){const r=document.getElementById('rUnitResults');if(r)r.classList.remove('show');monitoringUnitResultIndex=-1;}
function monitoringUnitMatches(){
  const q=monitoringSearchNorm(getVal('rUnitSearch')),tokens=q.split(' ').filter(Boolean);
  const jenis=getVal('rUnitJenis'),kab=getVal('rUnitKab');
  return DB.units.filter(u=>{
    if(jenis&&u.jenis!==jenis)return false;if(kab&&u.kab!==kab)return false;
    const hay=monitoringSearchNorm([u.nama,u.ref,u.desa,u.kec,u.kab,u.alamat,u.pic,u.telp].filter(Boolean).join(' '));
    return !tokens.length||tokens.every(t=>hay.includes(t));
  }).map(u=>{
    const nama=monitoringSearchNorm(u.nama),ref=monitoringSearchNorm(u.ref),area=monitoringSearchNorm([u.desa,u.kec,u.kab].join(' '));
    let score=0;if(q){if(ref===q)score+=1000;if(ref.startsWith(q))score+=500;if(nama===q)score+=450;if(nama.startsWith(q))score+=300;if(nama.includes(q))score+=180;if(area.includes(q))score+=100;}
    const visits=monsOf(u.id).length;if(!q&&visits===0)score+=50;
    return {u,score,visits};
  }).sort((a,b)=>b.score-a.score||a.visits-b.visits||a.u.nama.localeCompare(b.u.nama));
}
function searchMonitoringUnits(){
  const box=document.getElementById('rUnitResults'),meta=document.getElementById('rUnitSearchMeta');if(!box)return;
  const all=monitoringUnitMatches(),shown=all.slice(0,60);monitoringUnitResultIndex=-1;
  if(!shown.length){box.innerHTML='<div class="unit-result-empty"><i class="fas fa-search" style="font-size:18px;margin-bottom:7px"></i><br>Tidak ada unit yang cocok.<br>Coba nama, ID, desa, atau kecamatan lain.</div>';}
  else box.innerHTML=shown.map(x=>{const u=x.u,mon=x.visits>0;return `<div class="unit-result" data-unit-id="${esc(u.id)}" onclick="chooseMonitoringUnit(this.dataset.unitId)"><div class="unit-result-badge ${u.jenis.toLowerCase()}">${u.jenis==='SPPG'?'S':'K'}</div><div><div class="unit-result-name">${esc(u.nama)}</div><div class="unit-result-sub"><b>${esc(u.ref||'Tanpa ID')}</b> · ${esc(u.desa||'-')}, ${esc(u.kec||'-')} · ${esc(u.kab||'-')}</div></div><div class="unit-result-state ${mon?'mon':''}">${mon?'✓ '+x.visits+'x':'○ Belum'}<br>monitoring</div></div>`;}).join('');
  if(meta)meta.textContent=`${all.length} unit ditemukan${all.length>60?' · 60 teratas ditampilkan':''}`;
  box.classList.add('show');
}
function chooseMonitoringUnit(id){
  const u=unitById(id);if(!u)return;
  const sel=document.getElementById('rUnit');if(![...sel.options].some(o=>o.value===id))refreshUnitSelect();
  sel.value=id;document.getElementById('rUnitSearch').value=u.nama;closeMonitoringUnitResults();onUnitPick();
}
function clearMonitoringUnitSearch(e){
  if(e){e.preventDefault();e.stopPropagation();}
  setVal('rUnitSearch','');setVal('rUnit','');
  const info=document.getElementById('unitInfo');if(info)info.innerHTML='Cari lalu pilih unit SPPG atau KDMP yang dikunjungi.';
  renderRekamForm(null);searchMonitoringUnits();document.getElementById('rUnitSearch').focus();
}
function syncMonitoringUnitSearch(u){
  const inp=document.getElementById('rUnitSearch'),meta=document.getElementById('rUnitSearchMeta');if(!inp)return;
  inp.value=u?u.nama:'';
  if(meta)meta.textContent=u?`Terpilih: ${u.ref||u.id} · ${u.desa||'-'}, ${u.kec||'-'} · ${u.kab||'-'}`:'Ketik nama, ID SPPG, desa, atau kecamatan.';
}
function monitoringUnitSearchKey(e){
  const box=document.getElementById('rUnitResults');if(!box)return;
  if(e.key==='Escape'){closeMonitoringUnitResults();return;}
  const items=[...box.querySelectorAll('.unit-result')];if(!items.length)return;
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();monitoringUnitResultIndex=e.key==='ArrowDown'?Math.min(items.length-1,monitoringUnitResultIndex+1):Math.max(0,monitoringUnitResultIndex-1);
    items.forEach((x,i)=>x.classList.toggle('active',i===monitoringUnitResultIndex));items[monitoringUnitResultIndex].scrollIntoView({block:'nearest'});
  }else if(e.key==='Enter'&&monitoringUnitResultIndex>=0){e.preventDefault();items[monitoringUnitResultIndex].click();}
}
function initRekamForm(){
  const today=new Date().toISOString().slice(0,10);
  document.getElementById('rTgl').value=today;
  initMS();
  document.addEventListener('click',closeMonitoringUnitResults);
  renderRekamForm(null);
}
function refreshUnitSelect(){
  const sel=document.getElementById('rUnit');
  const cur=sel.value;
  const groups=[['🍳 SPPG — DAPUR MBG','SPPG'],['🏪 KDMP — KOPERASI','KDMP']].map(([label,j])=>{
    const opts=DB.units.filter(u=>u.jenis===j).sort((a,b)=>a.nama.localeCompare(b.nama))
      .map(u=>`<option value="${u.id}">${esc(u.nama)} — ${esc(u.kec)}, ${esc(u.kab)}</option>`).join('');
    return `<optgroup label="${label}">${opts}</optgroup>`;
  }).join('');
  sel.innerHTML='<option value="">— Pilih Unit yang Dimonitor —</option>'+groups;
  if(cur&&[...sel.options].some(o=>o.value===cur)){sel.value=cur;syncMonitoringUnitSearch(unitById(cur));}
  const hsel=document.getElementById('fHUnit');
  const hcur=hsel.value;
  hsel.innerHTML='<option value="">Semua Unit</option>';
  [...DB.units].sort((a,b)=>a.nama.localeCompare(b.nama)).forEach(u=>hsel.innerHTML+=`<option value="${u.id}">${esc(u.nama)}</option>`);
  if(hcur&&[...hsel.options].some(o=>o.value===hcur)) hsel.value=hcur;
  else hsel.value='';
}
function onUnitPick(){
  const u=unitById(getVal('rUnit'));
  const info=document.getElementById('unitInfo');
  syncMonitoringUnitSearch(u);
  if(!u){info.innerHTML='Cari lalu pilih unit SPPG atau KDMP yang dikunjungi.';renderRekamForm(null);return;}
  info.innerHTML=`📍 ${esc(u.alamat)}, ${esc(u.kec)}, ${esc(u.kab)} · status: <b>${statusUnitLabel(u.status)}</b> · hasil terakhir: <b>${HASIL_META[unitHasil(u)].label}</b>`;
  editMonId=null;
  currentRekamForm=null;currentSppgFormVersion=SPPG_FORM_VERSION;
  setVal('rTemuan','');setVal('rRekom','');
  renderRekamForm(u.jenis);
  flyToUnit(u.id);
}
function previewHasil(){
  const v=['rKebersihan','rGizi','rDistribusi','rDok'].map(getVal);
  if(v.some(x=>!x))return; // tunggu sampai semua terisi
  const h=computeHasil(v[0],v[1],v[2],v[3]);
  const hm=HASIL_META[h];
  const el=document.getElementById('hasilPreview');
  el.textContent=hm.icon+' '+hm.label.toUpperCase();
  el.style.color='#fff';el.style.background=hm.color;el.style.borderColor=hm.color;
  document.getElementById('hasilPreviewWrap').style.display='block';
}
function saveMonitoring(){
  if(!CU){toast('Silakan masuk terlebih dahulu','e');return;}
  const unitId=getVal('rUnit'),tgl=getVal('rTgl');
  if(!unitId){toast('Pilih unit yang dimonitor','e');return;}
  if(!tgl){toast('Isi tanggal kunjungan','e');return;}
  const u=unitById(unitId);if(!u)return;
  const petugas=getVal('rPetugas')||(CU?CU.nama:'');
  const driver='';
  const temuan=getVal('rTemuan'),rekom=getVal('rRekom');
  let form,hasil;
  if(u.jenis==='KDMP'){
    form=collectKDMP();
    if(!form.terjawab){toast('Isi minimal satu butir penilaian KDMP','e');return;}
    hasil=form.hasil;
  }else{
    const formDef=currentRekamForm==='SPPG'?getActiveSppgFormDefinition():(FORMS[currentRekamForm]||FORM_NAKER);
    form=collectGeneric(formDef);
    if(currentRekamForm==='SPPG')form.version=currentSppgFormVersion;
    hasil=getVal('rHasilManual')||'baik';
  }
  const base={unitId,tgl,petugas,driver,jenis:u.jenis,formType:(u.jenis==='KDMP'?'KDMP':(currentRekamForm||'SPPG')),form,hasil,temuan,rekom};
  if(editMonId){
    const current=monitoringRepository.getAll().find(x=>x.id===editMonId);
    if(current){monitoringRepository.save(Object.assign({},current,base));toast('✅ Monitoring diperbarui');}
    editMonId=null;
  }else{
    monitoringRepository.save(Object.assign({id:uid('mon')},base));
    toast(`✅ Monitoring "${u.nama}" tersimpan — hasil: ${HASIL_META[hasil].label}`);
  }
  resetRekamForm();
  renderAll();selectUnit(unitId);
  map.flyTo([u.lat,u.lng],13,{duration:1});
}
function resetRekamForm(){
  document.getElementById('rUnit').value='';
  document.getElementById('rTgl').value=new Date().toISOString().slice(0,10);
  setMSVal('rPetugas', CU?CU.nama:'');
  setVal('rTemuan','');
  setVal('rRekom','');setVal('rUnitSearch','');
  const meta=document.getElementById('rUnitSearchMeta');if(meta)meta.textContent='Ketik nama, ID SPPG, desa, atau kecamatan.';
  closeMonitoringUnitResults();
  document.getElementById('unitInfo').innerHTML='Cari lalu pilih unit SPPG atau KDMP yang dikunjungi.';
  renderRekamForm(null);
}
function addMonitorFor(id){
  const u=unitById(id);if(!u)return;
  if(map)map.closePopup();
  const sidebar=document.getElementById('sidebar');
  sidebar.classList.add('visible');
  goTab('rekam');refreshUnitSelect();
  editMonId=null;
  document.getElementById('rUnit').value=id;
  onUnitPick();
  if(CU)setMSVal('rPetugas',CU.nama);
  setTimeout(()=>{
    const tab=document.getElementById('tab-rekam');
    sidebar.scrollTo({top:Math.max(0,(tab?tab.offsetTop:0)-8),behavior:'smooth'});
  },80);
  toast(`📋 Form monitoring ${u.jenis} dibuka — silakan lengkapi kuesioner.`);
}


/* Public action bridge for existing HTML controls. */
Object.defineProperties(globalThis, {
  monitoringUnitResultIndex: { configurable: true, get: () => monitoringUnitResultIndex, set: value => { monitoringUnitResultIndex = value; } }
});
Object.assign(globalThis, { monitoringSearchNorm, closeMonitoringUnitResults, monitoringUnitMatches, searchMonitoringUnits, chooseMonitoringUnit, clearMonitoringUnitSearch, syncMonitoringUnitSearch, monitoringUnitSearchKey, initRekamForm, refreshUnitSelect, onUnitPick, previewHasil, saveMonitoring, resetRekamForm, addMonitorFor });
