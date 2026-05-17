#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

const ignoredArtifactPaths = [
  ".dev/dev.stdout.log",
  ".dev/dev.stderr.log",
  ".dev/preview.stdout.log",
  ".dev/preview.stderr.log",
  ".dev/preview-4175.stdout.log",
  ".dev/preview-4175.stderr.log",
  ".dev/preview-cdp.png",
  ".dev/preview-dom.html",
  ".dev/.vite/cache.tmp",
  ".dev/tmp-md3e-cookies.txt",
  ".dev/LOCAL_ROUTER_WORKFLOW.md",
  ".tmp-router-main.css",
  ".tmp-action/package.apk",
  ".tmp-apk/control.tar.gz",
  ".tmp-ipk/data.tar.gz",
  ".tmp-openwrt/install.log",
  ".tmp-playwright/package.json",
  ".tmp-playwright-rc7/package.json",
  ".tmp-release/luci-theme-md3e.apk",
  ".tmp-release-rc7/luci-theme-md3e.apk",
  "action-artifacts/luci-theme-md3e.apk",
  "actions-artifacts/luci-theme-md3e.ipk",
  "artifacts/package-check.log",
  "build-artifacts/package.apk",
  "device-verify/install.log",
  "gh-artifacts/run-123/package.apk",
  "openwrt-verify/http-check.txt",
  "release-artifacts/luci-theme-md3e.ipk",
  "router-verify/http-check.txt",
  "release-drafts/notes.md",
  "notes.local.md",
  "notes.private.md",
  "notes.scratch.md",
  "status-preview.stdout.log",
  "previews/scratch.png",
];
const trackedLocalHarnessPaths = [".dev/preview.html"];
const errors = [];

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: projectRoot,
    encoding: "utf-8",
  });

  if (result.error) throw result.error;
  return result;
}

for (const artifactPath of ignoredArtifactPaths) {
  const result = runGit(["check-ignore", "--quiet", artifactPath]);

  if (result.status !== 0) {
    errors.push(`${artifactPath} is not covered by .gitignore`);
  }
}

for (const harnessPath of trackedLocalHarnessPaths) {
  const result = runGit(["ls-files", "--error-unmatch", harnessPath]);

  if (result.status !== 0) {
    errors.push(
      `${harnessPath} should remain tracked as the local preview harness`,
    );
  }
}

if (errors.length) {
  throw new Error(`local artifact verification failed:\n${errors.join("\n")}`);
}

console.log(
  `local artifacts ok: ${ignoredArtifactPaths.length} transient paths ignored, ${trackedLocalHarnessPaths.length} harness file tracked`,
);
