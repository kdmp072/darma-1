/* ============================================================
   EXPORT / IMPORT (Excel · PDF · JSON)
============================================================ */
/* ---------- helper teks PDF (tanpa emoji, font standar jsPDF) ---------- */
const STATUS_PLAIN={aktif:'Operasional',persiapan:'Tahap Persiapan',rencana:'Direncanakan',kendala:'Ada Kendala'};
const HASIL_PLAIN={baik:'BAIK',perbaikan:'PERLU PERBAIKAN',kritis:'KRITIS',belum:'BELUM DIMONITOR'};
const ASPEK_PLAIN={baik:'Baik',perlu:'Perlu',tidak:'Tidak'};
const SLHS_PLAIN={ya:'Sudah Terbit',proses:'Dalam Proses',belum:'Belum'};
function stripEmoji(s){return String(s==null?'':s).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}]/gu,'').trim();}
function getJsPDF(){
  if(!window.jspdf||!window.jspdf.jsPDF){toast('Library PDF belum termuat — butuh internet saat pertama membuka aplikasi.','e');return null;}
  return window.jspdf.jsPDF;
}
function pdfHead(doc,title,subtitle,theme=null){
  const w=doc.internal.pageSize.getWidth();
  const headerBackground=theme&&theme.headerBackground?theme.headerBackground:[29,78,216];
  const headerText=theme&&theme.headerText?theme.headerText:[255,255,255];
  doc.__darmaPdfTheme=theme;
  doc.setFillColor(...headerBackground);doc.rect(0,0,w,20,'F');
  doc.setTextColor(...headerText);
  doc.setFontSize(13);doc.setFont('helvetica','bold');
  doc.text('DARMA-1',12,8.5);
  doc.setFontSize(8.5);doc.setFont('helvetica','normal');
  doc.text('Dashboard Akurat Reporting Manajemen Aplikasi SPPG & KDMP Wilayah Pekalongan',12,14.5);
  doc.setFontSize(8);
  doc.text('Dicetak: '+new Date().toLocaleString('id-ID',{dateStyle:'full',timeStyle:'short'}),w-12,8.5,{align:'right'});
  doc.text('Wilayah: Pekalongan - Batang',w-12,14.5,{align:'right'});
  let y=28;
  doc.setTextColor(30,30,30);doc.setFontSize(12);doc.setFont('helvetica','bold');
  doc.text(title,12,y);y+=5.5;
  if(subtitle){doc.setFontSize(8.5);doc.setFont('helvetica','normal');doc.setTextColor(90,90,90);doc.text(subtitle,12,y,{maxWidth:w-24});y+=5;}
  doc.setTextColor(30,30,30);
  return y+1;
}
function pdfFoot(doc){
  const n=doc.internal.getNumberOfPages(),w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight();
  for(let i=1;i<=n;i++){
    doc.setPage(i);doc.setFontSize(7.5);doc.setFont('helvetica','normal');doc.setTextColor(140,140,140);
    doc.text('DARMA-1 - dokumen hasil monitoring',12,h-7);
    doc.text('Halaman '+i+' dari '+n,w-12,h-7,{align:'right'});
  }
}
const TBL_STYLE={fontSize:7,cellPadding:1.6,overflow:'linebreak'};
const TBL_HEAD={fillColor:[29,78,216],textColor:[255,255,255],fontSize:7.5,fontStyle:'bold'};
const TBL_ALT={alternateRowStyles:{fillColor:[239,246,255]}};
function exportPdfMonitoring(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const fu=getVal('fHUnit'),ft=getVal('fHTgl');
  let list=[...DB.monitoring].sort((a,b)=>a.tgl.localeCompare(b.tgl));
  if(fu)list=list.filter(m=>m.unitId===fu);
  if(ft)list=list.filter(m=>m.tgl===ft);
  if(!list.length){toast('Tidak ada data monitoring sesuai filter','e');return;}
  const doc=new jsPDF({orientation:'l',unit:'mm',format:'a4'});
  const filterDesc=['Filter: '+(fu?('Unit: '+(unitById(fu)||{}).nama):'Semua Unit'),
    ft?('Tanggal: '+fmtD(ft)):'Semua Tanggal'];
  let y=pdfHead(doc,'LAPORAN RIWAYAT MONITORING MBG',filterDesc.join('  |  ')+'\nTotal '+list.length+' catatan monitoring.');
  doc.autoTable({
    startY:y,
    head:[['No','Tanggal','Nama Unit','Jenis','Kecamatan','Kabupaten/Kota','Petugas','Kebersihan','Menu & Gizi','Distribusi','Dokumentasi','HASIL','Temuan Lapangan','Rekomendasi']],
    body:list.map((m,i)=>{const u=unitById(m.unitId)||{};
      const pTxt = [m.petugas, (m.form&&m.form.fields&&m.form.fields.sp109) ? 'Wawancara: '+m.form.fields.sp109 : ''].filter(Boolean).join('\n');
      return [i+1,fmtD(m.tgl),stripEmoji(u.nama),u.jenis||'',u.kec||'',u.kab||'',pTxt,ASPEK_PLAIN[m.kebersihan]||'',ASPEK_PLAIN[m.gizi]||'',ASPEK_PLAIN[m.distribusi]||'',ASPEK_PLAIN[m.dok]||'',HASIL_PLAIN[m.hasil]||m.hasil,stripEmoji(m.temuan||'-'),stripEmoji(m.rekom||'-')];}),
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,
    columnStyles:{0:{cellWidth:7},1:{cellWidth:17},2:{cellWidth:34},3:{cellWidth:13},4:{cellWidth:19},5:{cellWidth:22},6:{cellWidth:19},7:{cellWidth:14},8:{cellWidth:14},9:{cellWidth:14},10:{cellWidth:16},11:{cellWidth:22},12:{cellWidth:37},13:{cellWidth:31}},
    didParseCell:d=>{if(d.section==='head')return;
      if(d.column.index===11){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:[185,28,28];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}
    }
  });
  pdfFoot(doc);
  doc.save('DARMA-1_Monitoring_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 PDF riwayat monitoring terunduh');
}
function exportPdfUnits(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const list=[...filteredUnits()].sort((a,b)=>a.jenis===b.jenis?a.nama.localeCompare(b.nama):a.jenis==='SPPG'?-1:1);
  if(!list.length){toast('Tidak ada unit sesuai filter','e');return;}
  const doc=new jsPDF({orientation:'l',unit:'mm',format:'a4'});
  const fd=[];
  fd.push('Filter: '+(FS.jenis||'Semua Jenis'));
  fd.push(FS.kab||'Semua Kabupaten');
  fd.push(FS.hasil?('Hasil: '+HASIL_PLAIN[FS.hasil]):'Semua Status Hasil');
  if(FS.search)fd.push('Kata kunci: "'+FS.search+'"');
  const s=list.filter(u=>u.jenis==='SPPG').length,k=list.length-s;
  let y=pdfHead(doc,'LAPORAN MASTER UNIT SPPG & KDMP',fd.join('  |  ')+'\nTotal '+list.length+' unit (🍳 SPPG: '+s+' , 🏪 KDMP: '+k+').');
  doc.autoTable({
    startY:y,
    head:[['No','Jenis','Nama Unit','No. Registrasi','Kecamatan','Kabupaten/Kota','Alamat Lengkap','Penanggung Jawab / Kontak','Data Utama','Status Unit','Hasil Monitoring','Tgl Terakhir']],
    body:list.map((u,i)=>{
      const m=lastMon(u.id);
      const data=u.jenis==='SPPG'
        ?('Kapasitas '+fmtN(u.kapasitas)+' porsi/hr, '+fmtN(u.sekolah)+' sekolah. SLHS: '+SLHS_PLAIN[u.slhs||'belum']+'. '+(u.yayasan||''))
        :(fmtN(u.anggota)+' anggota. Peran: '+(u.peran||'-')+'. '+(u.usaha||''));
      return [i+1,u.jenis,stripEmoji(u.nama),u.ref||'-',u.kec,u.kab,stripEmoji(u.alamat)+', '+u.desa,stripEmoji(u.pic||'-')+(u.telp?(' / '+u.telp):''),stripEmoji(data),STATUS_PLAIN[u.status]||u.status,HASIL_PLAIN[unitHasil(u)],m?fmtD(m.tgl):'-'];
    }),
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,
    columnStyles:{0:{cellWidth:7},1:{cellWidth:14},2:{cellWidth:33},3:{cellWidth:24},4:{cellWidth:19},5:{cellWidth:22},6:{cellWidth:38},7:{cellWidth:30},8:{cellWidth:41},9:{cellWidth:17},10:{cellWidth:19},11:{cellWidth:16}},
    didParseCell:d=>{
      if(d.column.index===10&&d.section==='body'){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:v==='KRITIS'?[185,28,28]:[100,116,139];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}
    }
  });
  pdfFoot(doc);
  doc.save('DARMA-1_MasterUnit_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 PDF master unit terunduh');
}
function exportPdfUnitDetail(id){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const u=unitById(id);if(!u)return;
  const ms=monsOf(id),last=ms[0],has=u.jenis==='SPPG';
  const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
  let y=pdfHead(doc,'KARTU PROFIL '+(has?'SPPG (DAPUR MBG)':'KDMP (KOPERASI)'),'Data hasil monitoring dan referensi unit per '+new Date().toLocaleDateString('id-ID',{dateStyle:'long'})+'.');
  const pairs=[
    ['Nama Unit',stripEmoji(u.nama)],
    ['Jenis',has?'SPPG - Satuan Pelayanan Pemenuhan Gizi (Dapur MBG)':'Koperasi Desa Merah Putih (KDMP)'],
    ['No. Registrasi / Referensi',u.ref||'-'],
    ['Status Unit',STATUS_PLAIN[u.status]||u.status],
    ['Kabupaten/Kota',u.kab],['Kecamatan',u.kec],['Desa/Kelurahan',u.desa],
    ['Alamat Lengkap',stripEmoji(u.alamat)],
    ['Koordinat',u.lat+', '+u.lng],
    ['Penanggung Jawab',stripEmoji(u.pic||'-')],
    ['Kontak',u.telp||'-']
  ];
  if(has){pairs.push(['Yayasan Pengelola',stripEmoji(u.yayasan||'-')],['Kapasitas',fmtN(u.kapasitas)+' porsi/hari'],['Sekolah Sasaran',fmtN(u.sekolah)+' sekolah'],['SLHS',SLHS_PLAIN[u.slhs||'belum']],['Mulai Operasi',u.mulai?fmtD(u.mulai):'-']);}
  else{pairs.push(['Jumlah Anggota',fmtN(u.anggota)+' orang'],['Peran dalam MBG',u.peran||'-'],['Unit Usaha',stripEmoji(u.usaha||'-')]);}
  pairs.push(['Hasil Monitoring Terakhir',last?(HASIL_PLAIN[last.hasil]+' ( '+fmtD(last.tgl)+' oleh '+stripEmoji(last.petugas)+' )'):'BELUM DIMONITOR']);
  if(u.note)pairs.push(['Catatan',stripEmoji(u.note)]);
  doc.autoTable({startY:y,body:pairs.map(p=>[{content:p[0],styles:{fontStyle:'bold',fillColor:[248,250,252],cellWidth:52}},{content:p[1]}]),theme:'grid',styles:{fontSize:8,cellPadding:2}});
  y=doc.lastAutoTable.finalY+6;
  doc.setFontSize(10);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('RIWAYAT MONITORING ('+ms.length+' kunjungan)',12,y);y+=2;
  if(ms.length){
    doc.autoTable({
      startY:y,
      head:[['Tanggal','Petugas','Kebersihan','Menu & Gizi','Distribusi','Dokumen','HASIL','Temuan Lapangan','Rekomendasi']],
      body:ms.map(m=>[fmtD(m.tgl),[m.petugas, (m.form&&m.form.fields&&m.form.fields.sp109) ? 'Wawancara: '+m.form.fields.sp109 : ''].filter(Boolean).join('\n'),ASPEK_PLAIN[m.kebersihan],ASPEK_PLAIN[m.gizi],ASPEK_PLAIN[m.distribusi],ASPEK_PLAIN[m.dok],HASIL_PLAIN[m.hasil],stripEmoji(m.temuan||'-'),stripEmoji(m.rekom||'-')]),
      styles:{fontSize:6.8,cellPadding:1.5,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:16},1:{cellWidth:19},2:{cellWidth:14},3:{cellWidth:14},4:{cellWidth:14},5:{cellWidth:14},6:{cellWidth:21},7:{cellWidth:38},8:{cellWidth:33}},
      didParseCell:d=>{if(d.column.index===6&&d.section==='body'){const v=d.cell.raw;const c=v==='BAIK'?[22,163,74]:v==='PERLU PERBAIKAN'?[180,83,9]:[185,28,28];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}}
    });
  }else{doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(120,120,120);doc.text('Belum ada kunjungan monitoring untuk unit ini.',12,y+4);}
  pdfFoot(doc);
  doc.save('DARMA-1_Profil_'+u.nama.replace(/[^\w\s]/g,'').replace(/\s+/g,'_').slice(0,30)+'.pdf');
  toast('📄 PDF profil unit terunduh');
}
function exportPdfDash(){
  const jsPDF=getJsPDF();if(!jsPDF)return;
  const doc=new jsPDF({orientation:'p',unit:'mm',format:'a4'});
  const s=DB.units.filter(u=>u.jenis==='SPPG').length,k=DB.units.length-s,oper=DB.units.filter(u=>u.status==='aktif').length;
  let y=pdfHead(doc,'LAPORAN RINGKASAN MONITORING',DB.units.length+' unit terdaftar (SPPG: '+s+', KDMP: '+k+'), '+oper+' unit berstatus operasional, '+DB.monitoring.length+' catatan monitoring.');
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('A. Status Hasil Monitoring Terakhir Semua Unit',12,y);y+=2;
  const cnt={baik:0,perbaikan:0,kritis:0,belum:0};DB.units.forEach(u=>cnt[unitHasil(u)]++);
  doc.autoTable({startY:y,head:[['Status Hasil','Jumlah Unit','Persentase']],body:Object.keys(HASIL_PLAIN).map(h=>[HASIL_PLAIN[h],cnt[h],DB.units.length?Math.round(cnt[h]/DB.units.length*100)+'%':'0%']),styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT,columnStyles:{0:{cellWidth:70},1:{cellWidth:45},2:{cellWidth:45}}});
  y=doc.lastAutoTable.finalY+6;
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('B. Unit per Kabupaten/Kota',12,y);y+=2;
  doc.autoTable({startY:y,head:[['Kabupaten/Kota','SPPG','KDMP','Total Unit','Total Monitoring']],
    body:Object.keys(KABUPATEN).map(kab=>{const us=DB.units.filter(u=>u.kab===kab);const ms=DB.monitoring.filter(m=>us.some(u=>u.id===m.unitId)).length;
      return [kab,us.filter(u=>u.jenis==='SPPG').length,us.filter(u=>u.jenis==='KDMP').length,us.length,ms];}),
    styles:TBL_STYLE,headStyles:TBL_HEAD,...TBL_ALT});
  y=doc.lastAutoTable.finalY+6;
  doc.setFontSize(9.5);doc.setFont('helvetica','bold');doc.setTextColor(29,78,216);
  doc.text('C. Unit Perlu Perhatian (hasil kritis / perlu perbaikan / belum dimonitor)',12,y);y+=2;
  const rank={kritis:0,perbaikan:1,belum:2};
  const attn=DB.units.filter(u=>unitHasil(u)!=='baik').sort((a,b)=>rank[unitHasil(a)]-rank[unitHasil(b)]);
  if(attn.length){
    doc.autoTable({startY:y,
      head:[['No','Jenis','Nama Unit','Kecamatan / Kabupaten','Status Hasil','Rekomendasi Terakhir']],
      body:attn.map((u,i)=>{const m=lastMon(u.id);return [i+1,u.jenis,stripEmoji(u.nama),u.kec+' / '+u.kab,HASIL_PLAIN[unitHasil(u)],m?stripEmoji(m.rekom||'-'):'Segera jadwalkan kunjungan monitoring.'];}),
      styles:{fontSize:6.8,cellPadding:1.6,overflow:'linebreak'},headStyles:TBL_HEAD,...TBL_ALT,
      columnStyles:{0:{cellWidth:7},1:{cellWidth:13},2:{cellWidth:38},3:{cellWidth:42},4:{cellWidth:26},5:{cellWidth:57}},
      didParseCell:d=>{if(d.column.index===4&&d.section==='body'){const v=d.cell.raw;const c=v==='KRITIS'?[185,28,28]:v==='PERLU PERBAIKAN'?[180,83,9]:[100,116,139];d.cell.styles.textColor=c;d.cell.styles.fontStyle='bold';}}
    });
  }else{doc.setFontSize(8);doc.setFont('helvetica','italic');doc.setTextColor(120);doc.text('Seluruh unit berstatus BAIK pada monitoring terakhir.',12,y+4);}
  pdfFoot(doc);
  doc.save('DARMA-1_LaporanRingkasan_'+new Date().toISOString().slice(0,10)+'.pdf');
  toast('📄 Laporan ringkasan terunduh');
}
function exportXlsxUnit(id){
  const u=unitById(id);if(!u)return;
  const has=u.jenis==='SPPG',ms=monsOf(id);
  const info=[['Nama Unit',u.nama],['Jenis',has?'SPPG (Dapur MBG)':'KDMP (Koperasi Desa Merah Putih)'],['No. Registrasi',u.ref||''],['Status',statusUnitLabel(u.status)],['Kabupaten/Kota',u.kab],['Kecamatan',u.kec],['Desa',u.desa],['Alamat',u.alamat],['Latitude',u.lat],['Longitude',u.lng],['Penanggung Jawab',u.pic||''],['Kontak',u.telp||'']];
  if(has)info.push(['Yayasan',u.yayasan||''],['Kapasitas Porsi/Hari',u.kapasitas||0],['Sekolah Sasaran',u.sekolah||0],['SLHS',slhsLabel(u.slhs||'belum')],['Mulai Operasi',u.mulai||'']);
  else info.push(['Jumlah Anggota',u.anggota||0],['Peran MBG',u.peran||''],['Unit Usaha',u.usaha||'']);
  info.push(['Catatan',u.note||'']);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(info),'Profil Unit');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(ms.map(m=>({'Tanggal':m.tgl,'Petugas Tim':m.petugas,'Pewawancara (SPPG)':(m.form&&m.form.fields&&m.form.fields.sp109)||'','Link Lampiran Berkas':(m.form&&m.form.fields&&m.form.fields.sp_link_lampiran)||'','Kebersihan':ASPEK_META[m.kebersihan],'Menu & Gizi':ASPEK_META[m.gizi],'Distribusi':ASPEK_META[m.distribusi],'Dokumentasi':ASPEK_META[m.dok],'Hasil':HASIL_META[m.hasil].label,'Temuan':m.temuan||'','Rekomendasi':m.rekom||''}))),'Riwayat Monitoring');
  XLSX.writeFile(wb,'DARMA-1_'+u.nama.replace(/[^\w\s]/g,'').replace(/\s+/g,'_').slice(0,30)+'.xlsx');
  toast('📥 Excel unit terunduh');
}
function exportXlsx(mode,useFilters){
  const wb=XLSX.utils.book_new();
  if(mode!=='monitoring'){
    const rows=DB.units.map(u=>({'Jenis':u.jenis==='SPPG'?'SPPG (Dapur MBG)':'KDMP (Koperasi)','Nama Unit':u.nama,'No Registrasi/Referensi':u.ref||'','Status':statusUnitLabel(u.status),'Kabupaten/Kota':u.kab,'Kecamatan':u.kec,'Desa/Kelurahan':u.desa,'Alamat Lengkap':u.alamat,'Latitude':u.lat,'Longitude':u.lng,'Penanggung Jawab':u.pic||'','Kontak':u.telp||'',
      ...(u.jenis==='SPPG'?{'Yayasan':u.yayasan||'','Kapasitas Porsi/Hari':u.kapasitas||0,'Sekolah Sasaran':u.sekolah||0,'SLHS':slhsLabel(u.slhs||'belum'),'Anggota':'','Peran MBG':'','Unit Usaha':''}:{'Yayasan':'','Kapasitas Porsi/Hari':'','Sekolah Sasaran':'','SLHS':'','Anggota':u.anggota||0,'Peran MBG':u.peran||'','Unit Usaha':u.usaha||''}),
      'Hasil Monitoring Terakhir':HASIL_META[unitHasil(u)].label,'Tgl Monitoring Terakhir':(lastMon(u.id)||{}).tgl||'','Catatan':u.note||''}));
    XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rows),'Master Unit');
  }
  let mons=DB.monitoring;
  if(useFilters){
    const fu=getVal('fHUnit'),ft=getVal('fHTgl');
    if(fu)mons=mons.filter(m=>m.unitId===fu);
    if(ft)mons=mons.filter(m=>m.tgl===ft);
    if(!mons.length){toast('Tidak ada data monitoring sesuai filter untuk diekspor','e');return;}
  }
  const mrows=[...mons].sort((a,b)=>a.tgl.localeCompare(b.tgl)).map(m=>{
    const u=unitById(m.unitId)||{};
    const isKdmp=m.form&&m.jenis==='KDMP', isSppg=m.form&&m.jenis==='SPPG';
    let survey='';
    if(isSppg){survey=Object.entries(m.form.fields||{}).filter(([,v])=>v&&v!=='').map(([k,v])=>(SPPG_FIELD_LABEL[k]||k)+': '+v).join('  |  ');}
    const comp=m.form&&m.form.compliance?m.form.compliance:[];
    return {'Tanggal':m.tgl,'Jenis':u.jenis||'','Nama Unit':u.nama||'','Kecamatan':u.kec||'','Kabupaten/Kota':u.kab||'','Petugas Tim':m.petugas,'Pewawancara':(m.form&&m.form.fields&&m.form.fields.sp109)||'','Link Lampiran':(m.form&&m.form.fields&&m.form.fields.sp_link_lampiran)||'',
      'Kebersihan & Sanitasi':ASPEK_META[m.kebersihan]||m.kebersihan||'','Kualitas Menu & Gizi':ASPEK_META[m.gizi]||m.gizi||'','Distribusi':ASPEK_META[m.distribusi]||m.distribusi||'','Dokumentasi':ASPEK_META[m.dok]||m.dok||'',
      'Skor Rata-rata (KDMP)':isKdmp?(m.form.avg!=null?m.form.avg:''):'',
      'Kategori (KDMP)':isKdmp?(m.form.kategori||''):'',
      'Kepatuhan Ya/Total (KDMP)':isKdmp?(comp.filter(x=>x==='ya').length+'/'+comp.length):'',
      'Ringkasan Survei (SPPG)':survey,
      'HASIL':HASIL_META[m.hasil]?HASIL_META[m.hasil].label:m.hasil,'Temuan Lapangan':m.temuan||'','Rekomendasi':m.rekom||''};
  });
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(mrows),'Hasil Monitoring');
  XLSX.writeFile(wb,`DARMA-1_${mode==='monitoring'?'monitoring':'lengkap'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('📥 File Excel terunduh');
}
function exportJSON(){
  const blob=new Blob([JSON.stringify(DB,null,2)],{type:'application/json'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);
  a.download=`DARMA-1_backup_${new Date().toISOString().slice(0,10)}.json`;a.click();
  toast('📥 Backup JSON terunduh');
}
function importJSON(ev){
  const f=ev.target.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const d=JSON.parse(r.result);
    if(!d.units||!d.monitoring)throw 0;
    DB=d;persistReplace();renderAll();toast('✅ Data backup dipulihkan');
  }catch(e){toast('File backup tidak valid','e');}};
  r.readAsText(f);ev.target.value='';
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { STATUS_PLAIN, HASIL_PLAIN, ASPEK_PLAIN, SLHS_PLAIN, TBL_STYLE, TBL_HEAD, TBL_ALT });
Object.assign(globalThis, { stripEmoji, getJsPDF, pdfHead, pdfFoot, exportPdfMonitoring, exportPdfUnits, exportPdfUnitDetail, exportPdfDash, exportXlsxUnit, exportXlsx, exportJSON, importJSON });
