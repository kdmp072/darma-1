import { calculateSppg411Totals, shouldShowConditionalField, SPPG_411_ROWS } from '../../domain/forms/sppg-calculations.js';
import { currencyScaleForField, displayUnitForField, formatRupiahAmount, formatStoredCurrency, parseCurrencyToStored, parseRupiahAmount } from '../../domain/forms/currency.js';

function showPreview(html,color,hasil){const el=document.getElementById('hasilPreview');el.innerHTML=html;el.style.color='#fff';el.style.background=color;el.style.borderColor=color;document.getElementById('hasilPreviewWrap').style.display='block';currentPreviewHasil=hasil;}
function hidePreview(){document.getElementById('hasilPreviewWrap').style.display='none';currentPreviewHasil=null;}
function focusCurrencyInput(input){const amount=parseRupiahAmount(input.value);input.value=amount==null?'':String(amount);input.select();}
function blurCurrencyInput(input){const amount=parseRupiahAmount(input.value);input.value=amount==null?'':formatRupiahAmount(amount);}
function currencyInputHtml({id,className,storedValue,scale,readOnly=false,onInput='onFormInput()'}){
  const ro=readOnly?' readonly tabindex="-1"':'';
  const editEvents=readOnly?'':` onfocus="focusCurrencyInput(this)" onblur="blurCurrencyInput(this)" oninput="${onInput}"`;
  return `<input class="${className}" type="text" inputmode="numeric" autocomplete="off" data-currency-scale="${scale}" id="${id}" value="${esc(formatStoredCurrency(storedValue,scale))}"${ro}${editEvents}/>`;
}
function currencyHint(field,parentField=null){const unit=displayUnitForField(field,parentField);return unit?`<div class="qunit-hint">Satuan tampilan: ${esc(unit)}</div>`:'';}

function formFieldHtml(f,data){
  const v=data?data[f.id]:undefined;
  if(f.type==='petugas_ms'){
    const val=v||'';
    const id='ff_'+f.id;
    return `<div class="ms-wrap" id="wrap_${id}">
      <div class="ms-trigger fc" onclick="toggleMS('${id}', event)">
        <div class="ms-labels" id="lbl_${id}"><span class="ms-placeholder">Pilih petugas / input baru...</span></div>
        <i class="fas fa-chevron-down ms-arrow"></i>
      </div>
      <input type="hidden" id="${id}" value="${esc(val)}" />
      <div class="ms-dropdown" id="drop_${id}" onclick="event.stopPropagation()">
        <div class="ms-head">
          <div class="ms-search-wrap">
            <i class="fas fa-search"></i>
            <input type="text" class="ms-search" placeholder="Cari nama..." oninput="filterMS('${id}', this.value)"/>
          </div>
          <div class="ms-actions">
            <button type="button" class="ms-btn-act" onclick="selectAllMS('${id}', true)">✓ Semua</button>
            <button type="button" class="ms-btn-act" onclick="selectAllMS('${id}', false)">✕ Reset</button>
          </div>
        </div>
        <div class="ms-list" id="list_${id}"></div>
        <div class="ms-foot">
          <div class="ms-custom-wrap">
            <input type="text" id="cust_${id}" placeholder="+ Input nama langsung..." class="ms-custom-inp" onkeydown="if(event.key==='Enter'){addCustomMS('${id}');event.preventDefault();}"/>
            <button type="button" class="ms-custom-btn" onclick="addCustomMS('${id}')">Tambah</button>
          </div>
        </div>
      </div>
    </div>`;
  }
  if(f.type==='url'||f.type==='link'){
    const val=v||'';
    const id='ff_'+f.id;
    return `<div class="link-wrap" style="position:relative">
      <i class="fas fa-link" style="position:absolute;left:11px;top:12px;color:var(--text3);font-size:11px"></i>
      <input type="url" id="${id}" class="fc" value="${esc(val)}" placeholder="Contoh: https://drive.google.com/file/d/..." style="padding-left:30px" oninput="onFormInput()"/>
      ${val ? `<div style="margin-top:5px;font-size:10.5px"><a href="${esc(val)}" target="_blank" rel="noopener noreferrer" style="color:var(--brand);font-weight:700"><i class="fas fa-external-link-alt"></i> Buka Link Lampiran</a></div>` : ''}
    </div>`;
  }
  if(f.type==='photo'){
    const val=v||'';
    const id='ff_'+f.id;
    return `<div class="photo-wrap" id="pwrap_${id}">
      <input type="hidden" id="${id}" value="${esc(val)}" />
      <div class="photo-controls" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <label class="btn bp bsm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
          <i class="fas fa-camera"></i> Ambil Foto
          <input type="file" accept="image/*" capture="environment" style="display:none" onchange="capturePhotoMS('${id}', event, 'camera')" />
        </label>
        <label class="btn bs bsm" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px" title="Pilih gambar melalui aplikasi File/Dokumen tanpa meminta izin kamera">
          <i class="fas fa-file-image"></i> Upload Gambar
          <input type="file" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" onchange="capturePhotoMS('${id}', event, 'upload')" />
        </label>
        <button type="button" class="btn bx bsm" id="pdel_${id}" onclick="deletePhotoMS('${id}')" style="display:${val?'inline-flex':'none'}">
          <i class="fas fa-trash"></i> Hapus Gambar
        </button>
      </div>
      <div class="fhint" style="margin-top:6px">JPG, PNG, atau WebP · maksimal 10 MB · otomatis dikompresi. <b>Upload Gambar</b> memakai pemilih File/Dokumen agar tidak memerlukan izin kamera/media. Jika kamera ditolak, izinkan Kamera pada pengaturan browser.</div>
      <div class="photo-preview" id="prev_${id}" style="margin-top:8px;display:${val?'block':'none'}">
        ${val ? `<img src="${val}" alt="Dokumentasi kegiatan" style="max-height:220px;max-width:100%;border-radius:10px;border:2px solid var(--border);box-shadow:var(--sh);object-fit:contain"/>` : ''}
      </div>
    </div>`;
  }
  if(f.type==='g')return gridFieldHtml(f,data);
  if(f.type==='ta')return `<textarea id="ff_${f.id}" class="fc" placeholder="${esc(f.label)}" oninput="onFormInput()">${esc(v||'')}</textarea>`;
  if(f.type==='s')return `<select id="ff_${f.id}" class="fc" onchange="onFormInput()"><option value="">— Pilih —</option>${f.opts.map(o=>`<option ${String(o)===String(v)?'selected':''}>${esc(o)}</option>`).join('')}</select>`;
  if(f.type==='c'||f.type==='yn'){
    const opts=f.type==='yn'?['Ya','Tidak']:f.opts;
    return `<div class="qchips" data-fid="${f.id}" data-multi="0">${opts.map(o=>`<button type="button" class="qchip ${String(o)===String(v)?'on':''}" data-opt="${esc(o)}" onclick="pickChip(this,false)">${esc(o)}</button>`).join('')}</div>`;
  }
  if(f.type==='m'){
    const sel=Array.isArray(v)?v:[];
    return `<div class="qchips" data-fid="${f.id}" data-multi="1">${f.opts.map(o=>`<button type="button" class="qchip ${sel.indexOf(o)>=0?'on':''}" data-opt="${esc(o)}" onclick="pickChip(this,true)">${esc(o)}</button>`).join('')}</div>`;
  }
  const currencyScale=currencyScaleForField(f);
  if(currencyScale)return currencyInputHtml({id:'ff_'+f.id,className:'fc',storedValue:v,scale:currencyScale})+currencyHint(f);
  const tp=f.type==='n'?'number':(f.type==='d'?'date':(f.type==='tm'?'time':'text'));
  return `<input type="${tp}" id="ff_${f.id}" class="fc" value="${esc(v||'')}" placeholder="${esc(f.label)}" ${f.type==='n'?'step="any"':''} oninput="onFormInput()"/>${f.unit?`<div class="qunit-hint">Satuan: ${esc(f.unit)}</div>`:''}`;
}
function gridFieldHtml(f,data){
  const d=(data&&data[f.id])||{};
  if(f.fields&&f.fields.length){
    let h='<table class="qgrid"><thead><tr><th>Item</th>'+f.fields.map(column=>{
      const scale=currencyScaleForField(column,f),unit=scale?displayUnitForField(column,f):column.unit;
      return `<th>${esc(column.label)}${unit?`<br><span style="font-weight:400;text-transform:none">(${esc(unit)})</span>`:''}</th>`;
    }).join('')+'</tr></thead><tbody>';
    f.rows.forEach(row=>{
      h+='<tr><td class="glab">'+esc(row.label)+'</td>'+f.fields.map(column=>{
        const rawValue=d[row.id]&&d[row.id][column.id],value=rawValue==null?'':rawValue,scale=currencyScaleForField(column,f),readOnly=!!row.computed;
        const onInput='onFormInput();'+(f.id==='sp411'?'updateSppgComputedTotals()':'');
        if(scale)return '<td>'+currencyInputHtml({id:'ff_'+f.id+'__'+row.id+'__'+column.id,className:'ginp',storedValue:value,scale,readOnly,onInput})+'</td>';
        const type=column.type==='time'?'time':'number',ro=readOnly?' readonly tabindex="-1"':'',eventAttr=readOnly?'':` oninput="${onInput}"`;
        return `<td><input class="ginp" type="${type}" ${type==='number'?'step="any" ':''}id="ff_${f.id}__${row.id}__${column.id}" value="${esc(value)}"${ro}${eventAttr}/></td>`;
      }).join('')+'</tr>';
    });
    return '<div class="qgrid-wrap">'+h+'</tbody></table></div>';
  }
  const yn=f.rows.some(row=>row.type==='yn'),scale=currencyScaleForField(f),unit=scale?displayUnitForField(f):(f.unit||'Nilai');
  let h='<table class="qgrid"><thead><tr><th>Item</th>'+(yn?'<th>Jawaban</th>':'<th>'+esc(unit)+'</th>')+'</tr></thead><tbody>';
  f.rows.forEach(row=>{
    const value=d[row.id];
    if(row.type==='yn'){
      h+='<tr><td class="glab">'+esc(row.label)+'</td><td><div class="qchips" data-fid="'+f.id+'__'+row.id+'" data-multi="0"><button type="button" class="qchip '+(value==='Ya'?'on':'')+'" data-opt="Ya" onclick="pickChip(this,false)">Ya</button><button type="button" class="qchip '+(value==='Tidak'?'on':'')+'" data-opt="Tidak" onclick="pickChip(this,false)">Tidak</button></div></td></tr>';
    }else if(scale){
      h+='<tr><td class="glab">'+esc(row.label)+'</td><td>'+currencyInputHtml({id:'ff_'+f.id+'__'+row.id,className:'ginp',storedValue:value,scale})+'</td></tr>';
    }else{
      h+='<tr><td class="glab">'+esc(row.label)+'</td><td><input class="ginp" type="number" step="any" id="ff_'+f.id+'__'+row.id+'" value="'+esc(value||'')+'" oninput="onFormInput()"/></td></tr>';
    }
  });
  return '<div class="qgrid-wrap">'+h+'</tbody></table></div>';
}
function renderGenericForm(formDef,data){
  let h=`<div class="qmeta"><b>${esc(formDef.title)}</b><br>Tujuan: ${esc(formDef.purpose)}. Estimasi ${esc(formDef.dur||'')}. Pilih/centang opsi, isi isian, atau pilih dropdown sesuai jawaban responden.</div>`;
  formDef.sections.forEach(sec=>{
    h+=`<div class="qbagian">${esc(sec.title)}</div>`;
    sec.fields.forEach((f,fi)=>{const m=f.id&&f.id.match(/^(?:sp|nk)(\d+)/),no=f.code||(m?m[1]:String(fi+1)),dep=f.showIf&&data?data[f.showIf.field]:'',visible=!f.showIf||String(dep||'').includes(f.showIf.contains);h+=`<div class="qfield" data-field-id="${esc(f.id)}"${f.showIf?` data-show-field="${esc(f.showIf.field)}" data-show-contains="${esc(f.showIf.contains)}"`:''} style="${visible?'':'display:none'}"><div class="qfn"><span class="qn">${esc(no)}</span>${esc(f.label)}</div>${formFieldHtml(f,data)}</div>`;});
  });
  return h;
}
function pickChip(btn,multi){if(!multi){btn.parentNode.querySelectorAll('.qchip').forEach(b=>b.classList.remove('on'));}btn.classList.toggle('on');onFormInput();updateSppgConditionalFields();}
function updateSppgConditionalFields(){
  document.querySelectorAll('#rekamForm .qfield[data-show-field]').forEach(row=>{const fid=row.dataset.showField,need=row.dataset.showContains||'',on=document.querySelector(`#rekamForm .qchips[data-fid="${fid}"] .qchip.on`),val=on?on.dataset.opt:'',show=shouldShowConditionalField(val,need);row.style.display=show?'':'none';if(!show){const inp=row.querySelector('input,textarea,select');if(inp)inp.value='';}});
}
function updateSppgComputedTotals(){
  const scale=1000000,table={};
  SPPG_411_ROWS.forEach(row=>{table[row]={dalam:parseCurrencyToStored(getVal('ff_sp411__'+row+'__dalam'),scale),luar:parseCurrencyToStored(getVal('ff_sp411__'+row+'__luar'),scale)};});
  const totals=calculateSppg411Totals(table);
  ['dalam','luar'].forEach(col=>{const el=document.getElementById('ff_sp411__total__'+col);if(el)el.value=formatStoredCurrency(totals[col],scale);});
}
function onFormInput(){if(currentRekamJenis!=='KDMP')previewHasilManual();}
function renderRekamForm(jenis,rec){
  currentRekamJenis=jenis;
  const root=document.getElementById('rekamForm');
  const tag=document.getElementById('rekamJenisTag');
  const rekamTab=document.getElementById('tab-rekam');if(rekamTab)rekamTab.classList.remove('sppg-v2-active');
  if(!jenis){root.innerHTML='<div class="empty"><i class="fas fa-clipboard-list"></i><p>Pilih unit terlebih dahulu untuk memunculkan kuesioner sesuai jenis unit (SPPG / KDMP).</p></div>';if(tag)tag.textContent='';hidePreview();return;}
  const f=(rec&&rec.form)||{};
  if(jenis==='KDMP'){
    if(tag)tag.textContent=' · KDMP (Kuesioner Juknis)';
    const secs=f.sections||[], comp=f.compliance||[];
    let h=`<div class="qmeta"><b>Kuesioner Monev KDMP/KKMP "Bangunan Permanen".</b><br>${SKALA_KDMP}</div>`;
    
    // --- Bagian A & B: Identitas Tambahan ---
    h+=`<div class="qbagian kdmp">A. Identitas Koperasi</div>`;
    h+=`<div class="frow">
          <div class="fg"><label class="fl">NIB Koperasi</label><input type="text" id="ff_nib" class="fc" value="${esc(f.nib||'')}" placeholder="Nomor Induk Berusaha"/></div>
          <div class="fg"><label class="fl">NPWP Koperasi</label>
            <div class="qchips" data-fid="npwp" data-multi="0">
              <button type="button" class="qchip ${f.npwp==='Ya'?'on':''}" data-opt="Ya" onclick="pickChip(this,false)">Ya</button>
              <button type="button" class="qchip ${f.npwp==='Tidak'?'on':''}" data-opt="Tidak" onclick="pickChip(this,false)">Tidak</button>
            </div>
          </div>
        </div>`;
    h+=`<div class="frow">
          <div class="fg"><label class="fl">Bidang Usaha</label>
            <select id="ff_bidang_usaha" class="fc">
              <option value="">— Pilih —</option>
              <option ${f.bidang_usaha==='Pengadaan Sembako'?'selected':''}>Pengadaan Sembako</option>
              <option ${f.bidang_usaha==='Lainnya'?'selected':''}>Lainnya</option>
            </select>
          </div>
          <div class="fg"><label class="fl">Status Pembangunan</label>
            <select id="ff_status_bangun" class="fc">
              <option value="">— Pilih —</option>
              <option ${f.status_bangun==='Belum Dibangun'?'selected':''}>Belum Dibangun</option>
              <option ${f.status_bangun==='Sedang Dibangun'?'selected':''}>Sedang Dibangun</option>
              <option ${f.status_bangun==='Bangunan Permanen'?'selected':''}>Bangunan Permanen</option>
            </select>
          </div>
        </div>`;
    h+=`<div class="frow">
          <div class="fg"><label class="fl">Provinsi</label><input type="text" id="ff_prov" class="fc" value="${esc(f.prov||'Jawa Tengah')}"/></div>
          <div class="fg"><label class="fl">Desa/Kelurahan</label><input type="text" id="ff_desa" class="fc" value="${esc(f.desa||(rec&&rec.unitId?unitById(rec.unitId).desa:''))}"/></div>
        </div>`;

    h+=`<div class="qbagian kdmp">B. Identitas Responden</div>`;
    h+=`<div class="fg"><label class="fl">Nama Responden</label><input type="text" id="ff_resp_nama" class="fc" value="${esc(f.resp_nama||'')}" placeholder="Nama narasumber"/></div>`;
    h+=`<div class="frow">
          <div class="fg"><label class="fl">No. HP Responden</label><input type="text" id="ff_resp_hp" class="fc" value="${esc(f.resp_hp||'')}" placeholder="08..."/></div>
          <div class="fg"><label class="fl">Jenis Responden</label>
            <select id="ff_resp_jenis" class="fc">
              <option value="">— Pilih —</option>
              <option ${f.resp_jenis==='Manajer/Pengurus Koperasi'?'selected':''}>Manajer/Pengurus Koperasi</option>
              <option ${f.resp_jenis==='Dinas Koperasi'?'selected':''}>Dinas Koperasi</option>
            </select>
          </div>
        </div>`;

    FORM_KDMP.forEach((sec,si)=>{
      h+=`<div class="qbagian kdmp">${sec.kode}. ${esc(sec.judul)}</div>`;
      const scores=(secs[si]&&secs[si].scores)||[];
      sec.items.forEach((it,ii)=>{
        const sel=scores[ii];
        h+=`<div class="qitem"><div class="qitxt">${si+1}.${ii+1} ${esc(it)}</div><div class="qscore">`+[1,2,3,4].map(v=>`<button type="button" class="qscore-btn ${sel===v?'on':''}" data-si="${si}" data-ii="${ii}" data-v="${v}" onclick="pickScore(this)">${v}</button>`).join('')+`</div></div>`;
      });
    });
    h+=`<div class="qbagian kdmp">Kepatuhan Regulasi & Akuntabilitas <small>(Ya/Tidak)</small></div>`;
    COMPLIANCE_KDMP.forEach((c,ci)=>{
      const sel=comp[ci];
      h+=`<div class="qyn"><div class="qyn-txt">${ci+1}. ${esc(c)}</div>`+`<button type="button" class="qyn-btn ${sel==='ya'?'on':''}" data-ci="${ci}" data-j="ya" onclick="pickYN(this)">Ya</button>`+`<button type="button" class="qyn-btn ${sel==='tidak'?'on':''}" data-ci="${ci}" data-j="tidak" onclick="pickYN(this)">Tidak</button></div>`;
    });
    h+=`<div class="qscore-sum"><div><div class="qs-n" id="qsNum">—</div><div class="qs-l">Skor Rata-rata (maks 4)</div></div><div id="qsKat" style="font-size:11px;font-weight:800;text-align:right;color:var(--text3)">Isi butir penilaian</div></div>`;
    
    h+=`<div class="qbagian kdmp">D. Pertanyaan Terbuka</div>`;
    h+=`<div class="fg"><label class="fl">1. Apa kelebihan KDMP/KKMP menurut Anda?</label><textarea id="ff_open_kelebihan" class="fc">${esc(f.open_kelebihan||'')}</textarea></div>`;
    h+=`<div class="fg"><label class="fl">2. Apa kendala utama yang dihadapi dan upaya yang sudah dilakukan?</label><textarea id="ff_open_kendala" class="fc">${esc(f.open_kendala||'')}</textarea></div>`;
    h+=`<div class="fg"><label class="fl">3. Apa saran untuk meningkatkan kinerja KDMP/KKMP?</label><textarea id="ff_open_saran" class="fc">${esc(f.open_saran||'')}</textarea></div>`;
    h+=`<div class="fg"><label class="fl">4. Berapa jumlah tenaga kerja yang diserap untuk pembangunan? (angka)</label><input type="number" id="ff_num_naker" class="fc" value="${esc(f.num_naker||'')}" placeholder="Contoh: 10"/></div>`;
    h+=`<div class="fg"><label class="fl">5. Produk unggulan yang terjual / produk lokal desa?</label><textarea id="ff_open_produk" class="fc">${esc(f.open_produk||'')}</textarea></div>`;

    root.innerHTML='<div class="qkues kdmp">'+h+'</div>';
    calcRekam();
    return;
  }
  if(!currentRekamForm)currentRekamForm=(rec&&rec.formType==='NAKER')?'NAKER':'SPPG';
  if(currentRekamForm==='SPPG')currentSppgFormVersion=(rec&&rec.form&&rec.form.version===SPPG_FORM_VERSION)?SPPG_FORM_VERSION:(rec?'SPPG-V1':SPPG_FORM_VERSION);
  if(currentRekamForm==='SPPG'&&currentSppgFormVersion===SPPG_FORM_VERSION&&rekamTab)rekamTab.classList.add('sppg-v2-active');
  if(tag)tag.textContent=' · '+(currentRekamForm==='NAKER'?'Tenaga Kerja (Naker)':('SPPG · '+(currentSppgFormVersion===SPPG_FORM_VERSION?'Form Formal V2':'Form Lama V1')));
  const formDef=currentRekamForm==='SPPG'?getActiveSppgFormDefinition():(FORMS[currentRekamForm]||FORM_NAKER);
  let h=`<div class="qformtabs"><div class="jopt ${currentRekamForm==='SPPG'?'on-sppg':''}" onclick="switchRekamForm('SPPG')"><div class="jt">🍳 Form SPPG</div></div><div class="jopt ${currentRekamForm==='NAKER'?'on-sppg':''}" onclick="switchRekamForm('NAKER')"><div class="jt">👷 Form Naker</div></div></div>`;
  const data=(rec&&rec.formType===currentRekamForm)?(f.fields):undefined;
  h+=renderGenericForm(formDef,data);
  h+=`<div class="qbagian">Penilaian Akhir Monitoring</div><div class="qfield"><div class="qfn"><span class="qn">★</span>Hasil / Status Monitoring <span class="rq">*</span></div><select id="rHasilManual" class="fc" onchange="previewHasilManual()"><option value="baik">🟢 Baik</option><option value="perbaikan">🟡 Perlu Perbaikan</option><option value="kritis">🔴 Kritis</option></select><div class="qunit-hint">Disarankan otomatis dari indikator — dapat disesuaikan petugas.</div></div>`;
  root.innerHTML='<div class="qkues '+(currentRekamForm==='SPPG'&&currentSppgFormVersion===SPPG_FORM_VERSION?'formal-sppg':'')+'">'+h+'</div>';
  const u = unitById(getVal('rUnit'));
  if (currentRekamForm === 'SPPG' && u) {
    if (!rec || !f.fields || !f.fields.sp101) {
      setVal('ff_sp101', u.nama + (u.ref ? ' (' + u.ref + ')' : ''));
    }
    if (!rec || !f.fields || !f.fields.sp102) {
      setVal('ff_sp102', 'Jawa Tengah');
    }
    if (!rec || !f.fields || !f.fields.sp103) {
      setVal('ff_sp103', u.kab || 'Kota Pekalongan');
    }
    if (!rec || !f.fields || !f.fields.sp109) {
      if (CU) setMSVal('ff_sp109', CU.nama);
    }
  }
  if (currentRekamForm === 'NAKER' && u) {
    if (!rec || !f.fields || !f.fields.nk105) {
      setVal('ff_nk105', u.nama + (u.ref ? ' (' + u.ref + ')' : ''));
    }
    if (!rec || !f.fields || !f.fields.nk106) {
      setVal('ff_nk106', 'Jawa Tengah');
    }
    if (!rec || !f.fields || !f.fields.nk107) {
      setVal('ff_nk107', u.kab || 'Kota Pekalongan');
    }
  }
  renderAllMS();
  if(currentRekamForm==='SPPG'&&currentSppgFormVersion===SPPG_FORM_VERSION){updateSppgComputedTotals();updateSppgConditionalFields();}
  setVal('rHasilManual',(rec&&rec.formType===currentRekamForm&&rec.hasil)?rec.hasil:hasilSaran());
  previewHasilManual();
}
function switchRekamForm(k){currentRekamForm=k;const u=unitById(getVal('rUnit'));renderRekamForm(u?u.jenis:null,null);}
function pickScore(btn){btn.parentNode.querySelectorAll('.qscore-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');calcRekam();}
function pickYN(btn){btn.parentNode.querySelectorAll('.qyn-btn').forEach(b=>b.classList.remove('on'));btn.classList.add('on');}
function hasilSaran(){
  if(currentRekamForm==='NAKER')return 'baik';
  if(currentRekamForm==='SPPG'){
    const d=collectGeneric(getActiveSppgFormDefinition()).fields;
    if(String(d.sp310||'').indexOf('Ya')===0)return 'kritis';
    if((d.sp301||'')==='Tidak')return 'perbaikan';
    if(/Dibuang ke sungai|Dibuang ke TPA/.test(d.sp311||''))return 'perbaikan';
    return 'baik';
  }
  return 'baik';
}
function previewHasilManual(){const h=getVal('rHasilManual')||'baik';const hm=HASIL_META[h];const s=hasilSaran();const note=s!==h?(' · Anda ubah manual (saran: '+HASIL_META[s].label+')'):' · sesuai indikator';showPreview(hm.icon+' '+hm.label+note,hm.color,h);}
function calcRekam(){
  if(!currentRekamJenis){hidePreview();return null;}
  if(currentRekamJenis==='KDMP'){
    const vals=[];document.querySelectorAll('#rekamForm .qscore-btn.on').forEach(b=>vals.push(parseInt(b.dataset.v)));
    const num=document.getElementById('qsNum'),kat=document.getElementById('qsKat');
    if(!vals.length){if(num)num.textContent='—';if(kat){kat.textContent='Isi butir penilaian';kat.style.color='var(--text3)';}hidePreview();return null;}
    const avg=vals.reduce((a,b)=>a+b,0)/vals.length;const k=kategoriDariSkor(avg);
    if(num)num.textContent=avg.toFixed(2);
    if(kat){kat.textContent=k.label;kat.style.color=kdmpColor(k.hasil);}
    showPreview(`<b>SKOR ${avg.toFixed(2)} / 4.00</b> — Kategori: ${k.label}`,kdmpColor(k.hasil),k.hasil);
    return {avg:avg,kategori:k.label,hasil:k.hasil};
  }
  previewHasilManual();
  return {hasil:getVal('rHasilManual')};
}
function collectKDMP(){
  const nib = document.getElementById('ff_nib').value;
  const npwp = document.querySelector('.qchips[data-fid="npwp"] .qchip.on')?.dataset.opt || '';
  const bidang_usaha = document.getElementById('ff_bidang_usaha').value;
  const status_bangun = document.getElementById('ff_status_bangun').value;
  const prov = document.getElementById('ff_prov').value;
  const desa = document.getElementById('ff_desa').value;

  const resp_nama = document.getElementById('ff_resp_nama').value;
  const resp_hp = document.getElementById('ff_resp_hp').value;
  const resp_jenis = document.getElementById('ff_resp_jenis').value;

  const sections=FORM_KDMP.map((sec,si)=>{const scores=sec.items.map((it,ii)=>{const on=document.querySelector('#rekamForm .qscore-btn.on[data-si="'+si+'"][data-ii="'+ii+'"]');return on?parseInt(on.dataset.v):0;});return {kode:sec.kode,judul:sec.judul,scores:scores};});
  const compliance=COMPLIANCE_KDMP.map((c,ci)=>{const on=document.querySelector('#rekamForm .qyn-btn.on[data-ci="'+ci+'"]');return on?on.dataset.j:null;});
  const ans=[].concat.apply([],sections.map(s=>s.scores)).filter(v=>v>0);
  const avg=ans.length?ans.reduce((a,b)=>a+b,0)/ans.length:0;const k=kategoriDariSkor(avg);
  
  const open_kelebihan = document.getElementById('ff_open_kelebihan').value;
  const open_kendala = document.getElementById('ff_open_kendala').value;
  const open_saran = document.getElementById('ff_open_saran').value;
  const open_produk = document.getElementById('ff_open_produk').value;
  const naker = document.getElementById('ff_num_naker').value;

  return {nib, npwp, bidang_usaha, status_bangun, prov, desa, resp_nama, resp_hp, resp_jenis, sections:sections, compliance:compliance, avg:ans.length?(+avg.toFixed(2)):null, kategori:ans.length?k.label:null, hasil:k.hasil, terjawab:ans.length, open_kelebihan, open_kendala, open_saran, open_produk, num_naker:naker};
}
function collectGeneric(formDef){
  const data={};
  formDef.sections.forEach(sec=>sec.fields.forEach(f=>{
    if(f.type==='g'){
      const o={};
      if(f.fields&&f.fields.length){f.rows.forEach(r=>{o[r.id]={};f.fields.forEach(c=>{const el=document.getElementById('ff_'+f.id+'__'+r.id+'__'+c.id),scale=currencyScaleForField(c,f);o[r.id][c.id]=el?(scale?parseCurrencyToStored(el.value,scale):(el.value||'')):'';});});}
      else{f.rows.forEach(r=>{if(r.type==='yn'){const wrap=document.querySelector('.qchips[data-fid="'+f.id+'__'+r.id+'"]');const on=wrap?wrap.querySelector('.qchip.on'):null;o[r.id]=on?on.getAttribute('data-opt'):'';}else{const el=document.getElementById('ff_'+f.id+'__'+r.id),scale=currencyScaleForField(f);o[r.id]=el?(scale?parseCurrencyToStored(el.value,scale):(el.value||'')):'';}});}
      data[f.id]=o;
    }else if(f.type==='c'||f.type==='yn'){
      const wrap=document.querySelector('.qchips[data-fid="'+f.id+'"]');const on=wrap?wrap.querySelector('.qchip.on'):null;
      data[f.id]=on?on.getAttribute('data-opt'):'';
    }else if(f.type==='m'){
      const wrap=document.querySelector('.qchips[data-fid="'+f.id+'"]');
      data[f.id]=wrap?Array.prototype.slice.call(wrap.querySelectorAll('.qchip.on')).map(b=>b.getAttribute('data-opt')):[];
    }else{
      const el=document.getElementById('ff_'+f.id),scale=currencyScaleForField(f);
      data[f.id]=el?(scale?parseCurrencyToStored(el.value,scale):(el.value||'')):'';
    }
  }));
  return {fields:data};
}
function monDetailAspects(m){
  if(m.form){
    if(m.jenis==='KDMP'){
      const f=m.form;let out=f.avg!=null?`<span class="ac" style="background:#1E3A8A;color:#fff">⭐ SKOR ${f.avg} · ${esc(f.kategori||'')}</span>`:'';
      out+=f.sections.map(s=>{const a=s.scores.filter(v=>v>0);const avg=a.length?(a.reduce((x,y)=>x+y,0)/a.length).toFixed(2):'–';return `<span class="ac ${kdmpAc(avg)}">${s.kode}. ${esc(s.judul)}: ${avg}</span>`;}).join('');
      const c=f.compliance||[];const ya=c.filter(x=>x==='ya').length;
      out+=`<span class="ac perlu" style="background:#eef2ff;color:#3730a3">Kepatuhan: ${ya}/${c.length} Ya</span>`;
      return out;
    }
    const tag=m.formType==='NAKER'?'<span class="ac" style="background:#7c3aed;color:#fff">Form Naker</span>':'<span class="ac" style="background:#1d4ed8;color:#fff">Form SPPG</span>';
    const f=m.form.fields||{};const out=[];
    Object.keys(f).forEach(k=>{const v=f[k];if(v==null||v==='')return;
      if(Array.isArray(v)){if(v.length)out.push(`<span class="ac baik"><b>${esc(ALL_FIELD_LABEL[k]||k)}:</b> ${esc(v.join('; ')).slice(0,38)}</span>`);}
      else if(typeof v==='object'){const filled=Object.values(v).filter(x=>x&&(typeof x!=='object'||Object.values(x).some(z=>z))).length;if(filled)out.push(`<span class="ac baik"><b>${esc(ALL_FIELD_LABEL[k]||k)}</b></span>`);}
      else out.push(`<span class="ac baik"><b>${esc(ALL_FIELD_LABEL[k]||k)}:</b> ${esc(String(v)).slice(0,38)}</span>`);
    });
    return tag+(out.length?out.slice(0,6).join(''):'<span class="ac baik">Survei terisi</span>');
  }
  return ['kebersihan','gizi','distribusi','dok'].filter(a=>m[a]).map(a=>`<span class="ac ${m[a]}">${ASPEK_LABEL[a]}: ${ASPEK_META[m[a]]||'-'}</span>`).join('')||'<span class="ac baik">—</span>';
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { showPreview, hidePreview, focusCurrencyInput, blurCurrencyInput, formFieldHtml, gridFieldHtml, renderGenericForm, pickChip, updateSppgConditionalFields, updateSppgComputedTotals, onFormInput, renderRekamForm, switchRekamForm, pickScore, pickYN, hasilSaran, previewHasilManual, calcRekam, collectKDMP, collectGeneric, monDetailAspects });
