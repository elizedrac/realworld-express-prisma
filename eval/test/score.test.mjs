// Tests for score.mjs using stub detectors. Run from the repo root:
//   node --test eval/test/*.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const evalDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  ".."
);
const repo = path.resolve(evalDir, "..");
const score = path.join(evalDir, "score.mjs");

const ANSWER = {
  conflict: true,
  confidence: 0.8,
  category: "build",
  involved_symbols: [],
  explanation: "stub",
};

// Each stub gets the refs on argv; "--a" is followed by branch A's name.
const STUBS = {
  "always-conflict": `console.log(JSON.stringify(${JSON.stringify(ANSWER)}));`,
  "never-conflict": `console.log(JSON.stringify({ ...${JSON.stringify(
    ANSWER
  )}, conflict: false, category: null }));`,
  // Flags only rw-001 and rw-003, labeled conflict (test) and no_conflict.
  picky: `const a = process.argv[process.argv.indexOf("--a") + 1];
const hit = ["rw-001-a", "rw-003-a"].includes(a);
console.log(JSON.stringify({ ...${JSON.stringify(
    ANSWER
  )}, conflict: hit, category: hit ? "test" : null, cost_usd: 0.5 }));`,
  crashes: `process.exit(3);`,
  "bad-shape": `console.log(JSON.stringify({ conflict: "yes" }));`,
};

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "score-test-"));
  const detectors = path.join(dir, "detectors");
  for (const [name, source] of Object.entries(STUBS)) {
    fs.mkdirSync(path.join(detectors, name), { recursive: true });
    fs.writeFileSync(path.join(detectors, name, "detect.mjs"), source);
  }
  const cases = path.join(dir, "cases.jsonl");
  const rows = [
    { id: "rw-001", type: "test", label: "conflict" },
    { id: "rw-002", type: "build", label: "conflict" },
    { id: "rw-003", type: "negative", label: "no_conflict" },
    { id: "rw-017", type: "negative", label: "no_conflict" },
  ].map((c) => ({
    ...c,
    base: "eval-base-v2",
    branch_a: `${c.id}-a`,
    branch_b: `${c.id}-b`,
  }));
  fs.writeFileSync(cases, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return { dir, detectors, cases, out: path.join(dir, "out") };
}

function runScore(env, detectorNames) {
  const res = spawnSync(
    process.execPath,
    [
      score,
      "--repo",
      repo,
      "--cases",
      env.cases,
      "--detectors-dir",
      env.detectors,
      "--out",
      env.out,
      ...detectorNames.flatMap((d) => ["--detector", d]),
    ],
    { encoding: "utf8" }
  );
  return res;
}

function summary(env, name) {
  return JSON.parse(fs.readFileSync(path.join(env.out, `${name}.json`), "utf8"))
    .summary;
}

test("always-conflict catches everything and flags every negative", () => {
  const env = setup();
  assert.equal(runScore(env, ["always-conflict"]).status, 0);
  const s = summary(env, "always-conflict");
  assert.equal(s.true_positives, 2);
  assert.equal(s.false_negatives, 0);
  assert.equal(s.false_positives, 2);
  assert.equal(s.recall, 1);
  assert.equal(s.precision, 0.5);
  assert.deepEqual(s.false_alarms, ["rw-003", "rw-017"]);
  // It always says "build", so only rw-002's category is right.
  assert.equal(s.category_accuracy, 0.5);
  fs.rmSync(env.dir, { recursive: true, force: true });
});

test("never-conflict misses every conflict and has no precision", () => {
  const env = setup();
  assert.equal(runScore(env, ["never-conflict"]).status, 0);
  const s = summary(env, "never-conflict");
  assert.equal(s.recall, 0);
  assert.equal(s.precision, null);
  assert.deepEqual(s.missed, ["rw-001", "rw-002"]);
  assert.equal(s.true_negatives, 2);
  fs.rmSync(env.dir, { recursive: true, force: true });
});

test("counts each outcome, by type, and sums cost", () => {
  const env = setup();
  assert.equal(runScore(env, ["picky"]).status, 0);
  const s = summary(env, "picky");
  assert.equal(s.true_positives, 1);
  assert.equal(s.false_negatives, 1);
  assert.equal(s.false_positives, 1);
  assert.equal(s.true_negatives, 1);
  assert.deepEqual(s.missed, ["rw-002"]);
  assert.deepEqual(s.false_alarms, ["rw-003"]);
  assert.equal(s.category_accuracy, 1);
  assert.deepEqual(s.by_type, {
    test: { total: 1, correct: 1 },
    build: { total: 1, correct: 0 },
    negative: { total: 2, correct: 1 },
  });
  assert.equal(s.total_cost_usd, 2);
  fs.rmSync(env.dir, { recursive: true, force: true });
});

test("crashes and malformed output are errors that count as no conflict", () => {
  const env = setup();
  assert.equal(runScore(env, ["crashes", "bad-shape"]).status, 0);
  for (const name of ["crashes", "bad-shape"]) {
    const s = summary(env, name);
    assert.equal(s.errors, 4);
    assert.equal(s.true_positives, 0);
    assert.equal(s.false_positives, 0);
    assert.deepEqual(s.missed, ["rw-001", "rw-002"]);
  }
  fs.rmSync(env.dir, { recursive: true, force: true });
});

test("rejects a detector that does not exist", () => {
  const env = setup();
  const res = runScore(env, ["nope"]);
  assert.equal(res.status, 2);
  assert.match(res.stderr, /no detector at/);
  fs.rmSync(env.dir, { recursive: true, force: true });
});
