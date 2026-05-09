#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const makefilePath = path.join(projectRoot, "Makefile");
const packagedLicenseRoot = path.join(
  projectRoot,
  "ucode",
  "template",
  "themes",
  "LICENSES",
);
const legacyLicenseRoot = path.join(projectRoot, "LICENSES");
const requiredLicenseFiles = ["Geist-OFL-1.1.txt", "Inter-OFL-1.1.txt"];
const errors = [];

const makefile = fs.readFileSync(makefilePath, "utf-8");

if (!/^PKG_LICENSE:=.*\bOFL-1\.1\b/m.test(makefile)) {
  errors.push("Makefile PKG_LICENSE must include OFL-1.1 for bundled fonts");
}

for (const fileName of requiredLicenseFiles) {
  const packagedPath = path.join(packagedLicenseRoot, fileName);
  const legacyPath = path.join(legacyLicenseRoot, fileName);

  if (!fs.existsSync(packagedPath)) {
    errors.push(
      `missing packaged font license: ${path.relative(projectRoot, packagedPath).replace(/\\/g, "/")}`,
    );
    continue;
  }

  if (fs.existsSync(legacyPath)) {
    errors.push(
      `legacy root license copy should not be packaged from ${path.relative(projectRoot, legacyPath).replace(/\\/g, "/")}`,
    );
  }
}

if (errors.length) {
  throw new Error(`license layout verification failed:\n${errors.join("\n")}`);
}

console.log(
  `license layout ok: ${requiredLicenseFiles.length} font licenses packaged under ucode/template/themes/LICENSES`,
);
