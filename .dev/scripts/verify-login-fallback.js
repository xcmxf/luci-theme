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
const loginTemplate = readProjectFile("ucode/template/themes/md3e/sysauth.ut");
const loginCss = readProjectFile(".dev/src/media/main/25-login.css");
const mainSourceCss = readProjectFile(".dev/src/media/main.css");
const publicComponentsCss = readProjectFile(".dev/public/md3e/components.css");

assertIncludes(
  headerTemplate,
  "blank_page ? 'md3e-login-root' : ''",
  "header.ut must mark the login document with html.md3e-login-root",
);
assertIncludes(
  headerTemplate,
  "blank_page ? 'md3e-login-page' : ''",
  "header.ut must mark the login body with body.md3e-login-page",
);
assertIncludes(
  loginTemplate,
  '<div class="login-screen"',
  "sysauth.ut must render a .login-screen wrapper",
);
assertIncludes(
  loginTemplate,
  'class="login-card"',
  "sysauth.ut must render a .login-card form",
);
assertIncludes(
  loginCss,
  "body.md3e-login-page",
  "login CSS must use body.md3e-login-page as the fallback shell selector",
);
assertIncludes(
  loginCss,
  "opacity: 1;",
  "login CSS must keep the login card visible by default",
);

const forbiddenLoginHas = /\bbody\s*:\s*has\s*\(\s*>\s*\.login-screen\s*\)/;
assertNotMatch(
  loginCss,
  forbiddenLoginHas,
  "login CSS must not rely on body:has(> .login-screen) for critical fallback",
);
assertNotMatch(
  mainSourceCss,
  forbiddenLoginHas,
  "assembled source CSS must not rely on body:has(> .login-screen)",
);

const criticalNavShellHas =
  /\bbody\[data-layout-mode=["']desktop["']\][^{,]*:has\(\.md3e-nav-shell\.is-expanded\)/;
assertNotMatch(
  publicComponentsCss,
  criticalNavShellHas,
  "page-outline layout must use explicit nav-expanded state instead of body:has(.md3e-nav-shell.is-expanded)",
);

const criticalLoginHide = [
  /\.login-screen[^{]*\{[^}]*display\s*:\s*none/i,
  /\.login-screen[^{]*\{[^}]*visibility\s*:\s*hidden/i,
  /\.login-card[^{]*\{[^}]*display\s*:\s*none/i,
  /\.login-card[^{]*\{[^}]*visibility\s*:\s*hidden/i,
  /\.login-card[^{]*\{[^}]*opacity\s*:\s*0/i,
];

for (const pattern of criticalLoginHide) {
  assertNotMatch(
    loginCss,
    pattern,
    "login fallback must not hide .login-screen or .login-card by default",
  );
}

if (errors.length) {
  throw new Error(`login fallback verification failed:\n${errors.join("\n")}`);
}

console.log("login fallback ok");
