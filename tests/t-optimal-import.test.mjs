import test from 'node:test';
import assert from 'node:assert/strict';
import { mapTOptimalRecord, toDarmaStored, toDarmaSupplierStored } from '../public/js/domain/imports/t-optimal-map.js';

test('currency conversion preserves DARMA storage scales', () => {
  assert.equal(toDarmaStored('Rp250.000.000', 1_000_000), 250);
  assert.equal(toDarmaStored('18.500', 1_000), 18.5);
  assert.equal(toDarmaStored('2240421.78', 1_000_000), 2.240422);
  assert.equal(toDarmaStored(3_000_000, 1), 3_000_000);
  assert.equal(toDarmaSupplierStored(1), 1);
  assert.equal(toDarmaSupplierStored(15), 15);
  assert.equal(toDarmaSupplierStored(98_500_000), 98.5);
});

test('SPPG finance fields are normalized from full Rupiah', () => {
  const mapped = mapTOptimalRecord({
    sheetName: 'Resp_MBG_SPPG', sourceId: 'currency-1',
    formData: {
      q101_namaSPPG: 'SPPG Uji', q110_tglWawancara: '2026-08-14', latitude: -6.9, longitude: 109.6,
      q401_saldoVA: '250000000', q403_nilaiTopup: '125.500.000',
      q410_a_kdkmp: '100000000', q411_a_pokok_dalamKota: '50000000', q411_a_pokok_luarKota: '25000000',
      q412_a_beras_bulanIni: '18500', q412_a_beras_bulanLalu: '17000',
      q413_a_tenagaKerja: '6000000'
    }
  });

  assert.equal(mapped.identity.lat, '-6.9');
  assert.equal(mapped.identity.lng, '109.6');
  assert.equal(mapped.fields.sp401, 250);
  assert.equal(mapped.fields.sp403, 125.5);
  assert.equal(mapped.fields.sp410.kdkmp, 100);
  assert.deepEqual(mapped.fields.sp411.pokok, { dalam: 50, luar: 25 });
  assert.deepEqual(mapped.fields.sp411.total, { dalam: 50, luar: 25 });
  assert.deepEqual(mapped.fields.sp412.beras, { ini: 18.5, lalu: 17 });
  assert.equal(mapped.fields.sp413.tk, 6);
});

test('Naker wages remain full Rupiah and checkbox groups are arrays', () => {
  const mapped = mapTOptimalRecord({
    sheetName: 'Resp_MBG_Naker', sourceId: 'currency-2',
    formData: {
      q105_namaSPPG: 'SPPG Uji', q203_upahSebelumnya: '3000000', q207_upahSPPG: '3250000',
      q304_kendalaTerbesar: ['1. Keterbatasan alat kerja / fasilitas kurang memadai'],
      q306_kendalaMBG: ['i. Tidak ada hambatan, semua berjalan lancar']
    }
  });
  assert.equal(mapped.fields.nk203, 3000000);
  assert.equal(mapped.fields.nk207, 3250000);
  assert.deepEqual(mapped.fields.nk304, ['Keterbatasan alat kerja/fasilitas kurang memadai']);
  assert.deepEqual(mapped.fields.nk306, ['Tidak ada hambatan, semua lancar']);
});
