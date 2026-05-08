#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sourceAssemblies } from "./source-assemblies.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const devRoot = path.resolve(scriptDir, "..");
const partNamePattern = /^\d{2}-.+\.(?:css|js)$/;
const manifestParts = new Set();
const manifestOutputs = new Set();
const directories = new Set();
const errors = [];

for (const assembly of sourceAssemblies) {
  manifestOutputs.add(path.normalize(assembly.output));

  for (const part of assembly.parts) {
    const normalizedPart = path.normalize(part);
    manifestParts.add(normalizedPart);
    directories.add(path.dirname(normalizedPart));

    if (!partNamePattern.test(path.basename(part))) {
      errors.push(`${assembly.label} part is missing numeric prefix: ${part}`);
    }

    if (!fs.existsSync(path.join(devRoot, part))) {
      errors.push(`${assembly.label} part is missing on disk: ${part}`);
    }
  }
}

for (const directory of directories) {
  const absoluteDirectory = path.join(devRoot, directory);
  const files = fs.readdirSync(absoluteDirectory);

  for (const file of files) {
    if (!partNamePattern.test(file)) continue;

    const relativeFile = path.normalize(path.join(directory, file));
    if (manifestOutputs.has(relativeFile)) continue;
    if (manifestParts.has(relativeFile)) continue;

    errors.push(
      `numeric source part is not listed in assembly manifest: ${relativeFile}`,
    );
  }
}

if (errors.length) {
  throw new Error(`source part verification failed:\n${errors.join("\n")}`);
}

console.log(
  `source parts ok: ${manifestParts.size} parts across ${directories.size} directories`,
);
