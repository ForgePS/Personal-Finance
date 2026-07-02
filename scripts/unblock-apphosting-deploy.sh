#!/bin/bash
# Unblock Firebase App Hosting rollouts that fail on missing PLAID_* secrets.
# App Hosting can keep secret bindings even after apphosting.yaml removes them.
#
# Run in Google Cloud Shell:
#   curl -sSL https://raw.githubusercontent.com/ForgePS/Personal-Finance/main/scripts/unblock-apphosting-deploy.sh | bash
# Or from a local clone:
#   ./scripts/unblock-apphosting-deploy.sh

set -euo pipefail

PROJECT="personal-finance-ed108"
BACKEND="personal-finance"
COMPUTE_SA="firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com"

echo "==> Project: $PROJECT"
gcloud config set project "$PROJECT" >/dev/null

ensure_secret() {
  local name="$1"
  local value="${2:-placeholder-not-configured}"

  if gcloud secrets describe "$name" --project="$PROJECT" >/dev/null 2>&1; then
    echo "Secret $name exists — adding version..."
    printf '%s' "$value" | gcloud secrets versions add "$name" --project="$PROJECT" --data-file=-
  else
    echo "Creating secret $name..."
    printf '%s' "$value" | gcloud secrets create "$name" \
      --project="$PROJECT" \
      --replication-policy=automatic \
      --data-file=-
  fi

  gcloud secrets add-iam-policy-binding "$name" \
    --project="$PROJECT" \
    --member="serviceAccount:${COMPUTE_SA}" \
    --role="roles/secretmanager.secretAccessor" \
    --quiet >/dev/null
}

echo ""
echo "==> Creating/updating Plaid placeholder secrets..."
ensure_secret "PLAID_CLIENT_ID"
ensure_secret "PLAID_SECRET"

echo ""
echo "==> Granting App Hosting backend access..."
if command -v firebase >/dev/null 2>&1; then
  firebase use "$PROJECT" >/dev/null
  firebase apphosting:secrets:grantaccess PLAID_CLIENT_ID,PLAID_SECRET -b "$BACKEND" || true
elif command -v npx >/dev/null 2>&1; then
  npx firebase-tools use "$PROJECT" >/dev/null
  npx firebase-tools apphosting:secrets:grantaccess PLAID_CLIENT_ID,PLAID_SECRET -b "$BACKEND" || true
else
  echo "Firebase CLI not found — IAM bindings above should still unblock deploy."
fi

echo ""
echo "==> Granting Firestore access (if not already done)..."
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/datastore.user" \
  --condition=None \
  --quiet >/dev/null 2>&1 || true

echo ""
echo "Done."
echo ""
echo "Next:"
echo "  1. Firebase Console → App Hosting → personal-finance → Create rollout → main"
echo "  2. Test https://personal-finance--personal-finance-ed108.us-central1.hosted.app/api/health"
echo ""
echo "Bank linking stays off until you set real Plaid keys in Secret Manager."
