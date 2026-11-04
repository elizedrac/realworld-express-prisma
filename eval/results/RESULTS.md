# Results

All 53 cases: 3 textual, 4 build, 4 test, 18 runtime, 6 intent and 18
negative. merge-check runs first. The LLM detectors run on the 42 cases it does
not flag, 3 times each, with Claude Sonnet 5.5, a 150,000-character cap per
diff, and diffs ordered as in `detectors/README.md`.

Scores are from the full run of 2026-11-03, with five cases rerun on
2026-11-04 after the diff ordering changed their prompts (rw-021, rw-050,
rw-051, and the new rw-052 and rw-053). Every other case's prompt is the same
as in the full run. Per-case results are in `scores/`; the five reruns are not
merged into those files yet.

## Summary

| Detector | Recall | Precision | Misses (of 3 runs) | False alarms (of 3 runs) | Median s | p90 s | Max s | LLM median s | Cost per LLM check | Cost per 100 checks |
| --- | ---: | ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| merge-check alone | 31% | 100% | 24 cases | 0 | 18.3 | 19.1 | 20.5 | n/a | $0 | $0 |
| merge-check → llm-diff | 97% | 99% | rw-040 ×2, rw-022 ×1 | rw-020 ×1 | 22.1 | 23.9 | 27.7 | 3.9 | $0.0294 | $2.33 |
| merge-check → llm-diff-intent | 99% | 99% | rw-040 ×1 | rw-020 ×1 | 22.2 | 23.9 | 27.1 | 3.8 | $0.0297 | $2.35 |
| merge-check → llm-graph | 99% | 98% | rw-035 ×1 | rw-020 ×2 | 22.6 | 24.1 | 27.0 | 4.3 | $0.0358 | $2.84 |
| **merge-check → llm-graph-intent** | **100%** | **100%** | none | none | 22.8 | 24.5 | 27.3 | 4.5 | $0.0361 | $2.86 |

- Recall and precision are for the whole pipeline, pooled over the 3 runs.
  "rw-040 ×2" means that case was missed in 2 of the 3 runs.
- The latency columns are seconds per case for the whole pipeline: merge-check,
  plus the LLM call when one is made. "LLM median s" is the LLM call alone,
  including building the graph.
- "Cost per LLM check" is the average cost of one LLM call. "Cost per 100
  checks" counts every case, including the ones merge-check flags, which cost
  nothing. A check whose diff reaches the cap costs about $0.08.

## Cases that any detector got wrong

Correct runs out of 3, LLM stage. The other 38 cases that reach the LLM were
right on every run for every detector.

| Case | Type | What it tests | llm-diff | llm-diff-intent | llm-graph | llm-graph-intent |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| rw-020 | negative | related changes that are compatible | **2/3** | **2/3** | **1/3** | 3/3 |
| rw-022 | runtime | page size mismatch | **2/3** | 3/3 | 3/3 | 3/3 |
| rw-035 | runtime | tag change hidden in a large diff | 3/3 | 3/3 | **2/3** | 3/3 |
| rw-040 | runtime | tag lookup outside both diffs | **1/3** | **2/3** | 3/3 | 3/3 |

## Comments

- **llm-graph-intent is the best of the four.** It is right on every run of
  every case. Over llm-diff it adds about 0.6 s and $0.007 per LLM check.
- **merge-check is a good first stage, not a detector on its own.** It catches
  every textual, build and test conflict with no false alarms and no API cost.
  It cannot see runtime or intent conflicts, which are 24 of its 35 conflicts.
- **Latency is mostly the test suite.** The median pipeline time is about 22 s:
  about 18 s for merge-check and about 4 s for the LLM.
- **The graph and the commit messages together prevent false alarms.** rw-020
  is a pair of related changes that work together (it looks like the real
  conflict rw-012, but B never calls A's function). Detectors with only one of
  the two, or neither, flag it in 1 or 2 runs of 3.
- **What the model can see matters more than the prompt.** With a 40k diff cap,
  every detector missed rw-046 and rw-047, where an unannounced change sat past
  the cut, and llm-diff-intent believed the misleading commit messages in
  rw-045 and rw-049. At 150k all of them get these right. A prompt line saying
  messages may be wrong made no measurable difference on its own.
- **Diff ordering handles diffs over the cap.** rw-050 hides an unannounced
  change behind a 160k seed file. Moving low-priority files (seed data, docs,
  lockfiles) to the end let every detector catch it on every run, up from 0 of
  3. rw-052 hides one in 197k of code. Putting the files linked to B by
  imports first took every detector to 3 of 3, from 0 of 3 (2 of 3 for
  llm-graph-intent).
- **The remaining gap is a large diff where the two sides connect only through
  data.** If the code alone is over the cap and A's change reaches B only
  through a token field or a database value, nothing imports across, so the
  ordering does not bring it forward. Graph nodes for shared data would cover
  that; no case tests it yet.
- **Limits:** one small repo, with cases written by us to test specific
  weaknesses; the numbers say how the detectors compare, not how often they
  will be right in production. Three runs per case is enough to see flaky cases
  (rw-020, rw-040) but not to rank detectors that differ by one run. The test
  database stalled twice during scoring; merge-check now reports that as an
  error, and both times the cases were rescored.
