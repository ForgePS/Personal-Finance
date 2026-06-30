#!/bin/bash
# Manually trigger the daily Plaid account sync (same job Cloud Scheduler runs at 7:30 AM).
#
# No global "firebase" or "cron" CLI is required — uses npx firebase-tools from this repo.
#
# Usage (from project root):
#   npm run sync:accounts
#   ./scripts/run-daily-sync.sh
#
# First time only:
#   npx firebase-tools login

set -euo pipefail

PROJECT_ID="${FIREBASE_PROJECT_ID:-money-command-3ee1b}"
APP_URL="${APP_URL:-https://money-command--money-command-3ee1b.us-central1.hosted.app}"
ENDPOINT="${APP_URL}/api/cron/sync-accounts"
FIREBASE_CLI=(npx --yes firebase-tools@latest)

echo "Fetching CRON_SECRET..."

CRON_SECRET=""
if command -v gcloud >/dev/null 2>&1; then
  CRON_SECRET="$(gcloud secrets versions access latest --secret=CRON_SECRET --project="$PROJECT_ID" 2>/dev/null | tr -d '\n' || true)"
fi

if [[ -z "$CRON_SECRET" ]]; then
  CRON_SECRET="$("${FIREBASE_CLI[@]}" apphosting:secrets:access CRON_SECRET --project "$PROJECT_ID" 2>/dev/null | tr -d '\n' || true)"
fi

if [[ -z "$CRON_SECRET" ]]; then
  echo "Error: Could not read CRON_SECRET."
  echo ""
  echo "Log in once (no global firebase install needed):"
  echo "  npx firebase-tools login"
  echo ""
  echo "Or with gcloud:"
  echo "  gcloud auth login"
  echo "  gcloud secrets versions access latest --secret=CRON_SECRET --project=$PROJECT_ID"
  exit 1
fi

echo "Triggering sync at $ENDPOINT ..."
curl -sS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  -H "Content-Type: application/json" \
  "$ENDPOINT" | (command -v jq >/dev/null && jq . || cat)

echo ""
