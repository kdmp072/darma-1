import assert from 'node:assert/strict';
import test from 'node:test';
import { createRepositories } from '../public/js/data/repositories.js';

function fixture() {
  const database = { users: [], units: [{ id: 'u1', nama: 'Unit 1' }], monitoring: [{ id: 'm1', unitId: 'u1', tgl: '2026-08-01' }] };
  const calls = [];
  const runtime = {
    getDatabase: () => database,
    persist: (kind, item) => calls.push(['save', kind, item.id]),
    remove: (kind, id) => calls.push(['remove', kind, id]),
    clear: kind => calls.push(['clear', kind])
  };
  return { database, calls, repositories: createRepositories(runtime) };
}

test('unit repository upserts and removes related monitoring', () => {
  const { database, calls, repositories } = fixture();
  repositories.units.save({ id: 'u1', nama: 'Diperbarui' });
  repositories.units.save({ id: 'u2', nama: 'Baru' });
  assert.deepEqual(database.units.map(x => x.nama), ['Diperbarui', 'Baru']);
  repositories.units.remove('u1');
  assert.equal(database.monitoring.length, 0);
  assert.deepEqual(calls.at(-1), ['remove', 'units', 'u1']);
});

test('monitoring repository sorts, saves, and clears records', () => {
  const { database, repositories } = fixture();
  repositories.monitoring.save({ id: 'm2', unitId: 'u1', tgl: '2026-08-12' });
  assert.equal(repositories.monitoring.getLatestByUnit('u1').id, 'm2');
  repositories.monitoring.remove('m1');
  assert.deepEqual(database.monitoring.map(x => x.id), ['m2']);
  repositories.monitoring.clear();
  assert.equal(database.monitoring.length, 0);
});
