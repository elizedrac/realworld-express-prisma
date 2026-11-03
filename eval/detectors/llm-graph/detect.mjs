#!/usr/bin/env node
// LLM detector given the two diffs and the ts-morph graph linking them.
import { run } from "../llm/llm.mjs";

await run({ graph: true, intent: false });
