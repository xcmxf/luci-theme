#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || projectRoot,
    stdio: "inherit",
  });

  if (result.status !== 0) {
    if (result.error) {
      throw result.error;
    }
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

function assertGeneratedOutputMatchesIndex() {
  const diff = spawnSync(
    "git",
    ["diff", "--name-status", "--exit-code", "--", "htdocs/luci-static"],
    {
      cwd: projectRoot,
      encoding: "utf-8",
    },
  );

  if (diff.status === 0) return;

  if (diff.error) {
    throw diff.error;
  }

  const status = spawnSync(
    "git",
    ["status", "--short", "--", "htdocs/luci-static"],
    {
      cwd: projectRoot,
      encoding: "utf-8",
    },
  );

  console.error(
    "generated output mismatch: rebuilt htdocs/luci-static differs from the git index",
  );

  if (diff.stdout.trim()) {
    console.error("\nDiff against index:");
    console.error(diff.stdout.trim());
  }

  if (status.stdout.trim()) {
    console.error("\nWorking tree status:");
    console.error(status.stdout.trim());
  }

  console.error(
    "\nHint: verify:generated compares the rebuilt static output with the current git index. If the generated output changes are intentional, stage the matching htdocs/luci-static files and rerun; otherwise review the source change or rebuild output.",
  );

  process.exit(1);
}

const viteBin = path.join(devRoot, "node_modules", "vite", "bin", "vite.js");

run(process.execPath, ["scripts/assemble-sources.js"], { cwd: devRoot });
run(process.execPath, ["scripts/clean.js"], { cwd: devRoot });
run(process.execPath, [viteBin, "build"], { cwd: devRoot });
assertGeneratedOutputMatchesIndex();

console.log("generated output ok: htdocs/luci-static matches .dev build");
