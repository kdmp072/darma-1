/* ============================================================
   MULTI-SELECT PETUGAS, WAWANCARA & FOTO HP
============================================================ */
const DEFAULT_OFFICERS = [
  "Darmawan",
  "Muh. Soleh",
  "Indrastutik",
  "Moh. Imron",
  "Srudono",
  "M. Reza Pratama",
  "I Wayan Deka",
  "Ihda Hidayah",
  "Hepi Sekar",
  "M. Hafidz",
  "Ida Nurkayadi",
  "Amin Hidayatullah",
  "Titut Triani",
  "Yuni Kusmiyati",
  "Ruli Indra Kusuma",
  "Martono",
  "Arif Sunoto",
  "Nursigit Santoso",
  "Hendranto P"
];
let OFFICER_LIST = [...DEFAULT_OFFICERS];

function initMS() {
  try {
    const saved = localStorage.getItem('darma_officers_names');
    if (saved) {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr) && arr.length) OFFICER_LIST = arr;
    }
  } catch (e) {}
  renderAllMS();
  document.addEventListener('click', function() { closeAllMS(); });
}

function renderAllMS() {
  document.querySelectorAll('.ms-wrap').forEach(w => {
    const id = w.id.replace('wrap_', '');
    renderMSList(id);
  });
}

function renderMSList(id) {
  const cont = document.getElementById('list_' + id);
  if (!cont) return;
  const currentVals = getMSVals(id);
  cont.innerHTML = OFFICER_LIST.map(nm => {
    const checked = currentVals.includes(nm.toLowerCase()) ? 'checked' : '';
    return `<label class="ms-item" data-name="${esc(nm).toLowerCase()}">
      <input type="checkbox" value="${esc(nm)}" ${checked} onchange="onMSChange('${id}')">
      <span class="ms-name">${esc(nm)}</span>
    </label>`;
  }).join('');
  renderMSSelection(id);
}

function toggleMS(id, e) {
  if (e) e.stopPropagation();
  const wrap = document.getElementById('wrap_' + id);
  if (!wrap) return;
  const wasOpen = wrap.classList.contains('open');
  closeAllMS();
  if (!wasOpen) {
    renderMSList(id);
    wrap.classList.add('open');
  }
}

function closeAllMS() {
  document.querySelectorAll('.ms-wrap.open').forEach(w => w.classList.remove('open'));
}

function getMSVals(id) {
  const valStr = (document.getElementById(id) && document.getElementById(id).value || '').trim();
  return valStr ? valStr.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) : [];
}

function onMSChange(id) {
  const cont = document.getElementById('list_' + id);
  if (!cont) return;
  const chks = cont.querySelectorAll('input[type="checkbox"]:checked');
  const vals = Array.from(chks).map(c => c.value);
  const inp = document.getElementById(id);
  if (inp) inp.value = vals.join(', ');
  renderMSSelection(id);
}

function renderMSSelection(id) {
  const inp = document.getElementById(id);
  const lbl = document.getElementById('lbl_' + id);
  if (!inp || !lbl) return;
  const valStr = (inp.value || '').trim();
  if (!valStr) {
    const ph = id === 'rPetugas' ? 'Pilih petugas / input baru...' : 'Pilih pewawancara / input baru...';
    lbl.innerHTML = `<span class="ms-placeholder">${ph}</span>`;
    return;
  }
  const vals = valStr.split(',').map(x => x.trim()).filter(Boolean);
  lbl.innerHTML = vals.map(v => `<span class="ms-chip">${esc(v)} <b onclick="removeMSItem('${id}', '${esc(v)}', event)">×</b></span>`).join('');
  const cont = document.getElementById('list_' + id);
  if (cont) {
    const lowVals = vals.map(v => v.toLowerCase());
    cont.querySelectorAll('input[type="checkbox"]').forEach(c => {
      c.checked = lowVals.includes(c.value.toLowerCase());
    });
  }
}

function removeMSItem(id, itemVal, e) {
  if (e) { e.stopPropagation(); e.preventDefault(); }
  const inp = document.getElementById(id);
  if (!inp) return;
  const valStr = (inp.value || '').trim();
  const vals = valStr.split(',').map(x => x.trim()).filter(x => x && x.toLowerCase() !== itemVal.toLowerCase());
  inp.value = vals.join(', ');
  renderMSSelection(id);
}

function selectAllMS(id, checkAll) {
  const cont = document.getElementById('list_' + id);
  if (!cont) return;
  const visibleChks = cont.querySelectorAll('.ms-item:not([style*="display: none"]) input[type="checkbox"]');
  visibleChks.forEach(c => { c.checked = checkAll; });
  onMSChange(id);
}

function filterMS(id, q) {
  const cont = document.getElementById('list_' + id);
  if (!cont) return;
  const items = cont.querySelectorAll('.ms-item');
  const term = (q || '').toLowerCase().trim();
  items.forEach(it => {
    const name = it.getAttribute('data-name') || '';
    it.style.display = (!term || name.includes(term)) ? 'flex' : 'none';
  });
}

function addCustomMS(id) {
  const inp = document.getElementById('cust_' + id);
  if (!inp) return;
  const newName = (inp.value || '').trim();
  if (!newName) return;
  const cont = document.getElementById('list_' + id);
  if (!OFFICER_LIST.some(nm => nm.toLowerCase() === newName.toLowerCase())) {
    OFFICER_LIST.push(newName);
    try { localStorage.setItem('darma_officers_names', JSON.stringify(OFFICER_LIST)); } catch (e) {}
    renderAllMS();
  }
  const valStr = (document.getElementById(id) && document.getElementById(id).value || '').trim();
  const vals = valStr ? valStr.split(',').map(x => x.trim()).filter(Boolean) : [];
  if (!vals.some(v => v.toLowerCase() === newName.toLowerCase())) {
    vals.push(newName);
  }
  const targetInp = document.getElementById(id);
  if (targetInp) targetInp.value = vals.join(', ');
  inp.value = '';
  renderMSSelection(id);
  toast('➕ Nama "' + newName + '" ditambahkan dan dipilih');
}

function setMSVal(id, valStr) {
  setVal(id, valStr || '');
  renderMSSelection(id);
}

async function syncPetugasFromSheet() {
  toast('⏳ Mengambil data nama petugas dari Google Sheet...');
  const url = 'https://docs.google.com/spreadsheets/d/1z-S7gWriLPNmq2BSUBqvd8fH7qDus1waeYQArlIClNE/export?format=csv';
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const lines = text.split(/\r?\n/).filter(x => x.trim());
    const list = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts[0] && parts[0].trim()) {
        const nm = parts[0].trim();
        if (!list.includes(nm)) list.push(nm);
      }
    }
    if (list.length > 0) {
      OFFICER_LIST = list;
      try { localStorage.setItem('darma_officers_names', JSON.stringify(list)); } catch (e) {}
      renderAllMS();
      toast('✅ ' + list.length + ' nama petugas diperbarui dari Google Sheet!');
      return;
    }
  } catch (err) {
    console.warn('Sync sheet fallback default', err);
  }
  OFFICER_LIST = [...DEFAULT_OFFICERS];
  renderAllMS();
  toast('✅ Data nama petugas dimuat (' + OFFICER_LIST.length + ' terdaftar)');
}

function capturePhotoMS(id, e, source) {
  const picker=e&&e.target;
  const file=picker&&picker.files&&picker.files[0];
  if(!file)return;
  const extOk=/\.(jpe?g|png|webp)$/i.test(file.name||'');
  const mimeOk=/^image\/(jpeg|jpg|png|webp)$/i.test(file.type||'');
  if(!mimeOk&&!extOk){
    toast('Pilih file gambar JPG, PNG, atau WebP','e');
    picker.value='';return;
  }
  if(file.size>10*1024*1024){
    toast('Ukuran gambar maksimal 10 MB','e');
    picker.value='';return;
  }
  const reader=new FileReader();
  reader.onerror=()=>{toast('Gagal membaca file gambar','e');picker.value='';};
  reader.onload=function(evt){
    const img=new Image();
    img.onerror=()=>{toast('Gambar tidak dapat diproses','e');picker.value='';};
    img.onload=function(){
      try{
        const canvas=document.createElement('canvas');
        const maxDim=800;
        let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
        if(w>maxDim||h>maxDim){
          if(w>h){h=Math.round((h*maxDim)/w);w=maxDim;}
          else{w=Math.round((w*maxDim)/h);h=maxDim;}
        }
        canvas.width=w;canvas.height=h;
        const ctx=canvas.getContext('2d');
        if(!ctx)throw new Error('Canvas tidak tersedia');
        ctx.drawImage(img,0,0,w,h);
        const dataUrl=canvas.toDataURL('image/jpeg',0.7);
        const inp=document.getElementById(id);if(inp)inp.value=dataUrl;
        const prev=document.getElementById('prev_'+id);
        if(prev){
          prev.innerHTML=`<img src="${dataUrl}" alt="Dokumentasi kegiatan" style="max-height:220px;max-width:100%;border-radius:10px;border:2px solid var(--border);box-shadow:var(--sh);object-fit:contain"/>`;
          prev.style.display='block';
        }
        const del=document.getElementById('pdel_'+id);if(del)del.style.display='inline-flex';
        toast(source==='camera'?'📷 Foto berhasil diambil dan disiapkan':'🖼️ Gambar berhasil di-upload dan disiapkan');
      }catch(err){
        console.error('Image processing error:',err);
        toast('Gagal memproses gambar','e');
      }
      picker.value='';
    };
    img.src=evt.target.result;
  };
  reader.readAsDataURL(file);
}

function deletePhotoMS(id) {
  const inp = document.getElementById(id);
  if (inp) inp.value = '';
  const prev = document.getElementById('prev_' + id);
  if (prev) { prev.innerHTML = ''; prev.style.display = 'none'; }
  const del = document.getElementById('pdel_' + id);
  if (del) del.style.display = 'none';
  toast('🗑️ Foto dihapus');
}


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { DEFAULT_OFFICERS });
Object.defineProperties(globalThis, {
  OFFICER_LIST: { configurable: true, get: () => OFFICER_LIST, set: value => { OFFICER_LIST = value; } }
});
Object.assign(globalThis, { initMS, renderAllMS, renderMSList, toggleMS, closeAllMS, getMSVals, onMSChange, renderMSSelection, removeMSItem, selectAllMS, filterMS, addCustomMS, setMSVal, syncPetugasFromSheet, capturePhotoMS, deletePhotoMS });
