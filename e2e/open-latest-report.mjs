import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = join(process.cwd(), "test-results", "screencasts");

if (!existsSync(root)) {
  console.error("No screencasts yet. Run: npm run test:e2e");
  process.exit(1);
}

const runs = readdirSync(root)
  .map((name) => ({ name, path: join(root, name) }))
  .filter((entry) => {
    try {
      return statSync(entry.path).isDirectory();
    } catch {
      return false;
    }
  })
  .sort((a, b) => b.name.localeCompare(a.name));

const latest = runs[0];
if (!latest) {
  console.error("No screencast folders found. Run: npm run test:e2e");
  process.exit(1);
}

const reportDir = join(latest.path, "report");
if (!existsSync(reportDir)) {
  console.error(`No HTML report in ${latest.path}`);
  process.exit(1);
}

console.log(`Opening screencast report: ${latest.name}`);
const result = spawnSync(
  "npx",
  ["playwright", "show-report", reportDir],
  { stdio: "inherit", shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
