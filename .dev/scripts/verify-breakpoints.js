#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const canonicalFile = ".dev/src/resource/menu-md3e-v2.js";
const layoutBreakpointFiles = [
  canonicalFile,
  ".dev/src/preview/local-preview.js",
  ".dev/src/media/main.css",
  ".dev/preview.html",
  "ucode/template/themes/md3e/header.ut",
];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

const canonicalSource = readProjectFile(canonicalFile);
const canonicalMatch = canonicalSource.match(
  /MOBILE_LAYOUT_MAX_WIDTH\s*=\s*(\d+)/,
);

if (!canonicalMatch) {
  throw new Error(`${canonicalFile} is missing MOBILE_LAYOUT_MAX_WIDTH`);
}

const mobileMaxWidth = Number(canonicalMatch[1]);
const desktopMinWidth = mobileMaxWidth + 1;
const errors = [];

const requiredPatterns = new Map([
  [canonicalFile, [`MOBILE_LAYOUT_MAX_WIDTH = ${mobileMaxWidth}`]],
  [
    ".dev/src/preview/local-preview.js",
    [`MOBILE_LAYOUT_MAX_WIDTH = ${mobileMaxWidth}`],
  ],
  [".dev/src/media/main.css", [`max-width: ${mobileMaxWidth}px`]],
  [
    ".dev/preview.html",
    [`max-width: ${mobileMaxWidth}px`, `min-width: ${desktopMinWidth}px`],
  ],
  [
    "ucode/template/themes/md3e/header.ut",
    [`max-width: ${mobileMaxWidth}px`, `min-width: ${desktopMinWidth}px`],
  ],
]);

for (const relativePath of layoutBreakpointFiles) {
  const source = readProjectFile(relativePath);

  for (const requiredPattern of requiredPatterns.get(relativePath) || []) {
    if (!source.includes(requiredPattern)) {
      errors.push(`${relativePath} is missing ${requiredPattern}`);
    }
  }

  for (const match of source.matchAll(/MOBILE_LAYOUT_MAX_WIDTH\s*=\s*(\d+)/g)) {
    const value = Number(match[1]);
    if (value !== mobileMaxWidth) {
      errors.push(
        `${relativePath} has MOBILE_LAYOUT_MAX_WIDTH ${value}, expected ${mobileMaxWidth}`,
      );
    }
  }

  // Component-specific breakpoints are allowed; this verifier only guards the
  // shared shell breakpoint that switches between mobile and desktop layouts.
}

if (errors.length) {
  throw new Error(
    `layout breakpoint verification failed:\n${errors.join("\n")}`,
  );
}

console.log(
  `layout breakpoint ok: mobile <= ${mobileMaxWidth}px, desktop >= ${desktopMinWidth}px`,
);
