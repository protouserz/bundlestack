import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

if (process.env.SHOPIFY_FUNCTION_BUILD_WRAPPER === "1") {
  console.error(
    "Refusing recursive Function build (SHOPIFY_FUNCTION_BUILD_WRAPPER=1).",
  );
  process.exit(1);
}

const extensionDir = path.dirname(fileURLToPath(import.meta.url));
const patchPath = path.join(extensionDir, "patch-cpus.mjs");
const nodeOptions = [process.env.NODE_OPTIONS, `--import ${JSON.stringify(patchPath)}`]
  .filter(Boolean)
  .join(" ");

// Keep a single graphql instance for codegen (workspace hoist vs nested copy).
const nestedGraphql = path.join(extensionDir, "node_modules", "graphql");
const rootGraphql = path.resolve(extensionDir, "../../node_modules/graphql");
if (
  fs.existsSync(rootGraphql) &&
  fs.existsSync(path.dirname(nestedGraphql))
) {
  fs.rmSync(nestedGraphql, { recursive: true, force: true });
  fs.symlinkSync(rootGraphql, nestedGraphql, "dir");
}

const result = spawnSync(
  "npm",
  ["exec", "--", "shopify", "app", "function", "build"],
  {
    cwd: extensionDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_OPTIONS: nodeOptions,
      SHOPIFY_FUNCTION_BUILD_WRAPPER: "1",
    },
    shell: process.platform === "win32",
  },
);

process.exit(result.status ?? 1);
