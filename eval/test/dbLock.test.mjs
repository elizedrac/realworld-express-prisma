// Tests for the test-database lock. Run from the repo root:
//   node --test eval/test/*.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const lib = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../lib/dbLock.mjs"
);

// Runs a script that takes the lock, holds it for holdMs, then exits.
function holder(lockDir, holdMs, extra = "") {
  return `import { acquireDbLock } from ${JSON.stringify(lib)};
const release = acquireDbLock("holder");
console.log("held " + Date.now());
${extra}
setTimeout(() => { release(); console.log("released " + Date.now()); }, ${holdMs});`;
}

function env(lockDir) {
  return { ...process.env, CONFLICT_EVAL_DB_LOCK: lockDir };
}

test("a second run waits until the first releases the database", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dblock-test-"));
  const lockDir = path.join(dir, "lock");
  const first = spawn(
    process.execPath,
    ["--input-type=module", "-e", holder(lockDir, 1_500)],
    {
      env: env(lockDir),
    }
  );
  let out = "";
  first.stdout.on("data", (d) => (out += d));
  while (!out.includes("held")) await new Promise((r) => setTimeout(r, 50));

  const second = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", holder(lockDir, 0)],
    {
      env: env(lockDir),
      encoding: "utf8",
    }
  );
  await new Promise((r) => first.on("close", r));
  const released = Number(out.match(/released (\d+)/)[1]);
  const secondHeld = Number(second.stdout.match(/held (\d+)/)[1]);
  assert.ok(
    secondHeld >= released,
    "second run took the lock before the first let go"
  );
  assert.match(
    second.stderr,
    /waiting for the test database, in use by holder/
  );
  fs.rmSync(dir, { recursive: true, force: true });
});

test("a lock left by a run that died is taken over", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dblock-test-"));
  const lockDir = path.join(dir, "lock");
  // The holder is killed while it holds the lock, so it never releases it.
  spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      holder(lockDir, 60_000, "process.kill(process.pid, 'SIGKILL');"),
    ],
    {
      env: env(lockDir),
    }
  );
  assert.ok(fs.existsSync(lockDir));
  const next = spawnSync(
    process.execPath,
    ["--input-type=module", "-e", holder(lockDir, 0)],
    {
      env: env(lockDir),
      encoding: "utf8",
      timeout: 10_000,
    }
  );
  assert.match(next.stdout, /released/);
  fs.rmSync(dir, { recursive: true, force: true });
});
