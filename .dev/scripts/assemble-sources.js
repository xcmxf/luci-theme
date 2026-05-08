#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  layoutBreakpoints,
  layoutBreakpointTokens,
} from "../src/shared/layout-breakpoints.js";
import { sourceAssemblies } from "./source-assemblies.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const checkOnly = process.argv.includes("--check");
const tokenReplacements = new Map([
  [
    layoutBreakpointTokens.mobileMaxWidth,
    String(layoutBreakpoints.mobileMaxWidth),
  ],
  [
    layoutBreakpointTokens.desktopMinWidth,
    String(layoutBreakpoints.desktopMinWidth),
  ],
]);

const assemblies = sourceAssemblies.map((assembly) => ({
  ...assembly,
  output: path.join(devRoot, assembly.output),
}));

function readPart(relativePath) {
  const fullPath = path.join(devRoot, relativePath);
  const content = fs.readFileSync(fullPath, "utf-8");
  const normalized = content.endsWith("\n") ? content : `${content}\n`;
  return resolveSourceTokens(normalized);
}

function resolveSourceTokens(content) {
  let nextContent = content;
  for (const [token, replacement] of tokenReplacements) {
    nextContent = nextContent.replaceAll(token, replacement);
  }
  return nextContent;
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
