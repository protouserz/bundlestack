import { expect, test, type Page } from "@playwright/test";

function envValue(key: string) {
  const raw = process.env[key];
  if (raw == null) return "";
  const trimmed = raw.trim();
  // Treat blank / empty-quoted values as unset.
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
  };
}

/** Ready for live storefront tests (URL + password for password-protected shops). */
export function storefrontReady() {
  const { storeUrl, password } = storefrontEnv();
  return Boolean(storeUrl && password);
}

/**
 * Unlock a password-protected Shopify storefront.
 * Callers should skip via storefrontReady() when password is unset.
 */
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
      "Storefront is password-protected. Set E2E_STOREFRONT_PASSWORD in .env.e2e (Admin → Online Store → Preferences).",
    );
    return;
  }

  const input =
    (await passwordInput.count()) > 0 ? passwordInput.first() : passwordField.first();
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
