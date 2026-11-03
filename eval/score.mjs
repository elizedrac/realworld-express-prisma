#!/usr/bin/env node
// Scores conflict detectors against the labeled cases.
//
// Each detector lives in detectors/<name>/detect.mjs. For every case it is run
// with the repo, the case's refs and the agent's task (intent_a; A is the
// agent's side), never the label, type, explanation or involved symbols, and
// must print one JSON object on stdout:
//
//   { "conflict": true, "confidence": 0.9, "category": "build",
//     "involved_symbols": ["articlesListPrisma"], "explanation": "..." }
//
// Optionally it may add "cost_usd" and "timings" (seconds per stage). A detector that exits non-zero, times out
// or prints anything else is recorded as an error and counted as answering
// "no conflict", so a crash can never improve its score.
//
// Usage:
//   node score.mjs --repo <path> --cases <cases.jsonl> --detector <name> [--detector <name>]...
//                  [--case <id>]... [--target <target.json>] [--timeout 900]
//                  [--after <name>] [--runs 1]
//
// Options:
//   --detectors-dir <dir> where detectors live (default: ./detectors next to this script)
//   --out <dir>           where scores are written (default: ./results/scores)
//   --target <file>       passed through to detectors that need the repo's commands
//   --after <name>        second stage: run only on the cases <name> did not flag,
//                         using its saved scores, and also score the whole
//                         pipeline (<name>, then this detector) on every case
//   --runs <n>            run each detector n times; scores are pooled across runs

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const CATEGORIES = ["textual", "build", "test", "runtime", "intent"];

const { values: args } = parseArgs({
  options: {
    repo: { type: "string" },
    cases: { type: "string" },
    detector: { type: "string", multiple: true },
    case: { type: "string", multiple: true },
    target: { type: "string" },
    timeout: { type: "string", default: "900" },
    "detectors-dir": { type: "string" },
    out: { type: "string" },
    after: { type: "string" },
    runs: { type: "string", default: "1" },
  },
});

function fail(message) {
  console.error(`score: ${message}`);
  process.exit(2);
}

if (!args.repo || !args.cases || !args.detector?.length)
  fail("--repo, --cases and at least one --detector are required");
const timeoutSeconds = Number(args.timeout);
if (!(timeoutSeconds > 0)) fail("--timeout must be a positive number");
const runs = Number(args.runs);
if (!Number.isInteger(runs) || runs < 1)
  fail("--runs must be a positive integer");

const evalDir = path.dirname(new URL(import.meta.url).pathname);
const repo = path.resolve(args.repo);
const detectorsDir = path.resolve(
  args["detectors-dir"] ?? path.join(evalDir, "detectors")
);
const outDir = path.resolve(
  args.out ?? path.join(evalDir, "results", "scores")
);
const target = args.target ? path.resolve(args.target) : null;

let cases = fs
  .readFileSync(args.cases, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));
if (args.case?.length) cases = cases.filter((c) => args.case.includes(c.id));
if (cases.length === 0) fail("no matching cases");

// With --after, the first stage's saved rows decide which cases reach this one.
let firstStage = null;
if (args.after) {
  const file = path.join(outDir, `${args.after}.json`);
  if (!fs.existsSync(file))
    fail(`no saved scores for ${args.after} at ${file}; score it first`);
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  if ((saved.runs?.length ?? 1) !== 1)
    fail(`${args.after} must be scored with a single run to be a first stage`);
  firstStage = new Map(saved.rows.map((row) => [row.id, row]));
  for (const c of cases) {
    const row = firstStage.get(c.id);
    if (!row) fail(`${args.after} has no saved result for ${c.id}`);
    if (row.error) fail(`${args.after} errored on ${c.id}; rescore it first`);
  }
}

for (const name of args.detector) {
  if (!fs.existsSync(path.join(detectorsDir, name, "detect.mjs")))
    fail(`no detector at ${path.join(detectorsDir, name, "detect.mjs")}`);
}

// ---------- running a detector ----------

// Returns the parsed answer, or an error string if the output breaks the contract.
function validate(answer) {
  if (typeof answer !== "object" || answer === null || Array.isArray(answer))
    return "output is not a JSON object";
  if (typeof answer.conflict !== "boolean") return "conflict must be a boolean";
  if (
    typeof answer.confidence !== "number" ||
    answer.confidence < 0 ||
    answer.confidence > 1
  )
    return "confidence must be a number from 0 to 1";
  if (answer.conflict && !CATEGORIES.includes(answer.category))
    return `category must be one of ${CATEGORIES.join(
      ", "
    )} when conflict is true`;
  if (
    !Array.isArray(answer.involved_symbols) ||
    !answer.involved_symbols.every((s) => typeof s === "string")
  )
    return "involved_symbols must be an array of strings";
  if (typeof answer.explanation !== "string")
    return "explanation must be a string";
  if (answer.cost_usd !== undefined && typeof answer.cost_usd !== "number")
    return "cost_usd must be a number when given";
  return null;
}

function runDetector(name, testCase) {
  const detectArgs = [
    path.join(detectorsDir, name, "detect.mjs"),
    "--repo",
    repo,
    "--base",
    testCase.base,
    "--a",
    testCase.branch_a,
    "--b",
    testCase.branch_b,
  ];
  if (testCase.intent_a) detectArgs.push("--task", testCase.intent_a);
  if (target) detectArgs.push("--target", target);
  const started = Date.now();
  const res = spawnSync(process.execPath, detectArgs, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    timeout: timeoutSeconds * 1000,
  });
  const seconds = Math.round((Date.now() - started) / 100) / 10;
  const stderrTail = (res.stderr ?? "").split("\n").slice(-20).join("\n");

  if (res.error?.code === "ETIMEDOUT")
    return { seconds, error: `timed out after ${timeoutSeconds}s`, stderrTail };
  if (res.status !== 0)
    return {
      seconds,
      error: `exited with ${res.status ?? res.signal}`,
      stderrTail,
    };
  let answer;
  try {
    answer = JSON.parse(res.stdout);
  } catch {
    return { seconds, error: "stdout is not valid JSON", stderrTail };
  }
  const problem = validate(answer);
  if (problem) return { seconds, error: problem, stderrTail };
  return { seconds, answer };
}

// ---------- scoring ----------

function outcome(testCase, predictedConflict) {
  const actual = testCase.label === "conflict";
  if (actual && predictedConflict) return "true_positive";
  if (actual && !predictedConflict) return "false_negative";
  if (!actual && predictedConflict) return "false_positive";
  return "true_negative";
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function summarize(rows) {
  const count = (o) => rows.filter((r) => r.outcome === o).length;
  const tp = count("true_positive");
  const fn = count("false_negative");
  const fp = count("false_positive");
  const tn = count("true_negative");

  const byType = {};
  for (const row of rows) {
    const t = (byType[row.type] ??= { total: 0, correct: 0 });
    t.total += 1;
    if (row.outcome === "true_positive" || row.outcome === "true_negative")
      t.correct += 1;
  }

  const caught = rows.filter((r) => r.outcome === "true_positive");
  const seconds = rows.map((r) => r.seconds).sort((x, y) => x - y);
  const categoryCorrect = caught.filter((r) => r.category === r.type).length;
  const costs = rows.map((r) => r.cost_usd).filter((c) => c !== undefined);

  return {
    true_positives: tp,
    false_negatives: fn,
    false_positives: fp,
    true_negatives: tn,
    errors: rows.filter((r) => r.error).length,
    recall: ratio(tp, tp + fn),
    precision: ratio(tp, tp + fp),
    category_accuracy: ratio(categoryCorrect, caught.length),
    by_type: byType,
    missed: ids(rows.filter((r) => r.outcome === "false_negative")),
    false_alarms: ids(rows.filter((r) => r.outcome === "false_positive")),
    errored: ids(rows.filter((r) => r.error)),
    total_seconds:
      Math.round(rows.reduce((s, r) => s + r.seconds, 0) * 10) / 10,
    median_seconds: seconds.length
      ? seconds[Math.floor((seconds.length - 1) / 2)]
      : null,
    max_seconds: seconds.length ? seconds.at(-1) : null,
    total_cost_usd: costs.length ? costs.reduce((s, c) => s + c, 0) : null,
  };
}

// Case IDs in order, each once; with several runs, "rw-011 x2" if it happened
// in two of them.
function ids(rows) {
  const counts = new Map();
  for (const row of rows) counts.set(row.id, (counts.get(row.id) ?? 0) + 1);
  return [...counts]
    .sort(([x], [y]) => x.localeCompare(y))
    .map(([id, n]) => (n > 1 ? `${id} x${n}` : id));
}

function percent(value) {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`;
}

function printSummary(name, s) {
  console.log(`\n== ${name}`);
  console.log(
    `   recall ${percent(s.recall)}  precision ${percent(
      s.precision
    )}  category ${percent(s.category_accuracy)}`
  );
  console.log(
    `   TP ${s.true_positives}  FN ${s.false_negatives}  FP ${s.false_positives}  TN ${s.true_negatives}  errors ${s.errors}`
  );
  console.log(
    `   by type: ${Object.entries(s.by_type)
      .map(([t, v]) => `${t} ${v.correct}/${v.total}`)
      .join(", ")}`
  );
  if (s.missed.length) console.log(`   missed: ${s.missed.join(", ")}`);
  if (s.false_alarms.length)
    console.log(`   false alarms: ${s.false_alarms.join(", ")}`);
  if (s.errored.length) console.log(`   errored: ${s.errored.join(", ")}`);
  console.log(
    `   time ${s.total_seconds}s total, ${s.median_seconds}s median, ${
      s.max_seconds
    }s max per case${
      s.total_cost_usd === null ? "" : `  cost $${s.total_cost_usd.toFixed(4)}`
    }`
  );
}

// ---------- main ----------

fs.mkdirSync(outDir, { recursive: true });

function scoreCase(name, testCase, run) {
  const result = runDetector(name, testCase);
  const predicted = result.answer?.conflict ?? false;
  const row = {
    id: testCase.id,
    type: testCase.type,
    label: testCase.label,
    run,
    predicted_conflict: predicted,
    outcome: outcome(testCase, predicted),
    seconds: result.seconds,
  };
  if (result.answer) {
    Object.assign(row, {
      confidence: result.answer.confidence,
      category: result.answer.category ?? null,
      involved_symbols: result.answer.involved_symbols,
      explanation: result.answer.explanation,
    });
    for (const field of ["cost_usd", "timings", "usage"])
      if (result.answer[field] !== undefined) row[field] = result.answer[field];
  } else {
    Object.assign(row, { error: result.error, stderr: result.stderrTail });
  }
  console.log(
    `   ${testCase.id} [${testCase.type}] ${row.outcome}${
      row.error ? ` (error: ${row.error})` : ""
    }`
  );
  return row;
}

// One pipeline row per case: the first stage's answer if it flagged the case,
// otherwise this stage's, with both stages' time and cost added up.
function pipelineRows(stageRows) {
  return stageRows.flatMap(({ run, rows }) => {
    const byId = new Map(rows.map((row) => [row.id, row]));
    return cases.map((c) => {
      const first = firstStage.get(c.id);
      const second = byId.get(c.id);
      if (!second) return { ...first, run };
      const cost = (first.cost_usd ?? 0) + (second.cost_usd ?? 0);
      return {
        ...second,
        seconds: Math.round((first.seconds + second.seconds) * 10) / 10,
        ...(first.cost_usd !== undefined || second.cost_usd !== undefined
          ? { cost_usd: cost }
          : {}),
      };
    });
  });
}

const stageCases = firstStage
  ? cases.filter((c) => !firstStage.get(c.id).predicted_conflict)
  : cases;

for (const name of args.detector) {
  const perRun = [];
  for (let run = 1; run <= runs; run++) {
    console.log(
      `\nRunning ${name} on ${stageCases.length} cases${
        firstStage ? ` (those ${args.after} did not flag)` : ""
      }${runs > 1 ? `, run ${run}/${runs}` : ""}`
    );
    perRun.push({
      run,
      rows: stageCases.map((testCase) => scoreCase(name, testCase, run)),
    });
  }
  const rows = perRun.flatMap((r) => r.rows);
  const summary = summarize(rows);
  printSummary(firstStage ? `${name} (stage 2 only)` : name, summary);
  if (runs > 1) {
    for (const r of perRun) {
      const s = summarize(r.rows);
      console.log(
        `   run ${r.run}: recall ${percent(s.recall)}  precision ${percent(
          s.precision
        )}  FN ${s.false_negatives}  FP ${s.false_positives}`
      );
    }
  }

  let pipeline = null;
  if (firstStage) {
    pipeline = summarize(pipelineRows(perRun));
    printSummary(`${args.after} -> ${name} (whole pipeline)`, pipeline);
  }

  fs.writeFileSync(
    path.join(outDir, `${name}.json`),
    JSON.stringify(
      {
        detector: name,
        scored_at: new Date().toISOString(),
        after: args.after ?? null,
        cases: stageCases.length,
        runs: perRun.map((r) => ({ run: r.run, summary: summarize(r.rows) })),
        summary,
        pipeline,
        rows,
      },
      null,
      2
    ) + "\n"
  );
}

console.log(`\nScores in ${outDir}`);
