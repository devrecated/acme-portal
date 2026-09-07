#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 */
import {
  assertSafeProject,
  loadConfig,
} from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson, runCommand } from "./lib.mjs";
import { boardTicketUrl, boardUrl, digestRecipients } from "./people.mjs";
import { SIGNED_URL_MAX_MS } from "./upload-stakeholder-artifact.mjs";
import {
  assertMailConfirm,
  buildMailDoc,
} from "./send-stakeholder-mail.mjs";

const docsHomeOf = (config) => config.docs?.home || "";
const docsChangelogOf = (config) =>
  config.docs?.changelog || (docsHomeOf(config) ? `${docsHomeOf(config).replace(/\/$/, "")}/changelog` : "");

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

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

export const itemDatabaseId = async (itemId, dryRun) => {
  if (!itemId || dryRun) return "";
  const query = `query($id: ID!) { node(id: $id) { ... on ProjectV2Item { databaseId } } }`;
  const result = runCommand("gh", ["api", "graphql", "-f", `query=${query}`, "-f", `id=${itemId}`]);
  if (!result.ok) return "";
  try {
    return String(JSON.parse(result.stdout || "{}")?.data?.node?.databaseId || "");
  } catch {
    return "";
  }
};

export const doneItems = (items) =>
  (items || []).filter((item) => String(item.status || "").toLowerCase() === "done");

export const buildDigestHtml = ({ tickets, artifacts, board, docsHome, docsChangelog }) => {
  const ticketList = tickets
    .map((ticket) => {
      const href = ticket.boardUrl || ticket.url || "#";
      return `<li><a href="${escapeHtml(href)}">${escapeHtml(ticket.title)}</a></li>`;
    })
    .join("");
  const files = artifacts
    .map((artifact) => `<li><a href="${escapeHtml(artifact.url)}">${escapeHtml(artifact.name)}</a> (private, expires in 7 days)</li>`)
    .join("");
  return [
    "<p>These tickets were moved to <strong>Done</strong> and released.</p>",
    `<p>Board: <a href="${escapeHtml(board)}">${escapeHtml(board)}</a></p>`,
    `<p>Docs: <a href="${escapeHtml(docsHome)}">${escapeHtml(docsHome)}</a> · <a href="${escapeHtml(docsChangelog)}">What’s new</a></p>`,
    ticketList ? `<p>Tickets</p><ul>${ticketList}</ul>` : "<p>No Done tickets in this range.</p>",
    files ? `<p>Files</p><ul>${files}</ul>` : "",
    "<p>File links expire in 7 days. Reply on the ticket if something looks wrong.</p>",
  ].join("\n");
};

export const refreshShareUrls = async (admin, prefix = "tmp/stakeholder-share/") => {
  const bucket = admin.storage().bucket();
  const [files] = await bucket.getFiles({ prefix, maxResults: 40 });
  const artifacts = [];
  for (const file of files) {
    if (file.name.endsWith("/")) continue;
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + SIGNED_URL_MAX_MS,
    });
    artifacts.push({ name: file.name.split("/").pop(), path: file.name, url });
  }
  return artifacts;
};

if (process.argv[1]?.endsWith("email-release-digest.mjs")) {
  const args = parseArgs();
  try {
    const { config } = loadConfig({ requireInstance: true });
    const projectId = argValue(args, "project", config.mail.firestoreProject);
    assertSafeProject(projectId, config);
    const to = digestRecipients(config);
    if (!to.length) fail("No stakeholder recipients in people.json.");
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
    const items = args.dryRun ? [] : doneItems(JSON.parse(list.stdout || "{}").items || []);
    const tickets = [];
    for (const item of items) {
      const databaseId = await itemDatabaseId(item.id, args.dryRun);
      tickets.push({
        title: item.title,
        boardUrl: databaseId ? boardTicketUrl(config, databaseId) : boardUrl(config),
      });
    }
    let artifacts = [];
    if (!args.dryRun) {
      const admin = await initAdmin(projectId);
      artifacts = await refreshShareUrls(admin);
    }
    const subject = `Released: ${tickets.length} ticket${tickets.length === 1 ? "" : "s"} moved to Done`;
    const html = buildDigestHtml({
      tickets,
      artifacts,
      board: boardUrl(config),
      docsHome: docsHomeOf(config),
      docsChangelog: docsChangelogOf(config),
    });
    if (args.dryRun) {
      printJson({
        ok: true,
        dryRun: true,
        projectId,
        to,
        subject,
        ticketCount: tickets.length,
        artifactCount: artifacts.length,
      });
      process.exit(0);
    }
    assertMailConfirm({
      dryRun: false,
      ci: args.flags.has("ci"),
      token: argValue(args, "confirm"),
    });
    const admin = await initAdmin(projectId);
    const doc = buildMailDoc({ to, subject, html });
    const ref = await admin.firestore().collection("mail").add(doc);
    printJson({
      ok: true,
      id: ref.id,
      projectId,
      to,
      ticketCount: tickets.length,
      artifactCount: artifacts.length,
    });
  } catch (error) {
    fail(error.message);
  }
}
