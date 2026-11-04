# Results

Scored 2026-11-03 on all 51 cases: 3 textual, 4 build, 4 test, 17 runtime,
6 intent and 17 negative. merge-check runs first. The LLM detectors run on
the 40 cases it does not flag, 3 times each, with Claude Sonnet 5.5 and a
150,000-character cap per diff. Full per-case results are in `scores/`.

## Summary

| Detector | Recall | Precision | Misses | False alarms | Median s | p90 s | Max s | LLM median s | Cost per LLM check | Cost per 100 checks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| merge-check alone | 32% | 100% | 23 | 0 | 18.2 | 19.1 | 20.5 | n/a | $0 | $0 |
| merge-check → llm-diff | 94% | 99% | 2 | 0.3 | 21.9 | 23.8 | 27.7 | 3.9 | $0.0242 | $1.90 |
| merge-check → llm-diff-intent | 96% | 99% | 1.3 | 0.3 | 22.0 | 24.0 | 27.1 | 3.8 | $0.0245 | $1.92 |
| merge-check → llm-graph | 96% | 98% | 1.3 | 0.7 | 22.4 | 23.8 | 27.0 | 4.2 | $0.0301 | $2.36 |
| **merge-check → llm-graph-intent** | **97%** | **100%** | **1** | **0** | 22.5 | 24.5 | 27.3 | 4.5 | $0.0303 | $2.38 |

- Recall and precision are for the whole pipeline, pooled over the 3 runs.
  Misses and false alarms are averages per run.
- The latency columns are seconds per case for the whole pipeline: merge-check,
  plus the LLM call when one is made. "LLM median s" is the LLM call alone,
  including building the graph.
- "Cost per LLM check" is the average cost of one LLM call. "Cost per 100
  checks" counts every case, including the ones merge-check flags, which cost
  nothing. A check whose diff reaches the cap costs about $0.08.

## Cases that any detector got wrong

Correct runs out of 3, LLM stage. The other 35 cases that reach the LLM were
right on every run for every detector.

| Case | Type | What it tests | llm-diff | llm-diff-intent | llm-graph | llm-graph-intent |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| rw-020 | negative | related changes that are compatible | **2/3** | **2/3** | **1/3** | 3/3 |
| rw-022 | runtime | page size mismatch | **2/3** | 3/3 | 3/3 | 3/3 |
| rw-035 | runtime | tag change hidden in a large diff | 3/3 | 3/3 | **2/3** | 3/3 |
| rw-040 | runtime | tag lookup outside both diffs | **1/3** | **2/3** | 3/3 | 3/3 |
| rw-050 | runtime | unannounced change past the 150k cap | **0/3** | **0/3** | **0/3** | **0/3** |

## Comments

- **llm-graph-intent is the best of the four.** It has no false alarms and one
  miss (rw-050), and it is the only detector right on every run of every other
  case. Over llm-diff it adds about 0.6 s and $0.006 per LLM check.
- **merge-check is a good first stage, not a detector on its own.** It catches
  every textual, build and test conflict with no false alarms and no API cost.
  It cannot see runtime or intent conflicts, which are 23 of its 34 conflicts.
- **Latency is mostly the test suite.** The median pipeline time is about 22 s:
  about 18 s for merge-check and about 4 s for the LLM.
- **The graph mostly saves false alarms.** rw-020 is a pair of related changes
  that work together. Without the graph and the commit messages together, the
  model flags it in about 1 run in 3.
- **The diff cap matters more than the prompt.** With a 40k cap, every
  detector missed rw-046 and rw-047: an unannounced change sat past the cut.
  llm-diff-intent also believed misleading commit messages in rw-045 and
  rw-049. At 150k, every detector gets all four right. The prompt line saying
  messages may be wrong made no measurable difference on its own.
- **rw-050 is the open gap.** A adds a 160k-character seed file that comes
  first in its diff, so an unannounced token change falls past the cap, and
  nothing in the code links it to B's change. Collapsing repetitive hunks,
  ordering files by how related they are to B, or graph nodes for data passed
  through the token are the candidate fixes.
- **Limits:** one small repo, with cases written by us to test specific
  weaknesses; the numbers say how the detectors compare, not how often they
  will be right in production. Three runs per case is enough to see flaky cases
  (rw-020, rw-040) but not to rank detectors that differ by one run. The test
  database stalled twice during scoring; merge-check now reports that as an
  error, and both times the cases were rescored.
