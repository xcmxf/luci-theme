#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  layoutBreakpoints,
  layoutBreakpointTokens,
} from "../src/shared/layout-breakpoints.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const generatedBreakpointFiles = [
  ".dev/src/preview/local-preview.js",
  ".dev/src/media/main.css",
  ".dev/public/md3e/components.css",
  ".dev/src/resource/menu-md3e-v2.js",
];
const tokenizedSourceFiles = [
  ".dev/src/media/main/20-layout-shell.css",
  ".dev/src/media/main/23-tables-forms-segmented.css",
  ".dev/src/media/main/24-navigation-page-chrome.css",
  ".dev/src/public-md3e/components/50-tabs.css",
  ".dev/src/public-md3e/components/60-page-outline.css",
  ".dev/src/resource/menu-md3e-v2/00-preamble.js",
];
const directSharedSourceFiles = [
  ".dev/src/preview/local-preview.js",
  ".dev/preview.html",
];
const templateBreakpointFiles = [
  ".dev/preview.html",
  "ucode/template/themes/md3e/header.ut",
];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

const mobileMaxWidth = layoutBreakpoints.mobileMaxWidth;
const desktopMinWidth = layoutBreakpoints.desktopMinWidth;
const errors = [];

if (desktopMinWidth !== mobileMaxWidth + 1) {
  errors.push(
    `.dev/src/shared/layout-breakpoints.js desktopMinWidth must be mobileMaxWidth + 1`,
  );
}

const generatedPatterns = new Map([
  [".dev/src/preview/local-preview.js", [`mobileLayoutQuery`]],
  [
    ".dev/src/media/main.css",
    [`max-width: ${mobileMaxWidth}px`, `min-width: ${desktopMinWidth}px`],
  ],
  [
    ".dev/public/md3e/components.css",
    [`max-width: ${mobileMaxWidth}px`, `min-width: ${desktopMinWidth}px`],
  ],
  [
    ".dev/src/resource/menu-md3e-v2.js",
    [
      `MOBILE_LAYOUT_MAX_WIDTH = ${mobileMaxWidth}`,
      `MOBILE_LAYOUT_QUERY = \`(max-width: \${MOBILE_LAYOUT_MAX_WIDTH}px)\``,
    ],
  ],
]);
const tokenizedSourcePatterns = new Map([
  [
    ".dev/src/media/main/20-layout-shell.css",
    [
      `max-width: ${layoutBreakpointTokens.mobileMaxWidth}px`,
      `min-width: ${layoutBreakpointTokens.desktopMinWidth}px`,
    ],
  ],
  [
    ".dev/src/media/main/23-tables-forms-segmented.css",
    [`max-width: ${layoutBreakpointTokens.mobileMaxWidth}px`],
  ],
  [
    ".dev/src/media/main/24-navigation-page-chrome.css",
    [
      `max-width: ${layoutBreakpointTokens.mobileMaxWidth}px`,
      `min-width: ${layoutBreakpointTokens.desktopMinWidth}px`,
    ],
  ],
  [
    ".dev/src/public-md3e/components/50-tabs.css",
    [`max-width: ${layoutBreakpointTokens.mobileMaxWidth}px`],
  ],
  [
    ".dev/src/public-md3e/components/60-page-outline.css",
    [`min-width: ${layoutBreakpointTokens.desktopMinWidth}px`],
  ],
  [
    ".dev/src/resource/menu-md3e-v2/00-preamble.js",
    [`MOBILE_LAYOUT_MAX_WIDTH = ${layoutBreakpointTokens.mobileMaxWidth}`],
  ],
]);
const templatePatterns = new Map([
  [
    ".dev/preview.html",
    [`data-layout-mode="mobile"`, `data-layout-mode="desktop"`],
  ],
  [
    "ucode/template/themes/md3e/header.ut",
    [
      `const mobile_layout_max_width = ${mobileMaxWidth};`,
      `const desktop_layout_min_width = mobile_layout_max_width + 1;`,
      `max-width: {{ mobile_layout_max_width }}px`,
      `min-width: {{ desktop_layout_min_width }}px`,
    ],
  ],
]);

function requirePatterns(relativePath, requiredPatterns) {
  const source = readProjectFile(relativePath);

  for (const requiredPattern of requiredPatterns || []) {
    if (!source.includes(requiredPattern)) {
      errors.push(`${relativePath} is missing ${requiredPattern}`);
    }
  }
}

function rejectHardcodedBreakpoint(relativePath) {
  const source = readProjectFile(relativePath);
  const hardcodedMediaQuery = /(?:min|max)-width:\s*(?:920|921)px/g;
  const hardcodedJsConstant = /MOBILE_LAYOUT_MAX_WIDTH\s*=\s*920/g;
  const matches = [
    ...source.matchAll(hardcodedMediaQuery),
    ...source.matchAll(hardcodedJsConstant),
  ];

  for (const match of matches) {
    errors.push(`${relativePath} has hardcoded breakpoint: ${match[0]}`);
  }
}

function rejectUnresolvedTokens(relativePath) {
  const source = readProjectFile(relativePath);

  for (const token of Object.values(layoutBreakpointTokens)) {
    if (source.includes(token)) {
      errors.push(`${relativePath} has unresolved breakpoint token: ${token}`);
    }
  }
}

for (const relativePath of generatedBreakpointFiles) {
  requirePatterns(relativePath, generatedPatterns.get(relativePath));
  rejectUnresolvedTokens(relativePath);
}

for (const relativePath of tokenizedSourceFiles) {
  requirePatterns(relativePath, tokenizedSourcePatterns.get(relativePath));
  rejectHardcodedBreakpoint(relativePath);
}

for (const relativePath of directSharedSourceFiles) {
  rejectHardcodedBreakpoint(relativePath);
}

for (const relativePath of templateBreakpointFiles) {
  requirePatterns(relativePath, templatePatterns.get(relativePath));
}

if (errors.length) {
  throw new Error(
    `layout breakpoint verification failed:\n${errors.join("\n")}`,
  );
}

console.log(
  `layout breakpoint ok: mobile <= ${mobileMaxWidth}px, desktop >= ${desktopMinWidth}px`,
);
