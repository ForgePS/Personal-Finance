#!/bin/bash
# Link Plaid secrets to your App Hosting backend.
# Run from the project root after: npx firebase-tools login && npx firebase-tools use money-command-3ee1b

set -e

BACKEND="money-command"

echo "Granting App Hosting backend '$BACKEND' access to Plaid secrets..."
echo ""

npx firebase-tools apphosting:secrets:grantaccess PLAID_CLIENT_ID,PLAID_SECRET -b "$BACKEND"

echo ""
echo "Done. Create a new rollout in Firebase App Hosting."
