/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  assertSafeProject,
  extractConfigBranchOverrides,
  findInstanceFile,
  findKitRoot,
  findRepoRoot,
  findWorkspaceBindDir,
  isBranchBindingConfig,
  isExampleConfig,
  kitScriptPath,
  listInstanceNames,
  loadConfig,
  normalizeConfig,
  readWorkspaceSlug,
  validateConfig,
  workspaceRootFromHook,
} from "./config-load.mjs";

const valid = {
  github: { owner: "org", repo: "repo", projectNumber: 5, projectId: "PVT_1" },
  fields: { status: { id: "F", options: {} }, priority: { id: "P", options: {} } },
  mail: { firestoreProject: "stg", allowlist: ["a@example.com"] },
  forbiddenProjects: ["prod"],
  preview: { firebaseProject: "stg", hostingTarget: "staging", baseBranch: "master" },
  stakeholders: [],
};

test("validateConfig accepts a full object", () => {
  assert.deepEqual(validateConfig(valid), []);
});

test("validateConfig flags missing allowlist", () => {
  const bad = structuredClone(valid);
  delete bad.mail.allowlist;
  assert.ok(validateConfig(bad).some((e) => e.includes("allowlist")));
});

test("normalizeConfig defaults board.provider to github", () => {
  const next = normalizeConfig(valid);
  assert.equal(next.board.provider, "github");
  assert.equal(validateConfig(valid).length, 0);
  assert.equal(validateConfig(next).length, 0);
});

test("validateConfig refuses unknown board providers", () => {
  const jira = { ...valid, board: { provider: "jira" } };
  assert.ok(validateConfig(jira).some((e) => e.includes("board.provider")));
});

test("validateConfig accepts singleBranch and branches on a full object", () => {
  const next = {
    ...valid,
    singleBranch: true,
    branches: { staging: "master" },
  };
  assert.deepEqual(validateConfig(next), []);
});

test("validateConfig flags a non-boolean singleBranch", () => {
  const bad = { ...valid, singleBranch: "yes" };
  assert.ok(validateConfig(bad).some((e) => e.includes("singleBranch")));
});

test("isBranchBindingConfig and extractConfigBranchOverrides read the instance flag", () => {
  const binding = { slug: "acme", singleBranch: true, branches: { staging: "master" } };
  assert.equal(isBranchBindingConfig(binding), true);
  assert.equal(isBranchBindingConfig(valid), false);
  assert.deepEqual(extractConfigBranchOverrides(binding), {
    staging: "master",
    singleBranch: true,
  });
  assert.equal(extractConfigBranchOverrides(valid), null);
});

test("loadConfig skips a branch-only instance file and overlays it on the example", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-branch-cfg-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  const kitDir = join(root, ".cursor/skills/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  mkdirSync(kitDir, { recursive: true });
  writeFileSync(
    join(instanceDir, "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  writeFileSync(join(kitDir, "config.example.json"), JSON.stringify(valid));
  const loaded = loadConfig({ root, allowExample: true, kitRoot: root });
  assert.equal(loaded.source, "example");
  assert.equal(loaded.config.singleBranch, true);
  assert.equal(loaded.config.branches.staging, "master");
  assert.equal(loaded.config.github.owner, "org");
});

test("isExampleConfig detects placeholders", () => {
  assert.equal(isExampleConfig({ github: { owner: "example-org" } }), true);
  assert.equal(isExampleConfig(valid), false);
});

test("assertSafeProject refuses forbidden ids", () => {
  assert.throws(() => assertSafeProject("prod", valid), /forbidden/);
  assert.doesNotThrow(() => assertSafeProject("stg", valid));
});

test("loadConfig reads .autodevelop before a legacy skills instance folder", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-bind-"));
  const bindDir = join(root, ".autodevelop");
  const kitDir = join(root, ".cursor/skills/autodevelop");
  mkdirSync(bindDir, { recursive: true });
  mkdirSync(kitDir, { recursive: true });
  writeFileSync(
    join(bindDir, "config.json"),
    JSON.stringify({ slug: "acme", singleBranch: true, branches: { staging: "master" } }),
  );
  writeFileSync(join(kitDir, "config.example.json"), JSON.stringify(valid));
  assert.equal(findWorkspaceBindDir(root), bindDir);
  assert.equal(readWorkspaceSlug(bindDir), "acme");
  assert.deepEqual(listInstanceNames(root), ["acme"]);
  assert.equal(findInstanceFile(root, "autodevelop", "config.json")?.path, join(bindDir, "config.json"));
  const loaded = loadConfig({ root, allowExample: true, kitRoot: root });
  assert.equal(loaded.source, "example");
  assert.equal(loaded.config.singleBranch, true);
  assert.equal(loaded.instance, "acme");
});

test("loadConfig prefers instance over example", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  const kitDir = join(root, ".cursor/skills/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  mkdirSync(kitDir, { recursive: true });
  writeFileSync(join(instanceDir, "config.json"), JSON.stringify(valid));
  writeFileSync(
    join(kitDir, "config.example.json"),
    JSON.stringify({ ...valid, github: { ...valid.github, owner: "example-org" } }),
  );
  const loaded = loadConfig({ root });
  assert.equal(loaded.source, "instance");
  assert.equal(loaded.config.github.owner, "org");
  assert.equal(loaded.config.board.provider, "github");
  assert.equal(findInstanceFile(root, "autodevelop", "config.json")?.instance, "acme");
});

test("loadConfig refuses an unknown board.provider", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-board-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(
    join(instanceDir, "config.json"),
    JSON.stringify({ ...valid, board: { provider: "trello" } }),
  );
  assert.throws(() => loadConfig({ root }), /board\.provider/);
});

test("findRepoRoot prefers cwd with .cursor/skills", () => {
  const root = mkdtempSync(join(tmpdir(), "firegit-root-"));
  mkdirSync(join(root, ".cursor/skills"), { recursive: true });
  assert.equal(findRepoRoot(root), root);
});

test("findKitRoot is this repo and kitScriptPath lands on a real script", () => {
  const kit = findKitRoot();
  assert.ok(kit.endsWith("autodevelop"));
  assert.equal(existsSync(kitScriptPath("config-load.mjs")), true);
});

test("workspaceRootFromHook prefers workspace_roots over cwd", () => {
  assert.equal(
    workspaceRootFromHook({ workspace_roots: ["/tmp/consumer"], cwd: "/tmp/plugin" }),
    resolve("/tmp/consumer"),
  );
});
