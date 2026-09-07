/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSimpleYaml } from "../../../hooks/autodevelop/lib.mjs";
import { findKitRoot } from "./config-load.mjs";
import { loadBranches } from "./branches-load.mjs";
import {
  deepMerge,
  kitPoliciesDir,
  loadPolicies,
  policyNameFromFile,
  summarizePolicies,
} from "./policies-load.mjs";

const writeInstancePolicy = (relName, filename, body) => {
  const root = mkdtempSync(join(tmpdir(), "ad-policies-"));
  const instanceDir = join(root, ".cursor/skills", relName, "autodevelop", ".policies");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(join(instanceDir, filename), body);
  return { root, instanceDir };
};

test("policyNameFromFile strips example and yaml suffixes", () => {
  assert.equal(policyNameFromFile("branch-policy.example.yaml"), "branch-policy");
  assert.equal(policyNameFromFile("email-policy.yaml"), "email-policy");
});

test("deepMerge lets instance scalars and lists replace defaults", () => {
  const merged = deepMerge(
    { confirmRequired: true, ids: ["staging"], nested: { a: 1, b: 2 } },
    { confirmRequired: false, ids: ["production"], nested: { b: 9 } },
  );
  assert.equal(merged.confirmRequired, false);
  assert.deepEqual(merged.ids, ["production"]);
  assert.deepEqual(merged.nested, { a: 1, b: 9 });
});

test("parseSimpleYaml reads block lists used by policies", () => {
  const doc = parseSimpleYaml(
    ["requiredOn:", "  - ticket-required", "  - worktree-status", "strictness: normal", ""].join(
      "\n",
    ),
  );
  assert.deepEqual(doc.requiredOn, ["ticket-required", "worktree-status"]);
  assert.equal(doc.strictness, "normal");
});

test("parseSimpleYaml still reads nested maps", () => {
  const doc = parseSimpleYaml(["hooks:", "  worktree-status: true", "  ticket-required: true", ""].join("\n"));
  assert.equal(doc.hooks["worktree-status"], true);
  assert.equal(doc.hooks["ticket-required"], true);
});

test("loadPolicies uses kit example defaults when the instance folder is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-policies-miss-"));
  mkdirSync(join(root, ".cursor/skills"), { recursive: true });
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.path, null);
  assert.ok(loaded.names.includes("branch-policy"));
  assert.ok(loaded.names.includes("email-policy"));
  assert.equal(loaded.sources["branch-policy"], "default");
  assert.equal(loaded.sources["email-policy"], "default");
  assert.equal(loaded.policies["branch-policy"].staging, "master");
  assert.equal(loaded.policies["branch-policy"].production, "release");
  assert.equal(loaded.policies["branch-policy"].singleBranch, false);
  assert.equal(loaded.policies["branch-policy"].askStaging, false);
  assert.equal(loaded.policies["branch-policy"].askProduction, false);
  assert.equal(loaded.policies["email-policy"].confirmRequired, true);
  assert.equal(loaded.policies["email-policy"].hooksNeverSend, true);
  assert.equal(loaded.policies["email-policy"].logBodies, false);
  assert.equal(loaded.policies["ticket-policy"].requiredForProductWork, true);
  assert.equal(loaded.policies["commit-policy"].allowForcePush, false);
  assert.equal(loaded.policies["mcp-policy"].lapseString, "Your billing has expired");
  const summary = summarizePolicies(loaded);
  assert.deepEqual(summary.policies, loaded.names);
  assert.equal(summary.path, null);
  assert.ok(!("policies" in summary && typeof summary.policies === "object" && !Array.isArray(summary.policies)));
});

test("loadPolicies merges an instance override over kit defaults", () => {
  const { root } = writeInstancePolicy(
    "acme",
    "branch-policy.yaml",
    ["staging: develop", "production: prod", "askStaging: false", "askProduction: true", ""].join(
      "\n",
    ),
  );
  writeFileSync(
    join(root, ".cursor/skills/acme/autodevelop/.policies/email-policy.yaml"),
    ["confirmRequired: true", "logBodies: false", "hooksNeverSend: true", ""].join("\n"),
  );
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.instance, "acme");
  assert.equal(loaded.sources["branch-policy"], "instance");
  assert.equal(loaded.sources["email-policy"], "instance");
  assert.equal(loaded.sources["ticket-policy"], "default");
  assert.equal(loaded.policies["branch-policy"].staging, "develop");
  assert.equal(loaded.policies["branch-policy"].production, "prod");
  assert.equal(loaded.policies["branch-policy"].askProduction, true);
  assert.equal(loaded.policies["email-policy"].allowlistSource, "config.json");
  assert.equal(loaded.policies["email-policy"].overridePhraseName, "send anyway");
});

test("loadPolicies falls back to legacy branches.yaml for branch-policy", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-policies-legacy-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(
    join(instanceDir, "branches.yaml"),
    ["staging: develop", "production: prod", "askStaging: true", "askProduction: false", ""].join(
      "\n",
    ),
  );
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.sources["branch-policy"], "legacy");
  assert.equal(loaded.policies["branch-policy"].staging, "develop");
  assert.equal(loaded.policies["branch-policy"].askStaging, true);
  assert.equal(loaded.path, null);
  const branches = loadBranches({ root });
  assert.equal(branches.source, "legacy");
});

test("loadPolicies treats instance singleBranch as master-only over the two-branch example", () => {
  const { root } = writeInstancePolicy(
    "acme",
    "branch-policy.yaml",
    ["singleBranch: true", "askStaging: false", "askProduction: false", ""].join("\n"),
  );
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.sources["branch-policy"], "instance");
  assert.equal(loaded.policies["branch-policy"].singleBranch, true);
  assert.equal(loaded.policies["branch-policy"].staging, "master");
  assert.equal(loaded.policies["branch-policy"].production, "master");
  assert.equal(loaded.policies["branch-policy"].askProduction, false);
});

test("loadPolicies uses config.json singleBranch when it agrees with instance yaml", () => {
  const { root, instanceDir } = writeInstancePolicy(
    "acme",
    "branch-policy.yaml",
    ["singleBranch: true", "askStaging: false", "askProduction: false", ""].join("\n"),
  );
  writeFileSync(
    join(instanceDir, "..", "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.sources["branch-policy"], "config+instance");
  assert.equal(loaded.policies["branch-policy"].singleBranch, true);
  assert.equal(loaded.policies["branch-policy"].production, "master");
});

test("loadPolicies refuses config.json that contradicts branch-policy", () => {
  const { root, instanceDir } = writeInstancePolicy(
    "acme",
    "branch-policy.yaml",
    ["staging: master", "production: release", ""].join("\n"),
  );
  writeFileSync(
    join(instanceDir, "..", "config.json"),
    JSON.stringify({ singleBranch: true }),
  );
  assert.throws(() => loadPolicies({ root, kitRoot: findKitRoot() }), /disagree on singleBranch/);
});

test("loadPolicies reads .autodevelop/.policies over a missing skills instance folder", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-policies-bind-"));
  mkdirSync(join(root, ".autodevelop", ".policies"), { recursive: true });
  writeFileSync(
    join(root, ".autodevelop", "config.json"),
    JSON.stringify({ slug: "acme", singleBranch: true, branches: { staging: "master" } }),
  );
  writeFileSync(
    join(root, ".autodevelop", ".policies", "email-policy.yaml"),
    ["confirmRequired: true", "logBodies: false", "hooksNeverSend: true", ""].join("\n"),
  );
  const loaded = loadPolicies({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.instance, "acme");
  assert.match(loaded.path.replaceAll("\\", "/"), /\.autodevelop\/.policies$/);
  assert.equal(loaded.sources["email-policy"], "instance");
  assert.equal(loaded.policies["branch-policy"].singleBranch, true);
});

test("kitPoliciesDir points at shipped examples", () => {
  const dir = kitPoliciesDir(findKitRoot());
  assert.ok(dir.endsWith(".cursor/skills/autodevelop/.policies"));
});
