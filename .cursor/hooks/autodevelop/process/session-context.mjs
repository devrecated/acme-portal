#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { findInstanceFile, workspaceRootFromHook } from "../../../skills/autodevelop/scripts/config-load.mjs";
import { readHookInput, writeHookOutput } from "../lib.mjs";

try {
  const input = await readHookInput();
  const root = workspaceRootFromHook(input);
  const hit = findInstanceFile(root, "session-context.md");
  if (!hit) {
    writeHookOutput({});
  } else {
    const text = readFileSync(hit.path, "utf8").trim();
    writeHookOutput(text ? { additional_context: text } : {});
  }
} catch {
  writeHookOutput({});
}
