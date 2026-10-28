# Conflict eval cases

Seeded pairs of branches (`rw-XXX-a`, `rw-XXX-b`) that each pass on their own,
built on the `eval-base-v2` tag. Case branches do not contain this folder.

- `cases.jsonl`: one line per case with its `type`, label, intents and explanation.
- `cases/<id>/oracle/`: oracle tests for `runtime` cases. They check the behavior
  the merge breaks when tsc and the repo's tests do not catch it.
- `targets/*.json`: how to set up, typecheck, test and run oracles for a target repo.
- `verify.mjs`: checks every case and writes `results/`.
- `replay.mjs`: testing only; pushes one side of a case to a scratch remote on a schedule, like a teammate.
- `test/`: tests for the eval scripts.

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

## Replaying a case live (testing only)

`replay.mjs` plays the teammate. It resets a local scratch remote to the case's
base, then pushes the teammate branch (B by default, `--teammate a` for A) to
the scratch `main` after a delay. The reset and each push are logged with
timestamps, to compare with when a detector flags the conflict. It only ever
pushes to a scratch remote it created.

```sh
node eval/replay.mjs --repo . --cases eval/cases.jsonl --case rw-001 \
  --remote /tmp/replay/remote.git --delay 120
```

Run the eval script tests with `node --test eval/test/*.test.mjs`.
