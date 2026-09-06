/**
 * Copyright (c) 2026 Devrecated.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  BILLING_EXPIRED,
  classifySessionOutcome,
  consumeOutcomeDecision,
  detectWorkspaceKind,
  feedbackEndpoint,
  logDoctorRun,
  normalizeOutcomePayload,
  outcomesEndpoint,
  postOutcome,
  readOutcomeState,
  sanitizeFeedback,
  writeOutcomeFlag,
} from "./outcomes-client.mjs";

test("outcomesEndpoint derives /outcomes from the entitlement URL", () => {
  assert.equal(outcomesEndpoint(""), "");
  assert.equal(outcomesEndpoint("http://127.0.0.1:8787"), "http://127.0.0.1:8787/outcomes");
  assert.equal(
    outcomesEndpoint("http://127.0.0.1:8787/entitlement"),
    "http://127.0.0.1:8787/outcomes",
  );
  assert.equal(feedbackEndpoint("http://127.0.0.1:8787/entitlement"), "http://127.0.0.1:8787/feedback");
});

test("sanitizeFeedback strips tokens and does not keep chat-sized secrets", () => {
  const raw =
    "Bearer eyJhbGciOiJIUzI1NiJ9.aaa.bbb TOKEN=ad_abcdefghijklmnopqrstuvwxyz012345 password=hunter2 the login failed";
  const cleaned = sanitizeFeedback(raw);
  assert.match(cleaned, /login failed/);
  assert.equal(cleaned.includes("eyJ"), false);
  assert.equal(cleaned.includes("hunter2"), false);
  assert.equal(cleaned.includes("ad_abcdefghijklmnopqrstuvwxyz012345"), false);
  assert.match(cleaned, /\[redacted\]/);
});

test("normalizeOutcomePayload rejects unknown source and caps fields", () => {
  assert.throws(() => normalizeOutcomePayload({ outcome: "success" }), /source must be/);
  const row = normalizeOutcomePayload({
    source: "plugin",
    outcome: "nope",
    skill: "doctor",
    error_class: "Doctor Fail!!",
    feedback: "ok",
    workspace_kind: "internal",
  });
  assert.equal(row.outcome, "unknown");
  assert.equal(row.error_class, "doctor_fail");
  assert.equal(row.skill, "doctor");
});

test("classifySessionOutcome logs failure flags then success once per ticket", () => {
  const failure = classifySessionOutcome({
    session: { issue: 12 },
    state: { flags: [{ logged: false, error_class: "doctor_fail", skill: "doctor" }] },
  });
  assert.equal(failure.outcome, "failure");
  assert.equal(failure.error_class, "doctor_fail");

  assert.equal(
    classifySessionOutcome({
      session: { issue: 12 },
      state: { flags: [{ logged: true, error_class: "doctor_fail" }] },
    }),
    null,
  );

  const success = classifySessionOutcome({
    session: { issue: 12, status: "In progress" },
    state: { flags: [] },
  });
  assert.equal(success.outcome, "success");
  assert.equal(success.issue, 12);

  assert.equal(
    classifySessionOutcome({
      session: { issue: 12 },
      state: { flags: [], successLogged: { issue: 12 } },
    }),
    null,
  );

  assert.equal(classifySessionOutcome({ session: null, state: { flags: [] } }), null);
});

test("flag file stays local and consume marks flags logged", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-outcomes-"));
  try {
    writeOutcomeFlag({ error_class: "doctor_fail", skill: "doctor", logged: false }, root);
    consumeOutcomeDecision({ action: "failure" }, root);
    const state = readOutcomeState(root);
    assert.equal(state.flags[0].logged, true);
    assert.match(readFileSync(state.path, "utf8"), /doctor_fail/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("this kit repo is internal workspace_kind", () => {
  assert.equal(detectWorkspaceKind(), "internal");
});

test("postOutcome is fail-open when the host is down", async () => {
  const result = await postOutcome(
    { source: "plugin", outcome: "failure", error_class: "host_error" },
    {
      env: { AUTODEVELOP_ENTITLEMENT_URL: "http://127.0.0.1:1" },
      fetchImpl: async () => {
        throw new Error("ECONNREFUSED");
      },
    },
  );
  assert.equal(result.ok, false);
});

test("logDoctorRun posts doctor_fail and does not throw", async () => {
  const root = mkdtempSync(join(tmpdir(), "ad-doctor-"));
  const calls = [];
  try {
    await logDoctorRun(
      { ok: false, root, hardFails: ["gh", "hooks.json"] },
      { ok: false, detail: BILLING_EXPIRED },
      {
        env: { AUTODEVELOP_ENTITLEMENT_URL: "http://outcomes.test" },
        fetchImpl: async (url, init) => {
          calls.push({ url, body: JSON.parse(init.body) });
          return new Response("{}", { status: 201 });
        },
      },
    );
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.error_class, "doctor_fail");
    assert.equal(calls[0].body.feedback, "gh, hooks.json");
    assert.equal(JSON.stringify(calls).includes("Bearer"), false);
    const state = readOutcomeState(root);
    assert.equal(state.flags.some((flag) => flag.error_class === "billing_expired" && flag.logged), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
