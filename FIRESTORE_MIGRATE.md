# Migrate Firestore: money-command → personal-finance

Copy all app data from **`money-command-3ee1b`** into **`personal-finance-ed108`**.

---

## Recommended: Direct copy (skip export/import)

If `gcloud firestore export` keeps failing with **PERMISSION_DENIED** on Cloud Storage, use this method instead. It reads Firestore directly — **no bucket permissions needed**.

### 1. Download two service account keys

**Money Command (source):**  
https://console.firebase.google.com/project/money-command-3ee1b/settings/serviceaccounts/adminsdk  
→ **Generate new private key** → save as `money-command-sa.json`

**Personal Finance (destination):**  
https://console.firebase.google.com/project/personal-finance-ed108/settings/serviceaccounts/adminsdk  
→ **Generate new private key** → save as `personal-finance-sa.json`

### 2. Run in Google Cloud Shell

Open: https://console.cloud.google.com/cloudshell?project=personal-finance-ed108

```bash
git clone https://github.com/ForgePS/Personal-Finance.git
cd Personal-Finance
npm install
```

Use the **⋮** menu → **Upload** to upload both JSON files to your home directory.

```bash
# Preview counts
SOURCE_SA_FILE=~/money-command-sa.json \
DEST_SA_FILE=~/personal-finance-sa.json \
npx tsx scripts/migrate-firestore.ts --dry-run

# Copy everything
SOURCE_SA_FILE=~/money-command-sa.json \
DEST_SA_FILE=~/personal-finance-sa.json \
npx tsx scripts/migrate-firestore.ts

# Or copy every collection found in source (including any extras)
SOURCE_SA_FILE=~/money-command-sa.json \
DEST_SA_FILE=~/personal-finance-sa.json \
npx tsx scripts/migrate-firestore.ts --all-collections
```

### 3. Verify

https://console.firebase.google.com/project/personal-finance-ed108/firestore

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

---

## Method 1 — Google Cloud export/import (recommended)

Works entirely in **Google Cloud Shell**. No local git required.

### 1. Open Cloud Shell

https://console.cloud.google.com/cloudshell?project=personal-finance-ed108

### 2. Create a storage bucket (one time)

```bash
gcloud config set project personal-finance-ed108
gsutil mb -l us-central1 gs://personal-finance-ed108-firestore-migrate
```

### 3. Export from Money Command

```bash
gcloud firestore export gs://personal-finance-ed108-firestore-migrate/money-command-backup \
  --project=money-command-3ee1b
```

Wait until the operation completes (check [Firestore → Import/Export](https://console.cloud.google.com/firestore/databases/-default-/import-export?project=money-command-3ee1b)).

### 4. Import into Personal Finance

```bash
gcloud firestore import gs://personal-finance-ed108-firestore-migrate/money-command-backup \
  --project=personal-finance-ed108
```

**Warning:** Import **overwrites** documents with the same IDs in the destination. Use a fresh/empty Firestore database, or export Personal Finance first if it already has data you want to keep.

### 5. Verify

Open the Personal Finance app or Firestore console:

https://console.firebase.google.com/project/personal-finance-ed108/firestore

You should see `accounts`, `transactions`, etc. with your data.

---

## Method 2 — Migration script (from your PC)

From `C:\Users\jerem\Projects\personal-finance`:

### 1. Download service account keys

**Source (Money Command):**

1. https://console.firebase.google.com/project/money-command-3ee1b/settings/serviceaccounts/adminsdk
2. **Generate new private key** → save as `money-command-sa.json`

**Destination (Personal Finance):**

1. https://console.firebase.google.com/project/personal-finance-ed108/settings/serviceaccounts/adminsdk
2. **Generate new private key** → save as `personal-finance-sa.json`

Give each key **Cloud Datastore User** (or Firebase Admin) on its project.

### 2. Dry run (count documents)

```powershell
cd C:\Users\jerem\Projects\personal-finance

$env:SOURCE_PROJECT_ID = "money-command-3ee1b"
$env:DEST_PROJECT_ID = "personal-finance-ed108"
$env:SOURCE_SERVICE_ACCOUNT_KEY = Get-Content -Raw money-command-sa.json
$env:DEST_SERVICE_ACCOUNT_KEY = Get-Content -Raw personal-finance-sa.json

npx tsx scripts/migrate-firestore.ts --dry-run
```

### 3. Run migration

```powershell
npx tsx scripts/migrate-firestore.ts
```

---

## Method 3 — Cloud Shell with the script

Upload both JSON keys to Cloud Shell, then:

```bash
export SOURCE_PROJECT_ID=money-command-3ee1b
export DEST_PROJECT_ID=personal-finance-ed108
export SOURCE_SERVICE_ACCOUNT_KEY="$(cat money-command-sa.json)"
export DEST_SERVICE_ACCOUNT_KEY="$(cat personal-finance-sa.json)"

npx tsx scripts/migrate-firestore.ts --dry-run
npx tsx scripts/migrate-firestore.ts
```

---

## After migration

1. Confirm App Hosting rollout is **Success** on `personal-finance-ed108`
2. Open https://personal-finance--personal-finance-ed108.us-central1.hosted.app/
3. Check **Accounts**, **Transactions**, **Envelopes** match Money Command
4. Re-link Plaid banks if needed (access tokens may need refresh after migration)

---

## Troubleshooting

**Permission denied on export**  
→ Your account needs `roles/datastore.importExportAdmin` on `money-command-3ee1b`.

**Permission denied on import**  
→ Same role on `personal-finance-ed108`.

**Destination already has test data**  
→ Import merges/overwrites by document ID. Export Personal Finance first if you need a backup.

**Plaid bank linking broken after migrate**  
→ Normal if tokens were environment-specific. Reconnect banks in **Settings → Bank Linking**.

**Empty source database**  
→ Money Command Firestore may never have been populated (app might have used SQLite/Turso only). Check:

https://console.firebase.google.com/project/money-command-3ee1b/firestore

If collections are empty there, your live data is not in Firestore and cannot be migrated this way.
