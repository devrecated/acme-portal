#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { argValue, fail, parseArgs, printJson } from "./lib.mjs";

export const ensureIssueLink = (body, issueNumber, mode = "Closes") => {
  const keyword = mode === "Refs" ? "Refs" : "Closes";
  const needle = new RegExp(`${keyword}\\s+#${issueNumber}\\b`, "i");
  if (needle.test(body || "")) return { body, changed: false };
  const suffix = `\n\n${keyword} #${issueNumber}\n`;
  return { body: `${body || ""}${suffix}`, changed: true };
};

if (process.argv[1]?.endsWith("link-pr.mjs")) {
  const args = parseArgs();
  try {
    const issue = argValue(args, "issue");
    if (!issue) fail("Missing --issue.");
    const result = ensureIssueLink(argValue(args, "body"), issue, argValue(args, "mode", "Closes"));
    printJson(result);
  } catch (error) {
    fail(error.message);
  }
}
