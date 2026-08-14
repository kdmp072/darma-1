import assert from 'node:assert/strict';
import test from 'node:test';
import { formatRupiahAmount, formatStoredCurrency, parseCurrencyToStored, parseRupiahAmount, storedCurrencyToAbsolute } from '../public/js/domain/forms/currency.js';

test('Rupiah uses Indonesian thousands separators', () => {
  assert.equal(formatRupiahAmount(1000000), 'Rp1.000.000,-');
  assert.equal(formatRupiahAmount(2500000), 'Rp2.500.000,-');
  assert.equal(parseRupiahAmount('Rp1.000.000,-'), 1000000);
  assert.equal(parseRupiahAmount('1,000,000.-'), 1000000);
});

test('Rp Juta display preserves legacy stored scale', () => {
  assert.equal(formatStoredCurrency(1, 1000000), 'Rp1.000.000,-');
  assert.equal(formatStoredCurrency(2.5, 1000000), 'Rp2.500.000,-');
  assert.equal(parseCurrencyToStored('Rp2.500.000,-', 1000000), 2.5);
  assert.equal(storedCurrencyToAbsolute(2.5, 1000000), 2500000);
});

test('Naker salary stores full Rupiah values', () => {
  assert.equal(formatStoredCurrency(1750000, 1), 'Rp1.750.000,-');
  assert.equal(parseCurrencyToStored('Rp1.750.000,-', 1), 1750000);
});

test('empty currency stays empty', () => {
  assert.equal(formatStoredCurrency('', 1000000), '');
  assert.equal(parseCurrencyToStored('', 1000000), '');
});
