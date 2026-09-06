/**
 * Copyright (c) 2026 Devrecated.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { classifySessionOutcome } from "../../../skills/autodevelop/scripts/outcomes-client.mjs";

test("session-end success requires a claimed ticket and no hard-fail flags", () => {
  const row = classifySessionOutcome({
    session: { issue: 88, status: "In progress" },
    state: { flags: [], successLogged: null },
  });
  assert.equal(row.outcome, "success");
  assert.equal(row.skill, "session-end");
});

test("unlogged doctor flag is a Failed outcome", () => {
  const row = classifySessionOutcome({
    session: { issue: 88 },
    state: {
      flags: [{ logged: false, error_class: "doctor_fail", skill: "doctor", feedback: "gh" }],
    },
  });
  assert.equal(row.outcome, "failure");
  assert.equal(row.feedback, "gh");
});
