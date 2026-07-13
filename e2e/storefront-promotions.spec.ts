import { test, expect } from "@playwright/test";
import {
  gotoProduct,
  storefrontEnv,
  storefrontReady,
  expectLiveWidgetContentOrSkip,
  fetchLocalProxyOffers,
} from "./helpers/storefront";

const { storeUrl, productGid } = storefrontEnv();

test.describe("Storefront promotions (real store)", () => {
  test.skip(
    !storefrontReady(),
    "Set E2E_STORE_URL and E2E_STOREFRONT_PASSWORD in .env.e2e",
  );

  test("PDP widget loads and shows offers when configured", async ({ page }) => {
    await gotoProduct(page);
    await expectLiveWidgetContentOrSkip(page);
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

/**
 * Create each promotion on the local Playwright webServer (E2E_AUTH_BYPASS),
 * then assert it appears via the local app proxy.
 *
 * Live PDP create→widget needs the same backend as the store's app proxy
 * (deployed Render with this branch). That path is covered separately when
 * the live store already has offers (PDP widget test above).
 */
test.describe("Admin create → local proxy matrix", () => {
  const cases = [
    {
      name: "bogo",
      newPath: "/app/promotions/bogo/new",
      submit: /Create BOGO/i,
      promoType: "bogo",
    },
    {
      name: "free_gift",
      newPath: "/app/promotions/free-gifts/new",
      submit: /Create Gifts/i,
      promoType: "free_gift",
    },
    {
      name: "mix_match",
      newPath: "/app/promotions/mix-match/new",
      submit: /Create Mix/i,
      promoType: "mix_match",
    },
    {
      name: "bundle_builder",
      newPath: "/app/promotions/builders/new",
      submit: /Create Builder/i,
      promoType: "bundle_builder",
    },
    {
      name: "fbt",
      newPath: "/app/promotions/fbt/new",
      submit: /Create FBT/i,
      promoType: "fbt",
    },
  ] as const;

  for (const entry of cases) {
    test(`creates ${entry.name} and proxy returns it`, async ({
      page,
      request,
      baseURL,
    }) => {
      test.skip(!baseURL, "Needs Playwright webServer baseURL");

      const title = `Proxy ${entry.name} ${Date.now()}`;
      await page.goto(entry.newPath);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.locator('input[name="title"]').fill(title);
      await page.locator('select[name="status"]').selectOption("active");

      if (entry.promoType === "free_gift") {
        const giftBrowse = page.getByRole("button", {
          name: /Browse gift products/i,
        });
        if (await giftBrowse.count()) {
          await giftBrowse.click();
        }
      }
      if (entry.promoType === "fbt") {
        const recBrowse = page.getByRole("button", {
          name: /Browse recommended products/i,
        });
        if (await recBrowse.count()) {
          await recBrowse.click();
        }
      }

      await page.getByRole("button", { name: entry.submit }).click();
      await expect(page).toHaveURL(/\/app\/promotions\//);
      await expect(page.getByText(title).first()).toBeVisible();

      const productId = "gid://shopify/Product/1001";
      const res = await fetchLocalProxyOffers(request, baseURL, productId);
      expect(res.ok()).toBeTruthy();
      const body = await res.json();
      expect(Array.isArray(body.promotions)).toBe(true);
      const match = body.promotions.find(
        (p: { title?: string; promotionType?: string }) =>
          p.title === title && p.promotionType === entry.promoType,
      );
      expect(
        match,
        `Expected local proxy to include ${entry.promoType} "${title}"`,
      ).toBeTruthy();
    });
  }
});

test.describe("App proxy promotions (local bypass)", () => {
  test("returns promotions array for a product", async ({ request, baseURL }) => {
    test.skip(!baseURL, "Needs Playwright webServer baseURL");
    const productId = productGid || "gid://shopify/Product/1001";
    const res = await fetchLocalProxyOffers(request, baseURL, productId);
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
