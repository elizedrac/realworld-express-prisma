#!/usr/bin/env node
// Verifies seeded conflict pairs against a target repo.
//
// For each pair (base, A, B) it checks out base, A, B and the merge of A into B
// in a dedicated git worktree, runs the target's typecheck and test commands on
// each, and records what the merge actually does: textual conflict, type error,
// test failure, or nothing. The observed result is compared with the expected
// label in cases.jsonl.
//
// Usage:
//   node verify.mjs --repo <path> --target <target.json> --cases <cases.jsonl> [--case <id>]...
//   node verify.mjs --repo <path> --target <target.json> --base <ref> --a <branch> --b <branch> [--id <id>]
//
// Options:
//   --out <dir>          results directory (default: ./results next to this script)
//   --workdir <dir>      where the worktree lives (default: OS temp dir)
//   --path-prepend <dir> directory prepended to PATH for all commands (e.g. a pinned node)

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";

const LOG_TAIL_LINES = 150;
const MANIFEST_ORDER = [
  "textual",
  "type_error",
  "test_failure",
  "oracle_failure",
];

const { values: args } = parseArgs({
  options: {
    repo: { type: "string" },
    target: { type: "string" },
    cases: { type: "string" },
    case: { type: "string", multiple: true },
    base: { type: "string" },
    a: { type: "string" },
    b: { type: "string" },
    id: { type: "string" },
    out: { type: "string" },
    workdir: { type: "string" },
    "path-prepend": { type: "string" },
  },
});

function fail(message) {
  console.error(`verify: ${message}`);
  process.exit(2);
}

if (!args.repo || !args.target) fail("--repo and --target are required");
if (!args.cases && !(args.base && args.a && args.b))
  fail("give either --cases or all of --base, --a, --b");

const repo = path.resolve(args.repo);
const target = JSON.parse(fs.readFileSync(args.target, "utf8"));
const outDir = path.resolve(
  args.out ??
    path.join(path.dirname(new URL(import.meta.url).pathname), "results")
);
const workdir = path.resolve(
  args.workdir ?? path.join(os.tmpdir(), "conflict-verify", path.basename(repo))
);
const env = { ...process.env, ...(target.env ?? {}) };
if (args["path-prepend"]) env.PATH = `${args["path-prepend"]}:${env.PATH}`;

// ---------- shell helpers ----------

function run(cmd, cwd, { timeoutMs } = {}) {
  const started = Date.now();
  const res = spawnSync(cmd, {
    cwd,
    env,
    shell: "/bin/bash",
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    timeout: timeoutMs ?? (target.timeout_seconds ?? 900) * 1000,
  });
  killStragglers();
  return {
    exit: res.status ?? (res.signal ? 124 : 1),
    output: `${res.stdout ?? ""}${res.stderr ?? ""}`,
    seconds: Math.round((Date.now() - started) / 100) / 10,
  };
}

// A timeout only kills the shell, not what it started. Anything still running
// from the worktree's own tools (e.g. a test runner that never exited) would
// keep using shared resources such as the test database, so kill it.
function killStragglers() {
  const pattern = `${workdir}/node_modules`;
  const found = spawnSync("pgrep", ["-f", pattern], { encoding: "utf8" });
  const pids = (found.stdout ?? "")
    .split("\n")
    .map(Number)
    .filter((pid) => pid && pid !== process.pid);
  for (const pid of pids) {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // already gone
    }
  }
}

function git(gitArgs, cwd = repo) {
  const res = run(`git ${gitArgs}`, cwd);
  return { ...res, out: res.output.trim() };
}

function gitOk(gitArgs, cwd = repo) {
  const res = git(gitArgs, cwd);
  if (res.exit !== 0) fail(`git ${gitArgs} failed in ${cwd}:\n${res.out}`);
  return res.out;
}

function tail(text) {
  return text.split("\n").slice(-LOG_TAIL_LINES).join("\n");
}

// ---------- worktree ----------

function ensureWorktree() {
  const listed = gitOk("worktree list --porcelain");
  const known = listed
    .split("\n")
    .some((line) => line === `worktree ${workdir}`);
  if (known && fs.existsSync(workdir)) return;
  if (known) gitOk("worktree prune");
  fs.mkdirSync(path.dirname(workdir), { recursive: true });
  gitOk(`worktree add --detach "${workdir}" HEAD`);
}

function checkout(ref) {
  git("merge --abort", workdir);
  gitOk("reset --hard -q", workdir);
  gitOk(`clean -fdq ${cleanExcludes()}`, workdir);
  gitOk(`checkout -q --detach ${ref}`, workdir);
}

function cleanExcludes() {
  return (target.keep_between_checkouts ?? [])
    .map((p) => `-e "${p}"`)
    .join(" ");
}

// Setup is a list of steps, each re-run only when its input files change, so a
// schema change regenerates the client without reinstalling every package.
// Once a step runs, every later step runs too, since it may depend on it.
// A plain string setup with setup_inputs is treated as a single step.
function setupSteps() {
  if (!target.setup) return [];
  if (Array.isArray(target.setup)) return target.setup;
  return [{ run: target.setup, inputs: target.setup_inputs }];
}

function inputsDigest(inputs) {
  const hash = createHash("sha256");
  for (const file of inputs) {
    const p = path.join(workdir, file);
    hash.update(file);
    hash.update(fs.existsSync(p) ? fs.readFileSync(p) : "<missing>");
  }
  return hash.digest("hex");
}

function setupIfNeeded() {
  const steps = setupSteps();
  if (steps.length === 0) return null;
  const result = { skipped: true, ok: true, seconds: 0, steps: [] };
  let rerunRest = false;
  for (const [index, step] of steps.entries()) {
    const hashFile = `${workdir}.setup-hash-${index}`;
    const digest = step.inputs ? inputsDigest(step.inputs) : null;
    const previous = fs.existsSync(hashFile)
      ? fs.readFileSync(hashFile, "utf8")
      : null;
    if (!rerunRest && digest !== null && previous === digest) {
      result.steps.push({ run: step.run, skipped: true });
      continue;
    }
    rerunRest = true;
    result.skipped = false;
    const res = run(step.run, workdir);
    result.seconds += res.seconds;
    const ok = res.exit === 0;
    result.steps.push({
      run: step.run,
      skipped: false,
      ok,
      exit: res.exit,
      seconds: res.seconds,
    });
    if (ok && digest !== null) fs.writeFileSync(hashFile, digest);
    else fs.rmSync(hashFile, { force: true });
    if (!ok) {
      // Force every step to run again next time, since this one left things half done.
      for (let i = index + 1; i < steps.length; i++)
        fs.rmSync(`${workdir}.setup-hash-${i}`, { force: true });
      Object.assign(result, {
        ok: false,
        exit: res.exit,
        log: tail(res.output),
      });
      return result;
    }
  }
  return result;
}

// ---------- checks ----------

function parseTestReport(reportPath) {
  if (target.test_report !== "jest-json" || !fs.existsSync(reportPath))
    return null;
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const failed = [];
  for (const file of report.testResults ?? []) {
    const rel = path.relative(workdir, file.name);
    const failedAssertions = (file.assertionResults ?? []).filter(
      (t) => t.status === "failed"
    );
    if (failedAssertions.length === 0 && file.status === "failed") {
      failed.push({
        file: rel,
        test: null,
        message: tail(file.message ?? "").slice(0, 2000),
      });
    }
    for (const t of failedAssertions) {
      failed.push({
        file: rel,
        test: t.fullName,
        message: (t.failureMessages ?? [])
          .join("\n")
          .split("\n")
          .slice(0, 8)
          .join("\n"),
      });
    }
  }
  return {
    total: report.numTotalTests,
    failed_count: report.numFailedTests,
    failed_suites: report.numFailedTestSuites,
    failed,
  };
}

function runChecks() {
  const result = {};
  const setup = setupIfNeeded();
  if (setup) result.setup = setup;
  if (setup && setup.skipped === false && !setup.ok) {
    result.ok = false;
    return result;
  }

  const tc = run(target.typecheck, workdir);
  result.typecheck = { ok: tc.exit === 0, exit: tc.exit, seconds: tc.seconds };
  if (tc.exit !== 0) result.typecheck.log = tail(tc.output);

  const reportPath = path.join(
    os.tmpdir(),
    `conflict-verify-report-${process.pid}.json`
  );
  fs.rmSync(reportPath, { force: true });
  const testCmd = target.test.replaceAll("{report}", reportPath);
  const tests = run(testCmd, workdir);
  result.test = {
    ok: tests.exit === 0,
    exit: tests.exit,
    seconds: tests.seconds,
  };
  const parsed = parseTestReport(reportPath);
  if (parsed) Object.assign(result.test, parsed);
  if (tests.exit !== 0 && !parsed) result.test.log = tail(tests.output);
  fs.rmSync(reportPath, { force: true });

  result.ok = result.typecheck.ok && result.test.ok;
  return result;
}

// Oracle tests live outside the target repo (eval/cases/<id>/oracle/). They are
// copied into the worktree only while the oracle command runs, so they never
// count toward the repo's own test results.
function runOracle(oracleDir) {
  if (!oracleDir) return null;
  if (!target.oracle)
    fail("case has an oracle but the target config has no 'oracle' section");
  const dest = path.join(workdir, target.oracle.dir);
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(oracleDir, dest, { recursive: true });
  const reportPath = path.join(
    os.tmpdir(),
    `conflict-verify-oracle-${process.pid}.json`
  );
  fs.rmSync(reportPath, { force: true });
  const cmd = target.oracle.command
    .replaceAll("{report}", reportPath)
    .replaceAll("{dir}", target.oracle.dir);
  const res = run(cmd, workdir);
  const result = { ok: res.exit === 0, exit: res.exit, seconds: res.seconds };
  const parsed = parseTestReport(reportPath);
  if (parsed) Object.assign(result, parsed);
  if (parsed && parsed.total === 0) {
    result.ok = false;
    result.error = "oracle command ran no tests";
  }
  if (res.exit !== 0 && !parsed) result.log = tail(res.output);
  fs.rmSync(reportPath, { force: true });
  fs.rmSync(dest, { recursive: true, force: true });
  return result;
}

function checkRef(ref, oracleDir) {
  checkout(ref);
  const result = { sha: gitOk("rev-parse HEAD", workdir), ...runChecks() };
  const oracle = runOracle(oracleDir);
  if (oracle) result.oracle = oracle;
  return result;
}

function checkMerge(a, b, oracleDir) {
  checkout(a);
  const merge = git(
    `-c user.name=verify -c user.email=verify@localhost merge --no-ff --no-commit ${b}`,
    workdir
  );
  const conflicted = git("diff --name-only --diff-filter=U", workdir).out;
  const conflictFiles = conflicted ? conflicted.split("\n") : [];
  if (merge.exit !== 0 && conflictFiles.length > 0) {
    return { textual_conflict: true, conflict_files: conflictFiles, ok: false };
  }
  if (merge.exit !== 0) fail(`merge of ${b} into ${a} failed:\n${merge.out}`);
  const result = { textual_conflict: false, ...runChecks() };
  const oracle = runOracle(oracleDir);
  if (oracle) result.oracle = oracle;
  return result;
}

// ---------- evaluation ----------

// What each case type requires of the merged result. A and B must always pass alone.
const TYPES = {
  textual: { label: "conflict", merged: "textual" },
  build: { label: "conflict", merged: "type_error" },
  test: { label: "conflict", merged: "test_failure" },
  runtime: { label: "conflict", merged: "oracle_failure" },
  intent: { label: "conflict", merged: "none" },
  negative: { label: "no_conflict", merged: "none" },
};

function observe(merged) {
  const manifests = [];
  if (merged.textual_conflict) manifests.push("textual");
  if (merged.typecheck && !merged.typecheck.ok) manifests.push("type_error");
  if (merged.test && !merged.test.ok) manifests.push("test_failure");
  if (merged.oracle && !merged.oracle.ok) manifests.push("oracle_failure");
  return {
    manifests_as: MANIFEST_ORDER.find((m) => manifests.includes(m)) ?? "none",
    manifests,
    failing_tests: (merged.test?.failed ?? []).map((f) =>
      f.test ? `${f.file} > ${f.test}` : f.file
    ),
    failing_oracle_tests: (merged.oracle?.failed ?? []).map(
      (f) => f.test ?? f.file
    ),
  };
}

function judge(pair, steps, observed) {
  const problems = [];
  if (!steps.base.ok) problems.push("base does not pass its own checks");
  if (!steps.a.ok) problems.push("branch A does not pass on its own");
  if (!steps.b.ok) problems.push("branch B does not pass on its own");
  for (const [name, side] of [
    ["A", pair.a],
    ["B", pair.b],
  ]) {
    const mergeBase = git(`merge-base ${pair.base} ${side}`).out;
    const baseSha = git(`rev-parse ${pair.base}^{commit}`).out;
    if (mergeBase !== baseSha)
      problems.push(`branch ${name} does not start from ${pair.base}`);
    const count = Number(git(`rev-list --count ${pair.base}..${side}`).out);
    if (count !== 1)
      problems.push(
        `branch ${name} has ${count} commits on top of base, expected 1`
      );
  }
  for (const step of pair.oracleAppliesTo) {
    if (!steps[step].oracle?.ok)
      problems.push(`oracle does not pass on ${step}`);
  }

  if (!pair.type) return { valid: problems.length === 0, problems };
  const spec = TYPES[pair.type];
  if (!spec) {
    problems.push(`unknown case type ${pair.type}`);
    return { valid: false, problems };
  }
  if (pair.label && pair.label !== spec.label) {
    problems.push(
      `type ${pair.type} implies label ${spec.label}, case says ${pair.label}`
    );
  }
  if (pair.type === "runtime" && !pair.oracleDir) {
    problems.push("runtime case has no oracle tests");
  }
  if (observed.manifests_as !== spec.merged) {
    problems.push(
      `type ${pair.type} expects the merge to show ${spec.merged}, observed ${observed.manifests_as}`
    );
  }
  return { valid: problems.length === 0, problems };
}

// ---------- main ----------

function loadPairs() {
  if (!args.cases) {
    return [
      {
        id: args.id ?? `${args.a}__${args.b}`,
        base: args.base,
        a: args.a,
        b: args.b,
      },
    ];
  }
  const lines = fs
    .readFileSync(args.cases, "utf8")
    .split("\n")
    .filter((l) => l.trim());
  let cases = lines.map((l) => JSON.parse(l));
  if (args.case?.length) cases = cases.filter((c) => args.case.includes(c.id));
  if (cases.length === 0) fail("no matching cases");
  const casesRoot = path.join(path.dirname(path.resolve(args.cases)), "cases");
  return cases.map((c) => {
    const oracleDir = path.join(casesRoot, c.id, "oracle");
    const hasOracle = fs.existsSync(oracleDir);
    return {
      id: c.id,
      type: c.type,
      label: c.label,
      base: c.base,
      a: c.branch_a,
      b: c.branch_b,
      oracleDir: hasOracle ? oracleDir : null,
      oracleAppliesTo: hasOracle ? c.oracle_applies_to ?? ["a", "b"] : [],
    };
  });
}

const pairs = loadPairs();
fs.mkdirSync(outDir, { recursive: true });
ensureWorktree();

const versions = target.versions
  ? run(target.versions, workdir).output.trim()
  : null;
const baseCache = new Map();
const summary = [];

// baselines.jsonl: what plain git, tsc and the repo's tests report for each
// case, i.e. what a detector with no extra analysis would see. Rows from
// earlier runs are kept, so running a subset of cases only updates those.
const baselinesPath = path.join(outDir, "baselines.jsonl");
const baselines = new Map(
  (fs.existsSync(baselinesPath) ? fs.readFileSync(baselinesPath, "utf8") : "")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))
    .map((row) => [row.id, row])
);

function sideBaseline(step) {
  return {
    tsc: step.typecheck?.ok ?? null,
    tests: step.test?.ok ?? null,
    oracle: step.oracle ? step.oracle.ok : null,
  };
}

function baselineRow(pair, steps, verdict) {
  const merged = steps.merged;
  const tscRan = !merged.textual_conflict;
  return {
    id: pair.id,
    type: pair.type ?? null,
    label: pair.label ?? null,
    valid: verdict.valid,
    git: {
      conflict: merged.textual_conflict,
      conflict_files: merged.conflict_files ?? [],
    },
    tsc: tscRan
      ? { pass: merged.typecheck.ok, exit: merged.typecheck.exit }
      : null,
    tests: tscRan
      ? {
          pass: merged.test.ok,
          failed_count: merged.test.failed_count ?? null,
          failing: (merged.test.failed ?? []).map((f) =>
            f.test ? `${f.file} > ${f.test}` : f.file
          ),
        }
      : null,
    oracle: merged.oracle ? { pass: merged.oracle.ok } : null,
    sides: { a: sideBaseline(steps.a), b: sideBaseline(steps.b) },
    verified_at: new Date().toISOString(),
  };
}

function writeBaselines() {
  const rows = [...baselines.values()].sort((x, y) => x.id.localeCompare(y.id));
  fs.writeFileSync(
    baselinesPath,
    rows.map((row) => JSON.stringify(row)).join("\n") + "\n"
  );
}

for (const pair of pairs) {
  console.log(
    `\n== ${pair.id} [${pair.type ?? "untyped"}]: ${pair.a} + ${pair.b} (base ${
      pair.base
    })`
  );
  if (!baseCache.has(pair.base)) {
    process.stdout.write("   base ... ");
    baseCache.set(pair.base, checkRef(pair.base));
    console.log(baseCache.get(pair.base).ok ? "ok" : "FAIL");
  }
  let base = baseCache.get(pair.base);
  if (pair.oracleAppliesTo.includes("base")) {
    checkout(pair.base);
    base = { ...base, oracle: runOracle(pair.oracleDir) };
  }

  const oracleFor = (step) =>
    pair.oracleAppliesTo.includes(step) ? pair.oracleDir : null;
  const describe = (step) =>
    `${step.ok ? "ok" : "FAIL"}${
      step.oracle ? `, oracle ${step.oracle.ok ? "pass" : "FAIL"}` : ""
    }`;

  process.stdout.write("   A ...... ");
  const sideA = checkRef(pair.a, oracleFor("a"));
  console.log(describe(sideA));

  process.stdout.write("   B ...... ");
  const sideB = checkRef(pair.b, oracleFor("b"));
  console.log(describe(sideB));

  process.stdout.write("   A+B .... ");
  const merged = checkMerge(pair.a, pair.b, pair.oracleDir);
  const observed = observe(merged);
  console.log(
    observed.manifests.length
      ? observed.manifests.join(", ")
      : "everything passes"
  );

  const steps = { base, a: sideA, b: sideB, merged };
  const verdict = judge(pair, steps, observed);
  console.log(
    `   ${verdict.valid ? "VALID" : "INVALID"}${verdict.problems
      .map((p) => `\n     - ${p}`)
      .join("")}`
  );

  const result = {
    id: pair.id,
    type: pair.type ?? null,
    label: pair.label ?? null,
    verified_at: new Date().toISOString(),
    target: target.name,
    versions,
    base: pair.base,
    branch_a: pair.a,
    branch_b: pair.b,
    oracle_applies_to: pair.oracleAppliesTo,
    observed,
    verdict,
    steps,
  };
  fs.writeFileSync(
    path.join(outDir, `${pair.id}.json`),
    JSON.stringify(result, null, 2) + "\n"
  );
  summary.push({
    id: pair.id,
    type: pair.type ?? null,
    observed: observed.manifests_as,
    valid: verdict.valid,
    problems: verdict.problems,
  });
  baselines.set(pair.id, baselineRow(pair, steps, verdict));
}

writeBaselines();

checkout(pairs[0].base);

// summary.json covers every case with a result file, not just this run's, so
// running a subset of cases does not drop the others.
const allResults = fs
  .readdirSync(outDir)
  .filter((f) => /\.json$/.test(f) && f !== "summary.json")
  .map((f) => JSON.parse(fs.readFileSync(path.join(outDir, f), "utf8")))
  .filter((r) => r.id && r.verdict)
  .sort((x, y) => x.id.localeCompare(y.id));
fs.writeFileSync(
  path.join(outDir, "summary.json"),
  JSON.stringify(
    {
      written_at: new Date().toISOString(),
      target: target.name,
      versions,
      valid: allResults.filter((r) => r.verdict.valid).length,
      total: allResults.length,
      cases: allResults.map((r) => ({
        id: r.id,
        type: r.type,
        observed: r.observed.manifests_as,
        valid: r.verdict.valid,
        problems: r.verdict.problems,
        verified_at: r.verified_at,
      })),
    },
    null,
    2
  ) + "\n"
);

const invalid = summary.filter((s) => !s.valid).length;
console.log(
  `\n${summary.length - invalid}/${
    summary.length
  } cases valid. Results in ${outDir}`
);
process.exit(invalid ? 1 : 0);
