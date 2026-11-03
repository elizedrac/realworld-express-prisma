// Tests for the llm-* detectors' prompt inputs (no API calls). Run from the
// repo root:
//   node --test eval/test/*.test.mjs
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { buildGraph } from "../detectors/llm/graph.mjs";
import { buildPrompt } from "../detectors/llm/llm.mjs";

const repo = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  "../.."
);
const refs = (id) => ({
  repo,
  base: "eval-base-v2",
  a: `${id}-a`,
  b: `${id}-b`,
});

test("graph links B's caller to the function A changed", () => {
  // rw-030: both change articlesListPrisma; B's controller calls it.
  const graph = buildGraph(refs("rw-030"));
  assert.match(
    graph,
    /B's src\/controllers\/articlesController\/articlesList\.ts#articlesList uses A's src\/utils\/db\/article\/articleListPrisma\.ts#articlesListPrisma/
  );
  assert.match(
    graph,
    /\/\/ src\/utils\/db\/article\/articleListPrisma\.ts#articlesListPrisma\n/
  );
});

test("graph links two sides through a database table", () => {
  // rw-029: A renames slugs on update; B reads articles by stored slug.
  assert.match(buildGraph(refs("rw-029")), /both touch db:article/);
});

test("graph says so when the sides do not connect", () => {
  assert.match(buildGraph(refs("rw-017")), /No links found/);
});

test("prompt includes only the requested inputs, each capped", () => {
  const task = "x".repeat(10_000);
  const all = buildPrompt(
    { ...refs("rw-028"), task },
    { graph: true, intent: true }
  );
  for (const tag of [
    "diff_a",
    "diff_b",
    "related_code",
    "agent_task",
    "commit_message_a",
    "commit_message_b",
  ])
    assert.match(all.text, new RegExp(`<${tag}>\\n[\\s\\S]*?</${tag}>`));
  assert.deepEqual(all.truncated, ["agent_task"]);
  assert.ok(all.text.length < 10_000 + 40_000);
  const task4k = all.text.match(/<agent_task>\n([\s\S]*?)<\/agent_task>/)[1];
  assert.ok(task4k.length < 4_100);
  assert.match(task4k, /\[truncated: \d+ more characters not shown\]/);

  const diffOnly = buildPrompt(refs("rw-028"), { graph: false, intent: false });
  assert.doesNotMatch(
    diffOnly.text,
    /<related_code>|<agent_task>|<commit_message_a>/
  );
  assert.equal(diffOnly.graphSeconds, undefined);
});

test("two steps out finds a link one step misses", () => {
  // rw-033: A's validator guards PUT /user, whose handler calls the same
  // userUpdatePrisma as B's new endpoint.
  assert.match(buildGraph(refs("rw-033")), /No links found/);
  assert.match(
    buildGraph({ ...refs("rw-033"), depth: 2 }),
    /userSetImage meet at src\/controllers\/userController\/userUpdate\.ts#userUpdate within two steps/
  );
});
