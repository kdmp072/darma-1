import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildOperationalRows,
  classifyUnit,
  recordStatus,
  recordType
} from '../public/js/features/reports/operational/domain.js';

const units = [
  { id: 's-never', jenis: 'SPPG', nama: 'SPPG Belum', status: 'aktif', kab: 'Kab. Batang' },
  { id: 's-gap', jenis: 'SPPG', nama: 'SPPG Lama', status: 'aktif', kab: 'Kab. Batang' },
  { id: 's-naker', jenis: 'SPPG', nama: 'SPPG Naker', status: 'aktif', kab: 'Kab. Batang' },
  { id: 'k-main', jenis: 'KDMP', nama: 'KDMP Utama', status: 'aktif', kab: 'Kab. Batang' }
];

const records = [
  { id: 'm-gap', unitId: 's-gap', tgl: '2026-07-10', formType: 'SPPG', hasil: 'perbaikan' },
  { id: 'm-naker', unitId: 's-naker', tgl: '2026-08-10', formType: 'NAKER', hasil: 'baik' },
  { id: 'm-kdmp', unitId: 'k-main', tgl: '2026-08-08', formType: 'KDMP', hasil: 'baik' }
];

const periodConfig = {
  section: 'unmonitored',
  scope: 'period',
  formScope: 'main',
  start: '2026-08-01',
  end: '2026-08-12',
  status: 'all',
  search: ''
};

test('period classification distinguishes never, gap, and Naker-only', () => {
  const result = buildOperationalRows({
    units,
    records,
    config: periodConfig,
    today: '2026-08-12'
  });
  const byId = Object.fromEntries(result.rows.map(row => [row.u.id, row]));
  assert.equal(byId['s-never'].category, 'never');
  assert.equal(byId['s-gap'].category, 'period_gap');
  assert.equal(byId['s-naker'].nakerOnly, true);
  assert.match(byId['s-naker'].reason, /hanya ada respons Naker/);
  assert.equal(byId['k-main'], undefined);
});

test('all-response scope labels Naker separately from main monitoring', () => {
  const config = {
    ...periodConfig,
    section: 'monitored',
    formScope: 'any'
  };
  const result = buildOperationalRows({ units, records, config, today: '2026-08-12' });
  const naker = result.rows.find(row => row.m.id === 'm-naker');
  assert.equal(naker.status, 'naker');
  assert.match(naker.followUp, /bukan monitoring utama/);
});

test('legacy records infer their main form from unit type', () => {
  const sppg = units[0], kdmp = units[3];
  assert.equal(recordType({ jenis: 'SPPG' }, sppg), 'SPPG');
  assert.equal(recordType({ jenis: 'KDMP' }, kdmp), 'KDMP');
  assert.equal(recordStatus({ formType: 'NAKER', hasil: 'baik' }, sppg), 'naker');
});

test('classifyUnit remains pure and does not mutate inputs', () => {
  const unit = Object.freeze({ ...units[1] });
  const frozenRecords = records.map(record => Object.freeze({ ...record }));
  const before = JSON.stringify(frozenRecords);
  classifyUnit(unit, frozenRecords, periodConfig, '2026-08-12');
  assert.equal(JSON.stringify(frozenRecords), before);
});
