# लोकमान्य बाल गणेश उत्सव मंडळ — Donation Admin

Donation & receipt management web app for **Lokmanya Bal Ganesh Utsav Mandal**, built fresh with **Astro.js** (SSR + Node).

## Features
- 🔒 Secure admin login (scrypt-hashed password, signed session cookie)
- 🏠 Dashboard — today's total, total received, donor count, this-month total, recent donations, quick actions
- ➕ Add Donation — name, mobile, WhatsApp, amount, payment method (Cash/UPI/Bank), transaction ID, date, notes
- 🧾 **Generate Receipt** — saves the record, assigns a unique receipt number, builds a **Marathi PDF** (with amount in words), auto-downloads it, and offers **WhatsApp share**
- 📋 Donations list with live search + per-row re-download / WhatsApp
- 📊 Reports — today / monthly / total collection, donor count, payment-method breakdown, Excel export
- ⚙️ Settings — mandal name, logo, address, contact, thank-you message, signatory, receipt prefix, password change
- 📁 All records stored in **Microsoft Excel (`data/donations.xlsx`)**
- 📱 Mobile responsive · saffron / gold / white / red theme · Marathi-friendly typography

## Run

```bash
npm install
npm run dev
```

Open http://localhost:4321

**Default login:** `admin` / `admin123` — change it in **Settings** after first login.

## Production build

```bash
npm run build
npm run preview   # serves ./dist on http://localhost:4321
```

## Where data lives
Everything is on disk under `data/` (git-ignored):
- `donations.xlsx` — all donation records
- `settings.json` — mandal details + admin password hash
- `uploads/` — logo image
- `.secret` — session-signing key

Back this folder up regularly. Deleting it resets the app.

## Notes on the Marathi PDF
The receipt is laid out as HTML (so the browser shapes Devanagari correctly), captured with `html2canvas`, and embedded into an A5 PDF via `jsPDF`. Marathi web fonts load from Google Fonts; on an offline machine Windows falls back to *Nirmala UI*, which also renders Devanagari correctly.
