#!/usr/bin/env bash
# Quick checks before App Store submission
set -euo pipefail

APP_URL="${SHOPIFY_APP_URL:-https://bundlestack-pfee.onrender.com}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" >/dev/null 2>&1; then
    echo "✓ $label"
    PASS=$((PASS + 1))
  else
    echo "✗ $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "BundleStack App Store readiness"
echo "Production URL: $APP_URL"
echo ""

check "Homepage responds" "curl -sf -o /dev/null -w '%{http_code}' '$APP_URL' | grep -q 200"
check "Privacy policy" "curl -sf '$APP_URL/privacy' | grep -qi 'Privacy Policy'"
check "Support page" "curl -sf '$APP_URL/support' | grep -qi 'Support'"
check "No read_orders in shopify.app.toml" "! grep -q read_orders shopify.app.toml"
check "Compliance webhook routes exist" "test -f app/routes/webhooks.compliance.tsx"
check "Compliance topics in shopify.app.toml" "grep -q 'compliance_topics' shopify.app.toml"
check "App icon present" "test -f docs/app-store/icon.png"
check "Billing config in shopify.server" "grep -q shopifyBillingConfig app/shopify.server.ts"
check "Health includes database check" "curl -sf '$APP_URL/health' | grep -q '\"database\":\"ok\"'"

echo ""
echo "Passed: $PASS  Failed: $FAIL"

if [ "$FAIL" -gt 0 ]; then
  echo "Fix failures above before submitting."
  exit 1
fi

echo "Ready for Partners Dashboard listing + review submission."
