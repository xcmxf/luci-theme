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
  process.env.MD3E_ROUTER_URL || "http://10.0.0.1/cgi-bin/luci/";
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
const diagnosticsDir = path.join(projectRoot, ".tmp-device-layout-diagnostics");

if (!playwrightModule) {
  console.log("device layout check skipped: Playwright runtime is unavailable");
  process.exit(0);
}

const script = `
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(${JSON.stringify(playwrightModule)});
const routerUrl = ${JSON.stringify(routerUrl)};
const routerUser = ${JSON.stringify(routerUser)};
const routerPassword = ${JSON.stringify(routerPassword)};
const chromePath = ${JSON.stringify(chromePath)};
const diagnosticsDir = ${JSON.stringify(diagnosticsDir)};

async function writeDiagnostics(page, label, details = {}) {
  try {
    fs.mkdirSync(diagnosticsDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = path.join(diagnosticsDir, stamp + "-" + label);
    const screenshotPath = basePath + ".png";
    const jsonPath = basePath + ".json";
    const layout = await page.evaluate(() => {
      const rectFor = (selector) => {
        const node = document.querySelector(selector);
        if (!(node instanceof HTMLElement)) return null;
        const rect = node.getBoundingClientRect();
        return {
          left: Math.round(rect.left),
          top: Math.round(rect.top),
          right: Math.round(rect.right),
          bottom: Math.round(rect.bottom),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      };
      const inactivePanels = Array.from(
        document.querySelectorAll(
          "#maincontent :is(.cbi-map-tabbed, .cbi-section-node-tabbed) > [data-tab-title]:not([data-tab-active='true'])",
        ),
      ).map((panel) => {
        const style = getComputedStyle(panel);
        const rect = panel.getBoundingClientRect();
        return {
          id: panel.id || "",
          className: panel.className || "",
          height: Math.round(rect.height),
          overflow: style.overflow,
          marginBlockStart: style.marginBlockStart,
          marginBlockEnd: style.marginBlockEnd,
          paddingBlockStart: style.paddingBlockStart,
          paddingBlockEnd: style.paddingBlockEnd,
          pointerEvents: style.pointerEvents,
          visibility: style.visibility,
        };
      });
      return {
        title: document.title,
        href: location.href,
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        scroll: {
          bodyHeight: document.body.scrollHeight,
          documentHeight: document.documentElement.scrollHeight,
        },
        rects: {
          maincontent: rectFor("#maincontent"),
          docsContent: rectFor("#maincontent > .docs-content"),
          footer: rectFor("footer"),
        },
        inactivePanels,
        bodyClasses: document.body.className || "",
        htmlLayoutMode: document.documentElement.getAttribute("data-layout-mode"),
        bodyLayoutMode: document.body.getAttribute("data-layout-mode"),
      };
    });

    await page.screenshot({ path: screenshotPath, fullPage: true });
    fs.writeFileSync(jsonPath, JSON.stringify({ details, layout }, null, 2));
    console.error("device layout diagnostics written: " + screenshotPath);
    console.error("device layout diagnostics written: " + jsonPath);
  } catch (diagnosticError) {
    console.error("device layout diagnostics failed:", diagnosticError);
  }
}

(async () => {
  const launchOptions = {
    headless: true,
    args: ["--no-sandbox"],
  };
  if (chromePath) launchOptions.executablePath = chromePath;
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage({
    viewport: { width: 626, height: 947 },
    deviceScaleFactor: 1,
  });
  const mobilePage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
  });
  const base = routerUrl.endsWith("/") ? routerUrl : routerUrl + "/";
  const loginIfNeeded = async (page) => {
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
  };

  await loginIfNeeded(page);
  await loginIfNeeded(mobilePage);

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
      badBoxes,
      bodyText: document.body.innerText || "",
    };
  });

  if (!response || response.status() !== 200) {
    await writeDiagnostics(page, "desktop-network-response", {
      status: response?.status() ?? null,
    });
    await browser.close();
    throw new Error("Interfaces page did not return HTTP 200");
  }
  if (!/Interfaces|接口/.test(result.bodyText)) {
    await writeDiagnostics(page, "desktop-network-title", {
      title: result.title,
      bodyText: result.bodyText.slice(0, 500),
    });
    await browser.close();
    throw new Error("Interfaces page did not render expected title text");
  }
  if (result.ifaceboxCount < 1) {
    await writeDiagnostics(page, "desktop-ifacebox-missing", result);
    await browser.close();
    throw new Error("Interfaces page rendered no ifacebox cards");
  }
  if (result.badCount > 0) {
    await writeDiagnostics(page, "desktop-ifacebox-layout", result);
    await browser.close();
    throw new Error("Interfaces page ifacebox layout has " + result.badCount + " overflow/overlap issues");
  }

  const mobileResponse = await mobilePage.goto(base + "admin/network/network", {
    waitUntil: "networkidle",
    timeout: 30000,
  });
  await mobilePage.waitForTimeout(1000);

  const mobileResult = await mobilePage.evaluate(() => {
    const pageEnd = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const footerBottom = Math.round(document.querySelector("footer")?.getBoundingClientRect().bottom || 0);
    const docsBottom = Math.round(document.querySelector("#maincontent > .docs-content")?.getBoundingClientRect().bottom || 0);
    const inactivePanels = Array.from(
      document.querySelectorAll(
        "#maincontent :is(.cbi-map-tabbed, .cbi-section-node-tabbed) > [data-tab-title]:not([data-tab-active='true'])",
      ),
    ).map((panel) => {
      const style = getComputedStyle(panel);
      const rect = panel.getBoundingClientRect();
      return {
        id: panel.id || "",
        height: Math.round(rect.height),
        overflow: style.overflow,
        marginBlockStart: style.marginBlockStart,
        marginBlockEnd: style.marginBlockEnd,
        paddingBlockStart: style.paddingBlockStart,
        paddingBlockEnd: style.paddingBlockEnd,
        pointerEvents: style.pointerEvents,
        visibility: style.visibility,
      };
    });
    const badInactivePanels = inactivePanels.filter(
      (panel) =>
        panel.height !== 0 ||
        panel.overflow !== "hidden" ||
        panel.marginBlockStart !== "0px" ||
        panel.marginBlockEnd !== "0px" ||
        panel.paddingBlockStart !== "0px" ||
        panel.paddingBlockEnd !== "0px" ||
        panel.pointerEvents !== "none" ||
        panel.visibility !== "hidden",
    );

    return {
      pageEnd,
      footerBottom,
      docsBottom,
      trailingBlank: pageEnd - Math.max(footerBottom, docsBottom),
      inactivePanelCount: inactivePanels.length,
      badInactivePanels,
      mobileOutlineCount: document.querySelectorAll(".md3e-on-this-page").length,
      hasOutlineBodyClass: document.body.classList.contains(
        "md3e-has-page-outline",
      ),
    };
  });

  if (!mobileResponse || mobileResponse.status() !== 200) {
    await writeDiagnostics(mobilePage, "mobile-network-response", {
      status: mobileResponse?.status() ?? null,
    });
    await browser.close();
    throw new Error("Mobile Interfaces page did not return HTTP 200");
  }
  if (mobileResult.inactivePanelCount > 0 && mobileResult.badInactivePanels.length) {
    await writeDiagnostics(mobilePage, "mobile-inactive-tab-panels", mobileResult);
    await browser.close();
    throw new Error(
      "Mobile Interfaces page has inactive tab panels extending page layout: " +
        JSON.stringify(mobileResult.badInactivePanels),
    );
  }
  if (mobileResult.trailingBlank > 96) {
    await writeDiagnostics(mobilePage, "mobile-trailing-blank", mobileResult);
    await browser.close();
    throw new Error(
      "Mobile Interfaces page trailing blank is too large: " +
        mobileResult.trailingBlank +
        "px",
    );
  }
  if (mobileResult.mobileOutlineCount > 0 || mobileResult.hasOutlineBodyClass) {
    await writeDiagnostics(mobilePage, "mobile-page-outline-present", mobileResult);
    await browser.close();
    throw new Error(
      "Mobile Interfaces page should not render page outline: " +
        JSON.stringify({
          mobileOutlineCount: mobileResult.mobileOutlineCount,
          hasOutlineBodyClass: mobileResult.hasOutlineBodyClass,
        }),
    );
  }

  console.log(
    "device interfaces layout ok: ifaceboxCount=" +
      result.ifaceboxCount +
      ", badCount=" +
      result.badCount +
      ", mobileTrailingBlank=" +
      mobileResult.trailingBlank +
      ", inactivePanelCount=" +
      mobileResult.inactivePanelCount +
      ", mobileOutlineCount=" +
      mobileResult.mobileOutlineCount,
  );

  await browser.close();
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
