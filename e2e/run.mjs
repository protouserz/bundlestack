import { existsSync, readFileSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function screencastStamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
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

/** Load KEY=VALUE pairs from a file into process.env (does not override existing). */
function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function browsersPathHasChromium(dir) {
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

/**
 * Cursor sandboxes often set PLAYWRIGHT_BROWSERS_PATH to an empty cache.
 * Prefer the real user install when the current path has no Chromium.
 */
function resolveBrowsersPath() {
  const preferred = join(homedir(), "Library/Caches/ms-playwright");
  const current = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (browsersPathHasChromium(current)) return current;
  if (browsersPathHasChromium(preferred)) return preferred;
  return current || preferred;
}

loadEnvFile(join(process.cwd(), ".env.e2e"));
loadEnvFile(join(process.cwd(), ".env"));

const browsersPath = resolveBrowsersPath();
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

const runDir =
  process.env.E2E_SCREENCAST_DIR ||
  join("test-results", "screencasts", screencastStamp());

console.log(`Screencasts → ${runDir}`);
console.log(`Browsers → ${browsersPath}`);

const result = spawnSync(
  "npx",
  ["playwright", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      E2E_SCREENCAST_DIR: runDir,
      PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    },
  },
);

process.exit(result.status ?? 1);
