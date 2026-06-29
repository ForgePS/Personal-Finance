#!/bin/bash
# Set up daily Plaid account sync at 7:30 AM via Cloud Scheduler.
#
# Run from project root after: firebase login && firebase use money-command-3ee1b
#
# Optional env overrides:
#   SYNC_TIMEZONE=America/New_York   # cron timezone (default)
#   SYNC_SCHEDULE="30 7 * * *"       # 7:30 AM daily
#   APP_URL=https://money-command--money-command-3ee1b.us-central1.hosted.app

set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-money-command-3ee1b}"
BACKEND="money-command"
REGION="us-central1"
JOB_NAME="money-command-daily-sync"
APP_URL="${APP_URL:-https://money-command--money-command-3ee1b.us-central1.hosted.app}"
SYNC_ENDPOINT="${APP_URL}/api/cron/sync-accounts"
SYNC_TIMEZONE="${SYNC_TIMEZONE:-America/New_York}"
SYNC_SCHEDULE="${SYNC_SCHEDULE:-30 7 * * *}"

echo "Money Command — daily account sync setup"
echo "  Schedule:  $SYNC_SCHEDULE ($SYNC_TIMEZONE)"
echo "  Endpoint:  $SYNC_ENDPOINT"
echo ""

if ! command -v gcloud >/dev/null 2>&1; then
  echo "Error: gcloud CLI is required. Install: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

gcloud config set project "$PROJECT_ID" >/dev/null

# 1) Create or update CRON_SECRET in Secret Manager
if gcloud secrets describe CRON_SECRET --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "CRON_SECRET already exists — adding a new version..."
  read -r -s -p "Enter CRON_SECRET value (or press Enter to generate): " CRON_VALUE
  echo ""
  if [[ -z "${CRON_VALUE:-}" ]]; then
    CRON_VALUE="$(openssl rand -base64 32)"
    echo "Generated CRON_SECRET."
  fi
  echo -n "$CRON_VALUE" | gcloud secrets versions add CRON_SECRET --data-file=- --project="$PROJECT_ID"
else
  CRON_VALUE="$(openssl rand -base64 32)"
  echo "Creating CRON_SECRET..."
  echo -n "$CRON_VALUE" | gcloud secrets create CRON_SECRET --data-file=- --project="$PROJECT_ID"
fi

# 2) Grant App Hosting backend access
echo "Granting App Hosting access to CRON_SECRET..."
npx firebase-tools apphosting:secrets:grantaccess CRON_SECRET -b "$BACKEND" --project "$PROJECT_ID"

# 3) Enable Cloud Scheduler API
gcloud services enable cloudscheduler.googleapis.com --project="$PROJECT_ID" >/dev/null

# 4) Create or update scheduler job
if gcloud scheduler jobs describe "$JOB_NAME" --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Updating Cloud Scheduler job '$JOB_NAME'..."
  gcloud scheduler jobs update http "$JOB_NAME" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="$SYNC_SCHEDULE" \
    --time-zone="$SYNC_TIMEZONE" \
    --uri="$SYNC_ENDPOINT" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_VALUE}" \
    --attempt-deadline=300s
else
  echo "Creating Cloud Scheduler job '$JOB_NAME'..."
  gcloud scheduler jobs create http "$JOB_NAME" \
    --location="$REGION" \
    --project="$PROJECT_ID" \
    --schedule="$SYNC_SCHEDULE" \
    --time-zone="$SYNC_TIMEZONE" \
    --uri="$SYNC_ENDPOINT" \
    --http-method=POST \
    --headers="Authorization=Bearer ${CRON_VALUE}" \
    --attempt-deadline=300s
fi

echo ""
echo "Done."
echo ""
echo "Next steps:"
echo "  1. Push/deploy so apphosting.yaml picks up CRON_SECRET@1"
echo "  2. Test manually:"
echo "     curl -X POST -H \"Authorization: Bearer <CRON_SECRET>\" $SYNC_ENDPOINT"
echo "  3. Optional — run job now:"
echo "     gcloud scheduler jobs run $JOB_NAME --location=$REGION --project=$PROJECT_ID"
