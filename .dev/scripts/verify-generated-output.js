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

const viteBin = path.join(devRoot, "node_modules", "vite", "bin", "vite.js");

run(process.execPath, ["scripts/assemble-sources.js"], { cwd: devRoot });
run(process.execPath, ["scripts/clean.js"], { cwd: devRoot });
run(process.execPath, [viteBin, "build"], { cwd: devRoot });
run("git", ["diff", "--exit-code", "--", "htdocs/luci-static"], {
  cwd: projectRoot,
});

console.log("generated output ok: htdocs/luci-static matches .dev build");
