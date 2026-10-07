import assert from "node:assert/strict";
import test from "node:test";
import {
  ENGINEERING_LABEL,
  RELEASED_LABEL,
  failureSummary,
  run,
  sign,
  signedPost,
  unreleasedPullRequests,
} from "./engineering-release.mjs";

const repository = "acme/crm";
const HEAD = "a".repeat(40);
const env = {
  GITHUB_REPOSITORY: repository,
  GITHUB_TOKEN: "token",
  ENGINEERING_RELEASE_SECRET: "x".repeat(48),
  RUN_ID: "77",
  GITHUB_RUN_ID: "88",
  GITHUB_SHA: HEAD,
};

function githubCalls(routes) {
  const calls = [];
  const call = async (path, init = {}) => {
    calls.push({ path, init });
    const route = routes.find(([pattern]) => pattern.test(path));
    if (!route) throw new Error(`unexpected ${path}`);
    return route[1](path, init);
  };
  return { calls, call };
}

test("signed reports retry server errors but not rejections", async () => {
  let attempts = 0;
  const statuses = [503, 200];
  const result = await signedPost({
    secret: env.ENGINEERING_RELEASE_SECRET,
    payload: { event: "deployed" },
    sleep: async () => {},
    now: () => 1_800_000_000_000,
    fetchImpl: async (_url, init) => {
      attempts += 1;
      assert.equal(init.headers["x-localtry-release-timestamp"], "1800000000");
      assert.equal(
        init.headers["x-localtry-release-signature"],
        sign(env.ENGINEERING_RELEASE_SECRET, "1800000000", init.body)
      );
      return new Response('{"accepted":true}', { status: statuses.shift() });
    },
  });
  assert.deepEqual(result, { accepted: true });
  assert.equal(attempts, 2);
  let rejected = 0;
  await assert.rejects(
    signedPost({
      secret: env.ENGINEERING_RELEASE_SECRET,
      payload: {},
      sleep: async () => {},
      fetchImpl: async () => {
        rejected += 1;
        return new Response("bad", { status: 401 });
      },
    }),
    /rejected/
  );
  assert.equal(rejected, 1);
  await assert.rejects(
    signedPost({ secret: "short", payload: {} }),
    /not configured/
  );
});

test("CI results are reported only for the current head of an engineering pull request", async () => {
  const posts = [];
  const pull = { number: 42, head: { sha: HEAD } };
  const github = githubCalls([
    [/\/pulls\?state=open&head=acme%3Aengineering%2Fsupport-12/, () => [pull]],
    [
      /\/actions\/runs\/77\/jobs/,
      () => ({
        jobs: [
          {
            id: 5,
            name: "verify",
            conclusion: "failure",
            steps: [{ name: "Tests", conclusion: "failure" }],
          },
          { id: 6, name: "lint", conclusion: "success", steps: [] },
        ],
      }),
    ],
    [
      /\/actions\/jobs\/5\/logs/,
      () =>
        "2026-10-07T10:00:00.000Z FAIL api/x.test.ts\n2026-10-07T10:00:01.000Z expected 1 to be 2",
    ],
  ]);
  const deps = {
    call: github.call,
    signedPost: async ({ payload }) => posts.push(payload),
    log: () => {},
  };
  const base = {
    ...env,
    HEAD_BRANCH: "engineering/support-12",
    HEAD_SHA: HEAD,
  };

  await run("ci-report", { ...base, CONCLUSION: "success" }, deps);
  await run("ci-report", { ...base, CONCLUSION: "failure" }, deps);
  assert.deepEqual(posts[0], {
    event: "checks_passed",
    repository,
    pullRequests: [{ number: 42, headSha: HEAD }],
    runUrl: "https://github.com/acme/crm/actions/runs/77",
  });
  assert.equal(posts[1].event, "checks_failed");
  assert.match(posts[1].summary, /Job "verify" failed at: Tests/);
  assert.match(posts[1].summary, /FAIL api\/x\.test\.ts\nexpected 1 to be 2/);
  assert.doesNotMatch(posts[1].summary, /2026-10-07T/);

  assert.equal(
    await run("ci-report", { ...base, CONCLUSION: "cancelled" }, deps),
    null
  );
  assert.equal(
    await run(
      "ci-report",
      { ...base, HEAD_BRANCH: "feature/x", CONCLUSION: "success" },
      deps
    ),
    null
  );
  assert.equal(
    await run(
      "ci-report",
      { ...base, HEAD_SHA: "b".repeat(40), CONCLUSION: "success" },
      deps
    ),
    null
  );
  assert.equal(posts.length, 2);
});

test("deployments report merged, unreleased engineering pull requests contained in the deployed commit", async () => {
  const labels = names => names.map(name => ({ name }));
  const pulls = [
    {
      number: 1,
      merged_at: "x",
      merge_commit_sha: "1".repeat(40),
      labels: labels([ENGINEERING_LABEL]),
    },
    {
      number: 2,
      merged_at: "x",
      merge_commit_sha: "2".repeat(40),
      labels: labels([ENGINEERING_LABEL, RELEASED_LABEL]),
    },
    {
      number: 3,
      merged_at: null,
      merge_commit_sha: "3".repeat(40),
      labels: labels([ENGINEERING_LABEL]),
    },
    {
      number: 4,
      merged_at: "x",
      merge_commit_sha: "4".repeat(40),
      labels: labels([]),
    },
    {
      number: 5,
      merged_at: "x",
      merge_commit_sha: "5".repeat(40),
      labels: labels([ENGINEERING_LABEL]),
    },
  ];
  const contains = commit => commit !== "5".repeat(40);
  const github = githubCalls([
    [/\/pulls\?state=closed/, () => pulls],
    [/\/issues\/\d+\/labels/, () => []],
  ]);
  assert.deepEqual(
    (
      await unreleasedPullRequests({ repository, call: github.call, contains })
    ).map(pull => pull.number),
    [1]
  );
  const posts = [];
  const deps = {
    call: github.call,
    contains,
    signedPost: async ({ payload }) => posts.push(payload),
    log: () => {},
  };
  await run("deployed", env, deps);
  assert.deepEqual(posts[0], {
    event: "deployed",
    repository,
    pullRequests: [{ number: 1 }],
    commitSha: HEAD,
    runUrl: "https://github.com/acme/crm/actions/runs/77",
  });
  const labelled = github.calls.filter(item => item.path.endsWith("/labels"));
  assert.deepEqual(
    labelled.map(item => [item.path, JSON.parse(item.init.body)]),
    [["/repos/acme/crm/issues/1/labels", { labels: [RELEASED_LABEL] }]]
  );
});

test("a failed deploy is reported with its log unless a newer commit superseded it", async () => {
  const pulls = [
    {
      number: 9,
      merged_at: "x",
      merge_commit_sha: "9".repeat(40),
      labels: [{ name: ENGINEERING_LABEL }],
    },
  ];
  const github = githubCalls([[/\/pulls\?state=closed/, () => pulls]]);
  const posts = [];
  const deps = {
    call: github.call,
    contains: () => true,
    signedPost: async ({ payload }) => posts.push(payload),
    readLog: () => "x".repeat(20_000) + "wrangler: authentication error",
    log: () => {},
  };
  assert.equal(
    await run("deploy-failed", env, {
      ...deps,
      remoteMain: () => "c".repeat(40),
    }),
    null
  );
  await run(
    "deploy-failed",
    { ...env, FAILURE_LOG: "/tmp/log" },
    { ...deps, remoteMain: () => HEAD }
  );
  assert.equal(posts.length, 1);
  assert.equal(posts[0].event, "deploy_failed");
  assert.ok(posts[0].summary.endsWith("wrangler: authentication error"));
  assert.ok(posts[0].summary.length <= 12_000);
  assert.equal(posts[0].commitSha, undefined);
  assert.equal(
    github.calls.some(item => item.path.endsWith("/labels")),
    false
  );
});

test("failure summaries stay within the callback limit", async () => {
  const github = githubCalls([
    [
      /\/jobs\?/,
      () => ({
        jobs: [1, 2, 3, 4].map(id => ({
          id,
          name: `job ${id}`,
          conclusion: "failure",
          steps: [],
        })),
      }),
    ],
    [/\/logs$/, () => "y".repeat(50_000)],
  ]);
  const summary = await failureSummary({
    repository,
    runId: 1,
    call: github.call,
  });
  assert.ok(summary.length <= 12_000);
  assert.match(summary, /job 1/);
  assert.doesNotMatch(summary, /job 4/);
});
