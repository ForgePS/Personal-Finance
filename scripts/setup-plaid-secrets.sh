#!/bin/bash
# Create Plaid secrets and grant App Hosting access.
# Run from repo root after: npx firebase-tools login && npx firebase-tools use personal-finance-ed108
#
# Usage:
#   ./scripts/setup-plaid-secrets.sh
#   PLAID_CLIENT_ID=xxx PLAID_SECRET=yyy ./scripts/setup-plaid-secrets.sh

set -euo pipefail

PROJECT="personal-finance-ed108"
BACKEND="personal-finance"
COMPUTE_SA="firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com"

echo "Project:  $PROJECT"
echo "Backend:  $BACKEND"
echo "Service account: $COMPUTE_SA"
echo ""

npx firebase-tools use "$PROJECT"

create_or_update_secret() {
  local name="$1"
  local value="$2"

  if gcloud secrets describe "$name" --project="$PROJECT" >/dev/null 2>&1; then
    echo "Updating secret $name..."
    printf '%s' "$value" | gcloud secrets versions add "$name" --project="$PROJECT" --data-file=-
  else
    echo "Creating secret $name..."
    printf '%s' "$value" | gcloud secrets create "$name" --project="$PROJECT" --replication-policy=automatic --data-file=-
  fi
}

if [[ -z "${PLAID_CLIENT_ID:-}" ]]; then
  read -r -p "Plaid client ID: " PLAID_CLIENT_ID
fi
if [[ -z "${PLAID_SECRET:-}" ]]; then
  read -r -s -p "Plaid secret: " PLAID_SECRET
  echo ""
fi

if [[ -z "$PLAID_CLIENT_ID" || -z "$PLAID_SECRET" ]]; then
  echo "Error: PLAID_CLIENT_ID and PLAID_SECRET are required."
  exit 1
fi

create_or_update_secret "PLAID_CLIENT_ID" "$PLAID_CLIENT_ID"
create_or_update_secret "PLAID_SECRET" "$PLAID_SECRET"

echo ""
echo "Granting App Hosting backend access to secrets..."
npx firebase-tools apphosting:secrets:grantaccess PLAID_CLIENT_ID,PLAID_SECRET -b "$BACKEND"

echo ""
echo "Granting Secret Accessor to compute service account (if needed)..."
for secret in PLAID_CLIENT_ID PLAID_SECRET; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project="$PROJECT" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null 2>&1 || true
done

echo ""
echo "Done. Next steps:"
echo "  1. Copy the Plaid block from apphosting.plaid.example.yaml into apphosting.yaml"
echo "  2. git commit && git push origin main"
echo "  3. Create a new rollout in Firebase App Hosting (do not retry the old failed one)"
