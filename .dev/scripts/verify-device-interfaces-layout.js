#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const require = createRequire(import.meta.url);
const routerUrl =
  process.env.MD3E_ROUTER_URL || "http://172.20.110.135/cgi-bin/luci/";
const routerUser = process.env.MD3E_ROUTER_USER || "root";
const routerPassword = process.env.MD3E_ROUTER_PASSWORD || "";
const chromeCandidates = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files (x86)/BraveSoftware/Brave-Browser/Application/brave.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
];

function resolvePlaywright() {
  const localPaths = [".tmp-playwright", ".tmp-playwright-rc7"].map((base) =>
    path.join(projectRoot, base, "node_modules", "playwright"),
  );
  const localPath = firstExisting(localPaths);
  if (localPath) return localPath;
  try {
    return require.resolve("playwright");
  } catch {
    return null;
  }
}

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

const playwrightModule = resolvePlaywright();
const chromePath =
  process.env.MD3E_CHROME_PATH || firstExisting(chromeCandidates);

if (!playwrightModule || !chromePath) {
  console.log(
    "device layout check skipped: Playwright runtime or Chromium-compatible browser is unavailable",
  );
  process.exit(0);
}

const script = `
const { chromium } = require(${JSON.stringify(playwrightModule)});
const routerUrl = ${JSON.stringify(routerUrl)};
const routerUser = ${JSON.stringify(routerUser)};
const routerPassword = ${JSON.stringify(routerPassword)};
const chromePath = ${JSON.stringify(chromePath)};

(async () => {
  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 626, height: 947 },
    deviceScaleFactor: 1,
  });
  const base = routerUrl.endsWith("/") ? routerUrl : routerUrl + "/";
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 30000 });

  const loginFields = await page.locator('input[name="luci_username"], input[name="username"], input[type="password"]').count();
  if (loginFields) {
    const user = page.locator('input[name="luci_username"], input[name="username"]').first();
    if (await user.count()) await user.fill(routerUser);
    const pass = page.locator('input[name="luci_password"], input[name="password"], input[type="password"]').first();
    if (await pass.count()) await pass.fill(routerPassword);
    const submit = page.locator('button[type="submit"], input[type="submit"], .cbi-button-apply, .btn').first();
    if (await submit.count()) {
      await Promise.allSettled([
        page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 15000 }),
        submit.click(),
      ]);
    }
  }

  const response = await page.goto(base + "admin/network/network", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForTimeout(1500);

  const result = await page.evaluate(() => {
    const boxes = Array.from(document.querySelectorAll(".ifacebox"));
    const badBoxes = boxes.map((box) => {
      const br = box.getBoundingClientRect();
      const children = Array.from(box.children).map((child) => {
        const rect = child.getBoundingClientRect();
        return {
          text: (child.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        };
      });
      const outOfBounds = children.filter((child) =>
        child.rect.width &&
        child.rect.height &&
        (child.rect.left < br.left - 2 ||
          child.rect.right > br.right + 2 ||
          child.rect.top < br.top - 2 ||
          child.rect.bottom > br.bottom + 2)
      );
      const overlapping = [];
      for (let i = 0; i < children.length; i += 1) {
        for (let j = i + 1; j < children.length; j += 1) {
          if (!children[i].text || !children[j].text) continue;
          const a = children[i].rect;
          const b = children[j].rect;
          const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
          const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
          if (x * y > 16) overlapping.push([children[i].text, children[j].text, Math.round(x * y)]);
        }
      }
      return { outOfBounds, overlapping };
    }).filter((box) => box.outOfBounds.length || box.overlapping.length);

    return {
      title: document.title,
      url: location.href,
      ifaceboxCount: boxes.length,
      badCount: badBoxes.length,
      bodyText: document.body.innerText || "",
    };
  });

  await browser.close();

  if (!response || response.status() !== 200) {
    throw new Error("Interfaces page did not return HTTP 200");
  }
  if (!/Interfaces|接口/.test(result.bodyText)) {
    throw new Error("Interfaces page did not render expected title text");
  }
  if (result.ifaceboxCount < 1) {
    throw new Error("Interfaces page rendered no ifacebox cards");
  }
  if (result.badCount > 0) {
    throw new Error("Interfaces page ifacebox layout has " + result.badCount + " overflow/overlap issues");
  }

  console.log("device interfaces layout ok: ifaceboxCount=" + result.ifaceboxCount + ", badCount=" + result.badCount);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
`;

const result = spawnSync(process.execPath, ["-e", script], {
  cwd: projectRoot,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
