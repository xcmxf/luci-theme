#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf-8");
}

function getSingleMatch(source, pattern, label) {
  const matches = Array.from(source.matchAll(pattern));

  if (matches.length !== 1) {
    throw new Error(`Expected exactly one ${label}, found ${matches.length}`);
  }

  return matches[0][1].trim();
}

const makefile = readProjectFile("Makefile");
const header = readProjectFile("ucode/template/themes/md3e/header.ut");

const packageVersion = getSingleMatch(
  makefile,
  /^PKG_VERSION:=(.+)$/gm,
  "PKG_VERSION in Makefile",
);
const packageRelease = getSingleMatch(
  makefile,
  /^PKG_RELEASE:=(.+)$/gm,
  "PKG_RELEASE in Makefile",
);
const releaseCacheVersion = getSingleMatch(
  header,
  /const\s+release_cache_version\s*=\s*['"]([^'"]+)['"]/g,
  "release_cache_version in header.ut",
);

const expectedCacheVersion = `${packageVersion}-${packageRelease}`;

if (releaseCacheVersion !== expectedCacheVersion) {
  throw new Error(
    `release_cache_version mismatch: expected ${expectedCacheVersion}, found ${releaseCacheVersion}`,
  );
}

console.log(`release version ok: ${releaseCacheVersion}`);
