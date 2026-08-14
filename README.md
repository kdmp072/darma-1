# DARMA-1

DARMA-1 — Dashboard Akurat Reporting Manajemen Aplikasi untuk monitoring SPPG, Tenaga Kerja, dan KDMP wilayah Pekalongan/Batang.

## Persyaratan

- Node.js 22 atau lebih baru
- Akun Cloudflare dengan D1
- Binding D1 bernama `DB`

## Pengembangan lokal

```bash
npm ci
npm run db:schema:local
npm run dev
```

## Validasi

```bash
npm run validate
```

Validasi mencakup syntax seluruh ES Module, domain laporan, repository data, perhitungan SPPG 204/411, permission, dan API/RBAC Worker.

## Deployment

```bash
npm run validate
npx wrangler deploy --dry-run
npm run deploy
```

Jangan menjalankan `db:schema:remote` atau `deploy` sebelum memastikan `database_id` pada `wrangler.toml` menunjuk D1 yang benar. Backup JSON dan `.dev.vars` tidak boleh dimasukkan ke repository.

## Struktur

- `public/index.html` — shell tampilan.
- `public/styles/` — CSS per area fungsi.
- `public/js/app.js` — composition root ES Modules.
- `public/js/domain/` — definisi dan perhitungan murni.
- `public/js/features/` — Map, Dashboard, Unit, Monitoring, Histori, Laporan, dan ekspor.
- `public/js/data/` — runtime dan repository data.
- `server/api.js` — API, autentikasi, RBAC, dan akses D1.
- `worker.js` — entry point Cloudflare Worker.
- `tests/` — pengujian otomatis.

Dokumentasi rinci tersedia di `docs/refactor-architecture.md`.

## Proses T-OPTIMAL

DARMA-1 menyediakan menu **Proses T-OPTIMAL** pada tab Master Unit dengan mode: Sinkronisasi Koordinat Master Unit, Monitoring SPPG/MBG, Monitoring Tenaga Kerja, dan Monitoring KDMP. Semua mode memakai satu file JSON dari Connector Windows, tetapi hanya data sesuai mode yang diproses. File dimuat ke pratinjau terlebih dahulu, dapat difilter, dipilih dengan checkbox Admin, dan baru disimpan setelah konfirmasi. Nilai keuangan T-OPTIMAL dinormalisasi saat proses: Rupiah penuh ke skala Rp Juta/Rp Ribu instrumen DARMA-1; upah Tenaga Kerja tetap Rupiah penuh. Untuk q410, data contoh menunjukkan campuran nominal penuh dan angka Rp Juta lama, sehingga angka kecil dideteksi sebagai nilai Rp Juta. Koordinat dari JSON dapat dipakai untuk memperbarui Master Unit yang dipilih. Untuk formulir SPPG, kombinasi Master Unit + tanggal survei dipakai sebagai filter duplikasi; secara default hanya satu respons terbaru dipilih, dengan opsi eksplisit untuk memperbarui rekaman tanggal sama. Data mentah sumber disimpan pada form untuk audit.

Panduan membuat repository GitHub, Worker, D1 baru, dan memulihkan backup tersedia di `SETUP-GITHUB-CLOUDFLARE.md`.
