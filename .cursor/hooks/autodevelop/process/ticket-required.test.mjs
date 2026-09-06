/**
 * Copyright (c) 2026 Devrecated
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAskMessage,
  formatOpenTicketLines,
  isDevrecatedExemptPath,
  isRecordableProductPath,
  samePathSet,
} from "./ticket-required.mjs";

test("Devrecated .cursor trees are exempt", () => {
  assert.equal(isDevrecatedExemptPath(".cursor/skills/autodevelop/process/create-branch/SKILL.md"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/hooks/autodevelop/process/ticket-required.mjs"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/rules/autodevelop/process/ticket-required.mdc"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/skills/autodevelop/cybersecurity/commit-risk-audit/SKILL.md"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/rules/autodevelop/frontend/ui-bucket.mdc"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/rules/frontend/ui-bucket.mdc"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/agents/identify-skills.md"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/plans/autodevelop-proprietary-distribution.plan.md"), true);
  assert.equal(isDevrecatedExemptPath("docs/internal/runbook.md"), true);
  assert.equal(isDevrecatedExemptPath("docs/internal/adr/remote-mcp-ip-protection.md"), true);
  assert.equal(isDevrecatedExemptPath("docs/internal/flows/routing.md"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/hooks.json"), true);
  assert.equal(isDevrecatedExemptPath(".cursor/skills/README.md"), true);
  assert.equal(isDevrecatedExemptPath("docs/devrecated-autodevelop/index.md"), true);
});

test("product and instance paths are not exempt", () => {
  assert.equal(isDevrecatedExemptPath("web/app/src/views/foo.tsx"), false);
  assert.equal(isDevrecatedExemptPath("services/functions/src/index.ts"), false);
  assert.equal(isDevrecatedExemptPath(".cursor/skills/acme/autodevelop/people.json"), false);
  assert.equal(isDevrecatedExemptPath("docs/docs.example.com/public/index.md"), false);
});

test("junk and transcripts are not recordable", () => {
  assert.equal(isRecordableProductPath('{"file_path":"/tmp/x.md","success":true}'), false);
  assert.equal(isRecordableProductPath("/Users/me/projects/acme-app"), false);
  assert.equal(
    isRecordableProductPath(
      "/Users/adamsiwiec/.cursor/projects/x/agent-transcripts/abc/abc.jsonl",
    ),
    false,
  );
  assert.equal(isRecordableProductPath(".cursor/hooks/autodevelop/process/ticket-required.mjs"), false);
  assert.equal(isRecordableProductPath("web/app/src/views/foo.tsx"), true);
});

test("samePathSet ignores order", () => {
  assert.equal(samePathSet(["a.ts", "b.ts"], ["b.ts", "a.ts"]), true);
  assert.equal(samePathSet(["a.ts"], ["a.ts", "b.ts"]), false);
});

test("ask message lists open tickets and skips Done", () => {
  const lines = formatOpenTicketLines([
    { status: "Ready", content: { number: 10, title: "Open one" }, title: "Open one" },
    { status: "Done", content: { number: 11, title: "Finished" }, title: "Finished" },
  ]);
  assert.deepEqual(lines, ["#10 Open one"]);
  const message = buildAskMessage(lines);
  assert.match(message, /say create/);
  assert.match(message, /#10 Open one/);
});
