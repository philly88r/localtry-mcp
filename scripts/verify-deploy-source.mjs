#!/usr/bin/env node

import { execFileSync } from "node:child_process";

function git(args) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function fail(message) {
  process.stderr.write(`\nProduction deployment blocked: ${message}\n\n`);
  process.exit(1);
}

const status = git(["status", "--porcelain"]);
if (status) fail("commit and push every production change before deploying.");

const head = git(["rev-parse", "HEAD"]);
const remoteHead = git(["ls-remote", "origin", "refs/heads/main"]).split(/\s+/)[0];
if (!remoteHead || head !== remoteHead) {
  fail("local HEAD does not match GitHub main.");
}

process.stdout.write(`Deployment source verified: GitHub main ${head.slice(0, 12)}.\n`);

