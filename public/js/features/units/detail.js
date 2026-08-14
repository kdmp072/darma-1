/* ============================================================
   DETAIL UNIT
============================================================ */
function openDetail(id){
  const u=unitById(id);if(!u)return;
  dtCurrent=id;
  const ms=monsOf(id);const last=ms[0];
  const has=u.jenis==='SPPG';
  const heroBadges=[
    has?'🍳 SPPG — DAPUR MBG':'🏪 KDMP — KOPERASI',
    statusUnitLabel(u.status),
    HASIL_META[unitHasil(u)].icon+' '+HASIL_META[unitHasil(u)].label
  ].map(t=>`<span class="dt-badge">${t}</span>`).join('');
  const kvs = has ? [
    ['Kapasitas',fmtN(u.kapasitas)+' porsi/hari'],['Sekolah Sasaran',fmtN(u.sekolah)+' sekolah'],
    ['SLHS',slhsLabel(u.slhs)],['Mulai Operasi',u.mulai?fmtD(u.mulai):'—'],
    ['Yayasan',esc(u.yayasan||'—')],['No. Registrasi',esc(u.ref||'—')]
  ] : [
    ['Jumlah Anggota',fmtN(u.anggota)+' orang'],['Peran MBG',esc(u.peran||'—')],
    ['Unit Usaha',esc(u.usaha||'—')],['No. Badan Hukum / NIK',esc(u.ref||'—')],
    ['Koordinat',u.lat+', '+u.lng],['']
  ];
  const kvHtml=kvs.filter(x=>x[0]).map(x=>`<div class="dt-kv"><span>${x[0]}</span><b>${x[1]}</b></div>`).join('');
  const monHtml=ms.length?ms.slice(0,5).map(m=>{
    const asp=monDetailAspects(m);
    const scoreTag=(m.form&&m.jenis==='KDMP'&&m.form.avg!=null)?`<span class="kchip" style="background:#1E3A8A;color:#fff">⭐ ${m.form.avg} · ${esc(m.form.kategori||'')}</span>`:'';
    const linkVal = (m.form && m.form.fields && m.form.fields.sp_link_lampiran);
    const linkHtml = linkVal
      ? `<div style="margin-top:6px;font-size:11px"><a href="${esc(linkVal)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand);font-weight:700;display:inline-flex;align-items:center;gap:5px"><i class="fas fa-external-link-alt"></i> <b>Link Lampiran Berkas</b></a></div>`
      : '';
    const fotoVal = (m.form && m.form.fields && (m.form.fields.sp_foto_kegiatan || m.form.fields.sp205_foto));
    const fotoHtml = fotoVal
      ? `<div style="margin-top:8px"><img src="${fotoVal}" style="max-height:160px;max-width:100%;border-radius:8px;border:1px solid var(--border)"/></div>`
      : '';
    return `<div class="mon-item">
      <div class="mon-top"><span class="mon-date">📅 ${fmtD(m.tgl)} · Tim: ${esc(m.petugas)}</span>${scoreTag}<span class="kchip baik">🟢 Sudah Dimonitor</span></div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">${asp}</div>
      <div class="mon-t"><b>Temuan:</b> ${esc(m.temuan||'-')}</div>
      <div class="mon-t"><b>Rekomendasi:</b> ${esc(m.rekom||'-')}</div>
      ${linkHtml}
      ${fotoHtml}
      <div class="hc-actions" style="margin-top:7px">
        <button class="btn bd bsm" onclick="cetakMon('${m.id}')"><i class="fas fa-file-pdf"></i> PDF</button>
        <button class="btn bs bsm" onclick="cetakMonDocx('${m.id}')"><i class="fas fa-file-word"></i> DOCX</button>
        <button class="btn bg bsm" onclick="cetakMonExcel('${m.id}')"><i class="fas fa-file-excel"></i> Excel</button>
      </div>
    </div>`;
  }).join(''):'<div class="empty"><i class="fas fa-inbox"></i><p>Belum ada riwayat monitoring.<br>Klik tombol <b>Monitoring</b> di bawah.</p></div>';
  document.getElementById('dtBody').innerHTML=`
    <div class="dt-hero ${u.jenis.toLowerCase()}">
      <div class="dt-name">${esc(u.nama)}</div>
      <div class="dt-addr"><i class="fas fa-map-marker-alt"></i> ${esc(u.alamat)}, Desa ${esc(u.desa)},<br>Kec. ${esc(u.kec)}, ${esc(u.kab)}</div>
      <div class="dt-badges">${heroBadges}</div>
    </div>
    <div style="padding:13px 15px">
      <div class="dt-grid">${kvHtml}</div>
      ${u.pic?`<div class="pop-row" style="color:var(--text2)"><i class="fas fa-user-tie"></i><span>Penanggung jawab: <b>${esc(u.pic)}</b>${u.telp?` · 📞 <a href="tel:${esc(u.telp)}" style="color:var(--brand)">${esc(u.telp)}</a>`:''}</span></div>`:''}
      ${u.note?`<div class="hc-temuan">📝 ${esc(u.note)}</div>`:''}
      <div class="dt-sec"><i class="fas fa-clipboard-check"></i> Riwayat Monitoring (${ms.length})</div>
      ${monHtml}
      ${ms.length>5?`<div class="fhint" style="text-align:center">… dan ${ms.length-5} kunjungan lainnya — lihat tab Histori.</div>`:''}
    </div>`;
  document.getElementById('mDetail').classList.remove('hidden');
  selectUnit(id);
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { openDetail });
