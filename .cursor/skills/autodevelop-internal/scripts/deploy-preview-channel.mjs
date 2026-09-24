#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { assertSafeProject, loadConfig } from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson, runCommand } from "./lib.mjs";

export const assertPreviewSafe = ({ config, projectId, hostingTarget, baseBranch, channelId }) => {
  assertSafeProject(projectId, config);
  if (projectId !== config.preview.firebaseProject) {
    throw new Error(`Preview project must be ${config.preview.firebaseProject}.`);
  }
  if (hostingTarget !== config.preview.hostingTarget) {
    throw new Error(`Hosting target must be ${config.preview.hostingTarget}.`);
  }
  if (baseBranch !== config.preview.baseBranch) {
    throw new Error(`PR base branch must be ${config.preview.baseBranch}.`);
  }
  const prefix = config.preview.channelPrefix || "pr-";
  if (!String(channelId || "").startsWith(prefix)) {
    throw new Error(`Channel id must start with ${prefix}.`);
  }
  if (String(channelId) === "live") throw new Error("Refusing live channel.");
};

if (process.argv[1]?.endsWith("deploy-preview-channel.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: !args.dryRun, allowExample: args.dryRun });
    const projectId = argValue(args, "project", config.preview.firebaseProject);
    const hostingTarget = argValue(args, "only", config.preview.hostingTarget);
    const baseBranch = argValue(args, "base", config.preview.baseBranch);
    const channelId = argValue(args, "channel");
    if (!channelId) fail("Missing --channel pr-<n>.");
    assertPreviewSafe({ config, projectId, hostingTarget, baseBranch, channelId });
    const expires = argValue(args, "expires", config.preview.expires || "14d");
    const cmd = [
      "hosting:channel:deploy",
      channelId,
      "--only",
      hostingTarget,
      "--expires",
      expires,
      "--project",
      projectId,
    ];
    const result = runCommand("firebase", cmd, { dryRun: args.dryRun });
    printJson({
      ok: result.ok,
      dryRun: args.dryRun,
      command: ["firebase", ...cmd].join(" "),
      stdout: result.stdout,
      stderr: result.stderr,
    });
    if (!result.ok && !args.dryRun) process.exit(result.status);
  } catch (error) {
    fail(error.message);
  }
}
