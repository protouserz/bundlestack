import { test, expect, type Page } from "@playwright/test";

async function openCreateCoupon(page: Page) {
  await page.goto("/app/coupons/new");
  // s-page heading is not exposed as a heading role in Playwright a11y tree.
  await expect(
    page.getByRole("heading", { name: /Coupon details/i }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Create coupon/i }),
  ).toBeVisible();
}

async function fillBasics(
  page: Page,
  {
    title,
    code,
  }: {
    title: string;
    code: string;
  },
) {
  await page.locator('input[name="title"]').fill(title);
  await page.locator('input[name="code"]').fill(code);
  // Default status is already "active".
}

function scopeSelect(page: Page) {
  return page.getByRole("combobox", { name: /^Scope$/ });
}

/**
 * Coupon dates are stored as Date and rendered with toISOString() (UTC).
 * Compute the datetime-local value the edit form will show after save.
 */
async function expectedDatetimeLocalValue(page: Page, localValue: string) {
  return page.evaluate((value) => {
    return new Date(value).toISOString().slice(0, 16);
  }, localValue);
}

async function openEditForTitle(page: Page, title: string) {
  await page
    .locator("s-box")
    .filter({ hasText: title })
    .getByRole("link", { name: /Edit coupon/i })
    .click();
  await expect(page).toHaveURL(/\/app\/coupons\/[^/]+$/);
}

async function createAndExpectListed(
  page: Page,
  {
    title,
    code,
    scopeText,
  }: {
    title: string;
    code: string;
    scopeText: string | RegExp;
  },
) {
  await page.getByRole("button", { name: /Create coupon/i }).click();
  await expect(page).toHaveURL(/\/app\/coupons(?:\?|$)/);
  await expect(page.getByText(title).first()).toBeVisible();
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText(scopeText).first()).toBeVisible();
  await expect(page.getByText(/synced to Shopify/i).first()).toBeVisible();
}

test.describe("Coupon create scenarios", () => {
  test("creates a whole-site coupon", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E Whole Site ${stamp}`;
    const code = `SITE${String(stamp).slice(-6)}`;

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });

    await expect(scopeSelect(page)).toHaveValue("all");
    await expect(
      page.getByText(/No exclusions\. This coupon applies to every product/i),
    ).toBeVisible();

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store/,
    });
  });

  test("creates a single-product coupon", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E Single Product ${stamp}`;
    const code = `PROD${String(stamp).slice(-6)}`;

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });

    await scopeSelect(page).selectOption("products");
    await expect(page.getByText("Browse products").first()).toBeVisible();
    // E2E picker seeds one sample product when scope is specific products.
    await expect(page.getByText("E2E Sample Product").first()).toBeVisible();
    await expect(page.getByText("1 product").first()).toBeVisible();

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /1 product/,
    });
  });

  test("creates a whole-site coupon with an excluded product", async ({
    page,
  }) => {
    const stamp = Date.now();
    const title = `E2E Store Exclude ${stamp}`;
    const code = `EXCL${String(stamp).slice(-6)}`;

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });

    await expect(scopeSelect(page)).toHaveValue("all");
    await page.getByText("Browse products to exclude").click();
    await expect(page.getByText("E2E Sample Product").first()).toBeVisible();
    await expect(page.getByText(/2 excluded/i).first()).toBeVisible();

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store · 2 excluded/,
    });
  });

  test("creates a coupon with a usage limit", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E Usage Limit ${stamp}`;
    const code = `LIM${String(stamp).slice(-6)}`;

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });

    await page.locator('input[name="usageLimit"]').fill("25");
    await expect(page.getByText(/25 total/i).first()).toBeVisible();

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store/,
    });

    await openEditForTitle(page, title);
    await expect(page.locator('input[name="usageLimit"]')).toHaveValue("25");
  });

  test("creates a coupon with a start date only", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E Start Date ${stamp}`;
    const code = `START${String(stamp).slice(-5)}`;
    const startsAt = "2026-07-15T09:00";

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });
    await page.locator('input[name="startsAt"]').fill(startsAt);

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store/,
    });

    await openEditForTitle(page, title);
    await expect(page.locator('input[name="startsAt"]')).toHaveValue(
      await expectedDatetimeLocalValue(page, startsAt),
    );
    await expect(page.locator('input[name="endsAt"]')).toHaveValue("");
  });

  test("creates a coupon with an end date only", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E End Date ${stamp}`;
    const code = `END${String(stamp).slice(-6)}`;
    const endsAt = "2026-08-20T18:30";

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });
    await page.locator('input[name="endsAt"]').fill(endsAt);

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store/,
    });

    await openEditForTitle(page, title);
    await expect(page.locator('input[name="startsAt"]')).toHaveValue("");
    await expect(page.locator('input[name="endsAt"]')).toHaveValue(
      await expectedDatetimeLocalValue(page, endsAt),
    );
  });

  test("creates a coupon with start and end dates", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E Date Range ${stamp}`;
    const code = `RANGE${String(stamp).slice(-5)}`;
    const startsAt = "2026-07-10T09:00";
    const endsAt = "2026-08-10T23:59";

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });
    await page.locator('input[name="startsAt"]').fill(startsAt);
    await page.locator('input[name="endsAt"]').fill(endsAt);

    await createAndExpectListed(page, {
      title,
      code,
      scopeText: /Entire store/,
    });

    await openEditForTitle(page, title);
    await expect(page.locator('input[name="startsAt"]')).toHaveValue(
      await expectedDatetimeLocalValue(page, startsAt),
    );
    await expect(page.locator('input[name="endsAt"]')).toHaveValue(
      await expectedDatetimeLocalValue(page, endsAt),
    );
  });

  test("rejects an end date that is not after the start date", async ({
    page,
  }) => {
    const stamp = Date.now();
    const title = `E2E Invalid Range ${stamp}`;
    const code = `BAD${String(stamp).slice(-6)}`;

    await openCreateCoupon(page);
    await fillBasics(page, { title, code });
    await page.locator('input[name="startsAt"]').fill("2026-08-10T12:00");
    await page.locator('input[name="endsAt"]').fill("2026-07-10T12:00");

    await page.getByRole("button", { name: /Create coupon/i }).click();
    await expect(page).toHaveURL(/\/app\/coupons\/new/);
    await expect(
      page.getByText(/End date must be after start date/i),
    ).toBeVisible();
  });
});
