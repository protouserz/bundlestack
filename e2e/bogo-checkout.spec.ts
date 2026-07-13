import { test, expect } from "@playwright/test";
import {
  gotoProduct,
  storefrontEnv,
  storefrontReady,
} from "./helpers/storefront";

/**
 * Phase 3 — BOGO deep path (same-product + different-product).
 * Tag: @bogo-checkout
 * Screencasts land in the timestamped folder from e2e/run.mjs.
 */

test.describe("BOGO deep path @bogo-checkout", () => {
  test.afterEach(async ({ page }) => {
    // Best-effort cleanup from list page if a row exists with our e2e prefix.
    try {
      await page.goto("/app/promotions/bogo");
      const row = page.getByText(/E2E BOGO Deep/i).first();
      if (await row.count()) {
        const edit = page.getByRole("link", { name: /Edit/i }).first();
        if (await edit.count()) {
          await edit.click();
          const del = page.getByRole("button", { name: /Delete offer/i });
          if (await del.count()) {
            await del.click();
          }
        }
      }
    } catch {
      // ignore cleanup failures
    }
  });

  test("creates same-product BOGO and lists it @bogo-checkout", async ({
    page,
  }) => {
    const title = `E2E BOGO Deep Same ${Date.now()}`;
    await page.goto("/app/promotions/bogo/new");
    await expect(page.getByRole("heading", { name: /Create BOGO/i })).toBeVisible();
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="status"]').selectOption("active");

    const sameProduct = page.locator("select").filter({ hasText: /Same product|Yes/ }).first();
    if (await sameProduct.count()) {
      await page.getByText("Same product").locator("..").locator("select").selectOption("true");
    }

    await page.getByRole("button", { name: /Create BOGO/i }).click();
    await expect(page).toHaveURL(/\/app\/promotions\/bogo/);
    await expect(page.getByText(title)).toBeVisible();
  });

  test("creates different-product BOGO and lists it @bogo-checkout", async ({
    page,
  }) => {
    const title = `E2E BOGO Deep Diff ${Date.now()}`;
    await page.goto("/app/promotions/bogo/new");
    await expect(page.getByRole("heading", { name: /Create BOGO/i })).toBeVisible();
    await page.locator('input[name="title"]').fill(title);
    await page.locator('select[name="status"]').selectOption("active");

    await page
      .locator("label")
      .filter({ hasText: /Same product/i })
      .locator("select")
      .selectOption("false");

    await expect(
      page.getByRole("button", { name: /Browse get products/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /Browse get products/i }).click();

    await page.getByRole("button", { name: /Create BOGO/i }).click();
    await expect(page).toHaveURL(/\/app\/promotions\/bogo/);
    await expect(page.getByText(title)).toBeVisible();
  });

  test("storefront BOGO checkout @bogo-checkout", async ({ page }) => {
    test.skip(
      !storefrontReady(),
      "Set E2E_STORE_URL and E2E_STOREFRONT_PASSWORD for live checkout assertion",
    );

    const { storeUrl } = storefrontEnv();
    await gotoProduct(page);

    await expect(
      page.locator('.bundlestack-widget__promo[data-promo-type="bogo"]').or(
        page.locator(".bundlestack-widget__tier"),
      ),
    ).toBeVisible({ timeout: 20_000 });

    const proxyHits: string[] = [];
    page.on("response", (res) => {
      if (res.url().includes("/apps/bundlestack/offers")) {
        proxyHits.push(`${res.status()} ${res.url()}`);
      }
    });

    const qty = page.locator('input[name="quantity"]').first();
    if (await qty.count()) {
      await qty.fill("2");
    }
    await page
      .locator('button[name="add"], form[action*="/cart/add"] button[type="submit"]')
      .first()
      .click({ timeout: 15_000 });
    await page.waitForTimeout(800);
    await page.goto(`${storeUrl}/cart`);
    const checkout = page
      .getByRole("button", { name: /check out|checkout/i })
      .or(page.getByRole("link", { name: /check out|checkout/i }));
    if (await checkout.count()) {
      await checkout.first().click();
      await expect(page).toHaveURL(/checkout|checkouts/i, { timeout: 30_000 });
      await expect(page.locator("body")).toContainText(
        /discount|BOGO|save|-%|off/i,
        { timeout: 20_000 },
      );
    }

    if (proxyHits.length) {
      test.info().annotations.push({
        type: "proxy",
        description: proxyHits.join("\n"),
      });
    }
  });
});
