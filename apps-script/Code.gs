/**
 * BELS 2026 – Google Apps Script (container-bound ke Google Sheet registrasi)
 *
 * Fungsi:
 *  - doPost: terima pendaftaran, validasi, kuota aman (LockService), Kode Registrasi BELS-001...
 *  - doGet?action=status: sisa kuota dan status buka/tutup untuk halaman web
 *  - onEdit: Status Bayar = "Lunas" -> terbitkan Kode Peserta acak 6 karakter + salin ke tab Tukar Jejak
 *  - releaseExpired: "Menunggu" lebih dari 24 jam -> "Dilepas" (kuota terbuka lagi), dijalankan tiap jam
 *  - Menu BELS di Sheets: setup, lepas kedaluwarsa, buat tautan pengingat WA
 *
 * Cara pasang ada di README.md. Jalankan setupBELS() SEKALI dari editor Apps Script.
 */

var CFG = {
  QUOTA: 100,
  PAY_HOURS: 24,
  CLOSE_AT: '2026-11-24T23:59:59+07:00',
  PRICE: 100000,
  TZ: 'Asia/Jakarta',
  CODE_PREFIX: 'BELS-',
  RATE_LIMIT_SECONDS: 60,   // 1 pendaftaran per nomor/email per menit
  MIN_FILL_MS: 4000,        // form diisi kurang dari 4 detik dianggap bot
  WA_NUMBER: '6287840491375', // TESTING. Ganti dengan nomor panitia.
  SHEETS: { REG: 'Registrasi', TUKAR: 'Tukar Jejak', HARIH: 'Hari H', PR: 'PR H+7', ADMIN: 'Admin', REMIND: 'Pengingat' }
};

var REG_HEADERS = ['Kode Registrasi','Waktu Daftar','Nama','WhatsApp','Email','Kota','Nama Bisnis','Bidang','Tahap','Tenaga Kerja','Instagram/Web','Posisi','Kategori Tantangan','Tantangan (teks)','Kontribusi Sosial','Minat Ruang','Sumber','Ikut Tukar Jejak','Jenis Jejak','Deskripsi Jejak','Jumlah Dibawa','Consent 1','Consent 2','Consent 3','Consent 4','Status Bayar','Waktu Lunas','Kode Peserta','Jejak Diterima','Status Kurasi','Check-in'];
var COL = {}; REG_HEADERS.forEach(function (h, i) { COL[h] = i + 1; });

var OTHER_HEADERS = {
  'Tukar Jejak': ['Kode Peserta','Nama Bisnis','Jenis','Jumlah Dijanjikan','Jumlah Diterima','Lolos Kurasi','Catatan'],
  'Hari H': ['Kode Peserta','Hasil Ruang 1','Hasil Ruang 2','Hasil Ruang 3','Hasil Ruang 4','Waktu Isi'],
  'PR H+7': ['Kode Peserta','PR 1','PR 2','PR 3','Status PR Selesai','Sertifikat Tambahan Terbit']
};

/* ===================== SETUP ===================== */

function setupBELS() {
  var ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(CFG.TZ);
  var reg = getOrCreate_(ss, CFG.SHEETS.REG);
  reg.getRange(1, 1, 1, REG_HEADERS.length).setValues([REG_HEADERS]).setFontWeight('bold').setBackground('#010302').setFontColor('#FDF9F2');
  reg.setFrozenRows(1); reg.setFrozenColumns(3);
  // Dropdown Status Bayar
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['Menunggu', 'Lunas', 'Dilepas'], true).build();
  reg.getRange(2, COL['Status Bayar'], 1000, 1).setDataValidation(rule);
  // Kolom WA/telepon sebagai teks agar angka 0 di depan tidak hilang
  reg.getRange(2, COL['WhatsApp'], 1000, 1).setNumberFormat('@');
  reg.getRange(2, COL['Kode Peserta'], 1000, 1).setNumberFormat('@');
  reg.getRange(2, COL['Waktu Daftar'], 1000, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');
  reg.getRange(2, COL['Waktu Lunas'], 1000, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

  Object.keys(OTHER_HEADERS).forEach(function (name) {
    var sh = getOrCreate_(ss, name);
    sh.getRange(1, 1, 1, OTHER_HEADERS[name].length).setValues([OTHER_HEADERS[name]]).setFontWeight('bold').setBackground('#010302').setFontColor('#FDF9F2');
    sh.setFrozenRows(1);
  });

  buildAdmin_(ss);

  // Trigger: hapus yang lama lalu pasang ulang
  ScriptApp.getProjectTriggers().forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('releaseExpired').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('onEditInstallable').forSpreadsheet(ss).onEdit().create();

  PropertiesService.getScriptProperties().setProperty('seq', String(maxSeq_(reg)));
  SpreadsheetApp.getUi().alert('Setup BELS selesai. Tab dan trigger sudah dibuat.');
}

function getOrCreate_(ss, name) { return ss.getSheetByName(name) || ss.insertSheet(name); }

function buildAdmin_(ss) {
  var sh = getOrCreate_(ss, CFG.SHEETS.ADMIN);
  sh.clear();
  var R = "'" + CFG.SHEETS.REG + "'!";
  var sCol = colLetter_(COL['Status Bayar']), tCol = colLetter_(COL['Ikut Tukar Jejak']), jCol = colLetter_(COL['Jumlah Dibawa']), aCol = colLetter_(COL['Jejak Diterima']);
  var rows = [
    ['INTERNAL. Jangan bagikan tab ini.', ''],
    ['Total pendaftar', '=COUNTA(' + R + 'A2:A)'],
    ['Lunas', '=COUNTIF(' + R + sCol + '2:' + sCol + ',"Lunas")'],
    ['Menunggu bayar', '=COUNTIF(' + R + sCol + '2:' + sCol + ',"Menunggu")'],
    ['Dilepas', '=COUNTIF(' + R + sCol + '2:' + sCol + ',"Dilepas")'],
    ['Sisa kuota', '=' + CFG.QUOTA + '-B3-B4'],
    ['Ikut Tukar Jejak (Ya)', '=COUNTIF(' + R + tCol + '2:' + tCol + ',"Ya")'],
    ['Total jejak dijanjikan', '=SUM(' + R + jCol + '2:' + jCol + ')'],
    ['Total jejak diterima', '=SUM(' + R + aCol + '2:' + aCol + ')']
  ];
  sh.getRange(1, 1, rows.length, 2).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontColor('#AE0013');
  sh.setColumnWidth(1, 260);
}

function colLetter_(n) { var s = ''; while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }

function onOpen() {
  SpreadsheetApp.getUi().createMenu('BELS')
    .addItem('Setup (jalankan sekali)', 'setupBELS')
    .addItem('Lepas kursi kedaluwarsa sekarang', 'releaseExpired')
    .addItem('Terbitkan Kode Peserta yang belum ada', 'assignMissingCodes')
    .addItem('Buat tautan pengingat WA (Lunas)', 'buildReminders')
    .addItem('Hapus data uji dan reset nomor', 'resetTestData')
    .addToUi();
}

/* ===================== WEB APP ===================== */

function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (action === 'status') return json_(status_());
  return json_({ ok: true, service: 'BELS 2026' });
}

function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    // Honeypot dan kecepatan isi: balas "sukses palsu" agar bot tidak belajar
    if (p.website) return json_({ ok: true, code: 'BELS-000', deadline: new Date().toISOString() });
    if (typeof p.elapsed === 'number' && p.elapsed < CFG.MIN_FILL_MS) return json_({ ok: false, message: 'Form terkirim terlalu cepat. Coba lagi.' });

    var err = validate_(p);
    if (err) return json_({ ok: false, message: err });

    var wa = normWA_(p.whatsapp), email = String(p.email).trim().toLowerCase();

    // Pembatasan kiriman berulang
    var cache = CacheService.getScriptCache();
    var rk = 'rl_' + wa, rk2 = 'rl_' + email;
    if (cache.get(rk) || cache.get(rk2)) return json_({ ok: false, message: 'Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.' });
    cache.put(rk, '1', CFG.RATE_LIMIT_SECONDS); cache.put(rk2, '1', CFG.RATE_LIMIT_SECONDS);

    var lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      var ss = SpreadsheetApp.getActive();
      var reg = ss.getSheetByName(CFG.SHEETS.REG);
      releaseExpired_(reg);

      var st = status_();
      if (!st.open) return json_({ ok: false, closed: true, message: st.reason === 'full' ? 'Kuota 100 kursi sudah penuh.' : 'Pendaftaran sudah ditutup.' });

      // Duplikat: nomor atau email yang masih aktif
      if (isDuplicate_(reg, wa, email)) return json_({ ok: false, message: 'Nomor WhatsApp atau email ini sudah terdaftar. Hubungi panitia lewat WhatsApp bila perlu bantuan.' });

      var props = PropertiesService.getScriptProperties();
      var seq = parseInt(props.getProperty('seq') || '0', 10) + 1;
      props.setProperty('seq', String(seq));
      var code = CFG.CODE_PREFIX + ('000' + seq).slice(-3);
      var now = new Date();

      var row = {};
      row['Kode Registrasi'] = code; row['Waktu Daftar'] = now;
      row['Nama'] = s_(p.nama); row['WhatsApp'] = "'" + wa; row['Email'] = s_(email); row['Kota'] = s_(p.kota);
      row['Nama Bisnis'] = s_(p.bisnis); row['Bidang'] = s_(p.bidang); row['Tahap'] = s_(p.tahap);
      row['Tenaga Kerja'] = Number(p.tenaga); row['Instagram/Web'] = s_(p.ig); row['Posisi'] = s_(p.posisi);
      row['Kategori Tantangan'] = s_(p.tant_kat); row['Tantangan (teks)'] = s_(p.tant_teks); row['Kontribusi Sosial'] = s_(p.kontribusi);
      row['Minat Ruang'] = s_(p.minat); row['Sumber'] = s_(p.sumber);
      row['Ikut Tukar Jejak'] = p.tukar === 'Ya' ? 'Ya' : 'Tidak';
      row['Jenis Jejak'] = s_(p.jenis); row['Deskripsi Jejak'] = s_(p.deskripsi); row['Jumlah Dibawa'] = p.jumlah ? Number(p.jumlah) : '';
      row['Consent 1'] = !!p.c1; row['Consent 2'] = !!p.c2; row['Consent 3'] = !!p.c3; row['Consent 4'] = !!p.c4;
      row['Status Bayar'] = 'Menunggu';

      var values = REG_HEADERS.map(function (h) { return row[h] === undefined ? '' : row[h]; });
      reg.appendRow(values);
      SpreadsheetApp.flush();

      var deadline = new Date(now.getTime() + CFG.PAY_HOURS * 3600 * 1000);
      return json_({ ok: true, code: code, deadline: deadline.toISOString(), remaining: Math.max(0, st.remaining - 1) });
    } finally {
      lock.releaseLock();
    }
  } catch (ex) {
    console.error(ex);
    return json_({ ok: false, message: 'Terjadi gangguan di server. Coba lagi beberapa saat.' });
  }
}

function status_() {
  var reg = SpreadsheetApp.getActive().getSheetByName(CFG.SHEETS.REG);
  var active = countActive_(reg);
  var remaining = Math.max(0, CFG.QUOTA - active);
  var closed = Date.now() > new Date(CFG.CLOSE_AT).getTime();
  var reason = closed ? 'date' : (remaining <= 0 ? 'full' : '');
  return { open: !closed && remaining > 0, remaining: remaining, quota: CFG.QUOTA, reason: reason, closesAt: CFG.CLOSE_AT };
}

/* ===================== KUOTA DAN PELEPASAN ===================== */

function countActive_(reg) {
  var last = reg.getLastRow(); if (last < 2) return 0;
  var st = reg.getRange(2, COL['Status Bayar'], last - 1, 1).getValues();
  var n = 0; st.forEach(function (r) { if (r[0] === 'Menunggu' || r[0] === 'Lunas') n++; });
  return n;
}

function isDuplicate_(reg, wa, email) {
  var last = reg.getLastRow(); if (last < 2) return false;
  var data = reg.getRange(2, 1, last - 1, REG_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    var st = data[i][COL['Status Bayar'] - 1];
    if (st !== 'Menunggu' && st !== 'Lunas') continue;
    var w = String(data[i][COL['WhatsApp'] - 1]).replace(/\D/g, '');
    var m = String(data[i][COL['Email'] - 1]).trim().toLowerCase();
    if (w === wa || m === email) return true;
  }
  return false;
}

/** Dipanggil trigger tiap jam dan dari menu. */
function releaseExpired() {
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { releaseExpired_(SpreadsheetApp.getActive().getSheetByName(CFG.SHEETS.REG)); } finally { lock.releaseLock(); }
}

function releaseExpired_(reg) {
  var last = reg.getLastRow(); if (last < 2) return 0;
  var rng = reg.getRange(2, 1, last - 1, REG_HEADERS.length);
  var data = rng.getValues();
  var limit = Date.now() - CFG.PAY_HOURS * 3600 * 1000;
  var n = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][COL['Status Bayar'] - 1] === 'Menunggu') {
      var t = data[i][COL['Waktu Daftar'] - 1];
      if (t instanceof Date && t.getTime() < limit) { reg.getRange(i + 2, COL['Status Bayar']).setValue('Dilepas'); n++; }
    }
  }
  return n;
}

/* ===================== LUNAS -> KODE PESERTA ===================== */

function onEditInstallable(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== CFG.SHEETS.REG || e.range.getColumn() !== COL['Status Bayar'] || e.range.getRow() < 2) return;
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try { handleLunas_(sh, e.range.getRow()); } finally { lock.releaseLock(); }
}

function handleLunas_(sh, row) {
  var status = sh.getRange(row, COL['Status Bayar']).getValue();
  if (status !== 'Lunas') return;
  var codeCell = sh.getRange(row, COL['Kode Peserta']);
  if (codeCell.getValue()) return; // sudah punya kode
  var code = uniqueCode_(sh);
  codeCell.setNumberFormat('@').setValue(code);
  sh.getRange(row, COL['Waktu Lunas']).setValue(new Date());
  var rowVals = sh.getRange(row, 1, 1, REG_HEADERS.length).getValues()[0];
  if (rowVals[COL['Ikut Tukar Jejak'] - 1] === 'Ya') {
    var tj = SpreadsheetApp.getActive().getSheetByName(CFG.SHEETS.TUKAR);
    tj.appendRow([code, rowVals[COL['Nama Bisnis'] - 1], rowVals[COL['Jenis Jejak'] - 1], rowVals[COL['Jumlah Dibawa'] - 1], '', '', '']);
  }
}

/** Untuk paste massal atau status yang diubah tanpa memicu onEdit. */
function assignMissingCodes() {
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(CFG.SHEETS.REG);
    var last = sh.getLastRow();
    for (var r = 2; r <= last; r++) handleLunas_(sh, r);
  } finally { lock.releaseLock(); }
}

// Tanpa 0/O/1/I/L agar mudah dibaca di HP dan dibacakan
var CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function uniqueCode_(sh) {
  var last = sh.getLastRow();
  var existing = {};
  if (last >= 2) sh.getRange(2, COL['Kode Peserta'], last - 1, 1).getValues().forEach(function (r) { if (r[0]) existing[String(r[0])] = true; });
  for (var tries = 0; tries < 200; tries++) {
    var c = ''; for (var i = 0; i < 6; i++) c += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
    if (!existing[c]) return c;
  }
  throw new Error('Gagal membuat kode unik');
}

/* ===================== DATA UJI ===================== */

/** Hapus semua baris yang namanya diawali "TEST " (data uji), lalu reset nomor urut ke maksimum yang tersisa.
 *  Jalankan dari menu BELS sebelum promosi publik. */
function resetTestData() {
  var ui = SpreadsheetApp.getUi();
  if (ui.alert('Hapus semua baris dengan nama berawalan "TEST " dan reset nomor registrasi?', ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  var lock = LockService.getScriptLock(); lock.waitLock(25000);
  try {
    var ss = SpreadsheetApp.getActive();
    var reg = ss.getSheetByName(CFG.SHEETS.REG), tj = ss.getSheetByName(CFG.SHEETS.TUKAR);
    var testCodes = {};
    for (var r = reg.getLastRow(); r >= 2; r--) {
      var nama = String(reg.getRange(r, COL['Nama']).getValue());
      if (nama.indexOf('TEST ') === 0) {
        var kp = reg.getRange(r, COL['Kode Peserta']).getValue(); if (kp) testCodes[String(kp)] = true;
        reg.deleteRow(r);
      }
    }
    for (var t = tj.getLastRow(); t >= 2; t--) if (testCodes[String(tj.getRange(t, 1).getValue())]) tj.deleteRow(t);
    PropertiesService.getScriptProperties().setProperty('seq', String(maxSeq_(reg)));
    ui.alert('Data uji dihapus. Nomor registrasi berikutnya: ' + CFG.CODE_PREFIX + ('000' + (maxSeq_(reg) + 1)).slice(-3));
  } finally { lock.releaseLock(); }
}

/* ===================== PENGINGAT WA ===================== */

/** Membuat tab Pengingat berisi tautan wa.me terisi untuk semua peserta Lunas.
 *  Jalankan di H-7 (19 Nov) dan H-3 (23 Nov), lalu klik tiap tautan. */
function buildReminders() {
  var ss = SpreadsheetApp.getActive();
  var reg = ss.getSheetByName(CFG.SHEETS.REG);
  var out = getOrCreate_(ss, CFG.SHEETS.REMIND); out.clear();
  out.getRange(1, 1, 1, 4).setValues([['Nama', 'WhatsApp', 'Pesan', 'Tautan']]).setFontWeight('bold');
  var last = reg.getLastRow(); if (last < 2) return;
  var data = reg.getRange(2, 1, last - 1, REG_HEADERS.length).getValues();
  var rows = [];
  data.forEach(function (r) {
    if (r[COL['Status Bayar'] - 1] !== 'Lunas') return;
    var nama = r[COL['Nama'] - 1], wa = String(r[COL['WhatsApp'] - 1]).replace(/\D/g, ''), kode = r[COL['Kode Peserta'] - 1];
    var ikut = r[COL['Ikut Tukar Jejak'] - 1] === 'Ya';
    var msg = 'Halo ' + nama + ', ini panitia BELS 2026. Kode Peserta kamu: ' + kode + '. ' +
      (ikut ? 'Pengingat Tukar Jejak: batas serah jejak 23 November 2026 atau saat check-in (yang saat check-in tidak dijamin sempat dikurasi). ' : 'Kamu belum memilih ikut Tukar Jejak. Tanpa jejak, tidak ada tote bag. ') +
      'Sampai jumpa 26 November di Microlibrary Alun-alun Bandung.';
    rows.push([nama, wa, msg, 'https://wa.me/' + wa + '?text=' + encodeURIComponent(msg)]);
  });
  if (rows.length) out.getRange(2, 1, rows.length, 4).setValues(rows);
}

/* ===================== UTIL ===================== */

function validate_(p) {
  var req = ['nama', 'whatsapp', 'email', 'kota', 'bisnis', 'bidang', 'tahap', 'tenaga', 'posisi', 'tant_kat', 'tant_teks', 'sumber'];
  for (var i = 0; i < req.length; i++) if (p[req[i]] === undefined || p[req[i]] === null || String(p[req[i]]).trim() === '') return 'Data belum lengkap. Periksa kembali isian wajib.';
  if (!normWA_(p.whatsapp)) return 'Nomor WhatsApp belum benar.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(p.email).trim())) return 'Format email belum benar.';
  if (!(Number(p.tenaga) >= 0)) return 'Jumlah tenaga kerja belum benar.';
  if (!p.c1 || !p.c2 || !p.c3) return 'Tiga persetujuan wajib harus dicentang.';
  if (p.tukar !== 'Ya' && p.tukar !== 'Tidak') return 'Pilih ikut atau tidak ikut Tukar Jejak.';
  if (p.tukar === 'Ya' && (!p.jenis || !p.deskripsi || !(Number(p.jumlah) >= 1))) return 'Lengkapi data Tukar Jejak.';
  var big = ['nama', 'kota', 'bisnis', 'ig', 'tant_teks', 'kontribusi', 'deskripsi'];
  for (var j = 0; j < big.length; j++) if (String(p[big[j]] || '').length > 600) return 'Salah satu isian terlalu panjang.';
  return '';
}

function normWA_(v) {
  var d = String(v || '').replace(/\D/g, '');
  if (d.indexOf('62') === 0) { /* ok */ } else if (d.indexOf('0') === 0) d = '62' + d.slice(1); else if (d.indexOf('8') === 0) d = '62' + d;
  return /^62\d{8,13}$/.test(d) ? d : '';
}

/** Cegah formula injection di Sheets. */
function s_(v) {
  v = String(v === undefined || v === null ? '' : v).trim();
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function maxSeq_(reg) {
  var last = reg.getLastRow(), max = 0; if (last < 2) return 0;
  reg.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { var m = String(r[0]).match(/(\d+)$/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return max;
}

function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
