#!/usr/bin/env bash
# Deploy BundleStack to Fly.io
# Prerequisites: flyctl installed, `fly auth login`, Shopify credentials in Partners Dashboard
set -euo pipefail

APP_NAME="${FLY_APP_NAME:-bundlestack}"
FLY_URL="https://${APP_NAME}.fly.dev"

echo "==> BundleStack Fly.io deploy (app: ${APP_NAME})"
echo "    URL will be: ${FLY_URL}"
echo ""

if ! command -v flyctl >/dev/null 2>&1 && ! command -v fly >/dev/null 2>&1; then
  echo "Install flyctl first:"
  echo "  curl -L https://fly.io/install.sh | sh"
  exit 1
fi

FLY="$(command -v flyctl || command -v fly)"

if ! "$FLY" auth whoami >/dev/null 2>&1; then
  echo "Log in to Fly.io:"
  echo "  fly auth login"
  exit 1
fi

# Create app if missing
if ! "$FLY" apps list 2>/dev/null | grep -q "^${APP_NAME}[[:space:]]"; then
  echo "==> Creating Fly app '${APP_NAME}'..."
  "$FLY" apps create "${APP_NAME}" --machines
fi

# Persistent volume for SQLite (skip if exists)
if ! "$FLY" volumes list -a "${APP_NAME}" 2>/dev/null | grep -q "bundlestack_data"; then
  echo "==> Creating volume bundlestack_data (1GB)..."
  "$FLY" volumes create bundlestack_data --size 1 -a "${APP_NAME}" -y
fi

# Secrets — set these in your shell before running, or edit here:
: "${SHOPIFY_API_KEY:?Set SHOPIFY_API_KEY (from Partners Dashboard)}"
: "${SHOPIFY_API_SECRET:?Set SHOPIFY_API_SECRET (from Partners Dashboard)}"

SCOPES="${SCOPES:-read_products,write_discounts,read_discounts}"

echo "==> Setting Fly secrets..."
"$FLY" secrets set \
  SHOPIFY_API_KEY="${SHOPIFY_API_KEY}" \
  SHOPIFY_API_SECRET="${SHOPIFY_API_SECRET}" \
  SCOPES="${SCOPES}" \
  SHOPIFY_APP_URL="${FLY_URL}" \
  DATABASE_URL="file:/data/production.sqlite" \
  -a "${APP_NAME}"

echo "==> Deploying..."
"$FLY" deploy -a "${APP_NAME}"

echo ""
echo "==> Deploy complete!"
echo "    App URL:     ${FLY_URL}"
echo "    Privacy:     ${FLY_URL}/privacy"
echo "    Health:      ${FLY_URL}/ (should show landing page)"
echo ""
echo "Next steps:"
echo "  1. Update shopify.app.toml:"
echo "       application_url = \"${FLY_URL}\""
echo "       redirect_urls = [\"${FLY_URL}/auth/callback\", \"${FLY_URL}/auth/shopify/callback\"]"
echo "  2. Run: npm run deploy"
echo "  3. In Partners → App Store listing, set privacy URL: ${FLY_URL}/privacy"
echo "  4. Install on dev store and test OAuth + offers"
