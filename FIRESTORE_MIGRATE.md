# Migrate Firestore: money-command → personal-finance

Copy all app data from **`money-command-3ee1b`** into **`personal-finance-ed108`**.

---

## Recommended: Direct copy in Cloud Shell (no JSON keys)

Use this when **"Generate new private key" is blocked** by organization policy, or when `gcloud firestore export` fails with **PERMISSION_DENIED** on Cloud Storage.

This reads and writes Firestore directly using **Application Default Credentials (ADC)** — your Google login — so **no service account key files are needed**.

### 1. Open Cloud Shell

https://console.cloud.google.com/cloudshell?project=personal-finance-ed108

### 2. Log in and grant yourself Firestore access

```bash
gcloud auth application-default login
gcloud config set project personal-finance-ed108
```

Your Google account needs **Cloud Datastore User** on **both** projects. If dry-run fails with permission errors, run (replace with your email):

```bash
gcloud projects add-iam-policy-binding money-command-3ee1b \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding personal-finance-ed108 \
  --member="user:YOUR_EMAIL@example.com" \
  --role="roles/datastore.user"
```

### 3. Clone and install

```bash
git clone https://github.com/ForgePS/Personal-Finance.git
cd Personal-Finance
npm install
```

### 4. Preview, then copy

```bash
# Preview document counts (no writes)
npx tsx scripts/migrate-firestore.ts --dry-run --all-collections

# Copy all collections found in source
npx tsx scripts/migrate-firestore.ts --all-collections

# Or copy only the known app collections
npx tsx scripts/migrate-firestore.ts
```

The script uses ADC automatically when no `SOURCE_SA_FILE` / `DEST_SA_FILE` env vars are set. You can also set `USE_ADC=1` explicitly.

### 5. Verify

https://console.firebase.google.com/project/personal-finance-ed108/firestore

Then open the app:

https://personal-finance--personal-finance-ed108.us-central1.hosted.app/

---

## Alternative: Direct copy with service account keys

Only use this if your organization **allows** key creation on both projects.

### 1. Download two service account keys

**Money Command (source):**  
https://console.firebase.google.com/project/money-command-3ee1b/settings/serviceaccounts/adminsdk  
→ **Generate new private key** → save as `money-command-sa.json`

**Personal Finance (destination):**  
https://console.firebase.google.com/project/personal-finance-ed108/settings/serviceaccounts/adminsdk  
→ **Generate new private key** → save as `personal-finance-sa.json`

If you see *"Key creation is not allowed on this service account"*, use the **ADC method above** instead.

### 2. Run in Cloud Shell

Upload both JSON files via the **⋮** menu → **Upload**, then:

```bash
git clone https://github.com/ForgePS/Personal-Finance.git
cd Personal-Finance
npm install

SOURCE_SA_FILE=~/money-command-sa.json \
DEST_SA_FILE=~/personal-finance-sa.json \
npx tsx scripts/migrate-firestore.ts --dry-run --all-collections

SOURCE_SA_FILE=~/money-command-sa.json \
DEST_SA_FILE=~/personal-finance-sa.json \
npx tsx scripts/migrate-firestore.ts --all-collections
```

---

## Alternative: gcloud export/import (Cloud Storage)

Only use this if direct copy is not an option. Requires bucket IAM for service account  
`service-611170516796@gcp-sa-firestore.iam.gserviceaccount.com` on the destination bucket.

| Collection | Data |
|------------|------|
| `accounts` | Bank & manual accounts |
| `categories` | Income/expense categories |
| `transactions` | All transactions |
| `budgets` | Monthly budgets |
| `goals` | Savings goals |
| `envelopePools` | Monthly envelope pool |
| `envelopes` | Category envelopes |
| `envelopePoolFundings` | Pool funding records |
| `envelopeTransfers` | Envelope transfers |
| `plaidItems` | Linked bank connections |
| `paySchedules` | Pay schedules |
| `scheduledExpenses` | Scheduled bills |
| `scheduleDateAdjustments` | Planner adjustments |
| `appConfig` | Plaid keys stored in Firestore (if any) |

Document IDs are preserved so relationships stay intact.

### Export from Money Command

```bash
gcloud config set project personal-finance-ed108
gsutil mb -l us-central1 gs://personal-finance-ed108-firestore-migrate

gcloud firestore export gs://personal-finance-ed108-firestore-migrate/money-command-backup \
  --project=money-command-3ee1b
```

### Import into Personal Finance

```bash
gcloud firestore import gs://personal-finance-ed108-firestore-migrate/money-command-backup \
  --project=personal-finance-ed108
```

**Warning:** Import **overwrites** documents with the same IDs in the destination.

---

## After migration

1. Confirm App Hosting rollout is **Success** on `personal-finance-ed108`
2. Open https://personal-finance--personal-finance-ed108.us-central1.hosted.app/
3. Check **Accounts**, **Transactions**, **Envelopes** match Money Command
4. Re-link Plaid banks if needed (access tokens may need refresh after migration)

---

## Troubleshooting

**"Key creation is not allowed on this service account"**  
→ Your Google Cloud organization blocks JSON key downloads. Use the **ADC / Cloud Shell method** at the top of this doc — no keys required.

**Permission denied during migration**  
→ Grant `roles/datastore.user` on both projects to your Google account (see step 2 above).

**Permission denied on export**  
→ Your account needs `roles/datastore.importExportAdmin` on `money-command-3ee1b`.

**Empty source database**  
→ Money Command Firestore may never have been populated (app might have used SQLite/Turso only). Check:

https://console.firebase.google.com/project/money-command-3ee1b/firestore

If collections are empty there, your live data is not in Firestore and cannot be migrated this way.

**Plaid bank linking broken after migrate**  
→ Normal if tokens were environment-specific. Reconnect banks in **Settings → Bank Linking**.
