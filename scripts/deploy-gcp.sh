#!/usr/bin/env bash
# Deploy Money Command to Google Cloud Run + Cloud SQL
# Usage: ./scripts/deploy-gcp.sh
#
# Prerequisites:
#   gcloud auth login
#   gcloud config set project personal-finance-ed108

set -euo pipefail

PROJECT_ID="${GCP_PROJECT_ID:-personal-finance-ed108}"
REGION="${GCP_REGION:-us-central1}"
SERVICE_NAME="${GCP_SERVICE_NAME:-personal-finance}"
DB_INSTANCE="${GCP_DB_INSTANCE:-personal-finance-db}"
DB_NAME="${GCP_DB_NAME:-personalfinance}"
DB_USER="${GCP_DB_USER:-personalfinance}"
AR_REPO="${GCP_AR_REPO:-personal-finance}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${SERVICE_NAME}:latest"

echo "==> Project: ${PROJECT_ID}"
echo "==> Region:  ${REGION}"

gcloud config set project "${PROJECT_ID}"

echo "==> Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com

if ! gcloud sql instances describe "${DB_INSTANCE}" &>/dev/null; then
  echo "==> Creating Cloud SQL PostgreSQL instance (this takes a few minutes)..."
  gcloud sql instances create "${DB_INSTANCE}" \
    --database-version=POSTGRES_15 \
    --tier=db-f1-micro \
    --region="${REGION}" \
    --root-password="$(openssl rand -base64 24)"
else
  echo "==> Cloud SQL instance ${DB_INSTANCE} already exists"
fi

if ! gcloud sql databases describe "${DB_NAME}" --instance="${DB_INSTANCE}" &>/dev/null; then
  echo "==> Creating database ${DB_NAME}..."
  gcloud sql databases create "${DB_NAME}" --instance="${DB_INSTANCE}"
fi

DB_PASSWORD="${DB_PASSWORD:-$(openssl rand -base64 24)}"
if ! gcloud sql users list --instance="${DB_INSTANCE}" --format="value(name)" | grep -q "^${DB_USER}$"; then
  echo "==> Creating database user ${DB_USER}..."
  gcloud sql users create "${DB_USER}" \
    --instance="${DB_INSTANCE}" \
    --password="${DB_PASSWORD}"
else
  echo "==> Database user ${DB_USER} already exists"
fi

if ! gcloud artifacts repositories describe "${AR_REPO}" --location="${REGION}" &>/dev/null; then
  echo "==> Creating Artifact Registry repository..."
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location="${REGION}"
fi

echo "==> Building and pushing container image..."
gcloud builds submit --tag "${IMAGE}"

CONNECTION_NAME="${PROJECT_ID}:${REGION}:${DB_INSTANCE}"
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@/${DB_NAME}?host=/cloudsql/${CONNECTION_NAME}"

echo "==> Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image="${IMAGE}" \
  --region="${REGION}" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --add-cloudsql-instances="${CONNECTION_NAME}" \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="DATABASE_URL=${DATABASE_URL}"

echo ""
echo "==> Running database migrations..."
# Run migrations via Cloud Run job or local proxy — use db push for initial setup
echo "Run this once to set up tables:"
echo ""
echo "  cloud-sql-proxy ${CONNECTION_NAME} &"
echo "  export DATABASE_URL=\"postgresql://${DB_USER}:PASSWORD@127.0.0.1:5432/${DB_NAME}\""
echo "  cp prisma/schema.postgres.prisma prisma/schema.prisma"
echo "  npx prisma db push"
echo "  npm run db:seed"
echo ""

SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" --region="${REGION}" --format="value(status.url)")
echo "==> Deployed! URL: ${SERVICE_URL}"
echo ""
echo "Save your database password: ${DB_PASSWORD}"
