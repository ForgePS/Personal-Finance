# Deploy Personal Finance to Firebase

Deploy to Firebase project **personal-finance-ed108**.

Firebase project: https://console.firebase.google.com/project/personal-finance-ed108/overview

> **Recommended:** Use **[FIREBASE_EXISTING.md](./FIREBASE_EXISTING.md)** — Firestore database, no Turso required.

---

## Overview

| Component | Service |
|-----------|---------|
| App hosting | **Firebase App Hosting** (runs Next.js on Cloud Run) |
| Database | **Firestore** (production) / SQLite (local dev) |
| Bank linking | **Plaid** (optional secrets) |
| Source code | **GitHub** → `ForgePS/Personal-Finance` branch `main` |

---

## Connect GitHub to Firebase App Hosting

1. Open [Firebase Console → App Hosting](https://console.firebase.google.com/project/personal-finance-ed108/apphosting)
2. Click **Get started** or **Create backend**
3. Connect your GitHub account
4. Select repository: **ForgePS/Personal-Finance**
5. Branch: **main**
6. Root directory: `/` (leave default)
7. Backend ID: `personal-finance`
8. Enable **automatic rollouts** (deploys on every push to `main`)

---

## Set secrets in Firebase

```bash
npm install -g firebase-tools
firebase login
firebase use personal-finance-ed108
```

Optional (for bank linking):

```bash
firebase apphosting:secrets:set PLAID_CLIENT_ID
firebase apphosting:secrets:set PLAID_SECRET
./scripts/grant-plaid-secrets.sh
```

---

## Deploy

Push to `main` on GitHub. Firebase App Hosting builds and deploys automatically.

```bash
git push origin main
```

---

## Verify

After rollout completes, your URL will look like:

```
https://personal-finance--personal-finance-ed108.us-central1.hosted.app
```

---

## Files for Firebase

- `.firebaserc` — project ID `personal-finance-ed108`
- `firebase.json` — App Hosting backend `personal-finance`
- `apphosting.yaml` — build/runtime settings and secret references

See **[FIREBASE_EXISTING.md](./FIREBASE_EXISTING.md)** for full setup, Firestore, and troubleshooting.
