CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, nama TEXT, username TEXT UNIQUE, password TEXT, role TEXT);
CREATE TABLE IF NOT EXISTS units (id TEXT PRIMARY KEY, jenis TEXT, nama TEXT, ref TEXT, status TEXT, kab TEXT, kec TEXT, desa TEXT, alamat TEXT, lat REAL, lng REAL, pic TEXT, telp TEXT, note TEXT, yayasan TEXT, kapasitas INTEGER, sekolah INTEGER, slhs TEXT, mulai TEXT, anggota INTEGER, peran TEXT, usaha TEXT, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS monitoring (id TEXT PRIMARY KEY, unit_id TEXT, tgl TEXT, petugas TEXT, jenis TEXT, form_type TEXT, hasil TEXT, form_json TEXT, kebersihan TEXT, gizi TEXT, distribusi TEXT, dok TEXT, temuan TEXT, rekom TEXT, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, username TEXT, created_at INTEGER);
CREATE INDEX IF NOT EXISTS idx_mon_unit ON monitoring(unit_id);
CREATE INDEX IF NOT EXISTS idx_sess_user ON sessions(username);
INSERT OR IGNORE INTO users(id,nama,username,password,role) VALUES('bootstrap-admin','Administrator Awal','admin','admin123','admin');
