#!/usr/bin/env node
// llm-graph-intent with the graph walked two steps out from each change.
import { run } from "../llm/llm.mjs";

await run({ graph: true, depth: 2, intent: true });
