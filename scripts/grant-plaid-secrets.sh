#!/bin/bash
# Link Plaid secrets to your App Hosting backend.
# Run from the project root after: npx firebase-tools login && npx firebase-tools use personal-finance-ed108

set -e

BACKEND="personal-finance"

echo "Granting App Hosting backend '$BACKEND' access to Plaid secrets..."
echo ""

npx firebase-tools apphosting:secrets:grantaccess PLAID_CLIENT_ID,PLAID_SECRET -b "$BACKEND"

echo ""
echo "Done. Create a new rollout in Firebase App Hosting."
