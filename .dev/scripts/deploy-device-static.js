#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..", "..");
const routerHost = process.env.MD3E_ROUTER_HOST || "10.0.0.1";
const routerUser = process.env.MD3E_ROUTER_USER || "root";
const knownHosts = path.join(projectRoot, ".ssh-known-hosts-md3e");
const files = [
  ["htdocs/luci-static/md3e/main.css", "/www/luci-static/md3e/main.css"],
  [
    "htdocs/luci-static/md3e/components.css",
    "/www/luci-static/md3e/components.css",
  ],
  [
    "htdocs/luci-static/resources/menu-md3e-v2.js",
    "/www/luci-static/resources/menu-md3e-v2.js",
  ],
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
}

for (const [localPath] of files) {
  if (!fs.existsSync(path.join(projectRoot, localPath))) {
    throw new Error(`missing built static file: ${localPath}`);
  }
}

const sshOptions = [
  "-o",
  "BatchMode=yes",
  "-o",
  "ConnectTimeout=10",
  "-o",
  "StrictHostKeyChecking=no",
  "-o",
  `UserKnownHostsFile=${knownHosts}`,
];
const remote = `${routerUser}@${routerHost}`;
const remotePaths = files.map(([, remotePath]) => remotePath);

for (const [localPath, remotePath] of files) {
  run("scp", [...sshOptions, localPath, `${remote}:${remotePath}`]);
}

run("ssh", [
  ...sshOptions,
  remote,
  `${remotePaths.map((remotePath) => `test -s ${remotePath}`).join(" && ")} && ls -l ${remotePaths.join(" ")}`,
]);

console.log(`device static deploy ok: ${remote}`);
