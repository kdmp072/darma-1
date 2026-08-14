import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { escapeHtml, matchesSearch, normalizeSearch } from '../public/js/core/utils/text.js';
import { daysSince, isDateInRange, localIsoDate } from '../public/js/core/utils/date.js';
import { canAccessFeature } from '../public/js/core/permissions.js';

test('index uses external CSS and ES Module composition root', () => {
  const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  assert.match(html, /styles\/00-base\.css/);
  assert.match(html, /styles\/70-print\.css/);
  assert.match(html, /type="module" src="\.\/js\/app\.js"/);
  assert.match(html, /type="module" src="\.\/js\/bootstrap\.js"/);
  assert.doesNotMatch(html, /js\/legacy-app\.js/);
  assert.equal(fs.existsSync(new URL('../public/js/legacy-app.js', import.meta.url)), false);
});

test('composition root lists all feature modules', () => {
  const app = fs.readFileSync(new URL('../public/js/app.js', import.meta.url), 'utf8');
  for (const modulePath of ['domain/forms/registry.js','features/map/index.js','features/dashboard/index.js','features/units/index.js','features/monitoring/index.js','features/history/index.js','features/exports/forms.js','features/auth/index.js']) {
    assert.match(app, new RegExp(modulePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('core text helpers are deterministic', () => {
  assert.equal(escapeHtml('<b>"DARMA"</b>'), '&lt;b&gt;&quot;DARMA&quot;&lt;/b&gt;');
  assert.equal(normalizeSearch('  Kec. KAJÉN  '), 'kec. kajen');
  assert.equal(matchesSearch('SPPG Kajen Kabupaten Pekalongan', 'kajen pekalongan'), true);
});

test('date helpers preserve ISO range semantics', () => {
  assert.equal(isDateInRange('2026-08-12', '2026-08-01', '2026-08-31'), true);
  assert.equal(isDateInRange('2026-07-31', '2026-08-01', '2026-08-31'), false);
  assert.equal(daysSince('2026-08-01', '2026-08-12'), 11);
  assert.match(localIsoDate(new Date(2026, 7, 12)), /^2026-08-12$/);
});

test('report permission remains Admin-only', () => {
  assert.equal(canAccessFeature({ role: 'admin' }, 'reports'), true);
  assert.equal(canAccessFeature({ role: 'petugas' }, 'reports'), false);
  assert.equal(canAccessFeature(null, 'reports'), false);
});
