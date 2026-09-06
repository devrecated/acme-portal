/**
 * Copyright (c) 2026 Devrecated
 */
import test from "node:test";
import assert from "node:assert/strict";
import { findRepoRoot } from "../../../scripts/config-load.mjs";
import { WORKFLOWS, checkInventory, listWorkflowFiles } from "./inventory.mjs";

test("expected workflows are on disk and linked from index", () => {
  const { missing } = checkInventory(findRepoRoot());
  assert.equal(missing.length, 0, missing.map((item) => `${item.kind}:${item.name}`).join(", "));
});

test("workflow list matches files on disk", () => {
  const onDisk = listWorkflowFiles(findRepoRoot());
  assert.deepEqual(onDisk, [...WORKFLOWS].toSorted());
});
