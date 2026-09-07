#!/usr/bin/env node
import { readHookInput, writeHookOutput } from "../lib.mjs";
import { readSession } from "../../../skills/autodevelop/scripts/session.mjs";

try {
  await readHookInput();
  const { session } = readSession();
  if (!session?.issue) {
    writeHookOutput({});
    process.exit(0);
  }
  writeHookOutput({
    additional_context: `Active board ticket #${session.issue}${session.title ? ` (${session.title})` : ""}. Started ${session.startedAt || "unknown"}. Last progress ${session.lastProgressAt || "none"}. Progress comments are manual: use the ticket-progress skill when the user asks. Do not invent estimates.`,
  });
} catch {
  writeHookOutput({});
}
