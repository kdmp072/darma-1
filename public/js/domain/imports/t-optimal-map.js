/* T-OPTIMAL -> DARMA-1 importer adapter.
 * The raw JSON is never changed. Currency normalization is applied only to
 * the mapped fields that will be stored by DARMA-1.
 */

export const TOPTIMAL_SHEETS = Object.freeze({
  SPPG: 'Resp_MBG_SPPG',
  NAKER: 'Resp_MBG_Naker'
});

export const TOPTIMAL_CURRENCY_RULES = Object.freeze({
  sp401: { sourceUnit: 'Rupiah', targetUnit: 'Rp Juta', divisor: 1000000 },
  sp403: { sourceUnit: 'Rupiah', targetUnit: 'Rp Juta', divisor: 1000000 },
  sp410: { sourceUnit: 'Rupiah atau angka Rp Juta lama', targetUnit: 'Rp Juta', divisor: 1000000, mode: 'mixed-auto' },
  sp411: { sourceUnit: 'Rupiah', targetUnit: 'Rp Juta', divisor: 1000000 },
  sp412: { sourceUnit: 'Rupiah/kg', targetUnit: 'Rp Ribu/kg', divisor: 1000 },
  sp413: { sourceUnit: 'Rupiah', targetUnit: 'Rp Juta', divisor: 1000000 },
  nk203: { sourceUnit: 'Rupiah/bulan', targetUnit: 'Rupiah/bulan', divisor: 1 },
  nk207: { sourceUnit: 'Rupiah/bulan', targetUnit: 'Rupiah/bulan', divisor: 1 }
});

function first(raw, ...keys) {
  for (const key of keys) {
    if (raw && raw[key] !== undefined && raw[key] !== null && raw[key] !== '') return raw[key];
  }
  return '';
}

function text(value) {
  if (Array.isArray(value)) return value.join('; ');
  return value === undefined || value === null ? '' : String(value);
}

function cleanChoice(value) {
  return text(value).replace(/^\s*[0-9]+[.)]\s*/, '').replace(/^\s*[a-zA-Z][.)]\s*/, '').replace(/^\((.*)\)$/, '$1').replace(/\s+/g, ' ').trim();
}

function canonicalProvince(value) {
  const v = text(value).trim().toUpperCase();
  return v.includes('JAWA TENGAH') ? 'Jawa Tengah' : text(value).trim();
}

function canonicalKabupaten(value, kecamatan = '') {
  const v = text(value).trim().toUpperCase();
  const k = text(kecamatan).trim().toUpperCase();
  if (v.includes('KOTA PEKALONGAN') || (v === 'PEKALONGAN' && /PEKALONGAN (BARAT|TIMUR|UTARA|SELATAN)/.test(k))) return 'Kota Pekalongan';
  if (v.includes('PEKALONGAN')) return 'Kab. Pekalongan';
  if (v.includes('KOTA BATANG') || v === 'BATANG') return 'Kab. Batang';
  return text(value).trim();
}

function canonicalPeriode(value) {
  const v = cleanChoice(value).toLowerCase();
  if (v.includes('2 mingguan') || v.includes('dua mingguan')) return 'Dua mingguan';
  if (v.includes('bulanan')) return 'Bulanan';
  if (v.includes('mingguan')) return 'Mingguan';
  if (v.includes('harian')) return 'Harian';
  return cleanChoice(value);
}

function canonicalWaktuTempuh(value) {
  const v = cleanChoice(value).replace(/\s+/g, ' ');
  if (/^<\s*15/i.test(v)) return '< 15 menit';
  if (/^<\s*30/i.test(v)) return '< 30 menit';
  if (/>\s*30/i.test(v)) return '> 30 menit, sebutkan';
  return v;
}

function canonicalSampah(value) {
  const v = cleanChoice(value);
  if (/didaur ulang/i.test(v)) return 'Didaur ulang / dimanfaatkan kembali';
  if (/dibuang ke tpa/i.test(v)) return 'Dibuang ke TPA';
  if (/dibuang ke sungai/i.test(v)) return 'Dibuang ke sungai/laut/pesisir';
  return v;
}

function yesNo(value) {
  const v = cleanChoice(value).toLowerCase();
  if (v === 'ya' || v === 'yes') return 'Ya';
  if (v === 'tidak' || v === 'no') return 'Tidak';
  return cleanChoice(value);
}

function parseNominal(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  let source = String(value).trim().replace(/^rp\s*/i, '').replace(/\s/g, '');
  if (!source) return '';
  // Indonesian thousands notation: 250.000.000 or 18.500. Keep a
  // decimal dot when the source is an explicit decimal such as 2240421.78.
  const hasDot = source.includes('.'), hasComma = source.includes(',');
  if (hasDot && hasComma) {
    if (source.lastIndexOf(',') > source.lastIndexOf('.')) source = source.replace(/\./g, '').replace(',', '.');
    else source = source.replace(/,/g, '');
  } else if (/^[-+]?\d{1,3}(\.\d{3})+$/.test(source)) source = source.replace(/\./g, '');
  else if (/^[-+]?\d{1,3}(,\d{3})+$/.test(source)) source = source.replace(/,/g, '');
  else if (hasComma) source = source.replace(',', '.');
  const digits = source.replace(/[^0-9+\-.]/g, '');
  const number = Number(digits);
  return Number.isFinite(number) ? number : '';
}

export function toDarmaStored(value, divisor) {
  const nominal = parseNominal(value);
  if (nominal === '') return '';
  const stored = nominal / Number(divisor || 1);
  return Number.isFinite(stored) ? Number(stored.toFixed(6)) : '';
}

// Pada contoh nyata q410 bercampur: 86.996.400 adalah Rupiah penuh,
// sedangkan 1 dan 15 bermakna 1 juta dan 15 juta. Nilai kecil diperlakukan
// sebagai angka Rp Juta lama sehingga nilai DARMA akhirnya tetap 1 dan 15.
export function toDarmaSupplierStored(value) {
  const nominal = parseNominal(value);
  if (nominal === '') return '';
  if (nominal > 0 && nominal < 100000) return Number(nominal.toFixed(6));
  return toDarmaStored(nominal, 1000000);
}

function numberOrText(value) {
  if (value === undefined || value === null || value === '') return '';
  const n = Number(value);
  return Number.isFinite(n) ? n : String(value);
}

function checked(raw, key) {
  const value = raw ? raw[key] : '';
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  return ['ya', 'yes', '1', 'true', 'checked'].includes(String(value || '').trim().toLowerCase());
}

function selected(raw, group, matcher, fallbackKey = '') {
  const value = raw ? raw[group] : '';
  const values = Array.isArray(value) ? value : (value === undefined || value === null ? [] : [value]);
  if (values.some(item => matcher(String(item)))) return true;
  return fallbackKey ? checked(raw, fallbackKey) : false;
}

function sumRows(rows) {
  const total = { dalam: 0, luar: 0 };
  let hasValue = false;
  Object.entries(rows).forEach(([key, value]) => {
    if (key === 'total' || !value || typeof value !== 'object') return;
    if (value.dalam !== '') { total.dalam += Number(value.dalam || 0); hasValue = true; }
    if (value.luar !== '') { total.luar += Number(value.luar || 0); hasValue = true; }
  });
  return hasValue ? { dalam: Number(total.dalam.toFixed(6)), luar: Number(total.luar.toFixed(6)) } : { dalam: '', luar: '' };
}

function mapSppg(raw, fileUrl = '') {
  const rawKec = text(first(raw, 'kecamatan', 'kecamatanSurvei'));
  const rawKab = first(raw, 'kabkota', 'kabupaten', 'kabupatenSurvei');
  const f = {
    version: 'SPPG-2026-08',
    sp101: text(first(raw, 'q101_namaSPPG', 'namaSPPG')),
    sp102: canonicalProvince(first(raw, 'provinsi', 'provinsiSurvei')),
    sp103: canonicalKabupaten(rawKab, rawKec),
    sp104: yesNo(first(raw, 'q104_beroperasi', 'beroperasi')),
    sp105: cleanChoice(first(raw, 'q105_alasanUtama', 'alasanUtama')),
    sp105_lain: text(first(raw, 'q105_alasanLainnya', 'alasanLainnya')),
    sp106: text(first(raw, 'q106_tglBeroperasi', 'tglBeroperasi')),
    sp107: text(first(raw, 'q107_namaResponden', 'namaResponden')),
    sp108: cleanChoice(first(raw, 'q108_jabatan', 'jabatan')),
    sp108_lain: text(raw.q108_jabatanLainnya),
    sp109: text(first(raw, 'q109_petugasWawancara', 'petugasWawancara')),
    sp110: text(first(raw, 'q110_tglWawancara', 'tglWawancara')),
    sp201: {
      siswa: numberOrText(raw.q201_siswa), ibuhamil: numberOrText(raw.q201_ibuHamilMenyusui),
      balita: numberOrText(raw.q201_balita), guru: numberOrText(raw.q201_guruTendik), posyandu: numberOrText(raw.q201_kaderPosyandu)
    },
    sp202: {
      paud: numberOrText(raw.q202_sekolahPAUD), tk: numberOrText(raw.q202_sekolahTKRA),
      sd: numberOrText(raw.q202_sekolahSD), smp: numberOrText(raw.q202_sekolahSMP), sma: numberOrText(raw.q202_sekolahSMA)
    },
    sp203: numberOrText(raw.q203_hariPenyaluran),
    sp204: canonicalWaktuTempuh(first(raw, 'q204_waktuTempuh', 'waktuTempuh')),
    sp204_detail: numberOrText(first(raw, 'q204_waktuTempuhKet', 'waktuTempuhKet')),
    sp205: numberOrText(raw.q205_totalPekerja), sp206: numberOrText(raw.q206_totalJuruMasak),
    sp207: numberOrText(raw.q207_hariKerjaUpah),
    sp208: cleanChoice(first(raw, 'q208_persentaseBPJS', 'persentaseBPJS')),
    sp301: yesNo(first(raw, 'q301_pengawasanEksternal', 'pengawasanEksternal')),
    sp302: {
      kppg: numberOrText(raw.q302_a_kppg), dinkes: numberOrText(raw.q302_b_dinkes),
      tni: numberOrText(raw.q302_c_tniPolri), lain: numberOrText(raw.q302_d_lainnya), lain_keterangan: text(raw.q302_d_lainnyaKet)
    },
    sp_waktu_proses: {
      sp303: { tahap1: text(raw.q303_tahap1), tahap2: text(raw.q303_tahap2) },
      sp304: { tahap1: text(raw.q304_tahap1), tahap2: text(raw.q304_tahap2) },
      sp305: { tahap1: text(raw.q305_tahap1), tahap2: text(raw.q305_tahap2) },
      sp306: { tahap1: text(raw.q306_tahap1), tahap2: text(raw.q306_tahap2) },
      sp307: { tahap1: text(raw.q307_tahap1), tahap2: text(raw.q307_tahap2) }
    },
    sp308: cleanChoice(first(raw, 'q308_ujiSampel', 'ujiSampel')), sp308_lain: text(raw.q308_ujiSampelLainnya),
    sp309: cleanChoice(first(raw, 'q309_sumberAir', 'sumberAir')), sp309_lain: text(raw.q309_sumberAirLainnya),
    sp310: yesNo(first(raw, 'q310_gangguanPencernaan', 'gangguanPencernaan')), sp310_kapan: cleanChoice(raw.q310_kapan),
    sp311: canonicalSampah(first(raw, 'q311_pengelolaanSampah', 'pengelolaanSampah')), sp311_lain: text(raw.q311_pengelolaanSampahLainnya),
    sp312: text(first(raw, 'q312_kendalaPenyiapan', 'kendalaPenyiapan')), sp313: numberOrText(raw.q312_frekuensiMingguLalu),
    // T-OPTIMAL stores these as full Rupiah; DARMA stores Rp Juta.
    sp401: toDarmaStored(raw.q401_saldoVA, 1000000), sp402: yesNo(first(raw, 'q402_saldoLebih500jt', 'saldoLebih500jt')),
    sp403: toDarmaStored(raw.q403_nilaiTopup, 1000000), sp404: numberOrText(raw.q404_rentangTopup),
    sp405: [checked(raw, 'q405_harian') ? 'Harian' : '', checked(raw, 'q405_duaMingguan') ? 'Dua mingguan' : '', checked(raw, 'q405_bulanan') ? 'Bulanan' : ''].filter(Boolean),
    sp406: [checked(raw, 'q406_aplikasiSPPG') ? 'Aplikasi Pelaporan Keuangan SPPG (berbasis Excel)' : '', checked(raw, 'q406_aplikasiLainnya') ? 'Aplikasi lainnya' : ''].filter(Boolean),
    sp406_lain: text(raw.q406_aplikasiLainnyaKet), sp407: canonicalPeriode(first(raw, 'q407_periodeInsentif', 'periodeInsentif')),
    sp408: numberOrText(raw.q408_hariInsentif), sp409: numberOrText(raw.q409_jumlahSupplier),
    sp410: {
      kdkmp: toDarmaSupplierStored(raw.q410_a_kdkmp), bumdes: toDarmaSupplierStored(raw.q410_b_bumdesKoperasi),
      agen: toDarmaSupplierStored(raw.q410_c_agenPasar), distributor: toDarmaSupplierStored(raw.q410_d_distributor),
      produsen: toDarmaSupplierStored(raw.q410_e_produsen), umkm: toDarmaSupplierStored(raw.q410_f_umkm)
    },
    sp411: {
      pokok: { dalam: toDarmaStored(raw.q411_a_pokok_dalamKota, 1000000), luar: toDarmaStored(raw.q411_a_pokok_luarKota, 1000000) },
      lauk: { dalam: toDarmaStored(raw.q411_b_lauk_dalamKota, 1000000), luar: toDarmaStored(raw.q411_b_lauk_luarKota, 1000000) },
      sayur: { dalam: toDarmaStored(raw.q411_c_sayur_dalamKota, 1000000), luar: toDarmaStored(raw.q411_c_sayur_luarKota, 1000000) },
      buah: { dalam: toDarmaStored(raw.q411_d_buah_dalamKota, 1000000), luar: toDarmaStored(raw.q411_d_buah_luarKota, 1000000) },
      minum: { dalam: toDarmaStored(raw.q411_e_minuman_dalamKota, 1000000), luar: toDarmaStored(raw.q411_e_minuman_luarKota, 1000000) },
      lain: { dalam: toDarmaStored(raw.q411_f_lainnya_dalamKota, 1000000), luar: toDarmaStored(raw.q411_f_lainnya_luarKota, 1000000) }
    },
    sp412: {
      beras: { ini: toDarmaStored(raw.q412_a_beras_bulanIni, 1000), lalu: toDarmaStored(raw.q412_a_beras_bulanLalu, 1000) },
      ayam: { ini: toDarmaStored(raw.q412_b_ayam_bulanIni, 1000), lalu: toDarmaStored(raw.q412_b_ayam_bulanLalu, 1000) },
      telur: { ini: toDarmaStored(raw.q412_c_telur_bulanIni, 1000), lalu: toDarmaStored(raw.q412_c_telur_bulanLalu, 1000) },
      susu: { ini: toDarmaStored(raw.q412_d_susu_bulanIni, 1000), lalu: toDarmaStored(raw.q412_d_susu_bulanLalu, 1000) }
    },
    sp413: {
      tk: toDarmaStored(raw.q413_a_tenagaKerja, 1000000), bbm: toDarmaStored(raw.q413_b_bbm, 1000000),
      lpg: toDarmaStored(raw.q413_c_lpg, 1000000), util: toDarmaStored(raw.q413_d_utilitas, 1000000),
      sewa: toDarmaStored(raw.q413_e_sewaKendaraan, 1000000), lain: toDarmaStored(raw.q413_f_lainnya, 1000000)
    },
    sp414: [
      selected(raw, 'q414_kendala', v => /ketersediaan bahan baku/i.test(v), 'q414_kendala_1') ? 'Ketersediaan bahan baku' : '',
      selected(raw, 'q414_kendala', v => /harga bahan baku/i.test(v), 'q414_kendala_2') ? 'Harga bahan baku meningkat' : '',
      selected(raw, 'q414_kendala', v => /pembayaran ke supplier/i.test(v), 'q414_kendala_3') ? 'Pembayaran ke supplier terhambat' : '',
      selected(raw, 'q414_kendala', v => /petty cash/i.test(v), 'q414_kendala_4') ? 'Petty cash tidak mencukupi' : '',
      selected(raw, 'q414_kendala', v => /keterlambatan pencairan/i.test(v), 'q414_kendala_5') ? 'Keterlambatan pencairan anggaran dari BGN' : '',
      selected(raw, 'q414_kendala', v => /lainnya/i.test(v), 'q414_kendala_6') ? 'Lainnya' : ''
    ].filter(Boolean),
    sp414_lain: text(raw.q414_kendalaLainnyaKet), sp_link_lampiran: text(first(raw, 'sp_link_lampiran', 'linkLampiran', 'buktiSurvei')) || text(fileUrl)
  };
  f.sp411.total = sumRows(f.sp411);
  return f;
}

function mapNaker(raw) {
  return {
    nk101: text(first(raw, 'q101_namaResponden', 'namaResponden')), nk102: cleanChoice(first(raw, 'q102_jabatan', 'jabatan')), nk102_lain: text(raw.q102_jabatanLainnya),
    nk103: cleanChoice(first(raw, 'q103_pendidikan', 'pendidikan')), nk104: text(first(raw, 'q104_bekerjaSejak', 'bekerjaSejak')),
    nk105: text(first(raw, 'q105_namaSPPG', 'namaSPPG')), nk106: canonicalProvince(first(raw, 'provinsi', 'provinsiSurvei')), nk107: canonicalKabupaten(first(raw, 'kabkota', 'kabupaten', 'kabupatenSurvei'), first(raw, 'kecamatan', 'kecamatanSurvei')),
    nk201: yesNo(first(raw, 'q201_pernahBekerja', 'pernahBekerja')), nk202: cleanChoice(first(raw, 'q202_sektorSebelumnya', 'sektorSebelumnya')),
    nk203: toDarmaStored(raw.q203_upahSebelumnya, 1), nk204: cleanChoice(first(raw, 'q204_kegiatanSebelumnya', 'kegiatanSebelumnya')), nk204_lain: text(raw.q204_kegiatanLainnya),
    nk205: numberOrText(raw.q205_hariKerjaPerMinggu), nk206: numberOrText(raw.q206_jamKerjaPerHari), nk207: toDarmaStored(raw.q207_upahSPPG, 1),
    nk208: yesNo(first(raw, 'q208_pembayaranLembur', 'pembayaranLembur')), nk209: yesNo(first(raw, 'q209_pekerjaanLain', 'pekerjaanLain')),
    nk301: cleanChoice(first(raw, 'q301_sopTertulis', 'sopTertulis')), nk302: cleanChoice(first(raw, 'q302_pengarahanSOP', 'pengarahanSOP')),
    nk303: cleanChoice(first(raw, 'q303_frekuensiMenyimpangSOP', 'frekuensiMenyimpangSOP')),
    nk304: [
      selected(raw, 'q304_kendalaTerbesar', v => /keterbatasan alat kerja/i.test(v), 'q304_kendalaTerbesar_1') ? 'Keterbatasan alat kerja/fasilitas kurang memadai' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /manajemen waktu/i.test(v), 'q304_kendalaTerbesar_2') ? 'Manajemen waktu (waktu pengerjaan sempit)' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /jumlah tenaga kerja/i.test(v), 'q304_kendalaTerbesar_3') ? 'Jumlah tenaga kerja kurang (beban kerja berat)' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /komunikasi|koordinasi/i.test(v), 'q304_kendalaTerbesar_4') ? 'Masalah komunikasi/koordinasi antar-tim' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /keterlambatan pasokan/i.test(v), 'q304_kendalaTerbesar_5') ? 'Keterlambatan pasokan bahan baku/logistik' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /pelaporan administrasi/i.test(v), 'q304_kendalaTerbesar_6') ? 'Sistem pelaporan administrasi terlalu rumit' : '',
      selected(raw, 'q304_kendalaTerbesar', v => /lainnya/i.test(v), 'q304_kendalaTerbesar_7') ? 'Lainnya' : ''
    ].filter(Boolean),
    nk304_lain: text(raw.q304_kendalaTerbesarLainnyaKet), nk305: text(raw.q305_solusiKendala),
    nk306: [
      selected(raw, 'q306_kendalaMBG', v => /keterlambatan distribusi/i.test(v), 'q306_kendalaMBG_a') ? 'Keterlambatan distribusi makanan' : '',
      selected(raw, 'q306_kendalaMBG', v => /sisa makanan|food waste/i.test(v), 'q306_kendalaMBG_b') ? 'Banyak sisa makanan terbuang (food waste)' : '',
      selected(raw, 'q306_kendalaMBG', v => /koordinasi|instruksi/i.test(v), 'q306_kendalaMBG_c') ? 'Kurangnya koordinasi/instruksi dari atasan' : '',
      selected(raw, 'q306_kendalaMBG', v => /lingkungan kerja/i.test(v), 'q306_kendalaMBG_d') ? 'Lingkungan kerja kurang nyaman' : '',
      selected(raw, 'q306_kendalaMBG', v => /sampah|limbah/i.test(v), 'q306_kendalaMBG_e') ? 'Pengelolaan sampah/limbah kurang baik' : '',
      selected(raw, 'q306_kendalaMBG', v => /selisih data penerima/i.test(v), 'q306_kendalaMBG_f') ? 'Selisih data penerima tidak sesuai' : '',
      selected(raw, 'q306_kendalaMBG', v => /gangguan kesehatan|keracunan/i.test(v), 'q306_kendalaMBG_g') ? 'Gangguan Kesehatan/Keracunan' : '',
      selected(raw, 'q306_kendalaMBG', v => /penurunan kualitas|kesegaran/i.test(v), 'q306_kendalaMBG_h') ? 'Penurunan kualitas/kesegaran makanan' : '',
      selected(raw, 'q306_kendalaMBG', v => /tidak ada hambatan/i.test(v), 'q306_kendalaMBG_i') ? 'Tidak ada hambatan, semua lancar' : ''
    ].filter(Boolean),
    nk307: text(raw.q307_usulanPerbaikan), nk308: cleanChoice(first(raw, 'q308_dampakPenghasilan', 'dampakPenghasilan')),
    nk309: [
      selected(raw, 'q309_dampakPositifLain', v => /keterampilan baru/i.test(v), 'q309_dampakPositifLain_1') ? 'Mendapat keterampilan baru' : '',
      selected(raw, 'q309_dampakPositifLain', v => /bangga|berkontribusi/i.test(v), 'q309_dampakPositifLain_2') ? 'Bangga berkontribusi untuk gizi anak' : '',
      selected(raw, 'q309_dampakPositifLain', v => /jaringan|relasi/i.test(v), 'q309_dampakPositifLain_3') ? 'Memiliki jaringan pertemanan/relasi' : '',
      selected(raw, 'q309_dampakPositifLain', v => /tidak ada dampak/i.test(v), 'q309_dampakPositifLain_4') ? 'Tidak ada dampak lain' : ''
    ].filter(Boolean), nk310: text(raw.q310_dampakEkonomiSekitar)
  };
}

export function detectTOptimalType(record) {
  const sheet = String(record?.sheetName || record?.sheet || '').toLowerCase();
  return sheet.includes('naker') || sheet.includes('tenaga') ? 'NAKER' : 'SPPG';
}

export function mapTOptimalRecord(record) {
  const raw = record?.formData || record?.response?.formData || {};
  const formType = detectTOptimalType(record);
  const fileUrl = record?.fileUrl || record?.response?.fileUrl || '';
  const fields = formType === 'NAKER' ? mapNaker(raw) : mapSppg(raw, fileUrl);
  const name = formType === 'NAKER' ? text(first(raw, 'q105_namaSPPG', 'namaSPPG')) : text(first(raw, 'q101_namaSPPG', 'namaSPPG'));
  const kec = text(first(raw, 'kecamatan', 'kecamatanSurvei'));
  const kab = canonicalKabupaten(first(raw, 'kabkota', 'kabupaten', 'kabupatenSurvei'), kec);
  const desa = text(first(raw, 'desa', 'desaSurvei'));
  const tgl = formType === 'SPPG' ? text(first(raw, 'q110_tglWawancara', 'tglWawancara')) : text(first(raw, 'tanggalWawancara', 'tglWawancara', 'tanggal'));
  const sourceId = String(record?.sourceId || record?.id || record?.responseId || '');
  const sheetName = String(record?.sheetName || record?.sheet || (formType === 'NAKER' ? TOPTIMAL_SHEETS.NAKER : TOPTIMAL_SHEETS.SPPG));
  return {
    sourceSystem: 'T-OPTIMAL', sourceId, sheetName, formType, fields, raw,
    identity: { name, kab, kec, desa, lat: text(first(raw, 'latitude', 'lat')), lng: text(first(raw, 'longitude', 'lng')) },
    tgl, petugas: text(first(raw, 'namaSurveyor', 'surveyor', 'surveyorEmail', 'q109_petugasWawancara')), fileUrl,
    sourceUpdatedAt: text(record?.summary?.editedAt || record?.summary?.timestamp || record?.exportedAt || '')
  };
}

export function normalizeTOptimalBundle(bundle) {
  const records = Array.isArray(bundle) ? bundle : (bundle?.records || []);
  return records.map(mapTOptimalRecord);
}
