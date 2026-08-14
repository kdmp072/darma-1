
/* ============================================================
   SIMON-MBG — Sistem Monitoring MBG : SPPG & KDMP
   Koperasi Desa Merah Putih
   Wilayah: Kota/Kab. Pekalongan · Kab. Batang
============================================================ */
const KABUPATEN = {
  'Kota Pekalongan':['Pekalongan Barat','Pekalongan Timur','Pekalongan Utara','Pekalongan Selatan'],
  'Kab. Pekalongan':['Wiradesa','Buaran','Tirto','Kedungwuni','Kajen','Bojong','Siwalan','Doro','Karanganyar','Karangdadap'],
  'Kab. Batang':['Batang','Bandar','Warungasem','Wonotunggal','Gringsing','Limpung','Subah','Tulis','Kandeman','Pecalungan','Reban','Bawang','Blado','Tersono']
};
const HASIL_META = {
  sudah:{label:'Sudah Dimonitor',color:'#16A34A',icon:'🟢'},
  baik:{label:'Sudah Dimonitor',color:'#16A34A',icon:'🟢'},
  perbaikan:{label:'Sudah Dimonitor',color:'#16A34A',icon:'🟢'},
  kritis:{label:'Sudah Dimonitor',color:'#16A34A',icon:'🟢'},
  belum:{label:'Belum Dimonitor',color:'#64748B',icon:'⚪'}
};
const ASPEK_LABEL = {kebersihan:'Kebersihan',gizi:'Menu & Gizi',distribusi:'Distribusi',dok:'Dokumentasi'};
const ASPEK_META = {baik:'✅ Baik',perlu:'⚠️ Perlu',tidak:'❌ Tidak Sesuai'};


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { KABUPATEN, HASIL_META, ASPEK_LABEL, ASPEK_META });
