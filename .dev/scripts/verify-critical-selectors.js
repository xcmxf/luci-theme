#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const errors = [];

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

function assertIncludes(content, needle, message) {
  if (!content.includes(needle)) errors.push(message);
}

function assertNotMatch(content, pattern, message) {
  if (pattern.test(content)) errors.push(message);
}

const headerTemplate = readProjectFile("ucode/template/themes/md3e/header.ut");
const controlsCss = readProjectFile(
  ".dev/src/media/main/21-controls-forms.css",
);
const layoutCss = readProjectFile(".dev/src/media/main/20-layout-shell.css");
const actionGroupsJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/41-action-groups.js",
);
const pageOutlineSourceCss = readProjectFile(
  ".dev/src/public-md3e/components/60-page-outline.css",
);
const publicComponentsCss = readProjectFile(".dev/public/md3e/components.css");

assertIncludes(
  headerTemplate,
  "switcher.dataset.activeTheme = current",
  "theme switcher state must be reflected with data-active-theme",
);
assertNotMatch(
  controlsCss,
  /:has\(\.theme-option\[data-theme=["'](?:device|light|dark)["']\]\.active\)/,
  "theme switcher indicator must not rely on :has(.theme-option.active)",
);
assertNotMatch(
  controlsCss,
  /\.cbi-page-actions\s*\{[\s\S]{0,260}(?:@apply(?=[^\n;]*\bsticky\b)(?=[^\n;]*\bbottom-6\b)[^\n;]*|position:\s*sticky\b)/,
  "desktop action areas must stay in normal page flow instead of sticky bottom placement",
);

assertIncludes(
  actionGroupsJs,
  'actions.classList.toggle("md3e-has-split-button", Boolean(splitButton))',
  "split action layout must be marked with .md3e-has-split-button",
);
assertIncludes(
  layoutCss,
  ".cbi-page-actions.md3e-has-split-button",
  "split action layout CSS must use the explicit .md3e-has-split-button class",
);
assertNotMatch(
  layoutCss,
  /\.cbi-page-actions:has\(\s*>\s*:is\(\.md3e-split-button,\s*\[data-md3e-split-button\]\)\)/,
  "split action layout must not rely on .cbi-page-actions:has(...)",
);

const navShellHas =
  /\bbody\[data-layout-mode=["']desktop["']\][^{,]*:has\(\.md3e-nav-shell\.is-expanded\)/;
assertNotMatch(
  pageOutlineSourceCss,
  navShellHas,
  "page-outline source CSS must use explicit nav-expanded state instead of body:has(.md3e-nav-shell.is-expanded)",
);
assertNotMatch(
  publicComponentsCss,
  navShellHas,
  "assembled components CSS must use explicit nav-expanded state instead of body:has(.md3e-nav-shell.is-expanded)",
);

if (errors.length) {
  throw new Error(
    `critical selector verification failed:\n${errors.join("\n")}`,
  );
}

console.log("critical selectors ok");
