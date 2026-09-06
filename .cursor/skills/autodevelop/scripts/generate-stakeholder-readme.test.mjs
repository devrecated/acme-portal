/**
 * Copyright (c) 2026 Devrecated
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildStakeholderReadme } from "./generate-stakeholder-readme.mjs";
import { applyPeople } from "./people.mjs";
import { buildDigestHtml, doneItems } from "./email-release-digest.mjs";

const config = applyPeople(
  {
    github: { owner: "org", repo: "repo", projectNumber: 5, projectId: "PVT_1" },
    fields: { status: { options: { "Owner acceptance": "1", Done: "2" } } },
    mail: { firestoreProject: "stg", allowlist: [] },
    preview: { firebaseProject: "stg" },
    productName: "Example product",
    stakeholderLabel: "Client",
  },
  {
    developers: [{ name: "Dev", github: "dev1", email: "dev@example.com" }],
    stakeholders: [{ name: "Pat Lee", github: "", email: "pat@example.com", alwaysNotify: true }],
    alwaysNotifyEmails: ["pat@example.com"],
  },
);

test("stakeholder readme includes statuses and alwaysNotify recipient", () => {
  const md = buildStakeholderReadme(config);
  assert.match(md, /Owner acceptance/);
  assert.match(md, /pat@example.com/);
  assert.match(md, /Reply on the GitHub ticket/);
  assert.doesNotMatch(md, /In review/);
});

test("doneItems keeps Done only", () => {
  assert.equal(doneItems([{ status: "Done" }, { status: "Ready" }]).length, 1);
});

test("digest html lists tickets and files", () => {
  const html = buildDigestHtml({
    tickets: [{ title: "Photos", boardUrl: "https://example.com/t" }],
    artifacts: [{ name: "deck.pdf", url: "https://example.com/f" }],
    board: "https://example.com/board",
    docsHome: "https://docs.example",
    docsChangelog: "https://docs.example/c",
  });
  assert.match(html, /Photos/);
  assert.match(html, /deck\.pdf/);
  assert.match(html, /expires in 7 days/);
});
