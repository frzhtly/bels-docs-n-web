/*
 * BELS 2026 — site configuration (the ONLY file to edit for go-live facts).
 *
 * Content gate (from the GTM Plan): public pages never show anything that is
 * not CONFIRMED yet — price, unconfirmed speaker names, sponsor names or
 * officials' attendance. Leave a value as null until it is decided and the
 * page hides it or shows a neutral "segera diumumkan" line instead.
 */
window.BELS_CONFIG = {
  // Event start (WIB, UTC+7). Registration desk opens 11.00.
  eventStart: "2026-11-26T11:00:00+07:00",

  // Registration form URL (Google Form / Typeform / payment page).
  // null => buttons show "Pendaftaran segera dibuka" and point to contact.
  registrationUrl: null,

  // Seat price in Rupiah, e.g. 100000. null => "diumumkan saat pendaftaran dibuka".
  price: null,

  // Last day of regular registration, e.g. "2026-11-21". null => hidden.
  registrationCloses: null,

  // Seats left (update daily from the tracker). null => counter hidden.
  seatsRemaining: null,

  // Official WhatsApp number in international format without "+", e.g. "6281234567890".
  // null => WhatsApp buttons hidden.
  whatsapp: null,

  // Official Instagram handle (Main Funnel distribution account).
  instagram: "freezehotly",

  // Speakers for Ruang 3 and Ruang 4. Fill ONLY after written confirmation.
  // Example: { r3: { name: "Nama", org: "Organisasi" }, r4: null }
  speakers: { r3: null, r4: null },

  // Show the neon-sign lighting moment only once vendor + Disarpus approval are documented.
  showNeon: false
};
