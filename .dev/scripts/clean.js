#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function removeAllChildren(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  for (const item of fs.readdirSync(targetDir)) {
    const itemPath = path.join(targetDir, item);
    fs.rmSync(itemPath, { recursive: true, force: true });
  }
}

function cleanBuildOutput() {
  const projectRoot = path.resolve("..");
  const legacyOutlineDir = path.join(
    projectRoot,
    "htdocs",
    "luci-static",
    "outline",
  );
  const md3eDir = path.join(projectRoot, "htdocs", "luci-static", "md3e");
  const resourcesDir = path.join(
    projectRoot,
    "htdocs",
    "luci-static",
    "resources",
  );

  console.log("🧹 start clean build output...");

  for (const themeDir of [legacyOutlineDir, md3eDir]) {
    if (!fs.existsSync(themeDir)) continue;
    for (const item of fs.readdirSync(themeDir)) {
      if (item !== "public") {
        const itemPath = path.join(themeDir, item);
        console.log(`   remove: ${itemPath}`);
        fs.rmSync(itemPath, { recursive: true, force: true });
      } else {
        console.log(`   keep: ${path.join(themeDir, "public")}`);
      }
    }
  }

  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  } else {
    console.log(`   clean: ${resourcesDir}/*`);
    removeAllChildren(resourcesDir);
  }

  console.log("✅ clean build output done!");
}

cleanBuildOutput();
