import assert from 'node:assert/strict';
import test from 'node:test';
import { NAKER_PDF_THEME, SPPG_PDF_THEME, themeForFormType } from '../public/js/features/exports/pdf-theme.js';

test('SPPG PDF uses navy blue backgrounds and yellow text', () => {
  assert.deepEqual([...SPPG_PDF_THEME.headerBackground], [11, 31, 58]);
  assert.deepEqual([...SPPG_PDF_THEME.headerText], [253, 230, 138]);
  assert.deepEqual([...SPPG_PDF_THEME.tableHead.fillColor], [21, 52, 91]);
  assert.deepEqual([...SPPG_PDF_THEME.tableHead.textColor], [253, 230, 138]);
});

test('Naker PDF uses the DARMA-1 blue palette', () => {
  assert.deepEqual([...NAKER_PDF_THEME.headerBackground], [30, 58, 138]);
  assert.deepEqual([...NAKER_PDF_THEME.headerText], [255, 255, 255]);
  assert.deepEqual([...NAKER_PDF_THEME.sectionBackground], [29, 78, 216]);
  assert.deepEqual([...NAKER_PDF_THEME.tableHead.fillColor], [37, 99, 235]);
  assert.deepEqual([...NAKER_PDF_THEME.tableHead.textColor], [255, 255, 255]);
});

test('form themes are selected per form type', () => {
  assert.equal(themeForFormType('SPPG'), SPPG_PDF_THEME);
  assert.equal(themeForFormType('NAKER'), NAKER_PDF_THEME);
  assert.equal(themeForFormType('KDMP'), null);
});
