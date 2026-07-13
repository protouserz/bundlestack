import { test, expect } from "@playwright/test";

const TYPES = [
  {
    slug: "bogo",
    listPath: "/app/promotions/bogo",
    newPath: "/app/promotions/bogo/new",
    heading: /Create BOGO/i,
    submit: /Create BOGO/i,
    title: "E2E Active BOGO",
  },
  {
    slug: "free-gifts",
    listPath: "/app/promotions/free-gifts",
    newPath: "/app/promotions/free-gifts/new",
    heading: /Create Free gifts/i,
    submit: /Create Gifts/i,
    title: "E2E Active Free Gift",
  },
  {
    slug: "mix-match",
    listPath: "/app/promotions/mix-match",
    newPath: "/app/promotions/mix-match/new",
    heading: /Create Mix & match/i,
    submit: /Create Mix/i,
    title: "E2E Active Mix Match",
  },
  {
    slug: "builders",
    listPath: "/app/promotions/builders",
    newPath: "/app/promotions/builders/new",
    heading: /Create Bundle builder/i,
    submit: /Create Builder/i,
    title: "E2E Active Builder",
  },
  {
    slug: "fbt",
    listPath: "/app/promotions/fbt",
    newPath: "/app/promotions/fbt/new",
    heading: /Create Frequently bought together/i,
    submit: /Create FBT/i,
    title: "E2E Active FBT",
  },
] as const;

async function createActivePromotion(
  page: import("@playwright/test").Page,
  entry: (typeof TYPES)[number],
) {
  const title = `${entry.title} ${Date.now()}`;
  await page.goto(entry.newPath);
  await expect(page.getByRole("heading", { name: entry.heading })).toBeVisible();

  const titleInput = page.locator('input[name="title"]');
  await titleInput.fill(title);

  await page.locator('select[name="status"]').selectOption("active");

  // E2E product picker seeds a sample product by default for required pickers.
  if (entry.slug === "free-gifts") {
    await expect(
      page.getByRole("button", { name: /Browse gift products/i }),
    ).toBeVisible();
  }
  if (entry.slug === "fbt") {
    await expect(
      page.getByRole("button", { name: /Browse recommended products/i }),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: entry.submit }).click();
  await expect(page).toHaveURL(new RegExp(`${entry.listPath}(?:\\?|$)`));
  await expect(page.getByText(title).first()).toBeVisible();
}

test.describe("Promotion create and save", () => {
  for (const entry of TYPES) {
    test(`creates and lists active ${entry.slug} promotion`, async ({ page }) => {
      await createActivePromotion(page, entry);
    });
  }
});
