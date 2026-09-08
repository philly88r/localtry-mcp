#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    encoding: "utf8",
    stdio: "inherit",
    ...options,
  });
}

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

run("npm", ["run", "verify:deploy-source"]);

const head = git(["rev-parse", "HEAD"]);
const tag = `github-${head.slice(0, 12)}`;
const message = `GitHub main ${head.slice(0, 12)}`;

run("wrangler", [
  "versions",
  "upload",
  "--tag",
  tag,
  "--message",
  message,
]);
run("wrangler", [
  "versions",
  "deploy",
  "--version-tag",
  tag,
  "--percentage",
  "100",
  "--message",
  message,
  "--yes",
]);

process.stdout.write(
  `MCP deployment completed from GitHub main ${head.slice(0, 12)} without changing routes.\n`,
);
