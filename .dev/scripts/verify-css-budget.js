#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

const budgets = [
  {
    label: "main.css",
    path: "htdocs/luci-static/md3e/main.css",
    maxBytes: 380 * 1024,
    maxGzipBytes: 52 * 1024,
  },
  {
    label: "components.css",
    path: "htdocs/luci-static/md3e/components.css",
    maxBytes: 64 * 1024,
    maxGzipBytes: 10 * 1024,
  },
];
const sourcePartBudgets = [
  {
    label: "main CSS source part",
    root: ".dev/src/media/main",
    maxBytes: 50 * 1024,
  },
  {
    label: "public component CSS source part",
    root: ".dev/src/public-md3e/components",
    maxBytes: 24 * 1024,
  },
];
const sourcePartReportLimit = 5;
const warningRatio = 0.9;

function formatBytes(bytes) {
  return `${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

function formatHeadroom(currentBytes, maxBytes) {
  return `${formatBytes(maxBytes - currentBytes)} remaining`;
}

function readIndexBytes(relativePath) {
  const result = spawnSync("git", ["show", `:${relativePath}`], {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0 || result.error) return null;
  return result.stdout;
}

function formatDelta(currentBytes, previousBytes) {
  if (previousBytes === null) return "index delta n/a";
  const delta = currentBytes - previousBytes;
  const sign = delta > 0 ? "+" : "";
  return `index delta ${sign}${formatBytes(delta)}`;
}

function collectCssFiles(root) {
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".css"))
    .map((entry) => path.join(root, entry.name))
    .sort();
}

const errors = [];
const warnings = [];
const summaries = [];

for (const budget of budgets) {
  const filePath = path.join(projectRoot, budget.path);
  const content = fs.readFileSync(filePath);
  const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;
  const indexContent = readIndexBytes(budget.path);
  const indexGzipBytes =
    indexContent === null
      ? null
      : zlib.gzipSync(indexContent, { level: 9 }).length;

  summaries.push(
    `${budget.label}: ${formatBytes(content.length)}, gzip ${formatBytes(gzipBytes)}, ${formatHeadroom(content.length, budget.maxBytes)}, gzip ${formatHeadroom(gzipBytes, budget.maxGzipBytes)}, ${formatDelta(content.length, indexContent?.length ?? null)}, gzip ${formatDelta(gzipBytes, indexGzipBytes)}`,
  );

  if (content.length > budget.maxBytes) {
    errors.push(
      `${budget.label} is ${formatBytes(content.length)}, budget ${formatBytes(budget.maxBytes)}`,
    );
  } else if (content.length >= budget.maxBytes * warningRatio) {
    warnings.push(
      `${budget.label} is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(content.length)} / ${formatBytes(budget.maxBytes)}`,
    );
  }

  if (gzipBytes > budget.maxGzipBytes) {
    errors.push(
      `${budget.label} gzip is ${formatBytes(gzipBytes)}, budget ${formatBytes(budget.maxGzipBytes)}`,
    );
  } else if (gzipBytes >= budget.maxGzipBytes * warningRatio) {
    warnings.push(
      `${budget.label} gzip is above ${Math.round(warningRatio * 100)}% of budget: ${formatBytes(gzipBytes)} / ${formatBytes(budget.maxGzipBytes)}`,
    );
  }
}

for (const budget of sourcePartBudgets) {
  const root = path.join(projectRoot, budget.root);
  const files = collectCssFiles(root);
  const rankedFiles = [];

  for (const filePath of files) {
    const size = fs.statSync(filePath).size;
    const relativePath = path
      .relative(projectRoot, filePath)
      .replace(/\\/g, "/");
    rankedFiles.push({ relativePath, size });

    if (size > budget.maxBytes) {
      errors.push(
        `${relativePath} is ${formatBytes(size)}, ${budget.label} budget ${formatBytes(budget.maxBytes)}`,
      );
    } else if (size >= budget.maxBytes * warningRatio) {
      warnings.push(
        `${relativePath} is above ${Math.round(warningRatio * 100)}% of ${budget.label} budget: ${formatBytes(size)} / ${formatBytes(budget.maxBytes)}`,
      );
    }
  }

  rankedFiles.sort((a, b) => b.size - a.size);

  if (rankedFiles.length) {
    summaries.push(
      `${budget.label} top ${Math.min(
        sourcePartReportLimit,
        rankedFiles.length,
      )}: ${rankedFiles
        .slice(0, sourcePartReportLimit)
        .map((file) => `${file.relativePath} ${formatBytes(file.size)}`)
        .join(", ")}`,
    );
  }
}

if (errors.length) {
  throw new Error(`CSS size budget failed:\n${errors.join("\n")}`);
}

if (warnings.length) {
  console.warn(`CSS size budget warnings:\n${warnings.join("\n")}`);
}

console.log(`CSS size budget ok: ${summaries.join("; ")}`);
