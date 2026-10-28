# Conflict eval cases

Seeded pairs of branches (`rw-XXX-a`, `rw-XXX-b`) that each pass on their own,
built on the `eval-base-v2` tag. Case branches do not contain this folder.

- `cases.jsonl`: one line per case with its `type`, label, intents and explanation.
- `cases/<id>/oracle/`: oracle tests for `runtime` cases. They check the behavior
  the merge breaks when tsc and the repo's tests do not catch it.
- `targets/*.json`: how to set up, typecheck, test and run oracles for a target repo.
- `verify.mjs`: checks every case and writes `results/`.
- `export-patches.mjs`: writes each branch's change as a patch file.

## Case types

| type     | A and B alone | A merged with B                                    |
| -------- | ------------- | -------------------------------------------------- |
| textual  | pass          | git merge conflict                                 |
| build    | pass          | merges, tsc fails                                  |
| test     | pass          | merges, tsc passes, repo tests fail                |
| runtime  | pass          | merges, tsc and tests pass, oracle fails           |
| intent   | pass          | everything passes; both sides build the same thing |
| negative | pass          | everything passes; related but compatible changes  |

## Running

Requires Node 22 and the test database (`npm run db:test:up`). From the repo root on `main`:

```sh
node eval/verify.mjs --repo . --target eval/targets/realworld-express-prisma.json --cases eval/cases.jsonl
node eval/verify.mjs ... --case rw-011        # one case
```

Each case is checked out in a temporary git worktree, so the working copy is never touched.
