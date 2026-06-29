# Deploy Money Command to Firebase

Replace the old app on **money-command-3ee1b** with the new Money Command build.

Firebase project: https://console.firebase.google.com/project/money-command-3ee1b/overview

---

## Overview

| Component | Service |
|-----------|---------|
| App hosting | **Firebase App Hosting** (runs Next.js on Cloud Run) |
| Database | **Turso** (cloud SQLite — works with our Prisma setup) |
| Bank linking | **Plaid** (optional secrets) |
| Source code | **GitHub** → `ForgePS/Money-Command` branch `main` |

---

## Step 1: Create a cloud database (Turso)

Firebase App Hosting can't use local SQLite files. Create a free Turso database:

```bash
# Install Turso CLI: https://docs.turso.tech/cli
turso auth login
turso db create money-command --region lax
turso db show money-command --url
turso db tokens create money-command
```

Save the **database URL** and **auth token**.

Apply the schema:

```bash
export TURSO_DATABASE_URL="libsql://your-db-url"
export TURSO_AUTH_TOKEN="your-token"
npx prisma migrate deploy
npm run db:seed
```

---

## Step 2: Connect GitHub to Firebase App Hosting

1. Open [Firebase Console → App Hosting](https://console.firebase.google.com/project/money-command-3ee1b/apphosting)
2. Click **Get started** or **Create backend**
3. Connect your GitHub account
4. Select repository: **ForgePS/Money-Command**
5. Branch: **main**
6. Root directory: `/` (leave default)
7. Backend ID: `money-command`
8. Enable **automatic rollouts** (deploys on every push to `main`)

---

## Step 3: Set secrets in Firebase

Install Firebase CLI and log in:

```bash
npm install -g firebase-tools
firebase login
firebase use money-command-3ee1b
```

Set required secrets:

```bash
firebase apphosting:secrets:set TURSO_DATABASE_URL
firebase apphosting:secrets:set TURSO_AUTH_TOKEN
```

Optional (for bank linking):

```bash
firebase apphosting:secrets:set PLAID_CLIENT_ID
firebase apphosting:secrets:set PLAID_SECRET
```

Grant access to the App Hosting backend when prompted.

---

## Step 4: Deploy

### Option A — Automatic (recommended)

Push to `main` on GitHub. Firebase App Hosting builds and deploys automatically.

```bash
git push origin main
```

### Option B — Manual rollout

1. Firebase Console → App Hosting → your backend
2. Click **Create rollout**
3. Select branch `main`

---

## Step 5: Verify

After rollout completes (5–10 minutes), Firebase gives you a URL like:

```
https://money-command--money-command-3ee1b.us-central1.hosted.app
```

Visit the URL and confirm:
- Dashboard loads
- Accounts page works
- Envelopes page works
- Connect Bank works (if Plaid secrets are set)

---

## Custom domain (optional)

1. Firebase Console → App Hosting → your backend → **Domains**
2. Add your custom domain
3. Follow DNS verification steps

---

## Local vs production

| | Local | Firebase |
|---|-------|----------|
| Database | SQLite (`dev.db`) | Turso (secrets) |
| Config | `.env` file | `apphosting.yaml` + secrets |
| Deploy | `npm run dev` | Push to GitHub |

---

## Troubleshooting

**Build fails**
- Check App Hosting build logs in Firebase Console
- Ensure `TURSO_*` secrets are set and accessible to the backend

**White screen / 500 errors**
- Run `npx prisma migrate deploy` against your Turso database
- Check runtime logs in Firebase Console → App Hosting → Logs

**Bank linking disabled**
- Set `PLAID_CLIENT_ID` and `PLAID_SECRET` secrets
- Use `PLAID_ENV=sandbox` for testing

---

## Files added for Firebase

- `.firebaserc` — project ID `money-command-3ee1b`
- `firebase.json` — App Hosting backend config
- `apphosting.yaml` — build/runtime settings and secret references
