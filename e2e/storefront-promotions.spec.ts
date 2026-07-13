import { test, expect } from "@playwright/test";
import {
  gotoProduct,
  storefrontEnv,
  storefrontReady,
} from "./helpers/storefront";

const { storeUrl, productGid, adminBaseUrl } = storefrontEnv();
const adminConfigured = Boolean(adminBaseUrl);

test.describe("Storefront promotions (real store)", () => {
  test.skip(
    !storefrontReady(),
    "Set E2E_STORE_URL and E2E_STOREFRONT_PASSWORD in .env.e2e",
  );

  test("PDP widget shows BundleStack promotions or quantity breaks", async ({
    page,
  }) => {
    await gotoProduct(page);
    const widget = page.locator(
      ".bundlestack-widget:not(.bundlestack-widget--hidden)",
    );
    await expect(widget.first()).toBeVisible({ timeout: 20_000 });
    const hasTiers = await page.locator(".bundlestack-widget__tier").count();
    const hasPromos = await page.locator(".bundlestack-widget__promo").count();
    expect(hasTiers + hasPromos).toBeGreaterThan(0);
  });

  test("add to cart reaches checkout with discount-capable cart", async ({
    page,
  }) => {
    await gotoProduct(page);
    await page
      .locator(
        'button[name="add"], form[action*="/cart/add"] button[type="submit"]',
      )
      .first()
      .click({ timeout: 15_000 });
    await page.waitForTimeout(1000);
    await page.goto(`${storeUrl}/cart`);
    await expect(page.locator("body")).toContainText(/\$|cart|checkout/i);
    const checkout = page
      .getByRole("button", { name: /check out|checkout/i })
      .or(page.getByRole("link", { name: /check out|checkout/i }));
    if (await checkout.count()) {
      await checkout.first().click();
      await expect(page).toHaveURL(/checkout|checkouts/i, { timeout: 30_000 });
    }
  });
});

test.describe("Admin → storefront matrix (requires admin + store)", () => {
  test.skip(
    !(storefrontReady() && adminConfigured),
    "Set E2E_ADMIN_BASE_URL, E2E_STORE_URL, and E2E_STOREFRONT_PASSWORD for full create → PDP matrix",
  );

  const cases = [
    {
      name: "bogo",
      newPath: "/app/promotions/bogo/new",
      submit: /Create BOGO/i,
      title: `Storefront BOGO ${Date.now()}`,
      promoType: "bogo",
    },
    {
      name: "free_gift",
      newPath: "/app/promotions/free-gifts/new",
      submit: /Create Gifts/i,
      title: `Storefront Gift ${Date.now()}`,
      promoType: "free_gift",
    },
    {
      name: "mix_match",
      newPath: "/app/promotions/mix-match/new",
      submit: /Create Mix/i,
      title: `Storefront Mix ${Date.now()}`,
      promoType: "mix_match",
    },
    {
      name: "bundle_builder",
      newPath: "/app/promotions/builders/new",
      submit: /Create Builder/i,
      title: `Storefront Builder ${Date.now()}`,
      promoType: "bundle_builder",
    },
    {
      name: "fbt",
      newPath: "/app/promotions/fbt/new",
      submit: /Create FBT/i,
      title: `Storefront FBT ${Date.now()}`,
      promoType: "fbt",
    },
  ] as const;

  for (const entry of cases) {
    test(`create ${entry.name} then see widget on PDP`, async ({
      page,
      context,
    }) => {
      await page.goto(`${adminBaseUrl}${entry.newPath}`);
      await page.locator('input[name="title"]').fill(entry.title);
      await page.locator('select[name="status"]').selectOption("active");
      await page.getByRole("button", { name: entry.submit }).click();
      await page.waitForURL(/\/app\/promotions\//);

      const storePage = await context.newPage();
      await gotoProduct(storePage);
      await expect(
        storePage
          .locator(
            `.bundlestack-widget__promo[data-promo-type="${entry.promoType}"]`,
          )
          .or(storePage.getByText(entry.title)),
      ).toBeVisible({ timeout: 30_000 });
    });
  }
});

test.describe("App proxy promotions (local bypass)", () => {
  test("returns promotions array for a product", async ({ request, baseURL }) => {
    test.skip(!baseURL, "Needs Playwright webServer baseURL");
    const productId = productGid || "gid://shopify/Product/1001";
    const shop = process.env.E2E_SHOP || "bundlestack-dev.myshopify.com";
    const res = await request.get(
      `${baseURL}/app-proxy/offers?product_id=${encodeURIComponent(productId)}&shop=${encodeURIComponent(shop)}`,
    );
    if (res.status() === 401) {
      test.skip(true, "App proxy signature required in this environment");
    }
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty("offers");
    expect(body).toHaveProperty("promotions");
    expect(Array.isArray(body.promotions)).toBe(true);
  });
});
