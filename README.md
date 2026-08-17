# लोकमान्य बाल गणेश उत्सव मंडळ — Donation Admin

Donation & receipt management web app for **Lokmanya Bal Ganesh Utsav Mandal**, built with **Astro.js** and deployed **serverless on Cloudflare** (Pages + R2).

## Features
- 🔒 Secure admin login (PBKDF2-hashed password, HMAC-signed session cookie)
- 🏠 Dashboard — today's total, total received, donor count, **amount to be received**, recent donations, quick actions
- ➕ Add Donation — name, mobile, WhatsApp, **Total / Paid / Balance**, payment method, transaction ID, date, notes
- 🧾 **Generate Receipt** — unique receipt number, Marathi **JPG** receipt (amount in words), auto-download + WhatsApp share
- 📋 Donations list — live search, **Money Received / Money Pending filters**, edit & delete
- 📊 Reports — today / monthly / total collection, donors, Excel export
- ⚙️ Settings — mandal name, logo, address, contact, thank-you message, signatory, password change
- 📁 All records stored in **Microsoft Excel (`donations.xlsx`)** — kept in Cloudflare R2
- 📱 Mobile responsive · saffron / gold / white / red theme · Marathi typography

## How storage works
There is **no database**. Everything lives in a single **Cloudflare R2 bucket** (`lokmanya-data`):
- `donations.xlsx` — all donation records (a real Excel file)
- `settings.json` — mandal details + admin password hash
- `uploads/logo.*` — the mandal logo

Auth uses WebCrypto (PBKDF2 + HMAC) so it runs on Cloudflare's runtime. The session-signing key is the `SESSION_SECRET` secret.

## Local development
```bash
npm install
npm run dev
```
Open http://localhost:4321 · login **admin / admin123** (change it in Settings).

`npm run dev` runs Astro with a **local emulated R2** (Miniflare) — data is stored under `.wrangler/` on your machine and does not touch production. Local secrets come from `.dev.vars`.

## Deploy to Cloudflare (one-time setup)

You need a free Cloudflare account. Run these from the project folder:

```bash
# 1. Log in to Cloudflare
npx wrangler login

# 2. Create the R2 bucket that stores the data
npx wrangler r2 bucket create lokmanya-data

# 3. Set the session-signing secret (paste a long random string when prompted)
npx wrangler pages secret put SESSION_SECRET

# 4. Build & deploy
npm run deploy
```

The first `npm run deploy` creates the Pages project (accept the prompts). After it finishes you get a `*.pages.dev` URL.

### Connect your domain
In the Cloudflare dashboard → **Workers & Pages → lokmanya → Custom domains → Set up a custom domain**, enter your domain (or subdomain). Cloudflare adds the DNS + SSL automatically.

### Move your existing donations into R2 (once)
Your current records live in `data/donations.xlsx`. Upload them to production R2:

```bash
npx wrangler r2 object put lokmanya-data/donations.xlsx --file=./data/donations.xlsx --remote
```

Mandal name / address / logo re-seed to defaults on first run — just re-enter them once in **Settings** after logging in. (The old admin password does **not** carry over; production starts at `admin / admin123` — change it immediately.)

## Redeploying after changes
```bash
npm run deploy
```
R2 data is untouched by deploys — only the code is replaced.
