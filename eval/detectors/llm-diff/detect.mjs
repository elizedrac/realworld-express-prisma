#!/usr/bin/env node
// LLM detector given only the two diffs.
import { run } from "../llm/llm.mjs";

await run({ intent: false });
