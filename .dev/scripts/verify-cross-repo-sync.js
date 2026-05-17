#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const projectName = path.basename(projectRoot);
const siblingRoot =
  process.env.MD3E_SYNC_TARGET ||
  path.resolve(
    projectRoot,
    "..",
    projectName === "luci-theme" ? "luci-theme-md3e" : "luci-theme",
  );
const sourceOnlyFiles = new Set(["AGENTS.md"]);
const errors = [];

function git(cwd, args) {
  const result = spawnSync("git", args, {
    cwd,
    encoding: "utf-8",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed in ${cwd}\n${result.stderr || result.stdout}`,
    );
  }
  return result.stdout.trim();
}

function trackedFiles(root) {
  return git(root, ["ls-files"]).split(/\r?\n/).filter(Boolean);
}

function fileHash(root, relativePath) {
  return createHash("sha256")
    .update(fs.readFileSync(path.join(root, relativePath)))
    .digest("hex");
}

if (!fs.existsSync(path.join(siblingRoot, ".git"))) {
  console.log(
    `cross repo sync skipped: target repo not found at ${siblingRoot}`,
  );
  process.exit(0);
}

const sourceFiles = trackedFiles(projectRoot).filter(
  (file) => !sourceOnlyFiles.has(file),
);
const targetFiles = trackedFiles(siblingRoot).filter(
  (file) => !sourceOnlyFiles.has(file),
);
const sourceSet = new Set(sourceFiles);
const targetSet = new Set(targetFiles);

for (const file of sourceFiles) {
  if (!targetSet.has(file)) {
    errors.push(`missing in target: ${file}`);
    continue;
  }
  if (fileHash(projectRoot, file) !== fileHash(siblingRoot, file)) {
    errors.push(`hash mismatch: ${file}`);
  }
}

for (const file of targetFiles) {
  if (!sourceSet.has(file)) {
    errors.push(`extra in target: ${file}`);
  }
}

if (errors.length) {
  throw new Error(
    `cross repo sync check failed against ${siblingRoot}:\n${errors.join("\n")}`,
  );
}

console.log(
  `cross repo sync ok: PACKAGE_INPUTS_MATCH ${sourceFiles.length} files`,
);
