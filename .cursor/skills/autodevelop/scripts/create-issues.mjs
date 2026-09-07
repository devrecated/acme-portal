#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { loadConfig } from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson, runCommand, ticketTemplate } from "./lib.mjs";

if (process.argv[1]?.endsWith("create-issues.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: !args.dryRun, allowExample: args.dryRun });
    const tickets = JSON.parse(argValue(args, "tickets") || "[]");
    if (!tickets.length) fail("Pass --tickets JSON array.");
    const created = [];
    for (const ticket of tickets) {
      const body = ticketTemplate(ticket);
      const repo = `${config.github.owner}/${config.github.repo}`;
      const create = runCommand(
        "gh",
        ["issue", "create", "--repo", repo, "--title", ticket.title, "--body", body],
        { dryRun: args.dryRun },
      );
      if (!create.ok && !args.dryRun) fail(create.stderr || "gh issue create failed");
      const url = (create.stdout || "").trim();
      if (url && !args.dryRun) {
        const added = runCommand(
          "gh",
          [
            "project",
            "item-add",
            String(config.github.projectNumber),
            "--owner",
            config.github.owner,
            "--url",
            url,
          ],
        );
        if (!added.ok) {
          fail(
            added.stderr ||
              `Created ${url} but could not add it to project ${config.github.projectNumber}. Run: gh auth refresh -s project`,
          );
        }
      }
      created.push({ title: ticket.title, url: url || null, dryRun: args.dryRun, body });
    }
    printJson({ ok: true, created });
  } catch (error) {
    fail(error.message);
  }
}
