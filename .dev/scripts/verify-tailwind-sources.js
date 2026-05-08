#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const sourceEntry = path.join(
  devRoot,
  "src",
  "media",
  "main",
  "00-tailwind-sources.css",
);

const expectedTailwindImport = '@import "tailwindcss" source(none);';
const expectedSources = [
  '@source "../../../ucode/template/themes/md3e";',
  '@source "../../src/media";',
  '@source "../../src/resource";',
];
const rejectedSourcePatterns = [
  ".dev/docs",
  "docs/*.md",
  "preview.html",
  "src/preview",
];
const forbiddenProductionSelectors = [
  ".inline{",
  ".inline-block{",
  ".contents{",
  ".static{",
];

const source = fs.readFileSync(sourceEntry, "utf-8");
const errors = [];

if (!source.includes(expectedTailwindImport)) {
  errors.push(`missing explicit Tailwind root: ${expectedTailwindImport}`);
}

for (const expectedSource of expectedSources) {
  if (!source.includes(expectedSource)) {
    errors.push(`missing Tailwind source allowlist entry: ${expectedSource}`);
  }
}

for (const rejectedPattern of rejectedSourcePatterns) {
  if (source.includes(rejectedPattern)) {
    errors.push(
      `Tailwind source allowlist must not include ${rejectedPattern}`,
    );
  }
}

const builtCss = fs.readFileSync(
  path.join(projectRoot, "htdocs", "luci-static", "md3e", "main.css"),
  "utf-8",
);

for (const selector of forbiddenProductionSelectors) {
  if (builtCss.includes(selector)) {
    errors.push(
      `production CSS contains unexpected utility selector ${selector}`,
    );
  }
}

if (errors.length) {
  throw new Error(`Tailwind source verification failed:\n${errors.join("\n")}`);
}

console.log(
  `Tailwind sources ok: ${expectedSources.length} production roots, preview/docs excluded`,
);
