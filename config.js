/* BELS 2026 – satu-satunya file yang perlu diubah untuk kontak, rekening, dan mitra.
   Jangan taruh data pribadi peserta di sini. */
window.BELS_CONFIG = {
  // URL web app Google Apps Script (akhiran /exec). Kosong = MODE DEMO (data tidak tersimpan).
  API_URL: "",

  // Kontak panitia. STATUS: TESTING. Ganti dengan nomor panitia sebelum promosi publik.
  WA_NUMBER: "6287840491375",
  WA_DISPLAY: "0878-4049-1375",

  // Rekening transfer. STATUS: DUMMY. Halaman TIDAK boleh tayang publik dengan isi ini.
  // Setelah rekening asli diisi, ubah isDummy menjadi false.
  BANK: { name: "[BANK DUMMY]", number: "0000000000", holder: "[NAMA DUMMY]", isDummy: true },

  PRICE: 100000,
  QUOTA: 100,
  EVENT_START: "2026-11-26T11:00:00+07:00",
  REG_CLOSE: "2026-11-24T23:59:59+07:00",
  PAY_HOURS: 24,

  MAP_URL: "https://www.google.com/maps/search/?api=1&query=Microlibrary+Alun-alun+Bandung",
  INSTAGRAM_URL: "",   // isi bila sudah ada, contoh: "https://instagram.com/akunpanitia"

  // Hanya yang SUDAH KONFIRMASI. Slot kosong otomatis disembunyikan di footer.
  // Format: { name: "Nama", logo: "assets/nama.svg" (opsional) }
  SPONSORS: [],
  PARTNERS: [{ name: "HIPMI PT UNISBA" }]
};
