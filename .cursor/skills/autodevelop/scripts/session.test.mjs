/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isTicketProgressPath, shouldAskProgress } from "./session.mjs";

test("shouldAskProgress is silent without new file touches", () => {
  assert.equal(shouldAskProgress(null), false);
  assert.equal(shouldAskProgress({ issue: 842 }), false);
  assert.equal(
    shouldAskProgress({
      issue: 842,
      lastProgressAt: "2026-08-21T19:48:00.000Z",
    }),
    false,
  );
  assert.equal(
    shouldAskProgress({
      issue: 842,
      lastTouchedAt: "2026-08-21T19:47:00.000Z",
      lastProgressAt: "2026-08-21T19:48:00.000Z",
    }),
    false,
  );
});

test("Devrecated and local paths are not ticket progress", () => {
  assert.equal(isTicketProgressPath(".cursor/hooks/autodevelop/process/ticket-progress-stop.mjs"), false);
  assert.equal(isTicketProgressPath(".cursor/local/gh-projects/session.json"), false);
  assert.equal(isTicketProgressPath("docs/devrecated-autodevelop/index.md"), false);
  assert.equal(isTicketProgressPath("web/app/src/views/SuperAdmin/Inventory/Inventory.tsx"), true);
});

test("shouldAskProgress speaks only after new touches", () => {
  assert.equal(
    shouldAskProgress({
      issue: 842,
      lastTouchedAt: "2026-08-21T19:50:00.000Z",
    }),
    true,
  );
  assert.equal(
    shouldAskProgress({
      issue: 842,
      lastTouchedAt: "2026-08-21T19:50:00.000Z",
      lastProgressAt: "2026-08-21T19:48:00.000Z",
    }),
    true,
  );
});
