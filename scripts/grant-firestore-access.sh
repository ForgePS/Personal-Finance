#!/bin/bash
# Grant Firestore access to the App Hosting compute service account.
# Run after enabling Firestore in the Firebase console.
#
#   npx firebase-tools login
#   ./scripts/grant-firestore-access.sh

set -euo pipefail

PROJECT="personal-finance-ed108"
COMPUTE_SA="firebase-app-hosting-compute@${PROJECT}.iam.gserviceaccount.com"

echo "Granting Firestore/Datastore access to $COMPUTE_SA ..."

gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${COMPUTE_SA}" \
  --role="roles/datastore.user" \
  --quiet

echo ""
echo "Done. Redeploy or wait ~1 minute, then test:"
echo "  https://personal-finance--personal-finance-ed108.us-central1.hosted.app/api/health?deep=1"
