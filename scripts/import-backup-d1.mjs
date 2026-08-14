import { readFile } from 'node:fs/promises';
import process from 'node:process';

const backupPath = process.argv[2];
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const databaseId = process.env.D1_DATABASE_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
const confirmed = process.env.CONFIRM_RESTORE === 'YES';

if (!backupPath) {
  console.error('Pemakaian: node scripts/import-backup-d1.mjs /lokasi/DARMA_backup.json');
  process.exit(1);
}
if (!accountId || !databaseId || !apiToken) {
  console.error('Set CLOUDFLARE_ACCOUNT_ID, D1_DATABASE_ID, dan CLOUDFLARE_API_TOKEN terlebih dahulu.');
  process.exit(1);
}
if (!confirmed) {
  console.error('Import dibatalkan. Set CONFIRM_RESTORE=YES setelah memastikan database_id adalah D1 BARU.');
  process.exit(1);
}

const backup = JSON.parse(await readFile(backupPath, 'utf8'));
if (!Array.isArray(backup.units) || !Array.isArray(backup.monitoring)) {
  throw new Error('Backup tidak valid: units dan monitoring harus berupa array.');
}
const users = Array.isArray(backup.users) ? backup.users : [];

function ensureUnique(list, name) {
  const seen = new Set();
  for (const row of list) {
    if (!row || !String(row.id || '').trim()) throw new Error(`${name}: ada record tanpa id.`);
    if (seen.has(row.id)) throw new Error(`${name}: id ganda ${row.id}.`);
    seen.add(row.id);
  }
  return seen;
}

const unitIds = ensureUnique(backup.units, 'units');
ensureUnique(backup.monitoring, 'monitoring');
if (users.length) {
  ensureUnique(users, 'users');
  if (!users.some(user => user.role === 'admin')) throw new Error('Backup users tidak memiliki Admin. Import dihentikan.');
  if (users.some(user => !user.username || !user.password)) throw new Error('Backup users memiliki username/password kosong. Import dihentikan.');
}
const orphan = backup.monitoring.filter(record => !unitIds.has(record.unitId));
if (orphan.length) throw new Error(`Ada ${orphan.length} monitoring tanpa unit. Contoh: ${orphan[0].id}`);

console.log(`Validasi lulus: ${users.length} users, ${backup.units.length} units, ${backup.monitoring.length} monitoring.`);
console.log(`Target D1: ${databaseId}`);

const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;
async function query(sql, params = [], attempt = 1) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
  });
  const payload = await response.json().catch(() => ({}));
  if ((!response.ok || payload.success === false) && attempt < 6 && (response.status === 429 || response.status >= 500)) {
    await new Promise(resolve => setTimeout(resolve, 500 * 2 ** (attempt - 1)));
    return query(sql, params, attempt + 1);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(`D1 gagal (${response.status}): ${JSON.stringify(payload.errors || payload)}`);
  }
  return payload;
}

const UNIT_SQL = `INSERT OR REPLACE INTO units(id,jenis,nama,ref,status,kab,kec,desa,alamat,lat,lng,pic,telp,note,yayasan,kapasitas,sekolah,slhs,mulai,anggota,peran,usaha,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
const MON_SQL = `INSERT OR REPLACE INTO monitoring(id,unit_id,tgl,petugas,jenis,form_type,hasil,form_json,kebersihan,gizi,distribusi,dok,temuan,rekom,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
const USER_SQL = `INSERT OR REPLACE INTO users(id,nama,username,password,role) VALUES(?,?,?,?,?)`;
const now = Date.now();
const text = value => value == null ? '' : String(value);
const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? 0 : Number(value);

// Semua validasi selesai sebelum penghapusan dimulai. Script aman dijalankan ulang ke D1 replika.
await query('DELETE FROM sessions');
await query('DELETE FROM monitoring');
await query('DELETE FROM units');
if (users.length) await query('DELETE FROM users');

for (let index = 0; index < users.length; index++) {
  const user = users[index];
  await query(USER_SQL, [text(user.id), text(user.nama), text(user.username), text(user.password), text(user.role)]);
  if ((index + 1) % 25 === 0) console.log(`Users: ${index + 1}/${users.length}`);
}

for (let index = 0; index < backup.units.length; index++) {
  const unit = backup.units[index];
  await query(UNIT_SQL, [
    text(unit.id), text(unit.jenis), text(unit.nama), text(unit.ref), text(unit.status || 'aktif'),
    text(unit.kab), text(unit.kec), text(unit.desa), text(unit.alamat), number(unit.lat), number(unit.lng),
    text(unit.pic), text(unit.telp), text(unit.note), text(unit.yayasan), number(unit.kapasitas),
    number(unit.sekolah), text(unit.slhs), text(unit.mulai), number(unit.anggota), text(unit.peran),
    text(unit.usaha), now
  ]);
  if ((index + 1) % 25 === 0) console.log(`Units: ${index + 1}/${backup.units.length}`);
}

for (let index = 0; index < backup.monitoring.length; index++) {
  const record = backup.monitoring[index];
  await query(MON_SQL, [
    text(record.id), text(record.unitId), text(record.tgl), text(record.petugas), text(record.jenis),
    text(record.formType), text(record.hasil), JSON.stringify(record.form ?? null), text(record.kebersihan),
    text(record.gizi), text(record.distribusi), text(record.dok), text(record.temuan), text(record.rekom), now
  ]);
  if ((index + 1) % 25 === 0) console.log(`Monitoring: ${index + 1}/${backup.monitoring.length}`);
}

const verification = await query(`SELECT
  (SELECT COUNT(*) FROM users) AS users,
  (SELECT COUNT(*) FROM units) AS units,
  (SELECT COUNT(*) FROM monitoring) AS monitoring,
  (SELECT COUNT(*) FROM monitoring m LEFT JOIN units u ON u.id=m.unit_id WHERE u.id IS NULL) AS orphan`);
console.log('Import selesai. Hasil verifikasi D1:');
console.log(JSON.stringify(verification.result || verification, null, 2));
