// Shared LLM detector. Each llm-* detector folder calls run() with the inputs
// it includes, so variants differ only in what goes into the prompt.
//
// It is the second stage of the pipeline: it only sees pairs that merge
// cleanly, typecheck and pass the repo's tests, so it only answers runtime or
// intent.

import Anthropic from "@anthropic-ai/sdk";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildGraph } from "./graph.mjs";

export const MODEL = "claude-sonnet-5-5";
// Claude Sonnet 5.5 first-party prices, USD per million tokens.
const PRICE = { input: 2, output: 10 };
const CONTEXT_LINES = 10;
// Every input is capped, in characters.
const MAX_DIFF_CHARS = 40_000;
const MAX_GRAPH_CHARS = 30_000;
const MAX_TEXT_CHARS = 4_000; // the task and each commit message
const MAX_TOKENS = 4_000;
// A request that takes longer is retried, so one hung call does not stall a case.
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;

export const SYSTEM_PROMPT = `You review two sets of changes made at the same time to the same codebase:
- Change A: a coding agent's work in progress.
- Change B: a teammate's change, just pushed to main.

Together they merge cleanly, typecheck, and pass the repo's existing tests.
Your job is to decide whether they still conflict once combined.

They conflict if either:
- runtime: the merged code behaves wrongly in a way neither change does alone,
  e.g. one change breaks an assumption the other relies on.
- intent: both changes solve the same problem in different ways, so the
  merged code duplicates or contradicts itself. This is a conflict even when
  running the work twice is harmless: one of the two should be removed.

They do not conflict if they touch related code but stay correct together.
Most concurrent changes are fine. Only flag a conflict if you can describe a
concrete scenario where the merged code goes wrong or does the work twice.

confidence is how sure you are of your answer (0 to 1).`;

// explanation comes first so the model reasons before it decides.
const SCHEMA = {
  type: "object",
  properties: {
    explanation: { type: "string" },
    conflict: { type: "boolean" },
    category: { type: "string", enum: ["runtime", "intent", "none"] },
    confidence: { type: "number" },
    involved_symbols: { type: "array", items: { type: "string" } },
  },
  required: [
    "explanation",
    "conflict",
    "category",
    "confidence",
    "involved_symbols",
  ],
  additionalProperties: false,
};

function fail(message) {
  console.error(`llm: ${message}`);
  process.exit(2);
}

function git(repo, args) {
  const res = spawnSync("git", args, {
    cwd: repo,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0) fail(`git ${args.join(" ")} failed:\n${res.stderr}`);
  return res.stdout;
}

// Cut at the last full line under the cap, and say so, so the model knows it
// is not seeing everything.
function capped(text, max) {
  if (text.length <= max) return { text, truncated: false };
  const cut = text.slice(0, max);
  const kept = cut.slice(0, cut.lastIndexOf("\n") + 1) || cut;
  return {
    text: `${kept}[truncated: ${
      text.length - kept.length
    } more characters not shown]\n`,
    truncated: true,
  };
}

function diff(repo, base, branch) {
  return capped(
    git(repo, ["diff", `-U${CONTEXT_LINES}`, `${base}...${branch}`]),
    MAX_DIFF_CHARS
  );
}

function commitMessages(repo, base, branch) {
  return capped(
    git(repo, ["log", "--reverse", "--format=%B", `${base}..${branch}`])
      .trim()
      .replace(/\n{3,}/g, "\n\n") + "\n",
    MAX_TEXT_CHARS
  );
}

function loadApiKey() {
  const envFile = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    "../../.env"
  );
  if (!process.env.ANTHROPIC_API_KEY && fs.existsSync(envFile))
    process.loadEnvFile(envFile);
  if (!process.env.ANTHROPIC_API_KEY)
    fail("ANTHROPIC_API_KEY is not set and eval/.env does not provide it");
}

// Builds the user message for the requested inputs. Returns which inputs were
// cut and how long the graph took.
export function buildPrompt({ repo, base, a, b, task }, include) {
  const inputs = [
    ["diff_a", diff(repo, base, a)],
    ["diff_b", diff(repo, base, b)],
  ];
  let graphSeconds;
  if (include.graph) {
    const started = Date.now();
    let graph;
    try {
      graph = buildGraph({ repo, base, a, b, depth: include.depth });
    } catch (err) {
      fail(`graph failed: ${err.message}`);
    }
    graphSeconds = Math.round((Date.now() - started) / 100) / 10;
    inputs.push(["related_code", capped(graph, MAX_GRAPH_CHARS)]);
  }
  if (include.intent) {
    if (!task) fail("this variant needs --task");
    inputs.push(
      ["agent_task", capped(`${task.trim()}\n`, MAX_TEXT_CHARS)],
      ["commit_message_a", commitMessages(repo, base, a)],
      ["commit_message_b", commitMessages(repo, base, b)]
    );
  }
  return {
    text: inputs
      .map(([tag, { text }]) => `<${tag}>\n${text}</${tag}>`)
      .join("\n\n"),
    truncated: inputs.filter(([, v]) => v.truncated).map(([tag]) => tag),
    graphSeconds,
  };
}

export async function run(include) {
  const { values: args } = parseArgs({
    options: {
      repo: { type: "string" },
      base: { type: "string" },
      a: { type: "string" },
      b: { type: "string" },
      task: { type: "string" },
      target: { type: "string" },
    },
  });
  if (!args.repo || !args.base || !args.a || !args.b)
    fail("--repo, --base, --a and --b are required");
  args.repo = path.resolve(args.repo);
  loadApiKey();

  const prompt = buildPrompt(args, include);
  const client = new Anthropic({
    timeout: REQUEST_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  const started = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    // Lowest thinking setting on Claude Sonnet 5.5 (no extended thinking).
    thinking: { type: "between_tools" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt.text }],
  });
  const seconds = Math.round((Date.now() - started) / 100) / 10;

  if (response.stop_reason === "refusal")
    fail(`model refused: ${JSON.stringify(response.stop_details)}`);
  if (response.stop_reason === "max_tokens")
    fail(`hit max_tokens (${MAX_TOKENS}) before finishing`);
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  let answer;
  try {
    answer = JSON.parse(text);
  } catch {
    fail(`response is not JSON:\n${text}`);
  }

  const { input_tokens, output_tokens } = response.usage;
  console.log(
    JSON.stringify(
      {
        conflict: answer.conflict,
        confidence: answer.confidence,
        category: answer.category === "none" ? null : answer.category,
        involved_symbols: answer.involved_symbols,
        explanation: answer.explanation,
        cost_usd:
          (input_tokens * PRICE.input + output_tokens * PRICE.output) / 1e6,
        timings:
          prompt.graphSeconds === undefined
            ? { llm: seconds }
            : { graph: prompt.graphSeconds, llm: seconds },
        usage: { input_tokens, output_tokens },
        model: response.model,
        truncated: prompt.truncated,
      },
      null,
      2
    )
  );
}
