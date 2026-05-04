#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const projectRoot = path.resolve(devRoot, "..");

function assertInsideProject(targetPath) {
  const resolved = path.resolve(targetPath);
  const projectPrefix = projectRoot + path.sep;

  if (!resolved.startsWith(projectPrefix)) {
    throw new Error(
      `Refusing to remove path outside project root: ${resolved}`,
    );
  }

  return resolved;
}

function removePath(targetPath) {
  const resolved = assertInsideProject(targetPath);
  if (!fs.existsSync(resolved)) return;

  console.log(`   remove: ${path.relative(projectRoot, resolved)}`);
  fs.rmSync(resolved, { recursive: true, force: true });
}

function scanFiles(targetDir, extensions = []) {
  if (!fs.existsSync(targetDir)) return [];

  const files = [];
  for (const item of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const itemPath = path.join(targetDir, item.name);

    if (item.isDirectory()) {
      files.push(...scanFiles(itemPath, extensions));
    } else if (
      item.isFile() &&
      (!extensions.length || extensions.some((ext) => itemPath.endsWith(ext)))
    ) {
      files.push(itemPath);
    }
  }

  return files;
}

function cleanBuildOutput() {
  const luciStaticDir = path.join(projectRoot, "htdocs", "luci-static");
  const md3eDir = path.join(luciStaticDir, "md3e");
  const resourcesDir = path.join(luciStaticDir, "resources");
  const sourceResourceDir = path.join(devRoot, "src", "resource");
  const legacyOutlineDir = path.join(luciStaticDir, "outline");

  console.log("start clean build output...");

  removePath(md3eDir);
  removePath(legacyOutlineDir);
  fs.mkdirSync(resourcesDir, { recursive: true });

  for (const sourceFile of scanFiles(sourceResourceDir, [".js"])) {
    const relativePath = path.relative(sourceResourceDir, sourceFile);
    removePath(path.join(resourcesDir, relativePath));
  }

  console.log("clean build output done!");
}

cleanBuildOutput();
