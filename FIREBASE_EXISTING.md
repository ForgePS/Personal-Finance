# Use Your Existing Firebase Project

Money Command is configured to run on your existing Firebase project:

**Project ID:** `money-command-3ee1b`  
**Console:** https://console.firebase.google.com/project/money-command-3ee1b/overview

No Turso. No separate Cloud SQL. Everything stays in Firebase.

---

## What the app uses from Firebase

| Firebase service | How it's used |
|------------------|---------------|
| **Firestore** | Database (accounts, transactions, budgets, envelopes, goals) |
| **App Hosting** | Runs the Next.js app |
| **Secret Manager** | Your existing Plaid API keys (`PLAID_CLIENT_ID`, `PLAID_SECRET`) |
| **Application Default Credentials** | Server auto-authenticates — no service account key file needed on App Hosting |

---

## Deploy (replace old app)

### 1. Enable Firestore (if not already)

1. [Firebase Console → Firestore](https://console.firebase.google.com/project/money-command-3ee1b/firestore)
2. If not set up, click **Create database** → **Production mode** → pick a region (e.g. `us-central1`)

### 2. Connect GitHub to App Hosting

1. [Firebase Console → App Hosting](https://console.firebase.google.com/project/money-command-3ee1b/apphosting)
2. **Create backend** (or edit existing)
3. Connect **ForgePS/Money-Command** repo, branch **main**
4. Backend ID: `money-command`
5. Enable **automatic rollouts**

### 3. Use your existing Plaid secrets (optional)

Bank linking is optional. The app deploys and runs without Plaid — you only need secrets if you want **Connect Bank**.

**If deploy fails with "Misconfigured secret" / `PLAID_CLIENT_ID`:**

Firebase App Hosting validates every `secret:` entry in `apphosting.yaml` at deploy time. If the secret doesn't exist (or the backend can't access it), the build fails in the preparer step.

**Quick fix (deploy without Plaid):**  
`apphosting.yaml` ships with Plaid secrets commented out. Push that version and redeploy — everything except bank linking will work.

**To enable Plaid later:**

```bash
firebase login
firebase use money-command-3ee1b
firebase apphosting:secrets:set PLAID_CLIENT_ID
firebase apphosting:secrets:set PLAID_SECRET
firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID PLAID_SECRET --backend money-command
```

Then uncomment the `PLAID_CLIENT_ID` and `PLAID_SECRET` blocks in `apphosting.yaml`, commit, and push.

**If secrets already exist but deploy still fails:**  
The App Hosting backend likely lacks permission. Run only the grant command:

```bash
firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID PLAID_SECRET --backend money-command
```

Verify secrets in [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager?project=money-command-3ee1b).

### 4. Push to deploy

```bash
git push origin main
```

Firebase builds and deploys automatically. Your live URL will look like:

```
https://money-command--money-command-3ee1b.us-central1.hosted.app
```

---

## Firestore collections

The app uses these Firestore collections (created automatically on first write):

| Collection | Data |
|------------|------|
| `accounts` | Bank & manual accounts |
| `categories` | Income/expense categories |
| `transactions` | All transactions |
| `budgets` | Monthly budgets |
| `goals` | Savings goals |
| `envelopePools` | Monthly money pool |
| `envelopes` | Category envelopes |
| `envelopeTransfers` | Envelope movements |
| `plaidItems` | Connected bank institutions |

If your old app used different collection names, let me know and we can map them.

---

## Local development

Locally the app still uses **SQLite** (no Firebase needed):

```bash
npm install
npm run db:setup
npm run dev
```

To test with Firestore locally:

```bash
# Download service account key from Firebase Console → Project Settings → Service Accounts
export USE_FIRESTORE=true
export FIREBASE_PROJECT_ID=money-command-3ee1b
export FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
npm run dev
```

---

## Optional: Firebase web config

If you have a Firebase web app config (API key, app ID, etc.), add to App Hosting secrets or `apphosting.yaml`:

```yaml
env:
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: FIREBASE_API_KEY
  - variable: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    value: money-command-3ee1b.firebaseapp.com
```

---

## Old Firebase Hosting site

If you had a static site on Firebase Hosting, it won't be replaced automatically. After App Hosting is live:

1. [Firebase Hosting](https://console.firebase.google.com/project/money-command-3ee1b/hosting)
2. Point your custom domain to the new App Hosting URL, or remove the old site

---

## Troubleshooting

**"Permission denied" on Firestore**  
→ Enable Firestore API in [Google Cloud Console](https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=money-command-3ee1b)

**Plaid not working**  
→ Plaid is optional. Uncomment `PLAID_*` secret blocks in `apphosting.yaml` only after creating secrets and granting access (see Step 3 above).

**Deploy fails: "Misconfigured secret" / `PLAID_CLIENT_ID`**  
→ Either create the secrets and run `firebase apphosting:secrets:grantaccess`, or keep Plaid commented out in `apphosting.yaml` to deploy without bank linking.

**Empty dashboard**  
→ Firestore is empty on first deploy. Use the app to add accounts, or run seed locally against Firestore (see above)
