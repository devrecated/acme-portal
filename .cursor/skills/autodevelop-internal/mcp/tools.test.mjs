/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  WORKSPACE_ROOT_REQUIRED,
  callTool,
  kitConfig,
  kitPeople,
  kitSession,
} from "./tools.mjs";
import { handleRequest } from "./server.mjs";

const SECRET_EMAIL = "secret.stakeholder@client.example";
const DEV_EMAIL = "dev.person@internal.example";

const validConfig = {
  github: { owner: "org", repo: "repo", projectNumber: 5, projectId: "PVT_1" },
  fields: { status: { id: "F", options: {} }, priority: { id: "P", options: {} } },
  mail: { firestoreProject: "stg-project", allowlist: [SECRET_EMAIL] },
  forbiddenProjects: ["prod-project"],
  preview: { firebaseProject: "stg-project", hostingTarget: "staging", baseBranch: "master" },
  stakeholders: [],
};

const writeWorkspace = ({ withPeople = true, withSession = false } = {}) => {
  const root = mkdtempSync(join(tmpdir(), "autodevelop-mcp-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  mkdirSync(join(root, ".cursor"), { recursive: true });
  writeFileSync(join(instanceDir, "config.json"), JSON.stringify(validConfig));
  writeFileSync(join(root, ".cursor/hooks.json"), JSON.stringify({ version: 1, hooks: {} }));
  if (withPeople) {
    writeFileSync(
      join(instanceDir, "people.json"),
      JSON.stringify({
        developers: [{ name: "Dev", email: DEV_EMAIL, github: "dev" }],
        stakeholders: [{ name: "Stake", email: SECRET_EMAIL, github: "stake" }],
      }),
    );
  }
  if (withSession) {
    mkdirSync(join(root, ".cursor/local/gh-projects"), { recursive: true });
    writeFileSync(
      join(root, ".cursor/local/gh-projects/session.json"),
      JSON.stringify({
        issue: 42,
        title: "Bind mail",
        startedAt: "2026-08-21T12:00:00.000Z",
        lastProgressAt: "2026-08-21T12:10:00.000Z",
        lastTouchedAt: "2026-08-21T12:20:00.000Z",
      }),
    );
  }
  return root;
};

const dump = (value) => JSON.stringify(value);

test("workspace_root is required", () => {
  assert.throws(() => callTool("kit_config", {}), (err) => err.message === WORKSPACE_ROOT_REQUIRED);
  assert.throws(() => callTool("kit_config", { workspace_root: "  " }), (err) =>
    err.message === WORKSPACE_ROOT_REQUIRED);
});

test("unknown tool is refused", () => {
  const root = writeWorkspace();
  assert.throws(() => callTool("send_mail", { workspace_root: root }), /Unknown tool/);
  assert.throws(() => callTool("create_issue", { workspace_root: root }), /Unknown tool/);
});

test("kit_config and kit_people never return emails", () => {
  const root = writeWorkspace();
  const config = kitConfig(root);
  const people = kitPeople(root);
  const text = `${dump(config)}\n${dump(people)}`;
  assert.equal(config.source, "instance");
  assert.equal(config.instance, "acme");
  assert.equal(config.board.provider, "github");
  assert.equal(config.github.owner, "org");
  assert.equal(config.mail.allowlistCount, 1);
  assert.equal(config.forbiddenProjectCount, 1);
  assert.equal(people.present, true);
  assert.equal(people.developerCount, 1);
  assert.equal(people.stakeholderCount, 1);
  assert.equal(people.errors.length, 0);
  assert.equal(text.includes(SECRET_EMAIL), false);
  assert.equal(text.includes(DEV_EMAIL), false);
  assert.equal(text.includes("@"), false);
});

test("kit_session reports progress due without extra fields", () => {
  const root = writeWorkspace({ withSession: true });
  const session = kitSession(root);
  assert.equal(session.issue, 42);
  assert.equal(session.title, "Bind mail");
  assert.equal(session.shouldAskProgress, true);
  assert.equal("filesTouched" in session, false);
});

test("kit_doctor is structured and has no tokens", () => {
  const root = writeWorkspace();
  const doctor = callTool("kit_doctor", { workspace_root: root }, { ...process.env });
  assert.equal(typeof doctor.ok, "boolean");
  assert.equal(Array.isArray(doctor.checks), true);
  assert.ok(doctor.checks.some((c) => c.name === "instance config" && c.ok));
  const text = dump(doctor);
  assert.equal(/AIza|ghp_|ya29\.|-----BEGIN/.test(text), false);
});

test("kit_git reports a real work tree without fetching", () => {
  const here = callTool("kit_git", { workspace_root: process.cwd() });
  assert.equal(here.git, true);
  assert.equal(typeof here.branch, "string");
  assert.equal(typeof here.dirty, "boolean");
  assert.equal(typeof here.originMaster.exists, "boolean");

  const empty = writeWorkspace();
  const missing = callTool("kit_git", { workspace_root: empty });
  assert.equal(missing.git, false);
});

test("kit_git does not invoke git fetch", () => {
  const here = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });
  assert.equal(here.status, 0);
  const result = callTool("kit_git", { workspace_root: process.cwd() });
  assert.equal(result.git, true);
});

test("handleRequest tools/list and tools/call", async () => {
  const writes = [];
  const orig = process.stdout.write;
  process.stdout.write = (chunk) => {
    writes.push(String(chunk));
    return true;
  };
  try {
    await handleRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const listed = JSON.parse(writes[0]);
    assert.deepEqual(
      listed.result.tools.map((t) => t.name),
      ["kit_doctor", "kit_config", "kit_session", "kit_people", "kit_git"],
    );

    const root = writeWorkspace();
    await handleRequest({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: { name: "kit_config", arguments: { workspace_root: root } },
    });
    const called = JSON.parse(writes[1]);
    const body = JSON.parse(called.result.content[0].text);
    assert.equal(body.mail.allowlistCount, 1);
    assert.equal(called.result.content[0].text.includes(SECRET_EMAIL), false);

    await handleRequest({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "kit_config", arguments: {} },
    });
    const missing = JSON.parse(writes[2]);
    assert.equal(missing.result.isError, true);
    assert.match(missing.result.content[0].text, /workspace_root/);
  } finally {
    process.stdout.write = orig;
  }
});
