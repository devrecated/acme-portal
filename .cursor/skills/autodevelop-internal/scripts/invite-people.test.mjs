/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  collectInvitees,
  invitedSummary,
  normalizeLogin,
  planInvites,
  projectCollaboratorsMutation,
  projectRoleFor,
} from "./invite-people.mjs";

const people = {
  developers: [{ name: "Alex", github: "@alex", email: "alex@example.com" }],
  stakeholders: [{ name: "Pat", github: "pat", email: "pat@example.com" }],
};

test("collectInvitees reads people.json and ad-hoc github/email", () => {
  const invitees = collectInvitees({
    people,
    extraGithub: ["@alex", "newdev"],
    extraEmail: ["pat@example.com", "extra@example.com"],
  });
  assert.equal(invitees.filter((p) => p.github === "alex").length, 1);
  assert.ok(invitees.some((p) => p.github === "newdev" && p.role === "developer"));
  assert.ok(invitees.some((p) => p.email === "extra@example.com" && !p.github));
  assert.equal(normalizeLogin("@alex"), "alex");
});

test("planInvites is dry-runnable and has no network", () => {
  const invitees = collectInvitees({
    people,
    extraGithub: ["newdev"],
    extraEmail: ["only@example.com"],
  });
  const plan = planInvites({
    invitees,
    owner: "org",
    repo: "repo",
    projectId: "PVT_kwHOBFsz584ACkb9",
    inviteOrg: true,
  });
  const alex = plan.find((row) => row.person.github === "alex");
  assert.deepEqual(
    alex.steps.map((s) => s.kind),
    ["repo", "org", "project"],
  );
  assert.equal(alex.steps[0].path, "repos/org/repo/collaborators/alex");
  assert.equal(alex.steps[2].role, "WRITER");
  const pat = plan.find((row) => row.person.github === "pat");
  assert.equal(projectRoleFor(pat.person.role), "READER");
  const emailOnly = plan.find((row) => row.person.email === "only@example.com");
  assert.ok(emailOnly.steps.some((s) => s.kind === "org-email"));
  assert.ok(emailOnly.steps.some((s) => s.skip));
});

test("placeholder project id skips project collaborator", () => {
  const plan = planInvites({
    invitees: [{ role: "developer", github: "alex", email: "a@b.com" }],
    owner: "org",
    repo: "repo",
    projectId: "PVT_xxxxxxxxxxxxxxxx",
    inviteOrg: false,
  });
  assert.deepEqual(
    plan[0].steps.map((s) => s.kind),
    ["repo"],
  );
});

test("projectCollaboratorsMutation and invitedSummary stay redacted of tokens", () => {
  const body = projectCollaboratorsMutation("PVT_1", "U_1", "WRITER");
  assert.equal(body.variables.c[0].role, "WRITER");
  const summary = invitedSummary([
    {
      person: { github: "alex", email: "alex@example.com" },
      steps: [
        { kind: "repo", status: "dry-run" },
        { kind: "project", status: "dry-run" },
      ],
    },
  ]);
  assert.equal(summary[0].repo, true);
  assert.equal(summary[1].project, true);
  assert.equal(JSON.stringify(summary).includes("token"), false);
});
