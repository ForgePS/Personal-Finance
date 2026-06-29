#!/bin/bash
# Fix App Hosting rollouts blocked by a failed Cloud Run revision referencing destroyed secrets.
#
# Symptom: rollout fails with "Revision 'money-command-build-...-010' is not ready"
# even though apphosting.yaml pins PLAID_* secrets to version 1.
#
# Cause: An older revision (often with secret version 2) stays in the service traffic
# targets and blocks RoutesReady until removed.
#
# Prerequisites: gcloud auth login, project set to money-command-3ee1b

set -euo pipefail

PROJECT_NUMBER="611170516796"
REGION="us-central1"
SERVICE="money-command"

echo "Listing revisions with secret bindings..."
gcloud run revisions list \
  --service="$SERVICE" \
  --region="$REGION" \
  --project="money-command-3ee1b" \
  --format="table(metadata.name,status.conditions[0].status,metadata.creationTimestamp)"

echo ""
read -r -p "Healthy revision to route 100% traffic to (e.g. money-command-build-2026-06-29-018): " GOOD_REV
read -r -p "Failed revision to delete (e.g. money-command-build-2026-06-29-010): " BAD_REV

echo "Routing traffic to $GOOD_REV..."
gcloud run services update-traffic "$SERVICE" \
  --to-revisions="${GOOD_REV}=100" \
  --region="$REGION" \
  --project="money-command-3ee1b"

echo "Deleting failed revision $BAD_REV..."
gcloud run revisions delete "$BAD_REV" \
  --region="$REGION" \
  --project="money-command-3ee1b" \
  --quiet

echo "Done. Trigger a new App Hosting rollout if the console still shows FAILED."
