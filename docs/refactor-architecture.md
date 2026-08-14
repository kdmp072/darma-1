# Arsitektur Modular DARMA

## Status

Aplikasi telah dipindahkan dari satu script monolitik menjadi komposisi Vanilla JavaScript ES Modules. `legacy-app.js` sudah dihapus. Skema D1 dan kontrak API tidak berubah.

`public/index.html` hanya memuat aset, markup, dan composition root `public/js/app.js`. Modul laporan manajerial dan operasional dimuat tersendiri karena keduanya memiliki engine ekspor khusus.

## Struktur utama

```text
public/js/
├── app.js                         # composition root
├── bootstrap.js                   # public API DARMA + context
├── adapters/
│   └── runtime-adapter.js
├── core/
│   ├── constants.js
│   ├── context.js
│   ├── navigation.js
│   ├── permissions.js
│   ├── store.js
│   ├── vendor-libs.js
│   └── utils/
├── data/
│   ├── repositories.js
│   └── runtime.js
├── domain/forms/
│   ├── registry.js
│   └── sppg-calculations.js
└── features/
    ├── auth/
    ├── dashboard/
    ├── exports/
    ├── filters/
    ├── history/
    ├── map/
    ├── monitoring/
    ├── reports/
    │   ├── managerial/
    │   └── operational/
    ├── units/
    └── users/
```

## Aturan dependensi

```text
core <- adapters/data/domain <- features <- app/bootstrap
```

1. Logika domain tidak membaca DOM dan tidak mengubah database.
2. Penulisan unit, monitoring, dan pengguna melalui repository.
3. Akses library CDN dipusatkan melalui vendor adapter.
4. Fitur laporan hanya mengelola `#tab-laporan`.
5. SPPG V1 tetap menjadi struktur historis; record tanpa marker tetap V1.
6. SPPG V2 ditentukan oleh marker `SPPG-2026-08`.
7. Pertanyaan 204 dan 411 menggunakan fungsi murni di `sppg-calculations.js`.
8. Perubahan data mengirim event `darma:data-changed`; perubahan login mengirim `darma:auth-changed`.
9. Compatibility bridge ke `globalThis` masih tersedia untuk handler HTML lama, tetapi implementasi fungsi berada di modul fitur masing-masing.

## Public API

`window.DARMA` menyediakan API baca dan subscription yang stabil:

```javascript
DARMA.getCurrentUser();
DARMA.canAccessFeature('reports');
DARMA.getUnitById(id);
DARMA.getMonitoringByUnit(id);
DARMA.getState();
const unsubscribe = DARMA.subscribe(state => {});
```

## Lokasi perbaikan

| Perubahan | Modul |
|---|---|
| Definisi/versioning form | `domain/forms/registry.js` |
| Pertanyaan 204/411 | `domain/forms/sppg-calculations.js` |
| Renderer/collector form | `features/monitoring/form-engine.js` |
| Simpan monitoring | `features/monitoring/index.js` + `data/repositories.js` |
| Master Unit | `features/units/` |
| Histori | `features/history/index.js` |
| Peta | `features/map/index.js` |
| Dashboard | `features/dashboard/index.js` |
| Login/RBAC | `features/auth/` + `core/permissions.js` |
| Laporan operasional | `features/reports/operational/` |
| PPT manajerial | `features/reports/managerial/index.js` |
| PDF/Excel/DOCX umum | `features/exports/` |
| API dan D1 | `worker.js` + `schema.sql` |

## Validasi

```bash
node --test tests/*.test.mjs
find public/js -name '*.js' -print0 | xargs -0 -n1 node --check
node --check worker.js
git diff --check
```

Sebelum deployment, jalankan pengujian browser untuk Admin/Petugas, semua tab, SPPG V1/V2, Naker, KDMP, CRUD unit/monitoring, dan seluruh ekspor.
