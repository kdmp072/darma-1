# Setup Repository GitHub, Worker, dan D1 Baru

Paket ini sudah bersih: tidak berisi `.git`, `node_modules`, `.wrangler`, credential, backup JSON, atau ID D1 lama.

## 1. Upload ke GitHub baru

Buat repository GitHub kosong dan **private**, misalnya `darma`. Jangan centang pembuatan README karena paket ini sudah memilikinya.

Jalankan dari folder ini:

```bash
git init
git add .
git commit -m "Initial DARMA production-ready"
git branch -M main
git remote add origin https://github.com/USERNAME/darma.git
git push -u origin main
```

Ganti `USERNAME` dan nama repository sesuai akun Anda.

## 2. Persyaratan lokal

Gunakan Node.js 22 atau lebih baru.

```bash
node --version
npm ci
npm run validate
```

## 3. Login Cloudflare dan cek akun

```bash
npx wrangler login
npx wrangler whoami
```

Pastikan akun yang tampil adalah akun Cloudflare BARU/tujuan.

## 4. Buat D1 baru

Nama contoh yang dipakai paket ini adalah `darma`:

```bash
npx wrangler d1 create darma
```

Cloudflare akan menampilkan `database_id`. Buka `wrangler.toml`, lalu ganti:

```toml
database_id = "00000000-0000-0000-0000-000000000000"
```

menjadi ID D1 BARU tersebut. Jangan menggunakan database ID aplikasi lama.

## 5. Buat tabel pada D1 baru

```bash
npm run db:schema:remote
```

`schema.sql` hanya membuat tabel, index, dan satu akun bootstrap:

```text
Username: admin
Password: admin123
```

Password ini hanya untuk login pertama dan wajib segera diganti setelah deployment.

Periksa tabel:

```bash
npx wrangler d1 execute darma --remote --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;"
```

## 6. Dry-run dan deploy Worker baru

```bash
npx wrangler deploy --dry-run
npm run deploy
```

Alamat akan berbentuk:

```text
https://darma.SUBDOMAIN-ANDA.workers.dev
```

Tes API:

```bash
curl https://darma.SUBDOMAIN-ANDA.workers.dev/api/ping
```

Respons yang benar:

```json
{"ok":true,"name":"SIMON-MBG API"}
```

## 7. Memulihkan Backup JSON

### Cara paling mudah

1. Buka aplikasi Worker baru.
2. Login menggunakan akun bootstrap.
3. Buka **Master Unit → Restore**.
4. Pilih file `DARMA_backup_....json` dari aplikasi lama.
5. Keluar dan login kembali menggunakan akun yang berasal dari backup.

Jangan letakkan backup JSON di repository atau folder `public`.

### Cara importer langsung ke D1 — disarankan untuk backup besar/Free plan

Buat Cloudflare API Token dengan izin D1 Edit. Siapkan:

- Account ID Cloudflare baru;
- Database ID D1 baru;
- API Token;
- lokasi backup JSON.

Linux/macOS/Git Bash:

```bash
export CLOUDFLARE_ACCOUNT_ID="ACCOUNT_ID_BARU"
export D1_DATABASE_ID="DATABASE_ID_BARU"
export CLOUDFLARE_API_TOKEN="API_TOKEN_D1"
export CONFIRM_RESTORE="YES"
node scripts/import-backup-d1.mjs "/lokasi/DARMA_backup_2026-xx-xx.json"
```

PowerShell:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="ACCOUNT_ID_BARU"
$env:D1_DATABASE_ID="DATABASE_ID_BARU"
$env:CLOUDFLARE_API_TOKEN="API_TOKEN_D1"
$env:CONFIRM_RESTORE="YES"
node scripts/import-backup-d1.mjs "C:\lokasi\DARMA_backup_2026-xx-xx.json"
```

Importer akan:

- memvalidasi ID ganda;
- memastikan monitoring memiliki unit;
- memastikan backup users mempunyai Admin;
- mempertahankan ID dan huruf kapital;
- membersihkan sessions;
- mengisi users, units, dan monitoring dengan parameterized query;
- menampilkan jumlah data akhir dan orphan monitoring.

**Pastikan `D1_DATABASE_ID` benar-benar D1 BARU.** Importer bersifat replace untuk users (jika tersedia), units, dan monitoring.

Setelah selesai, hapus environment token dari terminal:

Linux/macOS/Git Bash:

```bash
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID D1_DATABASE_ID CONFIRM_RESTORE
```

PowerShell:

```powershell
Remove-Item Env:CLOUDFLARE_API_TOKEN
Remove-Item Env:CLOUDFLARE_ACCOUNT_ID
Remove-Item Env:D1_DATABASE_ID
Remove-Item Env:CONFIRM_RESTORE
```

## 8. Verifikasi D1

```bash
npx wrangler d1 execute darma --remote --command="SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS units FROM units; SELECT COUNT(*) AS monitoring FROM monitoring;"
```

Periksa orphan:

```bash
npx wrangler d1 execute darma --remote --command="SELECT COUNT(*) AS orphan FROM monitoring m LEFT JOIN units u ON u.id=m.unit_id WHERE u.id IS NULL;"
```

Nilai `orphan` harus `0`.

## 9. Pemeriksaan aplikasi

- login Admin;
- ubah password bootstrap/default;
- cek jumlah Master Unit dan Histori;
- buka satu SPPG V1 dan satu SPPG V2;
- cek Naker dan KDMP;
- coba tambah lalu hapus satu data uji;
- unduh PDF, Excel, DOCX, PPT SPPG–Naker, dan PPT KDMP;
- pastikan badge menampilkan `Cloud (D1)`.

## Keamanan

- Jangan commit backup JSON, `.dev.vars`, token API, atau file hasil restore.
- Jangan memakai ID D1 lama pada `wrangler.toml`.
- Repository sebaiknya private.
- Ganti password `admin123` segera setelah deployment.
