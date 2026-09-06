/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseSimpleYaml } from "../../../hooks/autodevelop/lib.mjs";
import { findKitRoot } from "./config-load.mjs";
import {
  DEFAULT_BRANCHES,
  PRODUCTION_CONFIRM_PHRASE,
  STAGING_CONFIRM_PHRASE,
  branchConflictKeys,
  confirmPhraseFor,
  describeBranchMode,
  impliedBranchMode,
  isAskRequired,
  isReadOnlyBranch,
  isSingleBranch,
  loadBranches,
  normalizeBranches,
  roleForBranch,
  singleBranchRefuseReason,
  validateBranches,
} from "./branches-load.mjs";

const writeInstanceYaml = (relName, body, filename = "branch-policy.yaml") => {
  const root = mkdtempSync(join(tmpdir(), "ad-branches-"));
  const instanceDir = join(root, ".cursor/skills", relName, "autodevelop", ".policies");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(join(instanceDir, filename), body);
  return { root, instanceDir };
};

const writeLegacyYaml = (relName, body) => {
  const root = mkdtempSync(join(tmpdir(), "ad-branches-legacy-"));
  const instanceDir = join(root, ".cursor/skills", relName, "autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(join(instanceDir, "branches.yaml"), body);
  return { root, instanceDir };
};

test("defaults match current product (master/release, ask off)", () => {
  const branches = normalizeBranches({});
  assert.equal(branches.staging, "master");
  assert.equal(branches.production, "release");
  assert.equal(branches.askStaging, false);
  assert.equal(branches.askProduction, false);
  assert.equal(branches.singleBranch, false);
  assert.deepEqual(validateBranches(branches), []);
  assert.deepEqual(DEFAULT_BRANCHES.staging, "master");
  assert.equal(DEFAULT_BRANCHES.singleBranch, false);
  assert.equal(confirmPhraseFor("staging"), "YES PUSH TO MASTER");
  assert.equal(confirmPhraseFor("production"), "YES PUSH TO RELEASE");
  assert.equal(STAGING_CONFIRM_PHRASE, "YES PUSH TO MASTER");
  assert.equal(PRODUCTION_CONFIRM_PHRASE, "YES PUSH TO RELEASE");
  assert.equal(describeBranchMode(branches).mode, "two-branch");
});

test("loadBranches returns defaults when the instance file is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-branches-miss-"));
  mkdirSync(join(root, ".cursor/skills"), { recursive: true });
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "default");
  assert.equal(loaded.path, null);
  assert.equal(loaded.branches.staging, "master");
  assert.equal(loaded.branches.production, "release");
  assert.equal(loaded.branches.askStaging, false);
  assert.equal(loaded.branches.askProduction, false);
  assert.equal(loaded.confirm.staging, STAGING_CONFIRM_PHRASE);
  assert.equal(loaded.confirm.production, PRODUCTION_CONFIRM_PHRASE);
  assert.equal(loaded.mode, "two-branch");
  assert.equal(loaded.branches.singleBranch, false);
});

test("loadBranches reads instance override and keeps historic phrases", () => {
  const { root } = writeInstanceYaml(
    "acme",
    [
      "staging: develop",
      "production: prod",
      "askStaging: false",
      "askProduction: true",
      "",
    ].join("\n"),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "instance");
  assert.equal(loaded.instance, "acme");
  assert.equal(loaded.branches.staging, "develop");
  assert.equal(loaded.branches.production, "prod");
  assert.equal(loaded.branches.askStaging, false);
  assert.equal(loaded.branches.askProduction, true);
  assert.equal(loaded.confirm.staging, "YES PUSH TO MASTER");
  assert.equal(loaded.confirm.production, "YES PUSH TO RELEASE");
  assert.equal(isReadOnlyBranch("develop", loaded.branches), false);
  assert.equal(isReadOnlyBranch("prod", loaded.branches), true);
  assert.equal(isReadOnlyBranch("feat/x", loaded.branches), false);
  assert.equal(roleForBranch("develop", loaded.branches), "staging");
  assert.equal(isAskRequired("staging", loaded.branches), false);
});

test("loadBranches falls back to legacy branches.yaml", () => {
  const { root } = writeLegacyYaml(
    "acme",
    ["staging: develop", "production: prod", "askStaging: true", "askProduction: false", ""].join(
      "\n",
    ),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "legacy");
  assert.equal(loaded.instance, "acme");
  assert.equal(loaded.branches.staging, "develop");
  assert.equal(loaded.branches.production, "prod");
  assert.equal(loaded.branches.askStaging, true);
  assert.equal(loaded.branches.askProduction, false);
  assert.ok(loaded.path.endsWith("branches.yaml"));
});

test("loadBranches prefers .policies/branch-policy.yaml over legacy branches.yaml", () => {
  const { root } = writeLegacyYaml(
    "acme",
    ["staging: old-stg", "production: old-prod", "askStaging: true", "askProduction: true", ""].join(
      "\n",
    ),
  );
  const policiesDir = join(root, ".cursor/skills/acme/autodevelop/.policies");
  mkdirSync(policiesDir, { recursive: true });
  writeFileSync(
    join(policiesDir, "branch-policy.yaml"),
    ["staging: new-stg", "production: new-prod", "askStaging: false", "askProduction: false", ""].join(
      "\n",
    ),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "instance");
  assert.equal(loaded.branches.staging, "new-stg");
  assert.equal(loaded.branches.production, "new-prod");
  assert.equal(loaded.branches.askStaging, false);
  assert.ok(loaded.path.endsWith(".policies/branch-policy.yaml"));
});

test("kit autodevelop folder is not an instance override", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-branches-kit-"));
  const kitDir = join(root, ".cursor/skills/autodevelop");
  mkdirSync(join(kitDir, ".policies"), { recursive: true });
  writeFileSync(join(kitDir, "branches.yaml"), "staging: should-not-load\nproduction: other\n");
  writeFileSync(
    join(kitDir, ".policies/branch-policy.yaml"),
    "staging: should-not-load\nproduction: other\n",
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "default");
  assert.equal(loaded.branches.staging, "master");
});

test("protected list turns the matching ask flags on", () => {
  const branches = normalizeBranches({
    staging: "master",
    production: "release",
    askStaging: false,
    askProduction: false,
    protected: ["production"],
  });
  assert.equal(branches.askStaging, false);
  assert.equal(branches.askProduction, true);
});

test("same staging and production name is single-branch", () => {
  const branches = normalizeBranches({ staging: "trunk", production: "trunk" });
  assert.equal(branches.singleBranch, true);
  assert.equal(branches.production, "trunk");
  assert.equal(branches.askProduction, false);
  assert.deepEqual(validateBranches(branches), []);
  assert.equal(isSingleBranch(branches), true);
  assert.equal(roleForBranch("trunk", branches), "staging");
  assert.equal(isAskRequired("production", branches), false);
  assert.equal(describeBranchMode(branches).mode, "single-branch");
  assert.match(singleBranchRefuseReason(branches), /trunk only/);
});

test("singleBranch true omits a second production name", () => {
  const branches = normalizeBranches({ staging: "master", singleBranch: true });
  assert.equal(branches.singleBranch, true);
  assert.equal(branches.production, "master");
  assert.equal(branches.askProduction, false);
  assert.deepEqual(validateBranches(branches), []);
});

test("singleBranch true wins over a leftover production name from merge", () => {
  const branches = normalizeBranches({
    staging: "master",
    production: "release",
    singleBranch: true,
    askProduction: true,
  });
  assert.equal(branches.singleBranch, true);
  assert.equal(branches.production, "master");
  assert.equal(branches.askProduction, false);
  assert.deepEqual(validateBranches(branches), []);
});

test("loadBranches accepts a single-branch instance file", () => {
  const { root } = writeInstanceYaml(
    "acme",
    ["staging: master", "production: master", "singleBranch: true", "askStaging: false", "askProduction: false", ""].join(
      "\n",
    ),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "instance");
  assert.equal(loaded.mode, "single-branch");
  assert.equal(loaded.branches.singleBranch, true);
  assert.equal(loaded.branches.staging, "master");
  assert.equal(loaded.branches.production, "master");
  assert.match(loaded.note, /master only/);
  assert.match(loaded.note, /commit-push-master/);
  assert.match(loaded.note, /Do not fetch origin\/release/);
});

test("invalid instance file throws", () => {
  const { root } = writeInstanceYaml("acme", "staging: /nope\nproduction: release\n");
  assert.throws(() => loadBranches({ root }), /Invalid branch-policy/);
});

test("loadBranches reads singleBranch from instance config.json when policy is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-branches-cfg-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(
    join(instanceDir, "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "config");
  assert.equal(loaded.mode, "single-branch");
  assert.equal(loaded.branches.singleBranch, true);
  assert.equal(loaded.branches.staging, "master");
  assert.equal(loaded.branches.production, "master");
  assert.ok(loaded.configPath.endsWith("config.json"));
});

test("loadBranches merges agreeing config.json and branch-policy", () => {
  const { root, instanceDir } = writeInstanceYaml(
    "acme",
    ["staging: master", "production: master", "singleBranch: true", "askStaging: false", "askProduction: false", ""].join(
      "\n",
    ),
  );
  writeFileSync(
    join(instanceDir, "..", "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  const loaded = loadBranches({ root });
  assert.equal(loaded.source, "config+instance");
  assert.equal(loaded.mode, "single-branch");
  assert.equal(loaded.branches.production, "master");
});

test("loadBranches refuses config.json that contradicts two-branch policy", () => {
  const { root, instanceDir } = writeInstanceYaml(
    "acme",
    ["staging: master", "production: release", "askStaging: false", "askProduction: false", ""].join("\n"),
  );
  writeFileSync(
    join(instanceDir, "..", "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  assert.throws(() => loadBranches({ root }), /disagree on singleBranch/);
});

test("impliedBranchMode and branchConflictKeys treat omitted production as no release branch", () => {
  assert.equal(impliedBranchMode({ singleBranch: true }), "single-branch");
  assert.equal(impliedBranchMode({ staging: "master", production: "release" }), "two-branch");
  assert.deepEqual(branchConflictKeys({ singleBranch: true }, { production: "release" }), ["singleBranch"]);
  assert.deepEqual(
    branchConflictKeys({ singleBranch: true, staging: "master" }, { singleBranch: true, staging: "master", production: "master" }),
    [],
  );
});

test("this product instance is master-only in config and policy", () => {
  const loaded = loadBranches({ root: findKitRoot() });
  assert.equal(loaded.mode, "single-branch");
  assert.equal(loaded.branches.singleBranch, true);
  assert.equal(loaded.branches.staging, "master");
  assert.equal(loaded.branches.production, "master");
  assert.match(loaded.source, /config/);
  assert.match(loaded.configPath, /\.autodevelop\/config\.json/);
});

test("example file normalizes to the product defaults", () => {
  const kit = findKitRoot();
  const raw = readFileSync(
    join(kit, ".cursor/skills/autodevelop/.policies/branch-policy.example.yaml"),
    "utf8",
  );
  const branches = normalizeBranches(parseSimpleYaml(raw));
  assert.deepEqual(validateBranches(branches), []);
  assert.equal(branches.staging, "master");
  assert.equal(branches.production, "release");
  assert.equal(branches.askStaging, false);
  assert.equal(branches.askProduction, false);
  assert.equal(branches.singleBranch, false);
});
