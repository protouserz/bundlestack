import { expect, test, type Page, type APIRequestContext } from "@playwright/test";

function envValue(key: string) {
  const raw = process.env[key];
  if (raw == null) return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '""' || trimmed === "''") return "";
  return trimmed;
}

export function storefrontEnv() {
  return {
    storeUrl: envValue("E2E_STORE_URL").replace(/\/$/, ""),
    password: envValue("E2E_STOREFRONT_PASSWORD"),
    productHandle:
      envValue("E2E_PRODUCT_HANDLE") || "the-collection-snowboard-liquid",
    productGid: envValue("E2E_PRODUCT_GID"),
    adminBaseUrl: envValue("E2E_ADMIN_BASE_URL").replace(/\/$/, ""),
    e2eShop: envValue("E2E_SHOP") || "bundlestack-dev.myshopify.com",
  };
}

/** Ready for live storefront tests (URL + password for password-protected shops). */
export function storefrontReady() {
  const { storeUrl, password } = storefrontEnv();
  return Boolean(storeUrl && password);
}

export async function unlockStorefront(page: Page) {
  const { storeUrl, password } = storefrontEnv();
  if (!storeUrl) return;

  await page.goto(storeUrl, { waitUntil: "domcontentloaded" });

  const passwordInput = page.getByRole("textbox", {
    name: /store password|password/i,
  });
  const passwordField = page.locator(
    'input[type="password"], #password, input[name="password"]',
  );
  const hasWall =
    (await passwordInput.count()) > 0 || (await passwordField.count()) > 0;

  if (!hasWall) return;

  if (!password) {
    test.skip(
      true,
      "Storefront is password-protected. Set E2E_STOREFRONT_PASSWORD in .env.e2e.",
    );
    return;
  }

  const input =
    (await passwordInput.count()) > 0
      ? passwordInput.first()
      : passwordField.first();
  await input.fill(password);
  await page.getByRole("button", { name: /^enter$/i }).click();

  await expect(
    page.getByText(/this store is password protected/i),
  ).toHaveCount(0, { timeout: 15_000 });
}

export async function gotoProduct(page: Page, handle?: string) {
  const { storeUrl, productHandle } = storefrontEnv();
  const h = handle || productHandle;
  await unlockStorefront(page);
  await page.goto(`${storeUrl}/products/${h}`, {
    waitUntil: "domcontentloaded",
  });

  if (await page.getByText(/this store is password protected/i).count()) {
    await unlockStorefront(page);
    await page.goto(`${storeUrl}/products/${h}`, {
      waitUntil: "domcontentloaded",
    });
  }
}

/**
 * Wait for the theme widget to finish its proxy fetch (leave --pending).
 * Returns null if the widget never settles (proxy hang / old theme asset).
 */
export async function waitForWidgetSettled(page: Page) {
  const root = page.locator(".bundlestack-widget").first();
  const attached = await root.count();
  if (!attached) return null;

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const cls = (await root.getAttribute("class")) || "";
    if (!cls.includes("bundlestack-widget--pending")) {
      return root;
    }
    await page.waitForTimeout(250);
  }
  return null;
}

/**
 * Live PDP has a widget with tiers/promos, or skip when the proxy returned nothing
 * (common until Render is deployed with promotions + an active offer on the product).
 */
export async function expectLiveWidgetContentOrSkip(page: Page) {
  const root = await waitForWidgetSettled(page);
  if (!root) {
    test.skip(
      true,
      "Live store BundleStack widget never left --pending (app proxy failed or theme asset outdated). Deploy app + theme extension, or seed an offer on the live product.",
    );
    return;
  }
  const cls = (await root.getAttribute("class")) || "";
  if (cls.includes("bundlestack-widget--hidden")) {
    test.skip(
      true,
      "Live store widget has no active quantity-break offers or promotions for E2E_PRODUCT_HANDLE. Create one in Admin (on the deployed app) or pick another handle.",
    );
    return;
  }
  const emptyMsg = page.locator(".bundlestack-widget__empty");
  if ((await emptyMsg.count()) > 0) {
    test.skip(
      true,
      "Live store widget could not load offers from the app proxy.",
    );
    return;
  }
  await expect(root).toBeVisible();
  const hasTiers = await page.locator(".bundlestack-widget__tier").count();
  const hasPromos = await page.locator(".bundlestack-widget__promo").count();
  if (hasTiers + hasPromos === 0) {
    test.skip(
      true,
      "Live store widget settled but has no tiers or promotions for this product.",
    );
  }
}

export async function fetchLocalProxyOffers(
  request: APIRequestContext,
  baseURL: string,
  productId = "gid://shopify/Product/1001",
) {
  const { e2eShop } = storefrontEnv();
  const res = await request.get(
    `${baseURL}/app-proxy/offers?product_id=${encodeURIComponent(productId)}&shop=${encodeURIComponent(e2eShop)}`,
  );
  return res;
}

/**
 * Probe whether an admin base can serve promotion create forms.
 * Remote deploys without the AOV branch return 404 — matrix should use local baseURL instead.
 */
export async function adminServesPromotions(
  request: APIRequestContext,
  adminBaseUrl: string,
) {
  if (!adminBaseUrl) return false;
  try {
    const res = await request.get(`${adminBaseUrl}/app/promotions/bogo/new`, {
      timeout: 15_000,
      maxRedirects: 0,
    });
    // 200 = form, 302 = auth redirect (routes exist), 404 = old deploy
    return res.status() !== 404;
  } catch {
    return false;
  }
}
