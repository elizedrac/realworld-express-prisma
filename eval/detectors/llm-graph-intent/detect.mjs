#!/usr/bin/env node
// LLM detector given the two diffs, the ts-morph graph linking them, both
// commit messages and the agent's task.
import { run } from "../llm/llm.mjs";

await run({ graph: true, intent: true });
