#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { existsSync } from "node:fs";
import { assertSafeProject, loadConfig } from "./config-load.mjs";
import { consumeConfirmToken } from "./confirm-token.mjs";
import {
  allowlistCheck,
  argValue,
  fail,
  normalizeEmail,
  parseArgs,
  parseRecipientList,
  printJson,
} from "./lib.mjs";
import {
  appendArtifactLinks,
  buildStakeholderStoragePath,
  safeArtifactFilename,
  uploadStakeholderArtifact,
} from "./upload-stakeholder-artifact.mjs";

const loadAdmin = async () => {
  const mod = await import("firebase-admin");
  return mod.default || mod;
};

const initAdmin = async (projectId) => {
  const admin = await loadAdmin();
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId,
      storageBucket: `${projectId}.appspot.com`,
    });
  }
  return admin;
};

export const buildMailDoc = ({ to, subject, html }) => ({
  to,
  message: { subject, html },
});

/** Chat path needs --confirm. CI (`GITHUB_ACTIONS` or `ci: true`) skips the token. */
export const assertMailConfirm = ({ dryRun = false, ci = false, token = "" } = {}) => {
  if (dryRun) return { ok: true, skipped: "dry-run" };
  if (ci || process.env.GITHUB_ACTIONS === "true") return { ok: true, skipped: "ci" };
  const consumed = consumeConfirmToken(token);
  if (!consumed.ok) fail(`Mail confirm token ${consumed.reason}. Issue a token and pass --confirm.`);
  return consumed;
};

export const plannedArtifactUploads = (paths, now = new Date()) =>
  paths.map((filePath) => ({
    filename: safeArtifactFilename(filePath),
    storagePath: buildStakeholderStoragePath(filePath, now),
  }));

if (process.argv[1]?.endsWith("send-stakeholder-mail.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: true });
    const projectId = argValue(args, "project", config.mail.firestoreProject);
    assertSafeProject(projectId, config);
    const to = parseRecipientList(argValue(args, "to"));
    if (!to.length) fail("Missing --to.");
    const subject = argValue(args, "subject");
    const html = argValue(args, "html");
    if (!subject || !html) fail("Missing --subject or --html.");
    const check = allowlistCheck(
      to,
      config.mail.allowlist,
      config.mail.allowOverridePhrase,
      argValue(args, "override"),
    );
    if (!check.ok) {
      fail(`Recipients not on allowlist: ${check.blocked.join(", ")}. Retype --override "${config.mail.allowOverridePhrase}".`);
    }
    const token = argValue(args, "confirm");
    if (!args.dryRun) {
      const consumed = consumeConfirmToken(token);
      if (!consumed.ok) fail(`Mail confirm token ${consumed.reason}. Issue a token and pass --confirm.`);
    }
    const attachmentPaths = argValue(args, "attachments")
      ? argValue(args, "attachments").split(",").filter((p) => p && existsSync(p))
      : [];
    const planned = plannedArtifactUploads(attachmentPaths);
    if (args.dryRun) {
      printJson({
        ok: true,
        dryRun: true,
        projectId,
        to: to.length === 1 ? to[0] : to,
        subject,
        artifactCount: planned.length,
        artifactPaths: planned.map((item) => item.storagePath),
      });
      process.exit(0);
    }
    const admin = await initAdmin(projectId);
    const artifacts = [];
    if (attachmentPaths.length) {
      const bucket = admin.storage().bucket();
      for (const filePath of attachmentPaths) {
        artifacts.push(await uploadStakeholderArtifact({ bucket, filePath }));
      }
    }
    const doc = buildMailDoc({
      to: to.length === 1 ? to[0] : to,
      subject,
      html: appendArtifactLinks(html, artifacts),
    });
    const ref = await admin.firestore().collection("mail").add(doc);
    printJson({
      ok: true,
      id: ref.id,
      projectId,
      to: Array.isArray(doc.to) ? doc.to.map(normalizeEmail) : [normalizeEmail(doc.to)],
      artifactCount: artifacts.length,
      artifactPaths: artifacts.map((item) => item.storagePath),
    });
  } catch (error) {
    fail(error.message);
  }
}
