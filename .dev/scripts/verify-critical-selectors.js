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
const networkStatusCardsJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/41-network-status-cards.js",
);
const bootstrapLayoutJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/10-bootstrap-layout.js",
);
const customSelectsJs = readProjectFile(
  ".dev/src/resource/menu-md3e-v2/32-custom-selects.js",
);
const pageOutlineSourceCss = readProjectFile(
  ".dev/src/public-md3e/components/60-page-outline.css",
);
const publicComponentsCss = readProjectFile(".dev/public/md3e/components.css");
const statusCardsCss = readProjectFile(
  ".dev/src/media/main/22-status-cards.css",
);
const tablesFormsCss = readProjectFile(
  ".dev/src/media/main/23-tables-forms-segmented.css",
);

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

assertIncludes(
  networkStatusCardsJs,
  'card.classList.toggle("md3e-network-card", !isPortCard)',
  "network status cards must get an explicit .md3e-network-card class",
);
assertIncludes(
  networkStatusCardsJs,
  'card.classList.toggle("md3e-port-card", isPortCard)',
  "port status cards must get an explicit .md3e-port-card class",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-name")',
  "port status card name must be marked with .md3e-port-name",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-zone")',
  "port status card zone strip must be marked with .md3e-port-zone",
);
assertIncludes(
  networkStatusCardsJs,
  'classList.add("md3e-port-traffic")',
  "port status card traffic area must be marked with .md3e-port-traffic",
);
assertIncludes(
  statusCardsCss,
  ".md3e-network-card-grid",
  "network status cards must use the MD3E card grid wrapper",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card-grid",
  "port status cards must use the explicit MD3E port card grid wrapper",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card > .md3e-port-name",
  "port status card CSS must use the explicit .md3e-port-name marker",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card > .md3e-port-zone",
  "port status card CSS must use the explicit .md3e-port-zone marker",
);
assertIncludes(
  statusCardsCss,
  ".md3e-port-card .md3e-port-traffic",
  "port status card CSS must use the explicit .md3e-port-traffic marker",
);
assertNotMatch(
  statusCardsCss,
  /\.md3e-network-card[^{]*\{[\s\S]{0,520}width:\s*fit-content\b/,
  "network status cards must not shrink to fit-content on mobile",
);
assertNotMatch(
  statusCardsCss,
  /\.ifacebox:has\(\s*>\s*\.ifacebox-head\.cbi-tooltip-container\)/,
  "port status cards must not rely on .ifacebox:has(...) fallback selectors",
);
assertIncludes(
  readProjectFile(
    ".dev/src/resource/menu-md3e-v2/30-description-and-split-button.js",
  ),
  'field?.classList.toggle("md3e-value-field-localtime", hasLocalTime)',
  "localtime controls must get an explicit .md3e-value-field-localtime class",
);
assertIncludes(
  readProjectFile(".dev/src/media/main/21-controls-forms.css"),
  ".cbi-value-field.md3e-value-field-localtime",
  "localtime button CSS must use the explicit .md3e-value-field-localtime class",
);
assertNotMatch(
  readProjectFile(".dev/src/media/main/21-controls-forms.css"),
  /\.cbi-value-field:has\(#localtime\)/,
  "localtime button CSS must not rely on .cbi-value-field:has(#localtime)",
);

assertIncludes(
  tablesFormsCss,
  '[data-page="admin-network-network"] &',
  "network interfaces table must keep page-scoped responsive badge layout",
);
assertIncludes(
  tablesFormsCss,
  "& .ifacebox-body .cbi-tooltip.ifacebadge.large",
  "network interface badge tooltip must stay out of normal icon flow",
);
assertIncludes(
  tablesFormsCss,
  '&[data-name="_ifacestat"]',
  "network interface status details must keep the redesigned compact card",
);
assertIncludes(
  tablesFormsCss,
  "max-md:flex-none",
  "network interface cells must not shrink and squeeze redesigned badges on mobile",
);
assertIncludes(
  tablesFormsCss,
  ".md3e-interface-row",
  "network interface rows must use explicit JS markers for mobile redesign",
);
assertIncludes(
  tablesFormsCss,
  "grid-template-columns: minmax(0, 1fr) !important",
  "network interface row grid must override LuCI's generated multi-column table layout",
);
assertIncludes(
  networkStatusCardsJs,
  'row.classList.add("md3e-interface-row")',
  "network interface row marker must be applied by the LuCI runtime enhancer",
);
assertIncludes(
  bootstrapLayoutJs,
  "observeDomMutations(target, subscriberKey, callback",
  "runtime modules must use the shared DOM mutation hub for target-level observers",
);
assertIncludes(
  networkStatusCardsJs,
  'this.observeDomMutations(target, "network-status-cards"',
  "network status cards must subscribe to the shared mutation hub",
);
assertIncludes(
  actionGroupsJs,
  'this.observeDomMutations(target, "action-button-groups"',
  "action button groups must subscribe to the shared mutation hub",
);
assertIncludes(
  actionGroupsJs,
  "md3e-row-action-cluster",
  "row action button clusters must get an explicit marker class",
);
assertIncludes(
  tablesFormsCss,
  ".md3e-row-action-cluster",
  "row action button cluster CSS must use the explicit marker class",
);
assertNotMatch(
  tablesFormsCss,
  />\s*div:has\(\s*>\s*:is\(\.cbi-button,\s*\.btn,\s*button,\s*a\.btn,\s*input\.btn\)\)/,
  "row action button cluster CSS must not rely on div:has(> button)",
);
assertIncludes(
  customSelectsJs,
  'this.observeDomMutations(target, "custom-selects"',
  "custom selects must subscribe to the shared mutation hub",
);
assertIncludes(
  customSelectsJs,
  'const method = hasOpen ? "addEventListener" : "removeEventListener"',
  "dropdown viewport listeners must be attached only while a dropdown is open",
);
assertNotMatch(
  customSelectsJs,
  /window\.addEventListener\("scroll",\s*this\._dropdownViewportHandler,\s*true\)/,
  "dropdown scroll listener must not be installed permanently during init",
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
