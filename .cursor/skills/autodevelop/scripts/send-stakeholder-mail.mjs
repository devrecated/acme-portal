#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { assertSafeProject, findRepoRoot, loadConfig } from "./config-load.mjs";
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

export const mailTransportOf = (config) =>
  String(config?.mail?.transport || "hosted") === "firestore" ? "firestore" : "hosted";

export const readBindConfig = (root) => {
  const path = join(root, ".autodevelop", "config.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return {};
  }
};

export const loadMailConfig = (root = findRepoRoot()) => {
  try {
    return loadConfig({ requireInstance: true, root }).config;
  } catch {
    return readBindConfig(root);
  }
};

export const postHostedMail = async ({
  origin,
  token,
  to,
  subject,
  html,
  confirm,
  override = "",
  fetchImpl = fetch,
}) => {
  if (!token) {
    throw new Error("Missing Autodevelop login token. Run npx autodevelop login.");
  }
  const response = await fetchImpl(joinHostSafe(origin, "/cli/mail"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ to, subject, html, confirm, override }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Host mail failed (${response.status})`);
  }
  return data;
};

const DEFAULT_HOST = "http://127.0.0.1:8787";

const joinHostSafe = (origin, path) => `${String(origin || "").replace(/\/$/, "")}${path}`;

const credentialsPath = (env = process.env) => {
  const override = String(env.AUTODEVELOP_CREDENTIALS || "").trim();
  if (override) return override;
  const xdg = String(env.XDG_CONFIG_HOME || "").trim();
  const home = env.HOME || homedir();
  const base = xdg || join(home, ".config");
  return join(base, "autodevelop", "credentials.json");
};

export const readStoredCredentials = (env = process.env) => {
  const path = credentialsPath(env);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (data?.profiles && typeof data.profiles === "object") {
      const name = String(env.AUTODEVELOP_PROFILE || data.active || "default").trim() || "default";
      const entry = data.profiles[name] || data.profiles.default;
      const token = String(entry?.token || "").trim();
      return token ? { token, host: entry.host || "" } : null;
    }
    const token = String(data?.token || "").trim();
    return token ? { token, host: data.host || "" } : null;
  } catch {
    return null;
  }
};

export const resolveMailHost = (env = process.env, storedHost = "") => {
  const named = String(env.AUTODEVELOP_HOST || "").trim();
  if (named) return named.replace(/\/$/, "");
  const entitlement = String(env.AUTODEVELOP_ENTITLEMENT_URL || "").trim();
  if (entitlement) return entitlement.replace(/\/entitlement\/?$/i, "").replace(/\/$/, "");
  const stored = String(storedHost || "").trim();
  if (stored) return stored.replace(/\/$/, "");
  return DEFAULT_HOST;
};

export const readLoginToken = (env = process.env) => {
  const fromEnv = String(env.AUTODEVELOP_TOKEN || "").trim();
  if (fromEnv) return fromEnv;
  const stored = readStoredCredentials(env);
  if (stored?.token) return stored.token;
  return String(env.TOKEN || "").trim();
};

if (process.argv[1]?.endsWith("send-stakeholder-mail.mjs")) {
  const args = parseArgs();
  try {
    const root = findRepoRoot();
    const config = loadMailConfig(root);
    const transport = argValue(args, "transport") || mailTransportOf(config);
    const to = parseRecipientList(argValue(args, "to"));
    if (!to.length) fail("Missing --to.");
    const subject = argValue(args, "subject");
    const html = argValue(args, "html");
    if (!subject || !html) fail("Missing --subject or --html.");
    const localAllowlist = config.mail?.allowlist;
    if (Array.isArray(localAllowlist) && localAllowlist.length) {
      const check = allowlistCheck(
        to,
        localAllowlist,
        config.mail?.allowOverridePhrase,
        argValue(args, "override"),
      );
      if (!check.ok) {
        fail(
          `Recipients not on allowlist: ${check.blocked.join(", ")}. Retype --override "${config.mail?.allowOverridePhrase || "send anyway"}".`,
        );
      }
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
        transport,
        to: to.length === 1 ? to[0] : to,
        subject,
        artifactCount: planned.length,
        artifactPaths: planned.map((item) => item.storagePath),
      });
      process.exit(0);
    }
    if (transport === "hosted") {
      const stored = readStoredCredentials(process.env);
      const result = await postHostedMail({
        origin: resolveMailHost(process.env, stored?.host),
        token: readLoginToken(process.env),
        to,
        subject,
        html,
        confirm: token,
        override: argValue(args, "override"),
      });
      printJson({
        ok: true,
        transport: result.transport || "hosted",
        id: result.id,
        toCount: result.toCount || to.length,
      });
      process.exit(0);
    }
    const projectId = argValue(args, "project", config.mail?.firestoreProject);
    assertSafeProject(projectId, config);
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
