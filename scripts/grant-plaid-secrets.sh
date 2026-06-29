#!/bin/bash
# Run this AFTER creating PLAID_CLIENT_ID and PLAID_SECRET in Secret Manager.
# This links secrets to your App Hosting backend (project IAM alone is not enough).

set -e

PROJECT="money-command-3ee1b"
BACKEND="money-command"

echo "Granting App Hosting access to Plaid secrets..."
echo "Project: $PROJECT  Backend: $BACKEND"
echo ""

npx firebase-tools apphosting:secrets:grantaccess PLAID_CLIENT_ID \
  --backend "$BACKEND" \
  --project "$PROJECT"

npx firebase-tools apphosting:secrets:grantaccess PLAID_SECRET \
  --backend "$BACKEND" \
  --project "$PROJECT"

echo ""
echo "Done. Now create a new rollout in Firebase App Hosting."
