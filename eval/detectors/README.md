# Detectors

Candidate conflict detectors, compared with `../score.mjs` to choose one for the service.

Each detector is a folder with a `detect.mjs`. For one case it is run as:

```sh
node detectors/<name>/detect.mjs --repo <path> --base <ref> --a <branch> --b <branch> [--target <target.json>]
```

It gets only the repo and refs, never the case's label, type or explanation. It
must not change the repo's working copy (use a worktree), and must print one
JSON object on stdout:

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

- `category` is one of `textual`, `build`, `test`, `runtime`, `intent`; required when `conflict` is true.
- `cost_usd` is optional, for detectors that call a paid API.

A non-zero exit, a timeout or output that breaks this shape is scored as an
error and counted as "no conflict".

## Scoring

```sh
node eval/score.mjs --repo . --cases eval/cases.jsonl --detector <name> [--detector <other>]
```

Per detector it prints recall, precision, category accuracy, true/false
positives and negatives, results by case type, and the IDs of missed cases,
false alarms and errors. Full per-case results go to `results/scores/<name>.json`.
