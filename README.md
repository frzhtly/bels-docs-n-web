# BELS 2026 – Bandung Entrepreneurs Literacy Symposium

Situs statis (HTML/CSS/JS, tanpa build) untuk landing page, sales page, dan registrasi BELS 2026 (Kamis, 26 November 2026, Microlibrary Alun-alun Bandung). Data pendaftaran masuk ke Google Sheets lewat Google Apps Script.

```
index.html        halaman lengkap (landing, sales, form, layar sukses, FAQ)
config.js         satu-satunya file untuk WA, rekening, mitra, dan URL Apps Script
fonts/            Francy, Old Money Script, Azeret Mono, Blauer Nue
assets/           logo
apps-script/      Code.gs: kode registrasi, kuota, pelepasan 24 jam, Kode Peserta
archive/          halaman versi lama (11 Nov 2026), tidak ikut dideploy
```

## Konfigurasi (`config.js`)
`API_URL` (URL web app Apps Script), `WA_NUMBER`, `BANK` (isi `isDummy: false` setelah rekening asli), `SPONSORS`, `PARTNERS`. Selama `BANK.isDummy` bernilai `true`, halaman menampilkan banner pratinjau dan layar sukses memberi peringatan.

## Apps Script
Lihat `apps-script/Code.gs`. Ikatkan ke Google Sheet registrasi, jalankan `setupBELS()` sekali, lalu Deploy > Web app (Execute as: Me, Access: Anyone) dan tempel URL `/exec` ke `API_URL`.

## Go-public checklist
- [ ] Rekening asli dan nomor WA panitia di `config.js`, `isDummy: false`
- [ ] Hapus `<meta name="robots">` di `index.html` dan header `X-Robots-Tag` di `vercel.json`
- [ ] Hapus data uji di Sheet (menu BELS > Hapus data uji dan reset nomor)
- [ ] Hanya sponsor, mitra, dan pembicara yang sudah dikonfirmasi tampil
