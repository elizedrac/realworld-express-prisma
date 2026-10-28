#!/usr/bin/env node
// Writes each case's A and B changes as patch files, so a case can be rebuilt
// on top of its base even if the branches are gone.
//
// Usage: node export-patches.mjs --repo <path> --cases <cases.jsonl> [--out <dir>]
// Output: <out>/<id>/a.patch and <out>/<id>/b.patch (default out: ./cases next to this script)
// Rebuild a side with: git checkout -b <branch> <base> && git am <out>/<id>/a.patch

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: {
    repo: { type: "string" },
    cases: { type: "string" },
    out: { type: "string" },
  },
});

if (!args.repo || !args.cases) {
  console.error("export-patches: --repo and --cases are required");
  process.exit(2);
}

const outDir = path.resolve(
  args.out ??
    path.join(path.dirname(new URL(import.meta.url).pathname), "cases")
);
const cases = fs
  .readFileSync(args.cases, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => JSON.parse(l));

for (const c of cases) {
  const dir = path.join(outDir, c.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [side, branch] of [
    ["a", c.branch_a],
    ["b", c.branch_b],
  ]) {
    const patch = execFileSync(
      "git",
      ["format-patch", "--stdout", "--no-signature", `${c.base}..${branch}`],
      { cwd: path.resolve(args.repo), encoding: "utf8" }
    );
    fs.writeFileSync(path.join(dir, `${side}.patch`), patch);
  }
  console.log(`${c.id}: wrote a.patch, b.patch`);
}
