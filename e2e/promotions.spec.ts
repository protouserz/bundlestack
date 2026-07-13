import { test, expect } from "@playwright/test";

test.describe("AOV promotion suite screencast", () => {
  test("promotions hub shows all offer types", async ({ page }) => {
    await page.goto("/app/promotions");
    await expect(page.getByRole("heading", { name: "Promotions" })).toBeVisible();
    await expect(page.getByText("BOGO", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Free gifts", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Mix & match", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Bundle builder", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByText("Frequently bought together", { exact: true }).first(),
    ).toBeVisible();
  });

  test("BOGO list and create form", async ({ page }) => {
    await page.goto("/app/promotions/bogo");
    await expect(
      page.getByRole("heading", { name: "BOGO", exact: true }),
    ).toBeVisible();
    await page.getByRole("link", { name: /Create BOGO/i }).first().click();
    await expect(page.getByRole("heading", { name: /Create BOGO/i })).toBeVisible();
    await expect(page.getByText(/Buy quantity/i)).toBeVisible();
    await expect(page.getByText(/Get quantity/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Browse products/i })).toBeVisible();
  });

  test("free gifts create form", async ({ page }) => {
    await page.goto("/app/promotions/free-gifts/new");
    await expect(page.getByRole("heading", { name: /Create Free gifts/i })).toBeVisible();
    await expect(page.getByText(/Min subtotal/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Browse gift products/i })).toBeVisible();
  });

  test("mix & match create form", async ({ page }) => {
    await page.goto("/app/promotions/mix-match/new");
    await expect(page.getByRole("heading", { name: /Create Mix & match/i })).toBeVisible();
    await expect(page.getByText(/Minimum items/i)).toBeVisible();
  });

  test("bundle builder create form", async ({ page }) => {
    await page.goto("/app/promotions/builders/new");
    await expect(page.getByRole("heading", { name: /Create Bundle builder/i })).toBeVisible();
    await expect(page.getByText(/Bundle discount type/i)).toBeVisible();
  });

  test("FBT create form", async ({ page }) => {
    await page.goto("/app/promotions/fbt/new");
    await expect(
      page.getByRole("heading", { name: /Create Frequently bought together/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Recommended products", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Browse recommended products/i }),
    ).toBeVisible();
  });

  test("coupons page loads", async ({ page }) => {
    await page.goto("/app/coupons");
    await expect(
      page.getByRole("heading", { name: "Coupons", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /Create coupon/i }).first()).toBeVisible();
  });

  test("coupon create form", async ({ page }) => {
    await page.goto("/app/coupons/new");
    await expect(page.getByRole("heading", { name: /Create coupon/i })).toBeVisible();
  });

  test("nav walks promotions → coupons → billing", async ({ page }) => {
    await page.goto("/app/promotions");
    await page.getByRole("navigation", { name: "E2E navigation" }).getByText("Coupons").click();
    await expect(page).toHaveURL(/\/app\/coupons/);
    await page.getByRole("navigation", { name: "E2E navigation" }).getByText("Billing").click();
    await expect(page).toHaveURL(/\/app\/billing/);
    await expect(
      page.getByRole("heading", { name: /Billing/i }).first(),
    ).toBeVisible();
  });
});
