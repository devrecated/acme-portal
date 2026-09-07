/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  canonicalStatusName,
  fieldIdsFromList,
  isBoundProjectId,
  loadBaseConfig,
  mergeInstanceConfig,
  parseFieldList,
  parseProjectCreate,
  planBootstrapProject,
  statusOptionsWithPreservedIds,
  writeInstanceConfig,
} from "./bootstrap-project.mjs";
import { findKitRoot } from "./config-load.mjs";

const createJson = {
  id: "PVT_kwHOBFsz584ACkb9",
  number: 2,
  title: "Roadmap",
  url: "https://github.com/users/org/projects/2",
};

const fieldList = {
  fields: [
    { id: "PVTF_title", name: "Title", type: "ProjectV2Field" },
    {
      id: "PVTSSF_status",
      name: "Status",
      type: "ProjectV2SingleSelectField",
      options: [
        { id: "aaa111", name: "Todo" },
        { id: "47fc9ee4", name: "In Progress" },
        { id: "98236657", name: "Done" },
      ],
    },
  ],
};

test("isBoundProjectId rejects placeholders", () => {
  assert.equal(isBoundProjectId("PVT_kwHOBFsz584ACkb9"), true);
  assert.equal(isBoundProjectId("PVT_xxxxxxxxxxxxxxxx"), false);
  assert.equal(isBoundProjectId(""), false);
});

test("parseProjectCreate and field-list fixtures", () => {
  assert.deepEqual(parseProjectCreate(JSON.stringify(createJson)), {
    id: "PVT_kwHOBFsz584ACkb9",
    number: 2,
    title: "Roadmap",
    url: "https://github.com/users/org/projects/2",
  });
  const fields = parseFieldList(fieldList);
  const ids = fieldIdsFromList(fields);
  assert.equal(ids.statusId, "PVTSSF_status");
  assert.equal(ids.statusOptions.Done, "98236657");
  assert.equal(ids.priorityId, "");
});

test("status overwrite keeps option ids we map", () => {
  assert.equal(canonicalStatusName("In Progress"), "In progress");
  const next = statusOptionsWithPreservedIds(fieldList.fields[1].options);
  const byName = Object.fromEntries(next.map((opt) => [opt.name, opt]));
  assert.equal(byName.Backlog.id, "aaa111");
  assert.equal(byName["In progress"].id, "47fc9ee4");
  assert.equal(byName.Done.id, "98236657");
  assert.equal(byName.Ready.id, undefined);
  assert.equal(byName.Blocked.color, "RED");
  assert.equal(byName.Blocked.description, "");
});

test("planBootstrapProject binds a real PVT id", () => {
  const create = planBootstrapProject({
    config: { github: { owner: "org", repo: "repo", projectId: "PVT_xxxxxxxxxxxxxxxx", projectNumber: 1 } },
    title: "Board",
  });
  assert.equal(create.action, "create");
  const bind = planBootstrapProject({
    config: { github: { owner: "org", repo: "repo", projectId: "PVT_kwHOBFsz584ACkb9", projectNumber: 2 } },
  });
  assert.equal(bind.action, "bind");
  assert.equal(bind.projectNumber, 2);
});

test("mergeInstanceConfig keeps singleBranch from the instance file", () => {
  const merged = mergeInstanceConfig(
    { singleBranch: true, branches: { staging: "master" }, github: { owner: "org", repo: "repo" } },
    {
      owner: "org",
      repo: "repo",
      project: { id: "PVT_real", number: 4 },
      fields: {
        statusId: "PVTSSF_s",
        statusOptions: { Backlog: "1" },
        priorityId: "PVTSSF_p",
        priorityOptions: { P0: "a" },
        targetDateId: "",
        startDateId: "",
      },
    },
  );
  assert.equal(merged.singleBranch, true);
  assert.equal(merged.branches.staging, "master");
});

test("loadBaseConfig merges a branch-only instance file over the kit example", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-boot-branch-"));
  const instanceDir = join(root, ".cursor/skills/acme/autodevelop");
  mkdirSync(instanceDir, { recursive: true });
  writeFileSync(
    join(instanceDir, "config.json"),
    JSON.stringify({ singleBranch: true, branches: { staging: "master" } }),
  );
  const loaded = loadBaseConfig(root, findKitRoot());
  assert.equal(loaded.instance, "acme");
  assert.equal(loaded.config.singleBranch, true);
  assert.equal(loaded.config.github.owner, "example-org");
});

test("mergeInstanceConfig writes project and field ids", () => {
  const merged = mergeInstanceConfig(
    { github: { owner: "old", repo: "old", projectId: "x" }, mail: { allowlist: [] } },
    {
      owner: "org",
      repo: "repo",
      project: { id: "PVT_real", number: 4 },
      fields: {
        statusId: "PVTSSF_s",
        statusOptions: { Backlog: "1" },
        priorityId: "PVTSSF_p",
        priorityOptions: { P0: "a" },
        targetDateId: "",
        startDateId: "",
      },
    },
  );
  assert.equal(merged.github.projectId, "PVT_real");
  assert.equal(merged.github.projectNumber, 4);
  assert.equal(merged.fields.status.id, "PVTSSF_s");
  assert.equal(merged.fields.status.options.Backlog, "1");
  assert.equal(merged.board.provider, "github");
});

test("writeInstanceConfig refuses kit folder names", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-boot-"));
  assert.throws(() => writeInstanceConfig(root, "autodevelop", {}), /instance folder/);
  const path = writeInstanceConfig(root, "acme", { github: { owner: "org" } });
  assert.match(path, /skills\/acme\/autodevelop\/config.json/);
  assert.equal(JSON.parse(readFileSync(path, "utf8")).github.owner, "org");
  mkdirSync(join(root, ".cursor/skills"), { recursive: true });
});
