# Megamind BD — Invoice Manager

A web app we built for Megamind BD to handle invoicing the way we were already doing it, but properly. You can create professional PDF invoices (service, product sale with warranty, and repair), keep them safely stored and encrypted in the cloud, and find any invoice later by number or date. The whole thing runs on free services, so there are no monthly costs.

## What it does

- **Login with email and password** (Firebase Auth). Your invoices are only ever visible to you.
- **Three invoice types**, matching how the business actually works:
  - Service invoices (e.g. Facebook boosts) — numbers like `LN-XXXXXX`
  - Product sale invoices with a warranty line per item — `PN-XXXXXX`
  - Repair invoices with device details and separate labour / parts rows — `RN-XXXXXX`
- Invoice numbers are random and checked for uniqueness, so they never clash.
- A clean, professional A4 PDF in navy and gold with the Megamind BD logo, letterhead, line-item tables, totals panel, amount in words, and the usual contact details in the footer (the same ones that were on the old receipts, so nothing changes for the client).
- **Search** by invoice number (partial match works), date range, or type. You can view, download, or delete any invoice.
- Works nicely on a phone too, so you can create an invoice while out with a client.

## How the security works

Every invoice is handled on your device before anything is uploaded:

1. The PDF is generated in your browser.
2. It gets compressed.
3. It is encrypted with AES-256-GCM, using a key derived from your password (PBKDF2 with 310,000 rounds).
4. Only the encrypted blob goes to the cloud.

In short, nobody but you can read the invoices, not even the cloud provider. At sign-up you will see a one-time **recovery phrase** — if you ever forget your password, that phrase is the only way back into your invoices, so keep it somewhere safe (offline is best). Changing your password re-wraps the encryption key automatically, so nothing is lost.

## Running it locally

```bash
npm install
npm run dev
```

The app opens in your browser. Without Firebase configured it runs in **demo mode** (everything is saved in that browser), which is a handy way to try the whole flow before setting up the cloud storage.

## Connecting the cloud storage (Firebase, free plan, ~10 minutes)

1. Go to https://console.firebase.google.com and click **Add project**.
2. **Build → Authentication → Get started → Email/Password** and enable it.
3. **Build → Firestore Database → Create database** (production mode, choose a region near you).
4. **Build → Storage → Get started** (production mode).
5. In **Project settings → Your apps → Web app (</>)**, register the app and copy the config values.
6. Copy `.env.example` to `.env` and paste the six `VITE_FIREBASE_*` values:

```bash
cp .env.example .env
```

7. Lock down the data with the rules files in this repo:
   - **Firestore → Rules** → paste `firestore.rules` → Publish
   - **Storage → Rules** → paste `storage.rules` → Publish

Restart `npm run dev`. The badge on the login page should now say "Connected to firebase" instead of demo mode.

## Deploying to GitHub Pages (free hosting)

The repository includes a GitHub Actions workflow that builds and deploys automatically on every push to `main`.

1. Create a repository on GitHub and push this code:

```bash
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

2. On GitHub go to **Settings → Pages → Source** and select **GitHub Actions**.
3. After the first build finishes, the app is live at `https://<your-user>.github.io/<your-repo>/`.

## Checking the build

```bash
npm run build
```

## Automated test (optional)

The repository includes an end-to-end test that runs the whole flow in headless Firefox: sign-up, creating all three invoice types, searching, deleting, changing the password, and unlocking after a reload.

```bash
npm run dev -- --port 5173   # or: npm run preview
npm run test:e2e
```