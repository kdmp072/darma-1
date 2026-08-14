import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateSppg411Totals, normalizeSppg204Fields, shouldShowConditionalField } from '../public/js/domain/forms/sppg-calculations.js';

test('question 411 totals dalam and luar independently', () => {
  const totals = calculateSppg411Totals({
    pokok: { dalam: '100', luar: '25' },
    lauk: { dalam: 50, luar: 75 },
    sayur: { dalam: '', luar: '10' },
    buah: { dalam: '20.5', luar: null }
  });
  assert.deepEqual(totals, { dalam: 170.5, luar: 110 });
});

test('question 204 detail is retained only for more than 30 minutes', () => {
  assert.equal(normalizeSppg204Fields({ sp204: '> 30 menit', sp204_detail: '45' }).sp204_detail, '45');
  assert.equal(normalizeSppg204Fields({ sp204: '< 30 menit', sp204_detail: '45' }).sp204_detail, '');
  assert.equal(shouldShowConditionalField('> 30 menit', '> 30'), true);
});
