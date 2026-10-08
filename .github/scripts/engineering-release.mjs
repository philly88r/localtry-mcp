#!/usr/bin/env node
// Reports CI and deployment outcomes of LocalTry engineering pull requests
// back to the CRM. Runs only in trusted workflows (push to main, or
// workflow_run on the default branch) where ENGINEERING_RELEASE_SECRET is
// available; pull-request CI itself never receives that secret.
//
// The same dependency-free file is used in every LocalTry repository.
//
//   node .github/scripts/engineering-release.mjs ci-report
//     RUN_ID, CONCLUSION, HEAD_SHA, HEAD_BRANCH
//   node .github/scripts/engineering-release.mjs deployed
//   node .github/scripts/engineering-release.mjs deploy-failed
//     (both use GITHUB_SHA and the checked-out history; deploy-failed reads
//     the tail of FAILURE_LOG when the workflow captured one)

import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const ENGINEERING_LABEL = "localtry-engineering";
export const RELEASED_LABEL = "released";
const API = "https://api.github.com";
const DEFAULT_ENDPOINT =
  "https://localtry.com/api/internal/engineering/release";
const SUMMARY_LIMIT = 12_000;

export function sign(secret, timestamp, body) {
  return `sha256=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function signedPost({
  endpoint = DEFAULT_ENDPOINT,
  secret,
  payload,
  fetchImpl = fetch,
  now = () => Date.now(),
  sleep = wait,
}) {
  if (!secret || secret.length < 32)
    throw new Error("ENGINEERING_RELEASE_SECRET is not configured.");
  const body = JSON.stringify(payload);
  let lastError = "";
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const timestamp = String(Math.floor(now() / 1000));
    try {
      const response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-localtry-release-timestamp": timestamp,
          "x-localtry-release-signature": sign(secret, timestamp, body),
        },
        body,
      });
      const text = await response.text();
      if (response.ok) return text ? JSON.parse(text) : {};
      lastError = `${response.status}: ${text.slice(0, 500)}`;
      if (response.status < 500) break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 4) await sleep(5_000 * attempt);
  }
  throw new Error(`LocalTry rejected the release report (${lastError}).`);
}

function github({ token, fetchImpl = fetch }) {
  return async (path, init = {}) => {
    const response = await fetchImpl(`${API}${path}`, {
      ...init,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "localtry-release-report",
        ...(init.body ? { "content-type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });
    if (!response.ok)
      throw new Error(
        `GitHub ${path.split("?")[0]} returned ${response.status}`
      );
    return init.raw ? response.text() : response.json();
  };
}

export async function pullRequestForBranch({ repository, branch, call }) {
  const owner = repository.split("/")[0];
  const pulls = await call(
    `/repos/${repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${branch}`)}&per_page=1`
  );
  return pulls[0] || null;
}

/** Names the failed jobs and steps and includes the end of each failed log. */
export async function failureSummary({ repository, runId, call }) {
  const { jobs = [] } = await call(
    `/repos/${repository}/actions/runs/${runId}/jobs?filter=latest&per_page=50`
  );
  const failed = jobs.filter(job =>
    ["failure", "timed_out", "cancelled"].includes(job.conclusion)
  );
  const parts = [];
  for (const job of failed.slice(0, 3)) {
    const steps = (job.steps || [])
      .filter(step => ["failure", "timed_out"].includes(step.conclusion))
      .map(step => step.name);
    let log = "";
    try {
      log = await call(`/repos/${repository}/actions/jobs/${job.id}/logs`, {
        raw: true,
      });
    } catch {
      log = "(log unavailable)";
    }
    const budget = Math.floor(SUMMARY_LIMIT / Math.min(3, failed.length)) - 400;
    const tail = String(log)
      .replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z /gm, "")
      .slice(-budget);
    parts.push(
      `Job "${job.name}" failed${steps.length ? ` at: ${steps.join(", ")}` : ""}.\n${tail}`
    );
  }
  return (
    parts.join("\n\n") || "The CI run failed without a failed job record."
  ).slice(-SUMMARY_LIMIT);
}

/** Merged engineering pull requests contained in the deployed commit and not yet reported. */
export async function unreleasedPullRequests({ repository, call, contains }) {
  const pulls = await call(
    `/repos/${repository}/pulls?state=closed&sort=updated&direction=desc&per_page=100`
  );
  return pulls.filter(pull => {
    const labels = (pull.labels || []).map(label => label.name);
    return (
      pull.merged_at &&
      pull.merge_commit_sha &&
      labels.includes(ENGINEERING_LABEL) &&
      !labels.includes(RELEASED_LABEL) &&
      contains(pull.merge_commit_sha)
    );
  });
}

function gitContains(commit, head) {
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", commit, head], {
      stdio: "ignore",
    });
    return true;
  } catch {
    return false;
  }
}

function remoteMain() {
  return execFileSync("git", ["ls-remote", "origin", "refs/heads/main"], {
    encoding: "utf8",
  })
    .trim()
    .split(/\s+/)[0];
}

export async function run(command, env, deps = {}) {
  const repository = env.GITHUB_REPOSITORY;
  const call =
    deps.call || github({ token: env.GITHUB_TOKEN, fetchImpl: deps.fetchImpl });
  const post = payload =>
    (deps.signedPost || signedPost)({
      endpoint: env.LOCALTRY_RELEASE_ENDPOINT || DEFAULT_ENDPOINT,
      secret: env.ENGINEERING_RELEASE_SECRET,
      payload,
      fetchImpl: deps.fetchImpl,
    });
  const runUrl = `${env.GITHUB_SERVER_URL || "https://github.com"}/${repository}/actions/runs/${env.RUN_ID || env.GITHUB_RUN_ID}`;
  const log = deps.log || (message => process.stdout.write(`${message}\n`));

  if (command === "ci-report") {
    if (!String(env.HEAD_BRANCH || "").startsWith("engineering/")) {
      log("Not an engineering branch; nothing to report.");
      return null;
    }
    if (!["success", "failure", "timed_out"].includes(env.CONCLUSION)) {
      log(`CI concluded ${env.CONCLUSION}; nothing to report.`);
      return null;
    }
    const pull = await pullRequestForBranch({
      repository,
      branch: env.HEAD_BRANCH,
      call,
    });
    if (!pull || pull.head?.sha !== env.HEAD_SHA) {
      log(
        "The tested head is no longer the open pull request head; nothing to report."
      );
      return null;
    }
    const passed = env.CONCLUSION === "success";
    const payload = {
      event: passed ? "checks_passed" : "checks_failed",
      repository,
      pullRequests: [{ number: pull.number, headSha: env.HEAD_SHA }],
      runUrl,
      ...(passed
        ? {}
        : {
            summary: await failureSummary({
              repository,
              runId: env.RUN_ID,
              call,
            }),
          }),
    };
    await post(payload);
    log(`Reported ${payload.event} for #${pull.number}.`);
    return payload;
  }

  if (command === "deployed" || command === "deploy-failed") {
    const head = env.GITHUB_SHA;
    if (
      command === "deploy-failed" &&
      (deps.remoteMain || remoteMain)() !== head
    ) {
      log(
        "A newer commit is deploying; this run was superseded and is not reported."
      );
      return null;
    }
    const pulls = await unreleasedPullRequests({
      repository,
      call,
      contains: commit => (deps.contains || gitContains)(commit, head),
    });
    if (!pulls.length) {
      log("No unreleased engineering pull requests in this deployment.");
      return null;
    }
    const payload = {
      event: command === "deployed" ? "deployed" : "deploy_failed",
      repository,
      pullRequests: pulls.map(pull => ({ number: pull.number })),
      ...(command === "deployed" ? { commitSha: head } : {}),
      runUrl,
      ...(command === "deploy-failed"
        ? {
            summary: (() => {
              try {
                return (deps.readLog || (path => readFileSync(path, "utf8")))(
                  env.FAILURE_LOG
                ).slice(-SUMMARY_LIMIT);
              } catch {
                return "The deployment failed; see the workflow run for details.";
              }
            })(),
          }
        : {}),
    };
    await post(payload);
    if (command === "deployed")
      for (const pull of pulls)
        await call(`/repos/${repository}/issues/${pull.number}/labels`, {
          method: "POST",
          body: JSON.stringify({ labels: [RELEASED_LABEL] }),
        });
    log(
      `Reported ${payload.event} for ${pulls.map(pull => `#${pull.number}`).join(", ")}.`
    );
    return payload;
  }

  throw new Error(`Unknown command ${command}.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  run(process.argv[2], process.env).catch(error => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
