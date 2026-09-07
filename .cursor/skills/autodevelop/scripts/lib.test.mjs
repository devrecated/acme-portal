/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { allowlistCheck, parseArgs, ticketTemplate } from "./lib.mjs";
import { findDuplicates } from "./dedup-issues.mjs";
import { verifyAcceptance } from "./verify-ac.mjs";
import { assertPreviewSafe } from "./deploy-preview-channel.mjs";
import { buildMailDoc } from "./send-stakeholder-mail.mjs";
import { ensureIssueLink } from "./link-pr.mjs";
import { extractImageUrls } from "./ingest-ticket-media.mjs";
import { parseDocId } from "./fetch-gdoc.mjs";
import { consumeConfirmToken, issueConfirmToken } from "./confirm-token.mjs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { mkdirSync } from "node:fs";

test("parseArgs reads --dry-run and values", () => {
  const args = parseArgs(["--dry-run", "--to", "a@b.com", "rest"]);
  assert.equal(args.dryRun, true);
  assert.equal(args.values.to, "a@b.com");
  assert.deepEqual(args.positional, ["rest"]);
});

test("allowlistCheck blocks unknown recipients unless override matches", () => {
  const blocked = allowlistCheck(["x@y.com"], ["a@b.com"], "send anyway", "");
  assert.equal(blocked.ok, false);
  const ok = allowlistCheck(["x@y.com"], ["a@b.com"], "send anyway", "send anyway");
  assert.equal(ok.ok, true);
});

test("ticketTemplate includes AC and source", () => {
  const body = ticketTemplate({
    what: "Ship preview",
    steps: ["Add channel script", "Wire CORS"],
    acceptance: ["Channel URL works"],
    stakeholder: "@me",
    sourceUrl: "https://docs.google.com/document/d/abc",
    excerpt: "preview",
  });
  assert.match(body, /## What to build/);
  assert.match(body, /## Steps/);
  assert.match(body, /1\. Add channel script/);
  assert.match(body, /- \[ \] Channel URL works/);
  assert.match(body, /Notes:/);
});

test("findDuplicates flags overlapping titles", () => {
  const out = findDuplicates(
    [{ title: "Add preview channel deploy" }],
    [{ number: 12, title: "Add preview channel deploy for PRs", body: "" }],
  );
  assert.equal(out[0].possibleDuplicate, "#12");
});

test("verifyAcceptance scores checkboxes", () => {
  const rows = verifyAcceptance({
    body: "- [x] Done\n- [ ] Missing",
    localScreenshots: ["a.png"],
  });
  assert.equal(rows[0].result, "pass");
  assert.equal(rows[1].result, "fail");
});

test("assertPreviewSafe refuses live and forbidden project", () => {
  const config = {
    forbiddenProjects: ["prod"],
    preview: { firebaseProject: "stg", hostingTarget: "staging", baseBranch: "master", channelPrefix: "pr-" },
  };
  assert.throws(() =>
    assertPreviewSafe({ config, projectId: "prod", hostingTarget: "staging", baseBranch: "master", channelId: "pr-1" }),
  );
  assert.throws(() =>
    assertPreviewSafe({ config, projectId: "stg", hostingTarget: "staging", baseBranch: "release", channelId: "pr-1" }),
  );
  assert.throws(() =>
    assertPreviewSafe({ config, projectId: "stg", hostingTarget: "staging", baseBranch: "master", channelId: "live" }),
  );
  assert.doesNotThrow(() =>
    assertPreviewSafe({ config, projectId: "stg", hostingTarget: "staging", baseBranch: "master", channelId: "pr-9" }),
  );
});

test("buildMailDoc matches Trigger Email shape", () => {
  assert.deepEqual(buildMailDoc({ to: "a@b.com", subject: "Hi", html: "<p>x</p>" }), {
    to: "a@b.com",
    message: { subject: "Hi", html: "<p>x</p>" },
  });
});

test("ensureIssueLink appends Closes", () => {
  const first = ensureIssueLink("hello", 44);
  assert.equal(first.changed, true);
  assert.match(first.body, /Closes #44/);
  const second = ensureIssueLink(first.body, 44);
  assert.equal(second.changed, false);
});

test("extractImageUrls and parseDocId", () => {
  assert.deepEqual(
    extractImageUrls("see ![x](https://github.com/user-attachments/assets/abc)"),
    ["https://github.com/user-attachments/assets/abc"],
  );
  assert.equal(parseDocId("https://docs.google.com/document/d/AbC123/edit"), "AbC123");
});

test("confirm token mismatch and consume", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-token-"));
  mkdirSync(join(root, ".cursor/local/gh-projects"), { recursive: true });
  const issued = issueConfirmToken({ purpose: "mail" }, root);
  assert.equal(consumeConfirmToken("nope", root).ok, false);
  assert.equal(consumeConfirmToken(issued.token, root).ok, true);
  assert.equal(consumeConfirmToken(issued.token, root).ok, false);
});
