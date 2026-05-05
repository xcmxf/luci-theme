#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const checkOnly = process.argv.includes("--check");

const assemblies = [
  {
    label: "CSS entry",
    output: path.join(devRoot, "src", "media", "main.css"),
    parts: [
      "src/media/main/00-directives-and-tokens.css",
      "src/media/main/10-base.css",
      "src/media/main/20-components.css",
      "src/media/main/30-utilities.css",
      "src/media/main/40-plugins.css",
      "src/media/main/50-patches.css",
    ],
  },
  {
    label: "Public MD3E components",
    output: path.join(devRoot, "public", "md3e", "components.css"),
    parts: [
      "src/public-md3e/components/00-tokens-surfaces-buttons.css",
      "src/public-md3e/components/10-action-areas.css",
      "src/public-md3e/components/20-forms-dropdowns.css",
      "src/public-md3e/components/30-content-rows-dynlists.css",
      "src/public-md3e/components/40-dark-rail.css",
      "src/public-md3e/components/50-tabs.css",
      "src/public-md3e/components/60-page-outline.css",
    ],
  },
  {
    label: "LuCI menu resource",
    output: path.join(devRoot, "src", "resource", "menu-md3e-v2.js"),
    parts: [
      "src/resource/menu-md3e-v2/00-preamble.js",
      "src/resource/menu-md3e-v2/10-bootstrap-layout.js",
      "src/resource/menu-md3e-v2/11-metadata-icons.js",
      "src/resource/menu-md3e-v2/12-nav-builders.js",
      "src/resource/menu-md3e-v2/13-page-outline.js",
      "src/resource/menu-md3e-v2/20-indicators-progress.js",
      "src/resource/menu-md3e-v2/21-modal-and-toast.js",
      "src/resource/menu-md3e-v2/22-tabs-and-motion.js",
      "src/resource/menu-md3e-v2/30-description-and-split-button.js",
      "src/resource/menu-md3e-v2/31-dropdown-positioning.js",
      "src/resource/menu-md3e-v2/32-custom-selects.js",
      "src/resource/menu-md3e-v2/40-mobile-menu.js",
      "src/resource/menu-md3e-v2/41-action-groups.js",
      "src/resource/menu-md3e-v2/42-mobile-rendering.js",
      "src/resource/menu-md3e-v2/50-rendering.js",
      "src/resource/menu-md3e-v2/99-close.js",
    ],
  },
];

function readPart(relativePath) {
  const fullPath = path.join(devRoot, relativePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  return content.endsWith("\n") ? content : `${content}\n`;
}

function assemble(parts) {
  return parts.map(readPart).join("");
}

let failed = false;

for (const assembly of assemblies) {
  const nextContent = assemble(assembly.parts);
  const currentContent = fs.existsSync(assembly.output)
    ? fs.readFileSync(assembly.output, "utf-8")
    : "";

  if (checkOnly) {
    if (currentContent !== nextContent) {
      console.error(`${assembly.label} is not assembled from its parts`);
      failed = true;
    }
    continue;
  }

  if (currentContent !== nextContent) {
    fs.writeFileSync(assembly.output, nextContent, "utf-8");
    console.log(`assembled ${path.relative(devRoot, assembly.output)}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else if (checkOnly) {
  console.log("source assembly ok");
}
