# Use Your Existing Firebase Project

ForgePS Personal Finance is configured to run on Firebase project:

**Project ID:** `personal-finance-ed108`  
**Console:** https://console.firebase.google.com/project/personal-finance-ed108/overview

No Turso. No separate Cloud SQL. Everything stays in Firebase.

---

## What the app uses from Firebase

| Firebase service | How it's used |
|------------------|---------------|
| **Firestore** | Database (accounts, transactions, budgets, envelopes, goals) |
| **App Hosting** | Runs the Next.js app |
| **Secret Manager** | Plaid API keys (`PLAID_CLIENT_ID`, `PLAID_SECRET`) |
| **Application Default Credentials** | Server auto-authenticates — no service account key file needed on App Hosting |

---

## Deploy

### 1. Enable Firestore (if not already)

1. [Firebase Console → Firestore](https://console.firebase.google.com/project/personal-finance-ed108/firestore)
2. If not set up, click **Create database** → **Production mode** → pick a region (e.g. `us-central1`)
3. Grant the App Hosting service account access (required for 500 errors on empty DB):

```bash
./scripts/grant-firestore-access.sh
```

Then verify:

```
https://personal-finance--personal-finance-ed108.us-central1.hosted.app/api/health?deep=1
```

Should return `"firestore": { "ok": true }`.

### 2. Connect GitHub to App Hosting

1. [Firebase Console → App Hosting](https://console.firebase.google.com/project/personal-finance-ed108/apphosting)
2. **Create backend** (or edit existing)
3. Connect **ForgePS/Personal-Finance** repo, branch **main**
4. Backend ID: `personal-finance`
5. Enable **automatic rollouts**

### 3. Use your Plaid secrets (optional)

Bank linking is optional. The app deploys and runs without Plaid — you only need secrets if you want **Connect Bank**.

**If deploy fails with "Misconfigured secret" / `PLAID_CLIENT_ID`:**

Firebase App Hosting validates every `secret:` entry in `apphosting.yaml` at deploy time. If the secret doesn't exist (or the backend can't access it), the build fails in the preparer step.

**Quick fix (deploy without Plaid):**  
Comment out the `PLAID_CLIENT_ID` and `PLAID_SECRET` blocks in `apphosting.yaml`, push, and redeploy — everything except bank linking will work.

**To enable Plaid:**

```bash
firebase login
firebase use personal-finance-ed108
firebase apphosting:secrets:set PLAID_CLIENT_ID
firebase apphosting:secrets:set PLAID_SECRET
firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID PLAID_SECRET --backend personal-finance
```

Or run `./scripts/grant-plaid-secrets.sh` from the project root.

**If secrets already exist but deploy still fails:**  
The App Hosting backend likely lacks permission. Run only the grant command:

```bash
firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID PLAID_SECRET --backend personal-finance
```

Verify secrets in [Google Cloud Secret Manager](https://console.cloud.google.com/security/secret-manager?project=personal-finance-ed108).

### 4. Push to deploy

```bash
git push origin main
```

Firebase builds and deploys automatically. Your live URL will look like:

```
https://personal-finance--personal-finance-ed108.us-central1.hosted.app
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
export FIREBASE_PROJECT_ID=personal-finance-ed108
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
    value: personal-finance-ed108.firebaseapp.com
```

---

## Troubleshooting

**"Permission denied" on Firestore / 500 on every page**  
→ Enable Firestore, then run `./scripts/grant-firestore-access.sh`. Test with `/api/health?deep=1`.

**Plaid not working**  
→ Plaid is optional. Ensure `PLAID_*` secrets exist and run `firebase apphosting:secrets:grantaccess` for the `personal-finance` backend.

**Deploy fails: "Misconfigured secret" / `PLAID_CLIENT_ID` / `failed_precondition`**  
→ App Hosting may still require `PLAID_*` secrets even after removing them from `apphosting.yaml` (cached on the Cloud Run backend). The Environment tab in the console can look empty while secrets are still bound.

**Fastest fix (Google Cloud Shell):**

```bash
gcloud config set project personal-finance-ed108
./scripts/unblock-apphosting-deploy.sh
```

Or create secrets manually:

```bash
printf 'placeholder' | gcloud secrets create PLAID_CLIENT_ID --replication-policy=automatic --data-file=-
printf 'placeholder' | gcloud secrets create PLAID_SECRET --replication-policy=automatic --data-file=-
gcloud secrets add-iam-policy-binding PLAID_CLIENT_ID \
  --member="serviceAccount:firebase-app-hosting-compute@personal-finance-ed108.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
gcloud secrets add-iam-policy-binding PLAID_SECRET \
  --member="serviceAccount:firebase-app-hosting-compute@personal-finance-ed108.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

Then **Create rollout** from `main` (do not Retry old failures).

Also check **App Hosting → Secrets** tab (not just Environment) and **Cloud Run → personal-finance → Variables & Secrets**.

**Empty dashboard**  
→ Firestore is empty on first deploy. Use the app to add accounts, or run seed locally against Firestore (see above).
