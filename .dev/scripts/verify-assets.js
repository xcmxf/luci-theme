#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");
const publicRoot = path.join(devRoot, "public", "md3e");
const staticRoot = path.join(projectRoot, "htdocs", "luci-static", "md3e");
const generatedStaticFiles = new Set(["main.css"]);
const retainedPublicAssets = new Set([
  // Users may point the LuCI logo token at the PNG variant even though the
  // default templates use logo.svg.
  "images/logo.png",
]);
const imageExtensions = new Set([
  ".avif",
  ".gif",
  ".jpeg",
  ".jpg",
  ".png",
  ".svg",
  ".webp",
]);
const referenceRoots = [
  path.join(devRoot, "src"),
  path.join(devRoot, "preview.html"),
  path.join(devRoot, "vite.config.ts"),
  path.join(projectRoot, "root"),
  path.join(projectRoot, "ucode"),
  path.join(projectRoot, "Makefile"),
];

function toPosix(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function collectFiles(root) {
  const files = [];

  function walk(current) {
    if (!fs.existsSync(current)) return;

    const stat = fs.statSync(current);

    if (stat.isFile()) {
      files.push(toPosix(path.relative(root, current)));
      return;
    }

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        files.push(toPosix(path.relative(root, fullPath)));
      }
    }
  }

  walk(root);
  return files.sort();
}

function collectTextFiles(root) {
  if (!fs.existsSync(root)) return [];

  const stat = fs.statSync(root);

  if (stat.isFile()) return [root];

  const files = [];
  const allowedExtensions = new Set([
    ".css",
    ".html",
    ".js",
    ".json",
    ".lua",
    ".md",
    ".sh",
    ".ts",
    ".ut",
  ]);

  function walk(current) {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  walk(root);
  return files;
}

function hashFile(filePath) {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(filePath))
    .digest("hex");
}

function readReferenceCorpus() {
  return referenceRoots
    .flatMap(collectTextFiles)
    .map((filePath) => fs.readFileSync(filePath, "utf-8"))
    .join("\n");
}

function hasRuntimeReference(relativePath, corpus) {
  const basename = path.posix.basename(relativePath);
  const patterns = [
    relativePath,
    `/luci-static/md3e/${relativePath}`,
    `md3e/${relativePath}`,
    `/${relativePath}`,
    basename,
  ];

  return patterns.some((pattern) => corpus.includes(pattern));
}

const publicFiles = collectFiles(publicRoot);
const staticFiles = collectFiles(staticRoot);
const publicSet = new Set(publicFiles);
const staticSet = new Set(staticFiles);
const errors = [];

for (const relativePath of publicFiles) {
  const publicFile = path.join(publicRoot, relativePath);
  const staticFile = path.join(staticRoot, relativePath);

  if (!staticSet.has(relativePath)) {
    errors.push(`${relativePath} is missing from htdocs/luci-static/md3e`);
    continue;
  }

  if (hashFile(publicFile) !== hashFile(staticFile)) {
    errors.push(`${relativePath} differs between .dev/public/md3e and htdocs`);
  }
}

for (const relativePath of staticFiles) {
  if (!publicSet.has(relativePath) && !generatedStaticFiles.has(relativePath)) {
    errors.push(`${relativePath} has no source in .dev/public/md3e`);
  }
}

const referenceCorpus = readReferenceCorpus();

for (const relativePath of publicFiles) {
  const extension = path.posix.extname(relativePath).toLowerCase();

  if (
    !imageExtensions.has(extension) ||
    retainedPublicAssets.has(relativePath)
  ) {
    continue;
  }

  if (!hasRuntimeReference(relativePath, referenceCorpus)) {
    errors.push(`${relativePath} is not referenced by runtime sources`);
  }
}

if (errors.length) {
  throw new Error(`asset verification failed:\n${errors.join("\n")}`);
}

console.log(
  `assets ok: ${publicFiles.length} public files mirrored, ${generatedStaticFiles.size} generated static file allowed`,
);
