#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const themeTemplateRoot = path.join(
  projectRoot,
  "ucode",
  "template",
  "themes",
  "md3e",
);
const templateFiles = ["header.ut", "sysauth.ut"].map((file) =>
  path.join(themeTemplateRoot, file),
);
const md3eIconIncludePattern = /include\(['"]([^'"]*icon_[^'"]*)['"]\)/g;
const errors = [];

for (const templateFile of templateFiles) {
  const source = fs.readFileSync(templateFile, "utf-8");
  const relativeTemplate = path.relative(projectRoot, templateFile);

  for (const match of source.matchAll(md3eIconIncludePattern)) {
    const includePath = match[1];

    if (!includePath.startsWith("themes/md3e/")) {
      errors.push(
        `${relativeTemplate} uses non-theme icon include path: ${includePath}`,
      );
      continue;
    }

    const partialName = includePath.slice("themes/md3e/".length);
    const partialFile = path.join(themeTemplateRoot, `${partialName}.ut`);

    if (!fs.existsSync(partialFile)) {
      errors.push(
        `${relativeTemplate} includes missing md3e partial: ${includePath}`,
      );
    }
  }
}

if (errors.length) {
  throw new Error(
    `template include verification failed:\n${errors.join("\n")}`,
  );
}

console.log(
  `template includes ok: ${templateFiles.length} md3e templates checked`,
);
