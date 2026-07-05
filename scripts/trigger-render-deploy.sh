#!/usr/bin/env bash
# Trigger a Render redeploy via deploy hook (optional).
# Get your hook URL from Render → bundlestack → Settings → Deploy Hook
set -euo pipefail

if [ -z "${RENDER_DEPLOY_HOOK_URL:-}" ]; then
  echo "Set RENDER_DEPLOY_HOOK_URL to your Render deploy hook URL."
  echo "Render → bundlestack → Settings → Deploy Hook → copy URL"
  exit 1
fi

echo "Triggering Render deploy..."
curl -fsS -X POST "$RENDER_DEPLOY_HOOK_URL"
echo ""
echo "Deploy triggered. Wait ~2-5 min, then run: ./scripts/verify-app-store-readiness.sh"
