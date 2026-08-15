import { getAppContext } from '../../core/context.js';

const { repositories } = getAppContext();
const monitoringRepository = repositories.monitoring;
let exportState = { rows: [] };

function escExport(value) { return typeof esc === 'function' ? esc(value) : String(value == null ? '' : value); }
function exportKind(record) {
  if (record?.formType) return record.formType;
  if (record?.jenis) return record.jenis;
  const unit = unitById(record?.unitId);
  return unit?.jenis || 'SPPG';
}
function numeric(value) {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : '';
}
function fullFromStored(value, scale) {
  const n = numeric(value);
  return n === '' ? '' : Number((n * scale).toFixed(2));
}
function put(out, key, value) { if (value !== undefined && value !== null && value !== '') out[key] = value; }
function rawArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }

function sppgOutbound(record, unit) {
  const f = record.form?.fields || {}, raw = record.form?.raw || {}, out = Object.assign({}, raw);
  put(out, 'q101_namaSPPG', unit?.nama || f.sp101);
  put(out, 'provinsi', f.sp102 || unit?.prov || 'Jawa Tengah');
  put(out, 'kabkota', f.sp103 || unit?.kab); put(out, 'kecamatan', unit?.kec); put(out, 'desa', unit?.desa);
  put(out, 'latitude', unit?.lat); put(out, 'longitude', unit?.lng);
  put(out, 'q104_beroperasi', f.sp104); put(out, 'q105_alasanUtama', f.sp105); put(out, 'q105_alasanLainnya', f.sp105_lain);
  put(out, 'q106_tglBeroperasi', f.sp106); put(out, 'q107_namaResponden', f.sp107); put(out, 'q108_jabatan', f.sp108); put(out, 'q108_jabatanLainnya', f.sp108_lain);
  put(out, 'q109_petugasWawancara', f.sp109); put(out, 'q110_tglWawancara', record.tgl); put(out, 'q110_pukulWawancara', f.sp110_pukul);
  const p201 = f.sp201 || {}; ['siswa','ibuhamil','balita','guru','posyandu'].forEach((key, i) => put(out, ['q201_siswa','q201_ibuHamilMenyusui','q201_balita','q201_guruTendik','q201_kaderPosyandu'][i], p201[key]));
  const p202 = f.sp202 || {}; ['paud','tk','sd','smp','sma'].forEach((key, i) => put(out, ['q202_sekolahPAUD','q202_sekolahTKRA','q202_sekolahSD','q202_sekolahSMP','q202_sekolahSMA'][i], p202[key]));
  put(out, 'q203_hariPenyaluran', f.sp203); put(out, 'q204_waktuTempuh', f.sp204); put(out, 'q204_waktuTempuhKet', f.sp204_detail);
  put(out, 'q205_totalPekerja', f.sp205); put(out, 'q206_totalJuruMasak', f.sp206); put(out, 'q207_hariKerjaUpah', f.sp207); put(out, 'q208_persentaseBPJS', f.sp208);
  put(out, 'q301_pengawasanEksternal', f.sp301); const p302=f.sp302||{}; put(out,'q302_a_kppg',p302.kppg);put(out,'q302_b_dinkes',p302.dinkes);put(out,'q302_c_tniPolri',p302.tni);put(out,'q302_d_lainnya',p302.lain);put(out,'q302_d_lainnyaKet',p302.lain_keterangan);
  const process=f.sp_waktu_proses||{}; ['303','304','305','306','307'].forEach(key=>{const value=process['sp'+key]||{};put(out,'q'+key+'_tahap1',value.tahap1);put(out,'q'+key+'_tahap2',value.tahap2);});
  put(out,'q308_ujiSampel',f.sp308);put(out,'q308_ujiSampelLainnya',f.sp308_lain);put(out,'q309_sumberAir',f.sp309);put(out,'q309_sumberAirLainnya',f.sp309_lain);put(out,'q310_gangguanPencernaan',f.sp310);put(out,'q310_kapan',f.sp310_kapan);put(out,'q311_pengelolaanSampah',f.sp311);put(out,'q311_pengelolaanSampahLainnya',f.sp311_lain);put(out,'q312_kendalaPenyiapan',f.sp312);put(out,'q312_frekuensiMingguLalu',f.sp313);
  put(out,'q401_saldoVA',fullFromStored(f.sp401,1000000));put(out,'q402_saldoLebih500jt',f.sp402);put(out,'q403_nilaiTopup',fullFromStored(f.sp403,1000000));put(out,'q404_rentangTopup',f.sp404);
  const p405=rawArray(f.sp405);put(out,'q405_harian',p405.includes('Harian')?'Ya':'');put(out,'q405_duaMingguan',p405.includes('Dua mingguan')?'Ya':'');put(out,'q405_bulanan',p405.includes('Bulanan')?'Ya':'');
  const p406=rawArray(f.sp406);put(out,'q406_aplikasiSPPG',p406.some(v=>/pelaporan/i.test(v))?'Ya':'');put(out,'q406_aplikasiLainnya',p406.includes('Aplikasi lainnya')?'Ya':'');put(out,'q406_aplikasiLainnyaKet',f.sp406_lain);
  put(out,'q407_periodeInsentif',f.sp407);put(out,'q408_hariInsentif',f.sp408);put(out,'q409_jumlahSupplier',f.sp409);
  const p410=f.sp410||{}; ['kdkmp','bumdes','agen','distributor','produsen','umkm'].forEach((key,i)=>put(out,['q410_a_kdkmp','q410_b_bumdesKoperasi','q410_c_agenPasar','q410_d_distributor','q410_e_produsen','q410_f_umkm'][i],fullFromStored(p410[key],1000000)));
  const p411=f.sp411||{}; const map411=[['pokok','a','pokok'],['lauk','b','lauk'],['sayur','c','sayur'],['buah','d','buah'],['minum','e','minuman'],['lain','f','lainnya']]; map411.forEach(([key,letter,target])=>{const v=p411[key]||{};put(out,`q411_${letter}_${target}_dalamKota`,fullFromStored(v.dalam,1000000));put(out,`q411_${letter}_${target}_luarKota`,fullFromStored(v.luar,1000000));});
  const p412=f.sp412||{}; [['beras','a'],['ayam','b'],['telur','c'],['susu','d']].forEach(([key,letter])=>{const v=p412[key]||{};put(out,`q412_${letter}_${key}_bulanIni`,fullFromStored(v.ini,1000));put(out,`q412_${letter}_${key}_bulanLalu`,fullFromStored(v.lalu,1000));});
  const p413=f.sp413||{}; ['tk','bbm','lpg','util','sewa','lain'].forEach((key,i)=>put(out,['q413_a_tenagaKerja','q413_b_bbm','q413_c_lpg','q413_d_utilitas','q413_e_sewaKendaraan','q413_f_lainnya'][i],fullFromStored(p413[key],1000000)));
  const p414=rawArray(f.sp414);put(out,'q414_kendala',p414.map((v,i)=>`${i+1}. ${v}`));put(out,'q414_kendalaLainnyaKet',f.sp414_lain);put(out,'analisisSurveyor',record.temuan);return out;
}

function nakerOutbound(record, unit) {
  const f=record.form?.fields||{}, raw=record.form?.raw||{}, out=Object.assign({},raw);
  put(out,'q101_namaResponden',f.nk101);put(out,'q102_jabatan',f.nk102);put(out,'q102_jabatanLainnya',f.nk102_lain);put(out,'q103_pendidikan',f.nk103);put(out,'q104_bekerjaSejak',f.nk104);put(out,'q105_namaSPPG',unit?.nama||f.nk105);put(out,'provinsi',f.nk106);put(out,'kabkota',f.nk107);put(out,'kecamatan',unit?.kec);put(out,'desa',unit?.desa);put(out,'latitude',unit?.lat);put(out,'longitude',unit?.lng);
  put(out,'q201_pernahBekerja',f.nk201);put(out,'q202_sektorSebelumnya',f.nk202);put(out,'q203_upahSebelumnya',f.nk203);put(out,'q204_kegiatanSebelumnya',f.nk204);put(out,'q204_kegiatanLainnya',f.nk204_lain);put(out,'q205_hariKerjaPerMinggu',f.nk205);put(out,'q206_jamKerjaPerHari',f.nk206);put(out,'q207_upahSPPG',f.nk207);put(out,'q208_pembayaranLembur',f.nk208);put(out,'q209_pekerjaanLain',f.nk209);
  put(out,'q301_sopTertulis',f.nk301);put(out,'q302_pengarahanSOP',f.nk302);put(out,'q303_frekuensiMenyimpangSOP',f.nk303);put(out,'q304_kendalaTerbesar',rawArray(f.nk304));put(out,'q304_kendalaTerbesarLainnyaKet',f.nk304_lain);put(out,'q305_solusiKendala',f.nk305);put(out,'q306_kendalaMBG',rawArray(f.nk306));put(out,'q307_usulanPerbaikan',f.nk307);put(out,'q308_dampakPenghasilan',f.nk308);put(out,'q309_dampakPositifLain',rawArray(f.nk309));put(out,'q310_dampakEkonomiSekitar',f.nk310);put(out,'analisisSurveyor',record.temuan);return out;
}

function outboundRecord(record) {
  const unit=unitById(record.unitId), kind=exportKind(record), raw=record.form?.raw||{};
  const formData=kind==='SPPG'?sppgOutbound(record,unit):kind==='NAKER'?nakerOutbound(record,unit):Object.assign({},raw,record.form?.remoteScores||{});
  return { sourceId: record.id, sheetName: record.form?._source?.sheetName || (kind==='SPPG'?'Resp_MBG_SPPG':kind==='NAKER'?'Resp_MBG_Naker':'Resp_KDKMP_BangunanPermanen'), formType: kind, tgl: record.tgl, unit: unit ? { id:unit.id,nama:unit.nama,jenis:unit.jenis,kab:unit.kab,kec:unit.kec,desa:unit.desa,lat:unit.lat,lng:unit.lng } : null, formData, exportedAt:new Date().toISOString() };
}

function exportRowsVisible() {
  const type=document.getElementById('toptExportForm')?.value||'',start=document.getElementById('toptExportStart')?.value||'',end=document.getElementById('toptExportEnd')?.value||'',search=(document.getElementById('toptExportSearch')?.value||'').toLowerCase().trim();
  return exportState.rows.filter(row=>{const r=row.record,kind=exportKind(r),unit=unitById(r.unitId)||{};if(type&&kind!==type)return false;if(start&&r.tgl<start)return false;if(end&&r.tgl>end)return false;if(search&&!([unit.nama,r.id,r.formType].join(' ').toLowerCase().includes(search)))return false;return true;});
}
function renderTOptimalExport() {
  const visible=exportRowsVisible(), selected=exportState.rows.filter(row=>row.selected).length, meta=document.getElementById('toptExportMeta');
  if(meta)meta.innerHTML=`<b>${exportState.rows.length}</b> monitoring tersedia · tampil <b>${visible.length}</b> · dipilih <b>${selected}</b> (maksimal 1 form)`;
  const body=document.getElementById('toptExportRows');if(!body)return;
  body.innerHTML=visible.length?visible.map(row=>{const r=row.record,u=unitById(r.unitId)||{};return `<tr><td><input type="checkbox" ${row.selected?'checked':''} onchange="toggleTOptimalExportRow('${escExport(row.key)}',this.checked)"></td><td>${escExport(exportKind(r))}</td><td><b>${escExport(u.nama||'—')}</b></td><td>${escExport(r.tgl||'—')}</td><td>${escExport(r.id)}</td><td><span class="import-status siap-koordinat">Siap diekspor</span></td></tr>`;}).join(''):'<tr><td colspan="6" class="text-center text-muted py-3">Tidak ada data.</td></tr>';
  const button=document.getElementById('toptExportButton');if(button)button.disabled=selected===0;
}
function toggleTOptimalExportRow(key,checked){
  if(checked) exportState.rows.forEach(item=>{item.selected=item.key===key;});
  else {const row=exportState.rows.find(item=>item.key===key);if(row)row.selected=false;}
  renderTOptimalExport();
}
function openTOptimalProcessMenu(){document.getElementById('mTOptimalProcess')?.classList.remove('hidden');}
function closeTOptimalProcessMenu(){document.getElementById('mTOptimalProcess')?.classList.add('hidden');}
function beginTOptimalImport(){openTOptimalImportMode();}
function openTOptimalExport(){
  closeTOptimalProcessMenu();
  exportState={rows:monitoringRepository.getAll().map(record=>({key:`export:${record.id}`,record,selected:false}))};
  document.getElementById('mTOptimalExport')?.classList.remove('hidden');renderTOptimalExport();
}
function closeTOptimalExport(){document.getElementById('mTOptimalExport')?.classList.add('hidden');}
function exportTOptimalSelected(){
  const selected=exportState.rows.filter(row=>row.selected);
  if(selected.length !== 1){toast('Pilih tepat satu form monitoring untuk diekspor.','e');return;}
  const one=selected[0].record;
  const payload={format:'darma1-t-optimal-outbound-v1',source:'DARMA-1',target:'T-OPTIMAL',exportedAt:new Date().toISOString(),records:[outboundRecord(one)]};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`DARMA1_TOPTIMAL_${exportKind(one)}_${one.tgl||new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);toast('✅ 1 form disiapkan untuk Portal T-OPTIMAL.');
}
Object.assign(globalThis,{openTOptimalProcessMenu,closeTOptimalProcessMenu,beginTOptimalImport,openTOptimalExport,closeTOptimalExport,renderTOptimalExport,toggleTOptimalExportRow,exportTOptimalSelected});
