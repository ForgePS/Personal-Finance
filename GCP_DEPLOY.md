# Deploy Money Command on Google Cloud

Deploy entirely within **Google Cloud** — no Turso, no Firebase App Hosting required.

| Service | Purpose |
|---------|---------|
| **Cloud Run** | Hosts the Next.js app |
| **Cloud SQL** | PostgreSQL database |
| **Artifact Registry** | Stores Docker images |
| **Secret Manager** | Plaid API keys (optional) |

Firebase project `money-command-3ee1b` is a Google Cloud project — you can use Cloud Run directly.

---

## Quick deploy (one script)

```bash
# Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install
gcloud auth login
gcloud config set project money-command-3ee1b

chmod +x scripts/deploy-gcp.sh
./scripts/deploy-gcp.sh
```

The script will:
1. Enable required GCP APIs
2. Create a Cloud SQL PostgreSQL database
3. Build a Docker image and push to Artifact Registry
4. Deploy to Cloud Run with the database connected

---

## Manual step-by-step

### 1. Enable APIs

```bash
gcloud config set project money-command-3ee1b

gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com
```

### 2. Create Cloud SQL database

```bash
gcloud sql instances create money-command-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

gcloud sql databases create moneycommand --instance=money-command-db

gcloud sql users create moneycommand \
  --instance=money-command-db \
  --password=YOUR_SECURE_PASSWORD
```

### 3. Build and deploy

```bash
# Create Artifact Registry repo (once)
gcloud artifacts repositories create money-command \
  --repository-format=docker \
  --location=us-central1

# Build image with Cloud Build
gcloud builds submit --tag us-central1-docker.pkg.dev/money-command-3ee1b/money-command/money-command:latest

# Deploy to Cloud Run
gcloud run deploy money-command \
  --image=us-central1-docker.pkg.dev/money-command-3ee1b/money-command/money-command:latest \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --add-cloudsql-instances=money-command-3ee1b:us-central1:money-command-db \
  --set-env-vars="DATABASE_URL=postgresql://moneycommand:YOUR_PASSWORD@/moneycommand?host=/cloudsql/money-command-3ee1b:us-central1:money-command-db"
```

### 4. Set up database tables

Install Cloud SQL Auth Proxy locally:

```bash
# Download: https://cloud.google.com/sql/docs/postgres/connect-auth-proxy
cloud-sql-proxy money-command-3ee1b:us-central1:money-command-db &

export DATABASE_URL="postgresql://moneycommand:YOUR_PASSWORD@127.0.0.1:5432/moneycommand"
cp prisma/schema.postgres.prisma prisma/schema.prisma
npx prisma generate
npx prisma db push
npm run db:seed
```

### 5. Open your app

```bash
gcloud run services describe money-command --region=us-central1 --format="value(status.url)"
```

---

## Custom domain

1. [Cloud Run Console](https://console.cloud.google.com/run) → `money-command` → **Manage custom domains**
2. Add your domain and follow DNS instructions

Or map through Firebase Hosting as a reverse proxy to Cloud Run (optional).

---

## Plaid bank linking (optional)

Store secrets in Secret Manager and attach to Cloud Run:

```bash
echo -n "your_plaid_client_id" | gcloud secrets create PLAID_CLIENT_ID --data-file=-
echo -n "your_plaid_secret" | gcloud secrets create PLAID_SECRET --data-file=-

gcloud run services update money-command \
  --region=us-central1 \
  --set-secrets=PLAID_CLIENT_ID=PLAID_CLIENT_ID:latest,PLAID_SECRET=PLAID_SECRET:latest \
  --set-env-vars=PLAID_ENV=sandbox
```

---

## Local development vs Google Cloud

| | Local (`npm run dev`) | Google Cloud |
|---|----------------------|--------------|
| Database | SQLite file | Cloud SQL PostgreSQL |
| Hosting | localhost:3000 | Cloud Run URL |
| Config | `.env` | Cloud Run env vars |

Your local setup stays the same — Google Cloud is only for production.

---

## Cost estimate (low traffic)

- **Cloud Run**: Free tier covers light usage
- **Cloud SQL db-f1-micro**: ~$7–10/month
- **Artifact Registry**: Minimal storage cost

---

## Console links

- [Cloud Run](https://console.cloud.google.com/run?project=money-command-3ee1b)
- [Cloud SQL](https://console.cloud.google.com/sql?project=money-command-3ee1b)
- [Cloud Build](https://console.cloud.google.com/cloud-build?project=money-command-3ee1b)
- [Firebase / GCP Project](https://console.firebase.google.com/project/money-command-3ee1b/overview)
