# Detectors

Candidate conflict detectors, compared with `../score.mjs` to choose one for the
service.

Each detector is a folder with a `detect.mjs`. For one case it is run as:

```sh
node detectors/<name>/detect.mjs --repo <path> --base <ref> --a <branch> --b <branch> \
  [--task <text>] [--target <target.json>]
```

A is the agent's side and `--task` is the agent's task (`intent_a`), which the
service would know. A detector may ignore it. It never gets the case's label,
type, explanation or involved symbols. It must not change the repo's working
copy (use a worktree), and must print one JSON object on stdout:

```json
{
  "conflict": true,
  "confidence": 0.9,
  "category": "build",
  "involved_symbols": ["articlesListPrisma"],
  "explanation": "B calls articlesListPrisma positionally; A changed it to take an options object.",
  "cost_usd": 0.012
}
```

- `category` is one of `textual`, `build`, `test`, `runtime`, `intent`; required
  when `conflict` is true.
- `cost_usd` is optional, for detectors that call a paid API.
- `timings` is optional: seconds per stage, e.g.
  `{"merge": 0.1, "typecheck": 4.2}`.
- `usage` is optional: token counts, e.g.
  `{"input_tokens": 3309, "output_tokens": 322}`.

A non-zero exit, a timeout or output that breaks this shape is scored as an
error and counted as "no conflict".

## Detectors

- `merge-check`: baseline, what CI catches. Merges B into A in its own worktree
  and runs the target's typecheck and tests; needs `--target`.
- `llm-diff`: Claude Sonnet 5.5 given the two diffs.
- `llm-diff-intent`: the same, plus the agent's task and both commit messages.
- `llm-graph`: the two diffs plus a ts-morph graph (`llm/graph.mjs`) of the
  merged code: the top-level declarations each side changed, how they link (one
  uses the other, or both use the same declaration or `prisma.<table>`), and the
  linked declarations' merged code.
- `llm-graph-intent`: `llm-graph` plus the agent's task and both commit messages.
- `llm-graph2`, `llm-graph2-intent`: the same two, with the graph walked two
  steps out from each change instead of one. Declarations used by more than 10
  others are not walked through, or every change would meet every other.

The `llm-*` detectors share `llm/llm.mjs`, so they differ only in their inputs.
They are a second stage: the prompt says the pair already merges, typechecks and
passes tests, so run them with `--after merge-check`. Settings: thinking off
(`between_tools`), effort `high`, 10 lines of diff context, structured JSON
output, a 120 s request timeout with 2 retries. Every input is capped, and marked
when cut: each diff at 40,000 characters, the graph at 30,000 (each declaration
in it at 3,000, at most 40 links), and the task and each commit message at
4,000. They read
`ANTHROPIC_API_KEY` from the environment or from `eval/.env` (gitignored).
Install their dependency once with `npm install --prefix eval`.

## Scoring

```sh
node eval/score.mjs --repo . --cases eval/cases.jsonl --detector <name> [--detector <other>] \
  --target eval/targets/realworld-express-prisma.json
```

Second stage, three runs each (the first stage must be scored first):

```sh
node eval/score.mjs --repo . --cases eval/cases.jsonl --after merge-check --runs 3 \
  --detector llm-diff --detector llm-diff-intent --detector llm-graph --detector llm-graph-intent \
  --detector llm-graph2 --detector llm-graph2-intent
```

With `--after`, a detector runs only on the cases the first stage did not flag,
and the scorer also reports the whole pipeline on every case, adding up both
stages' time and cost. With `--runs`, scores are pooled across runs and each run
is also shown on its own.

Per detector it prints recall, precision, category accuracy, true/false
positives and negatives, results by case type, and the IDs of missed cases,
false alarms and errors, and total, median and max time per case. Full per-case
results go to `results/scores/<name>.json`.
