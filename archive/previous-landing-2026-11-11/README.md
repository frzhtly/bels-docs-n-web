# BELS 2026 · The Journey — website

Landing page for **Simposium Literasi Kewirausahaan Bandung 2026** (Kamis, 26 November 2026, Microlibrary Asia Afrika).
Static site: plain HTML/CSS/JS, no build step.

```
index.html            page content (Bahasa Indonesia)
assets/css/style.css  visual identity (provisional Freezehotly palette)
assets/js/config.js   go-live facts: registration link, price, WhatsApp, speakers R3/R4, seat counter
assets/js/main.js     countdown, Founder Compass self-check, config wiring
```

## Content gate (from the GTM Plan)
Public pages show only what is CONFIRMED. Until a value is decided, leave it `null` in `assets/js/config.js`:

| Field | Shows when set | Hidden / neutral when `null` |
|---|---|---|
| `registrationUrl` | All "Daftar" buttons open the form | "Pendaftaran segera dibuka" |
| `price` | "Rp100.000 / orang" | "Harga diumumkan saat pendaftaran dibuka" |
| `registrationCloses` | Close date on the ticket | hidden |
| `seatsRemaining` | Seat counter in the hero | hidden |
| `whatsapp` | WhatsApp buttons | hidden |
| `speakers.r3`, `speakers.r4` | Name on the room card | "Pemandu segera diumumkan" |
| `showNeon` | Neon-sign closing moment | hidden |

Deliberately **not** on the site until confirmed in writing: sponsor names, the Mayor's or Kadisarpus' attendance, media partners, menu brands.

## Run locally
```
python3 -m http.server 8000   # then open http://localhost:8000
```

## Deploy
Any static host works. GitHub Pages: Settings → Pages → deploy from branch, root folder (`.nojekyll` included).
