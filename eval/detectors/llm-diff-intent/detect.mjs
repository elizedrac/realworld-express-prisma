#!/usr/bin/env node
// LLM detector given the two diffs, both commit messages and the agent's task.
import { run } from "../llm/llm.mjs";

await run({ intent: true });
