import { calculateSppg411Totals, normalizeSppg204Fields } from './sppg-calculations.js';

/* ============================================================
   KUESIONER MONITORING
   - KDMP  : Kuesioner Monev Juknis (skala 1-4) + Compliance Ya/Tidak
   - SPPG  : Form Survei Penyaluran MBG (adaptasi Excel)
============================================================ */
let editMonId=null, currentRekamJenis=null, currentRekamForm=null, currentPreviewHasil=null, currentSppgFormVersion='SPPG-2026-08';
const SKALA_KDMP='Skala 1–4: (1) Sangat Tidak Baik · (2) Kurang Baik · (3) Baik · (4) Sangat Baik. Hasil = rata-rata seluruh butir.';
const KATEGORI_KDMP=[
  {min:3.26,label:'Sangat Baik',hasil:'baik'},
  {min:2.51,label:'Baik',hasil:'baik'},
  {min:1.76,label:'Kurang Baik',hasil:'perbaikan'},
  {min:1.00,label:'Sangat Kurang',hasil:'kritis'}
];
function kategoriDariSkor(avg){for(const k of KATEGORI_KDMP){if(avg>=k.min)return k;}return KATEGORI_KDMP[KATEGORI_KDMP.length-1];}
function kdmpColor(hasil){return hasil==='baik'?'#16A34A':hasil==='perbaikan'?'#D97706':'#B91C1C';}
function kdmpAc(avg){const v=parseFloat(avg);if(isNaN(v))return 'belum';if(v>=2.51)return 'baik';if(v>=1.76)return 'perlu';return 'tidak';}

/* ---- KDMP: 8 bagian penilaian skala (Juknis Monev KDMP/KKMP sesuai dokumen) ---- */
const FORM_KDMP=[
  {kode:'I',judul:'Gerai',items:[
    'Gerai telah beroperasi secara aktif dan berjalan sesuai rencana yang telah ditetapkan.',
    'Lokasi gerai mudah dijangkau masyarakat.',
    'Barang/jasa yang dijual sesuai kebutuhan masyarakat.',
    'Harga Barang Kompetitif.',
    'Ketersediaan barang/jasa mencukupi kebutuhan masyarakat.'
  ]},
  {kode:'II',judul:'Gudang',items:[
    'Gudang tersedia dan digunakan.',
    'Kondisi bangunan gudang layak.',
    'Penyimpanan barang tertata dengan baik.',
    'Gudang memiliki sistem keamanan yang memadai.',
    'Barang mudah ditelusuri dan ditemukan.'
  ]},
  {kode:'III',judul:'Sarana & Prasarana',items:[
    'Ketersediaan kendaraan operasional memadai.',
    'Kondisi kendaraan masih layak digunakan.',
    'Peralatan operasional mendukung kegiatan koperasi.',
    'Sarana dimanfaatkan secara optimal.',
    'Pemeliharaan sarana dilakukan secara rutin.'
  ]},
  {kode:'IV',judul:'Kepengurusan',items:[
    'Struktur organisasi jelas.',
    'Pengurus menjalankan tugas sesuai fungsi.',
    'Koordinasi antar pengurus berjalan baik.',
    'Pengurus memberikan SOP dan keuangan secara transparan.',
    'Pengurus memiliki kompetensi mengelola koperasi.'
  ]},
  {kode:'V',judul:'Persediaan',items:[
    'Stok barang selalu tersedia.',
    'Pencatatan persediaan dilakukan dengan baik.',
    'Jumlah stok sesuai dengan pencatatan.',
    'Barang tersimpan dengan baik.',
    'Pengelolaan stok sudah efektif.'
  ]},
  {kode:'VI',judul:'Lahan',items:[
    'Lahan yang dimiliki memadai dan optimal untuk operasional.',
    'Status kepemilikan lahan jelas.',
    'Lahan mendukung pengembangan usaha.'
  ]},
  {kode:'VII',judul:'Tata Kelola (Perspektif Dinas)',items:[
    'KDKMP dikelola sesuai dengan ketentuan yang berlaku (operasional rutin, sarpras tersedia).',
    'Pengurus melaksanakan tugas secara efektif dan akuntabel.',
    'KDKMP menyampaikan informasi dan laporan keuangan kepada Dinas Koperasi secara berkala.',
    'Koordinasi antara pengurus dan Dinas Koperasi berjalan dengan baik.',
    'Operasional KDKMP berjalan sesuai tujuan pembentukannya.'
  ]},
  {kode:'VIII',judul:'Dampak',items:[
    'Keberadaan KDKMP berkontribusi terhadap penguatan ekonomi desa.',
    'KDKMP memudahkan akses masyarakat terhadap barang, jasa dan/atau layanan usaha koperasi.',
    'KDKMP mendukung pengembangan usaha masyarakat dan pelaku UMKM di desa.',
    'KDKMP menciptakan peluang ekonomi atau lapangan kerja di desa.',
    'Keberadaan KDKMP memberikan manfaat yang nyata bagi masyarakat dan layak dikembangkan.'
  ]}
];
/* ---- KDMP: Kepatuhan Regulasi & Akuntabilitas (Ya/Tidak) ---- */
const COMPLIANCE_KDMP=[
  'Tersedia dokumen kontrak ketika sebelum pembangunan.',
  'Seluruh tagihan kontrak perencanaan/pembangunan sudah dibayarkan.',
  'Gerai sudah dilengkapi sarana prasarana (meja kasir, rak persediaan, CCTV dan APAR).',
  'Gerai sudah dilengkapi kendaraan (motor listrik dan truk).',
  'Tersedia dokumen BAST pembangunan gerai/gudang yang sudah ditandatangani.',
  'Dokumen BAST berisi lengkap: Kode desa, NIK Koperasi, Jenis Aset, dan Nilai Rupiah Aset.'
];

/* ---- SPPG: Form Survei (sheet "SPPG" - 4 bagian, 33 butir) ---- */
const FORM_SPPG_V1={key:'SPPG',version:'SPPG-V1',title:'DAFTAR PERTANYAAN UNTUK SPPG',purpose:'Mengetahui Perkembangan Operasional dalam Pengelolaan SPPG',dur:'45 menit',sections:[
  {title:'Bagian 1. Identitas dan Lokasi Responden',fields:[
    {id:'sp101',label:'Nama SPPG',type:'t'},
    {id:'sp102',label:'Provinsi',type:'c',opts:['Jawa Tengah']},
    {id:'sp103',label:'Kabupaten/Kota',type:'c',opts:['Kota Pekalongan','Kab. Pekalongan','Kab. Batang']},
    {id:'sp104',label:'Apakah masih beroperasi?',type:'yn'},
    {id:'sp105',label:'Jika tidak beroperasi, alasan utama',type:'s',opts:['Proses Pendaftaran','Persiapan Operasional','Kontrak berakhir / dihentikan pemerintah','Dana operasional tidak tersedia','Fasilitas dapur tidak layak pakai','Kendala distribusi logistik ke lokasi','Suspend BGN','Lainnya']},
    {id:'sp106',label:'Sejak kapan beroperasi',type:'d'},
    {id:'sp107',label:'Nama Responden',type:'t'},
    {id:'sp108',label:'Jabatan/Posisi Responden',type:'c',opts:['Kepala SPPG','Pengawas Gizi','Akuntan','Lainnya']},
    {id:'sp109',label:'Petugas yang mewawancara',type:'petugas_ms'},
    {id:'sp110',label:'Tanggal wawancara',type:'d'}
  ]},
  {title:'Bagian 2. Operasional SPPG',fields:[
    {id:'sp201',label:'Jumlah porsi/hari yang dilayani pada akhir bulan lalu',type:'g',unit:'penerima',rows:[{id:'siswa',label:'Siswa'},{id:'ibuhamil',label:'Ibu Hamil & Menyusui'},{id:'balita',label:'Balita'},{id:'guru',label:'Guru & Tendik'},{id:'posyandu',label:'Kader Posyandu'}]},
    {id:'sp202',label:'Jumlah Sekolah yang menerima MBG pada akhir bulan lalu',type:'g',unit:'penerima',rows:[{id:'paud',label:'PAUD'},{id:'tk',label:'TK/RA'},{id:'sd',label:'SD/MI/SDLB'},{id:'smp',label:'SMP/MTs/SMPLB'},{id:'sma',label:'SMA/SMK/MA/SMALB'}]},
    {id:'sp203',label:'Jumlah hari penyaluran MBG bulan lalu',type:'n',unit:'hari'},
    {id:'sp204',label:'Waktu tempuh terlama untuk distribusi',type:'c',opts:['< 15 menit','< 30 menit','> 30 menit, sebutkan']},
    {id:'sp205',label:'Total jumlah pekerja bulan lalu (termasuk Kepala SPPG, Pengawas Gizi, Akuntan)',type:'n',unit:'orang'},
    {id:'sp206',label:'Total jumlah juru masak bulan lalu (termasuk head chef)',type:'n',unit:'orang'},
    {id:'sp207',label:'Jumlah hari kerja untuk dasar pembayaran upah bulan lalu',type:'n',unit:'hari'},
    {id:'sp208',label:'Persentase pekerja didaftarkan BPJS Ketenagakerjaan',type:'c',opts:['0-20%','21-50%','51-80%','81-100%']}
  ]},
  {title:'Bagian 3. Keamanan Pangan dan Pengelolaan Sampah',fields:[
    {id:'sp301',label:'Apakah terdapat pengawasan kelaikan makanan oleh pihak eksternal?',type:'yn'},
    {id:'sp302',label:'Jika ya, berapa kali dilakukan pada minggu lalu',type:'g',unit:'kali',rows:[{id:'kppg',label:'KPPG/Korwil/Korcam'},{id:'dinkes',label:'Dinas Kesehatan/Puskesmas'},{id:'tni',label:'TNI / POLRI'},{id:'lain',label:'Lainnya'}]},
    {id:'sp303',label:'Pukul makanan mulai dimasak hari ini',type:'tm'},
    {id:'sp304',label:'Pukul makanan selesai dimasak',type:'tm'},
    {id:'sp305',label:'Pukul mulai proses pemorsian',type:'tm'},
    {id:'sp306',label:'Pukul selesai diporsikan',type:'tm'},
    {id:'sp307',label:'Pukul dikirim ke penerima',type:'tm'},
    {id:'sp308',label:'Siapa yang melakukan uji sampel makanan sebelum dibagikan?',type:'c',opts:['Tidak ada','Kepala SPPG','Pengawas Gizi','Juru Masak','Lainnya']},
    {id:'sp309',label:'Sumber air utama untuk memasak',type:'c',opts:['Sumur Bor/Pompa','PDAM','Air Galon Bermerk','Air Galon Isi ulang','Lainnya']},
    {id:'sp310',label:'Pernah ada kejadian gangguan pencernaan?',type:'c',opts:['Tidak','Ya - 1 bulan terakhir','Ya - 1-3 bulan lalu','Ya - lebih dari 3 bulan lalu']},
    {id:'sp311',label:'Pengelolaan sampah/limbah padat sisa makanan MBG',type:'c',opts:['Didaur ulang / dimanfaatkan kembali','Dibuang ke TPA','Dibuang ke sungai/laut/pesisir','Lainnya']},
    {id:'sp312',label:'Kendala dalam penyiapan makanan dalam jumlah besar',type:'ta'}
  ]},
  {title:'Bagian 4. Administrasi Keuangan SPPG',fields:[
    {id:'sp401',label:'Saldo VA akhir bulan lalu',type:'n',unit:'Rp Juta'},
    {id:'sp402',label:'Saldo VA 3 bulan lalu pernah melebihi Rp500 juta?',type:'yn'},
    {id:'sp403',label:'Nilai penerimaan/top up dari BGN bulan lalu',type:'n',unit:'Rp Juta'},
    {id:'sp404',label:'Rentang waktu top up saldo VA terakhir dan sebelumnya',type:'n',unit:'hari kerja'},
    {id:'sp405',label:'Laporan keuangan yang disampaikan ke BGN',type:'g',rows:[{id:'harian',label:'Harian',type:'yn'},{id:'duamingguan',label:'Dua mingguan',type:'yn'},{id:'bulanan',label:'Bulanan',type:'yn'}]},
    {id:'sp406',label:'Aplikasi yang digunakan untuk laporan keuangan',type:'g',rows:[{id:'apl',label:'Aplikasi Pelaporan SPPG (Excel)',type:'yn'},{id:'lain',label:'Aplikasi lainnya',type:'yn'}]},
    {id:'sp407',label:'Periode pembayaran insentif dapur (Rp6 juta/hari)',type:'c',opts:['Bulanan','Dua mingguan','Mingguan','Harian']},
    {id:'sp408',label:'Jumlah hari untuk perhitungan insentif dapur minggu lalu',type:'n',unit:'hari'},
    {id:'sp409',label:'Jumlah supplier untuk program MBG pada SPPG ini',type:'n',unit:'unit supplier'},
    {id:'sp410',label:'Pengeluaran bahan baku minggu lalu (per kelompok supplier)',type:'g',unit:'Rp Juta',rows:[{id:'kdkmp',label:'KDKMP'},{id:'bumdes',label:'BUMDes/Koperasi lainnya'},{id:'agen',label:'Agen/Pasar'},{id:'distributor',label:'Distributor'},{id:'produsen',label:'Produsen (petani, peternak, nelayan)'},{id:'umkm',label:'UMKM makanan'}]},
    {id:'sp411',label:'Pengeluaran bahan baku minggu lalu (per kelompok bahan baku)',type:'g',fields:[{id:'dalam',label:'Dalam kota',unit:'Rp Juta'},{id:'luar',label:'Luar kota',unit:'Rp Juta'}],rows:[{id:'pokok',label:'Makanan Pokok (Beras, Kentang, Ubi)'},{id:'lauk',label:'Lauk (Daging, ayam, ikan, tempe, tahu)'},{id:'sayur',label:'Sayuran'},{id:'buah',label:'Buah-buahan'},{id:'minum',label:'Minuman (Susu, dll)'},{id:'lain',label:'Lainnya (Minyak, bumbu)'}]},
    {id:'sp412',label:'Harga bahan baku',type:'g',fields:[{id:'ini',label:'Bulan ini',unit:'Rp Ribu/kg'},{id:'lalu',label:'Bulan lalu',unit:'Rp Ribu/kg'}],rows:[{id:'beras',label:'Beras'},{id:'ayam',label:'Daging ayam'},{id:'telur',label:'Telur'},{id:'susu',label:'Susu'}]},
    {id:'sp413',label:'Pengeluaran biaya operasional minggu lalu',type:'g',unit:'Rp Juta',rows:[{id:'tk',label:'Tenaga kerja/Relawan'},{id:'bbm',label:'Bensin/Solar/BBM'},{id:'lpg',label:'LPG/BBG/Gas Kota'},{id:'util',label:'Utilitas: Listrik, Air Bersih'},{id:'sewa',label:'Sewa kendaraan'},{id:'lain',label:'Biaya operasional lainnya'}]},
    {id:'sp414',label:'Kendala terkait penyiapan dan distribusi MBG (boleh lebih dari satu)',type:'m',opts:['Ketersediaan bahan baku','Harga bahan baku meningkat','Pembayaran ke supplier terhambat','Petty cash tidak mencukupi','Keterlambatan pencairan anggaran dari BGN','Lainnya']}
  ]},
  {title:'Bagian 5. Dokumentasi Kegiatan & Lampiran',fields:[
    {id:'sp_link_lampiran',label:'1. Link / Tautan Lampiran Berkas (Google Drive, Dokumen, Laporan, dsb.)',type:'url'},
    {id:'sp_foto_kegiatan',label:'2. Dokumentasi Foto/Gambar Kegiatan / Distribusi MBG',type:'photo'}
  ]}
]};

/* ---- SPPG V2: Form formal terbaru, tetap kompatibel dengan data V1 ---- */
const SPPG_FORM_VERSION='SPPG-2026-08';
const FORM_SPPG_V2=JSON.parse(JSON.stringify(FORM_SPPG_V1));
FORM_SPPG_V2.version=SPPG_FORM_VERSION;
FORM_SPPG_V2.title='FORM SURVEI MONITORING SPPG';
FORM_SPPG_V2.purpose='Mengetahui kondisi operasional, keamanan pangan, pengelolaan, dan administrasi SPPG';
function sppgV2Field(id){for(const sec of FORM_SPPG_V2.sections){const f=sec.fields.find(x=>x.id===id);if(f)return f;}return null;}
function sppgV2Replace(sectionIndex,id,newField){const a=FORM_SPPG_V2.sections[sectionIndex].fields,i=a.findIndex(x=>x.id===id);if(i>=0)a.splice(i,1,newField);}
function sppgV2InsertAfter(sectionIndex,id,newField){const a=FORM_SPPG_V2.sections[sectionIndex].fields,i=a.findIndex(x=>x.id===id);a.splice(i<0?a.length:i+1,0,newField);}
FORM_SPPG_V2.sections[0].title='BAGIAN 1. IDENTITAS DAN LOKASI RESPONDEN';
FORM_SPPG_V2.sections[1].title='BAGIAN 2. OPERASIONAL SPPG';
FORM_SPPG_V2.sections[2].title='BAGIAN 3. KEAMANAN PANGAN DAN PENGELOLAAN SAMPAH';
FORM_SPPG_V2.sections[3].title='BAGIAN 4. ADMINISTRASI KEUANGAN SPPG';
FORM_SPPG_V2.sections[4].title='BAGIAN 5. DOKUMENTASI KEGIATAN DAN LAMPIRAN';
Object.assign(sppgV2Field('sp202'),{label:'Jumlah sekolah yang menerima MBG pada akhir bulan lalu',unit:'sekolah'});
Object.assign(sppgV2Field('sp207'),{label:'Jumlah hari kerja dasar pembayaran upah bulan lalu'});
sppgV2InsertAfter(1,'sp204',{id:'sp204_detail',code:'204a',label:'Sebutkan waktu tempuh terlama',type:'n',unit:'menit',showIf:{field:'sp204',contains:'> 30'}});
const s3=FORM_SPPG_V2.sections[2].fields,idx303=s3.findIndex(x=>x.id==='sp303');
s3.splice(idx303,5,{id:'sp_waktu_proses',code:'303–307',label:'Waktu proses hari ini',type:'g',fields:[{id:'tahap1',label:'Tahap I',type:'time'},{id:'tahap2',label:'Tahap II',type:'time'}],rows:[{id:'sp303',label:'303. Mulai dimasak'},{id:'sp304',label:'304. Selesai dimasak'},{id:'sp305',label:'305. Mulai proses pemorsian'},{id:'sp306',label:'306. Selesai diporsikan'},{id:'sp307',label:'307. Dikirim ke penerima'}]});
Object.assign(sppgV2Field('sp308'),{label:'Siapa yang melakukan uji sampel makanan hari ini sebelum dibagikan?'});
Object.assign(sppgV2Field('sp310'),{label:'Apakah pernah ada kejadian menonjol gangguan pencernaan?',type:'yn'});delete sppgV2Field('sp310').opts;
Object.assign(sppgV2Field('sp312'),{label:'Apakah ada kendala dalam penyiapan makanan dalam jumlah besar?'});
sppgV2InsertAfter(2,'sp312',{id:'sp313',code:'313',label:'Jika ada, berapa frekuensi keterjadian kendala pada minggu lalu?',type:'n',unit:'kali'});
sppgV2Replace(3,'sp405',{id:'sp405',code:'405',label:'Laporan keuangan yang disampaikan ke BGN (bisa lebih dari satu)',type:'m',opts:['Harian','Dua mingguan','Bulanan']});
sppgV2Replace(3,'sp406',{id:'sp406',code:'406',label:'Aplikasi yang digunakan untuk membuat laporan keuangan',type:'m',opts:['Aplikasi Pelaporan Keuangan SPPG (berbasis Excel)','Aplikasi lainnya']});
sppgV2InsertAfter(3,'sp406',{id:'sp406_lain',code:'406a',label:'Sebutkan aplikasi lainnya (jika ada)',type:'t'});
const sp411=sppgV2Field('sp411');sp411.label='Pengeluaran bahan baku minggu lalu (berdasarkan kelompok bahan baku)';sp411.rows.push({id:'total',label:'Total',computed:true});
const sp410=sppgV2Field('sp410');sp410.label='Pengeluaran bahan baku minggu lalu (berdasarkan kelompok supplier)';
const sp413=sppgV2Field('sp413');sp413.label='Pengeluaran biaya operasional minggu lalu';
const row413={tk:'Tenaga kerja/Relawan',bbm:'Bensin/Solar/BBM lain',lpg:'LPG/BBG/Gas Kota',util:'Utilitas: Listrik, Air Bersih, dll.',sewa:'Sewa kendaraan',lain:'Biaya Operasional Lainnya'};sp413.rows.forEach(r=>{if(row413[r.id])r.label=row413[r.id];});
// Input keuangan ditampilkan sebagai Rupiah penuh, tetapi nilai JSON tetap memakai skala instrumen lama.
['sp401','sp403'].forEach(id=>Object.assign(sppgV2Field(id),{currencyScale:1000000,currencyDisplayUnit:'Rupiah'}));
['sp410','sp411','sp413'].forEach(id=>Object.assign(sppgV2Field(id),{currencyScale:1000000,currencyDisplayUnit:'Rupiah'}));
Object.assign(sppgV2Field('sp412'),{currencyScale:1000,currencyDisplayUnit:'Rupiah/kg'});
sppgV2Replace(3,'sp414',{id:'sp414',code:'414',label:'Kendala terkait proses penyiapan dan distribusi MBG di SPPG (bisa lebih dari satu)',type:'m',opts:['Ketersediaan bahan baku','Harga bahan baku meningkat','Pembayaran ke supplier terhambat','Petty cash tidak mencukupi','Keterlambatan pencairan anggaran dari BGN','Lainnya']});
sppgV2InsertAfter(3,'sp414',{id:'sp414_lain',code:'414a',label:'Lainnya, sebutkan',type:'t'});
FORM_SPPG_V2.sections.forEach(sec=>sec.fields.forEach(f=>{if(!f.code){const m=f.id.match(/^sp(\d+)/);if(m)f.code=m[1];}}));
const FORM_SPPG=FORM_SPPG_V2;

/* ---- Naker: Form Tenaga Kerja (sheet "Naker" - 3 bagian, 10 butir) ---- */
const FORM_NAKER={key:'NAKER',title:'DAFTAR PERTANYAAN UNTUK TENAGA KERJA',purpose:'Mengetahui Dampak MBG terhadap Tenaga Kerja',dur:'6 menit',sections:[
  {title:'Bagian 1. Lokasi dan Identitas Responden',fields:[
    {id:'nk101',label:'Nama Responden',type:'t'},
    {id:'nk102',label:'Jabatan/Posisi Responden',type:'c',opts:['Kepala SPPG','Ahli Gizi','Juru Masak','Juru Cuci','Koordinator Lapangan','Pengemudi','Akuntan','Lainnya']},
    {id:'nk103',label:'Pendidikan Terakhir Responden',type:'c',opts:['Tidak Tamat SD','SD/sederajat','SMP/sederajat','SMA/sederajat','Diploma/S-1','S2/S3']},
    {id:'nk104',label:'Bekerja di SPPG Sejak (bulan/tahun)',type:'t'},
    {id:'nk105',label:'Nama SPPG',type:'t'},
    {id:'nk106',label:'Provinsi',type:'c',opts:['Jawa Tengah']},
    {id:'nk107',label:'Kabupaten/Kota',type:'c',opts:['Kota Pekalongan','Kab. Pekalongan','Kab. Batang']}
  ]},
  {title:'Bagian 2. Pertanyaan terkait Pekerjaan',fields:[
    {id:'nk201',label:'Apakah Anda telah bekerja sebelumnya?',type:'c',opts:['Ya','Tidak']},
    {id:'nk202',label:'Di sektor apakah Anda bekerja sebelumnya',type:'s',opts:['Pertanian, Kehutanan, Perikanan','Pertambangan/Penggalian','Industri Pengolahan/Manufaktur','Pengadaan Listrik & Gas','Pengadaan Air, Pengelolaan Sampah, Limbah','Konstruksi','Perdagangan Besar & Eceran; Reparasi Mobil/Motor','Transportasi & Pergudangan','Akomodasi & Makan Minum','Informasi & Komunikasi','Jasa Keuangan & Asuransi','Real Estate','Jasa Perusahaan','Administrasi Pemerintahan, Pertahanan, Jaminan Sosial','Jasa Pendidikan','Jasa Kesehatan & Kegiatan Sosial','Jasa Lainnya']},
    {id:'nk203',label:'Rata-rata upah bulanan pada pekerjaan sebelumnya',type:'n',unit:'Rp/bulan'},
    {id:'nk204',label:'Kegiatan utama Anda sebelum bekerja di SPPG',type:'c',opts:['Mencari Pekerjaan','Ibu/Bapak Rumah Tangga','Sekolah','Pensiun','Lainnya']},
    {id:'nk205',label:'Hari kerja rata-rata dalam sepekan di SPPG ini',type:'n',unit:'hari/minggu'},
    {id:'nk206',label:'Jam rata-rata per hari bekerja di SPPG ini',type:'n',unit:'jam/hari'},
    {id:'nk207',label:'Rata-rata upah satu bulan terakhir di SPPG ini',type:'n',unit:'Rp/bulan'},
    {id:'nk208',label:'Apakah terdapat pembayaran lembur di SPPG ini?',type:'yn'},
    {id:'nk209',label:'Apakah Anda memiliki pekerjaan lain selain SPPG ini?',type:'yn'}
  ]},
  {title:'Bagian 3. Evaluasi Operasional, Kendala, dan Dampak MBG',fields:[
    {id:'nk301',label:'Apakah sudah tersedia SOP tertulis yang jelas di posisi Anda?',type:'c',opts:['Ya, sudah ada dan sangat jelas','Sudah ada, tetapi kurang jelas/sulit diterapkan','Belum ada SOP tertulis sama sekali']},
    {id:'nk302',label:'Pernah mendapat pengarahan khusus SOP sebelum program berjalan?',type:'c',opts:['Ya, pernah','Tidak pernah']},
    {id:'nk303',label:'Seberapa sering pekerjaan menyimpang dari SOP?',type:'c',opts:['Sering sekali','Kadang-kadang','Tidak pernah / Selalu sesuai SOP']},
    {id:'nk304',label:'Kendala terbesar yang paling sering dihadapi (boleh lebih dari satu)',type:'m',opts:['Keterbatasan alat kerja/fasilitas kurang memadai','Manajemen waktu (waktu pengerjaan sempit)','Jumlah tenaga kerja kurang (beban kerja berat)','Masalah komunikasi/koordinasi antar-tim','Keterlambatan pasokan bahan baku/logistik','Sistem pelaporan administrasi terlalu rumit','Lainnya']},
    {id:'nk305',label:'Solusi/inovasi/perbaikan mandiri yang sudah dilakukan di lapangan',type:'ta'},
    {id:'nk306',label:'Kendala dalam menyalurkan MBG di lapangan (boleh lebih dari satu)',type:'m',opts:['Keterlambatan distribusi makanan','Banyak sisa makanan terbuang (food waste)','Kurangnya koordinasi/instruksi dari atasan','Lingkungan kerja kurang nyaman','Pengelolaan sampah/limbah kurang baik','Selisih data penerima tidak sesuai','Gangguan Kesehatan/Keracunan','Penurunan kualitas/kesegaran makanan','Tidak ada hambatan, semua lancar']},
    {id:'nk307',label:'Usulan perbaikan paling mendesak untuk manajemen pusat/SPPG',type:'ta'},
    {id:'nk308',label:'Dampak penghasilan SPPG terhadap ekonomi keluarga',type:'c',opts:['Sangat membantu meningkatkan taraf hidup','Cukup membantu kebutuhan pokok sehari-hari','Belum cukup untuk kebutuhan pokok','Tidak memberi perubahan berarti']},
    {id:'nk309',label:'Dampak positif lain yang dirasakan (boleh lebih dari satu)',type:'m',opts:['Mendapat keterampilan baru','Bangga berkontribusi untuk gizi anak','Memiliki jaringan pertemanan/relasi','Tidak ada dampak lain']},
    {id:'nk310',label:'Dampak ekonomi SPPG bagi lingkungan/pelaku usaha sekitar',type:'ta'}
  ]}
]};
FORM_NAKER.sections.forEach(section=>section.fields.forEach(field=>{
  if(['nk203','nk207'].includes(field.id))Object.assign(field,{currencyScale:1,currencyDisplayUnit:'Rupiah/bulan'});
}));
const FORMS={SPPG:FORM_SPPG_V2,NAKER:FORM_NAKER};
function getSppgFormDefinition(form){return form&&form.version===SPPG_FORM_VERSION?FORM_SPPG_V2:FORM_SPPG_V1;}
function getActiveSppgFormDefinition(){return currentSppgFormVersion===SPPG_FORM_VERSION?FORM_SPPG_V2:FORM_SPPG_V1;}
function normalizeSppgForm(form){
  const src=form||{},out={version:src.version||'SPPG-V1',fields:JSON.parse(JSON.stringify(src.fields||{}))},f=out.fields;
  if(!f.sp_waktu_proses){f.sp_waktu_proses={};['sp303','sp304','sp305','sp306','sp307'].forEach(k=>f.sp_waktu_proses[k]={tahap1:f[k]||'',tahap2:''});}
  ['sp303','sp304','sp305','sp306','sp307'].forEach(k=>{if(!f[k]&&f.sp_waktu_proses[k])f[k]=f.sp_waktu_proses[k].tahap1||'';});
  if(f.sp405&&!Array.isArray(f.sp405)&&typeof f.sp405==='object'){const map={harian:'Harian',duamingguan:'Dua mingguan',bulanan:'Bulanan'};f.sp405=Object.keys(map).filter(k=>String(f.sp405[k]||'').toLowerCase()==='ya').map(k=>map[k]);}
  if(f.sp406&&!Array.isArray(f.sp406)&&typeof f.sp406==='object'){const a=[];if(String(f.sp406.apl||'').toLowerCase()==='ya')a.push('Aplikasi Pelaporan Keuangan SPPG (berbasis Excel)');if(String(f.sp406.lain||'').toLowerCase()==='ya')a.push('Aplikasi lainnya');f.sp406=a;}
  if(f.sp411&&typeof f.sp411==='object'){f.sp411.total=calculateSppg411Totals(f.sp411);}
  out.fields=normalizeSppg204Fields(f);
  return out;
}
window.normalizeSppgForm=normalizeSppgForm;
const ALL_FIELD_LABEL={};
[FORM_SPPG_V1,FORM_SPPG_V2,FORM_NAKER].forEach(F=>F.sections.forEach(s=>s.fields.forEach(f=>ALL_FIELD_LABEL[f.id]=f.label)));
const SPPG_FIELD_LABEL=ALL_FIELD_LABEL;


/* Public action bridge for existing HTML controls. */
Object.assign(globalThis, { SKALA_KDMP, KATEGORI_KDMP, FORM_KDMP, COMPLIANCE_KDMP, FORM_SPPG_V1, SPPG_FORM_VERSION, FORM_SPPG_V2, FORM_SPPG, FORM_NAKER, FORMS, ALL_FIELD_LABEL, SPPG_FIELD_LABEL });
Object.defineProperties(globalThis, {
  editMonId: { configurable: true, get: () => editMonId, set: value => { editMonId = value; } },
  currentRekamJenis: { configurable: true, get: () => currentRekamJenis, set: value => { currentRekamJenis = value; } },
  currentRekamForm: { configurable: true, get: () => currentRekamForm, set: value => { currentRekamForm = value; } },
  currentPreviewHasil: { configurable: true, get: () => currentPreviewHasil, set: value => { currentPreviewHasil = value; } },
  currentSppgFormVersion: { configurable: true, get: () => currentSppgFormVersion, set: value => { currentSppgFormVersion = value; } }
});
Object.assign(globalThis, { kategoriDariSkor, kdmpColor, kdmpAc, sppgV2Field, sppgV2Replace, sppgV2InsertAfter, getSppgFormDefinition, getActiveSppgFormDefinition, normalizeSppgForm });
