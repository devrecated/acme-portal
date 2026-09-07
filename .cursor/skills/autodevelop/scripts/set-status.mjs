#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { loadConfig } from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson, runCommand } from "./lib.mjs";

export const statusOptionId = (config, statusName) => {
  const id = config.fields?.status?.options?.[statusName];
  if (!id) throw new Error(`Unknown or unset status option: ${statusName}`);
  return id;
};

if (process.argv[1]?.endsWith("set-status.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: !args.dryRun, allowExample: args.dryRun });
    const itemId = argValue(args, "item");
    const status = argValue(args, "status");
    if (!itemId || !status) fail("Missing --item or --status.");
    const optionId = statusOptionId(config, status);
    const cmd = [
      "project",
      "item-edit",
      "--project-id",
      config.github.projectId,
      "--id",
      itemId,
      "--field-id",
      config.fields.status.id,
      "--single-select-option-id",
      optionId,
    ];
    const result = runCommand("gh", cmd, { dryRun: args.dryRun });
    printJson({ ok: result.ok || args.dryRun, dryRun: args.dryRun, status, optionId, command: result.preview || ["gh", ...cmd].join(" ") });
    if (!result.ok && !args.dryRun) process.exit(result.status);
  } catch (error) {
    fail(error.message);
  }
}
