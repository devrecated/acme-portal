#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { loadConfig } from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson, runCommand } from "./lib.mjs";

export const filterItems = (items, { priority, query }) => {
  const q = String(query || "").toLowerCase();
  const pri = String(priority || "").toLowerCase();
  return items.filter((item) => {
    const hay = `${item.title || ""} ${item.body || ""} ${item.status || ""} ${item.priority || ""}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (pri === "high") {
      const value = String(item.priority || "").toUpperCase();
      return value === "P0" || value === "P1";
    }
    if (pri && String(item.priority || "").toLowerCase() !== pri) return false;
    return true;
  });
};

if (process.argv[1]?.endsWith("list-project.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: !args.dryRun, allowExample: args.dryRun });
    const list = runCommand(
      "gh",
      [
        "project",
        "item-list",
        String(config.github.projectNumber),
        "--owner",
        config.github.owner,
        "--format",
        "json",
        "--limit",
        argValue(args, "limit", "100"),
      ],
      { dryRun: args.dryRun },
    );
    if (args.dryRun) {
      printJson({ ok: true, dryRun: true, command: list.preview });
      process.exit(0);
    }
    if (!list.ok) fail(list.stderr || "gh project item-list failed");
    const parsed = JSON.parse(list.stdout || "{}");
    const items = parsed.items || parsed || [];
    printJson(filterItems(items, { priority: argValue(args, "priority"), query: argValue(args, "query") }));
  } catch (error) {
    fail(error.message);
  }
}
