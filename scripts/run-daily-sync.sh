#!/bin/bash
# Manually trigger the daily Plaid account sync (same job Cloud Scheduler runs at 7:30 AM).
#
# No "cron" command exists — scheduling is handled by Google Cloud Scheduler in GCP.
# This script calls the sync API directly using CRON_SECRET from Secret Manager.
#
# Usage:
#   ./scripts/run-daily-sync.sh
#
# Optional:
#   APP_URL=https://your-app.hosted.app ./scripts/run-daily-sync.sh

set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-money-command-3ee1b}"
APP_URL="${APP_URL:-https://money-command--money-command-3ee1b.us-central1.hosted.app}"
ENDPOINT="${APP_URL}/api/cron/sync-accounts"

echo "Fetching CRON_SECRET from Secret Manager..."
CRON_SECRET="$(npx firebase-tools apphosting:secrets:access CRON_SECRET --project "$PROJECT_ID" 2>/dev/null | tr -d '\n')"

if [[ -z "$CRON_SECRET" ]]; then
  echo "Error: Could not read CRON_SECRET. Run: firebase login && firebase use $PROJECT_ID"
  exit 1
fi

echo "Triggering sync at $ENDPOINT ..."
curl -sS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "$ENDPOINT" | (command -v jq >/dev/null && jq . || cat)

echo ""
