#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function formatBytes(bytes) {
  return `${bytes} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

const errors = [];
const summaries = [];

for (const budget of budgets) {
  const filePath = path.join(projectRoot, budget.path);
  const content = fs.readFileSync(filePath);
  const gzipBytes = zlib.gzipSync(content, { level: 9 }).length;

  summaries.push(
    `${budget.label}: ${formatBytes(content.length)}, gzip ${formatBytes(gzipBytes)}`,
  );

  if (content.length > budget.maxBytes) {
    errors.push(
      `${budget.label} is ${formatBytes(content.length)}, budget ${formatBytes(budget.maxBytes)}`,
    );
  }

  if (gzipBytes > budget.maxGzipBytes) {
    errors.push(
      `${budget.label} gzip is ${formatBytes(gzipBytes)}, budget ${formatBytes(budget.maxGzipBytes)}`,
    );
  }
}

if (errors.length) {
  throw new Error(`CSS size budget failed:\n${errors.join("\n")}`);
}

console.log(`CSS size budget ok: ${summaries.join("; ")}`);
