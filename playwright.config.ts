import { existsSync, readdirSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";
import { homedir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.E2E_PORT || 4179);
const BASE_URL = process.env.E2E_BASE_URL || `http://127.0.0.1:${PORT}`;
const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  `file:${join(process.cwd(), "prisma", "dev.sqlite")}`;

function browsersPathHasChromium(dir: string | undefined) {
  if (!dir || !existsSync(dir)) return false;
  try {
    return readdirSync(dir).some(
      (name) =>
        name.startsWith("chromium-") ||
        name.startsWith("chromium_headless_shell-"),
    );
  } catch {
    return false;
  }
}

// Prefer a browsers dir that actually contains Chromium (sandbox caches are often empty).
const preferredBrowsers = join(homedir(), "Library/Caches/ms-playwright");
if (!browsersPathHasChromium(process.env.PLAYWRIGHT_BROWSERS_PATH)) {
  if (browsersPathHasChromium(preferredBrowsers)) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = preferredBrowsers;
  } else if (!process.env.PLAYWRIGHT_BROWSERS_PATH) {
    process.env.PLAYWRIGHT_BROWSERS_PATH = preferredBrowsers;
  }
}

function screencastStamp() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join("");
}

// Playwright may load this config more than once; pin the run folder in env.
if (!process.env.E2E_SCREENCAST_DIR) {
  process.env.E2E_SCREENCAST_DIR = join(
    "test-results",
    "screencasts",
    screencastStamp(),
  );
}

const SCREENCAST_RUN_DIR = process.env.E2E_SCREENCAST_DIR;

/**
 * Browser e2e with video screencasts.
 * Each run writes artifacts under test-results/screencasts/<timestamp>/.
 * Open the HTML report with: npm run test:e2e:report
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    [
      "html",
      {
        open: "never",
        outputFolder: join(SCREENCAST_RUN_DIR, "report"),
      },
    ],
  ],
  // Keep videos/traces out of the HTML report folder (Playwright forbids nesting).
  outputDir: join(SCREENCAST_RUN_DIR, "videos"),
  use: {
    ...devices["Desktop Chrome"],
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "on",
  },
  webServer: {
    command: `npm run build && HOST=127.0.0.1 PORT=${PORT} E2E_AUTH_BYPASS=1 E2E_BILLING_PLAN=scale SHOPIFY_APP_URL=${BASE_URL} npm run start`,
    url: `${BASE_URL}/app/coupons`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      E2E_AUTH_BYPASS: "1",
      E2E_BILLING_PLAN: "scale",
      HOST: "127.0.0.1",
      PORT: String(PORT),
      SHOPIFY_APP_URL: BASE_URL,
      // Absolute path — Prisma resolves relative file: URLs from schema dir (prisma/),
      // so file:./prisma/dev.sqlite becomes prisma/prisma/dev.sqlite and breaks saves.
      DATABASE_URL: E2E_DATABASE_URL,
    },
  },
});
