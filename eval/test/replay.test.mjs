// Tests for replay.mjs against the real case branches. Run from the repo root:
//   node --test eval/test/*.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";

const evalDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);
const repo = path.resolve(evalDir, "..");
const replay = path.join(evalDir, "replay.mjs");
const cases = path.join(evalDir, "cases.jsonl");
const rw001 = fs
  .readFileSync(cases, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l))
  .find((c) => c.id === "rw-001");

function git(args, cwd = repo) {
  const res = spawnSync("git", args, { cwd, encoding: "utf8" });
  assert.equal(res.status, 0, res.stderr);
  return res.stdout.trim();
}

function remoteMain(remote) {
  const out = spawnSync("git", ["ls-remote", remote, "refs/heads/main"], {
    encoding: "utf8",
  });
  return out.stdout.split("\t")[0] || null;
}

function readLog(file) {
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function runReplay(extraArgs) {
  return spawn(
    process.execPath,
    [replay, "--repo", repo, "--cases", cases, ...extraArgs],
    {
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}

function exited(child) {
  return new Promise((resolve) => child.on("exit", (code) => resolve(code)));
}

function tempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "replay-test-"));
}

test("pushes the teammate commit after the delay, which a polling service can see", async () => {
  const dir = tempDir();
  const remote = path.join(dir, "remote.git");
  const log = path.join(dir, "log.jsonl");
  const baseSha = git(["rev-parse", `${rw001.base}^{commit}`]);
  const teammateSha = git(["rev-parse", rw001.branch_b]);

  const child = runReplay([
    "--case",
    "rw-001",
    "--remote",
    remote,
    "--delay",
    "2",
    "--interval",
    "0",
    "--log",
    log,
  ]);
  const done = exited(child);

  // A stand-in for the service: poll the remote and note when main moves.
  const seen = [];
  let finished = false;
  done.then(() => (finished = true));
  while (!finished) {
    const sha = remoteMain(remote);
    if (sha && seen.at(-1)?.sha !== sha) seen.push({ sha, at: Date.now() });
    await sleep(100);
  }
  const sha = remoteMain(remote);
  if (seen.at(-1)?.sha !== sha) seen.push({ sha, at: Date.now() });

  assert.equal(await done, 0);
  assert.deepEqual(
    seen.map((s) => s.sha),
    [baseSha, teammateSha]
  );

  const events = readLog(log);
  assert.deepEqual(
    events.map((e) => e.event),
    ["reset", "teammate_push", "done"]
  );
  const [reset, push] = events;
  assert.equal(reset.sha, baseSha);
  assert.equal(push.sha, teammateSha);
  assert.equal(push.branch, rw001.branch_b);
  assert.ok(
    Date.parse(push.t) - Date.parse(reset.t) >= 2000,
    "push waited for --delay"
  );
  assert.ok(
    seen[1].at >= Date.parse(push.t),
    "the service saw main move only after the logged push"
  );

  fs.rmSync(dir, { recursive: true, force: true });
});

test("--teammate a pushes side A instead", async () => {
  const dir = tempDir();
  const remote = path.join(dir, "remote.git");
  const log = path.join(dir, "log.jsonl");
  const child = runReplay([
    "--case",
    "rw-001",
    "--remote",
    remote,
    "--teammate",
    "a",
    "--delay",
    "0",
    "--interval",
    "0",
    "--log",
    log,
  ]);
  assert.equal(await exited(child), 0);
  assert.equal(remoteMain(remote), git(["rev-parse", rw001.branch_a]));
  const push = readLog(log).find((e) => e.event === "teammate_push");
  assert.equal(push.branch, rw001.branch_a);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("refuses to push to a directory it did not create", async () => {
  const dir = tempDir();
  const notOurs = path.join(dir, "someone-elses.git");
  git(["init", "--bare", "--quiet", notOurs], dir);
  const child = runReplay([
    "--case",
    "rw-001",
    "--remote",
    notOurs,
    "--delay",
    "0",
  ]);
  let stderr = "";
  child.stderr.on("data", (d) => (stderr += d));
  assert.equal(await exited(child), 2);
  assert.match(stderr, /not a scratch remote made by replay\.mjs/);
  assert.equal(remoteMain(notOurs), null, "nothing was pushed");
  fs.rmSync(dir, { recursive: true, force: true });
});

test("rejects an unknown case", async () => {
  const dir = tempDir();
  const child = runReplay([
    "--case",
    "rw-999",
    "--remote",
    path.join(dir, "r.git"),
  ]);
  assert.equal(await exited(child), 2);
  assert.equal(
    fs.existsSync(path.join(dir, "r.git")),
    false,
    "no remote was created"
  );
  fs.rmSync(dir, { recursive: true, force: true });
});
