#!/usr/bin/env node
// Test-only: replays one side of a case as a teammate pushing to main.
//
// 1. Resets a local scratch remote so its main is at the case's base.
// 2. After --delay seconds, pushes the teammate branch's commits to the
//    scratch main one at a time, --interval seconds apart.
// The reset and each push are appended to a JSON-lines log with timestamps, so
// an eval can compare them with when a detector flagged the conflict.
//
// The scratch remote is always a local bare repo that this script created
// (it carries a marker file). It refuses to push anywhere else.
//
// Usage:
//   node replay.mjs --repo <path> --cases <cases.jsonl> --case <id> --remote <dir>
//                   [--teammate b] [--delay 120] [--interval 30]
//                   [--log <file>]

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

const MARKER = "conflict-replay-remote";

const { values: args } = parseArgs({
  options: {
    repo: { type: "string" },
    cases: { type: "string" },
    case: { type: "string" },
    remote: { type: "string" },
    teammate: { type: "string", default: "b" },
    delay: { type: "string", default: "120" },
    interval: { type: "string", default: "30" },
    log: { type: "string" },
  },
});

function fail(message) {
  console.error(`replay: ${message}`);
  process.exit(2);
}

if (!args.repo || !args.cases || !args.case || !args.remote)
  fail("--repo, --cases, --case and --remote are required");
if (!["a", "b"].includes(args.teammate)) fail("--teammate must be a or b");
const delaySeconds = Number(args.delay);
const intervalSeconds = Number(args.interval);
if (!(delaySeconds >= 0) || !(intervalSeconds >= 0))
  fail("--delay and --interval must be non-negative numbers");

const repo = path.resolve(args.repo);
const remote = path.resolve(args.remote);
const logPath = path.resolve(args.log ?? path.join(remote, "replay-log.jsonl"));

const testCase = fs
  .readFileSync(args.cases, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))
  .find((c) => c.id === args.case);
if (!testCase) fail(`case ${args.case} not found in ${args.cases}`);

const teammateBranch = testCase[`branch_${args.teammate}`];

// ---------- helpers ----------

function git(gitArgs, cwd = repo) {
  const res = spawnSync("git", gitArgs, { cwd, encoding: "utf8" });
  if (res.status !== 0)
    fail(`git ${gitArgs.join(" ")} failed in ${cwd}:\n${res.stderr.trim()}`);
  return res.stdout.trim();
}

function logEvent(event, fields = {}) {
  const row = {
    t: new Date().toISOString(),
    case: testCase.id,
    event,
    ...fields,
  };
  fs.appendFileSync(logPath, JSON.stringify(row) + "\n");
  console.log(
    `[${row.t}] ${event}${fields.sha ? ` ${fields.sha.slice(0, 7)}` : ""}${
      fields.subject ? ` ${fields.subject}` : ""
    }`
  );
}

// Creates the scratch remote, or confirms an existing directory is one we made.
function ensureScratchRemote() {
  if (fs.existsSync(remote)) {
    if (!fs.existsSync(path.join(remote, MARKER)))
      fail(
        `${remote} exists but is not a scratch remote made by replay.mjs; refusing to push to it`
      );
    return;
  }
  fs.mkdirSync(remote, { recursive: true });
  git(["init", "--bare", "--quiet", "--initial-branch=main", remote], remote);
  fs.writeFileSync(
    path.join(remote, MARKER),
    "Scratch remote for replay.mjs. Safe to delete.\n"
  );
}

// ---------- main ----------

const baseSha = git(["rev-parse", `${testCase.base}^{commit}`]);
const commits = git([
  "rev-list",
  "--reverse",
  `${testCase.base}..${teammateBranch}`,
])
  .split("\n")
  .filter(Boolean);
if (commits.length === 0)
  fail(`${teammateBranch} has no commits on top of ${testCase.base}`);

ensureScratchRemote();
fs.rmSync(logPath, { force: true });

git(["push", "--quiet", "--force", remote, `${baseSha}:refs/heads/main`]);
logEvent("reset", { sha: baseSha, base: testCase.base, remote });

await sleep(delaySeconds * 1000);
for (const [index, sha] of commits.entries()) {
  if (index > 0) await sleep(intervalSeconds * 1000);
  git(["push", "--quiet", remote, `${sha}:refs/heads/main`]);
  const subject = git(["log", "-1", "--format=%s", sha]);
  logEvent("teammate_push", {
    sha,
    subject,
    side: args.teammate,
    branch: teammateBranch,
  });
}
logEvent("done");
