#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 *
 * Plan and apply GitHub repo / org / Project invitations from people.json
 * plus ad-hoc --github / --email. Dry-run unless --apply.
 */
import { fileURLToPath } from "node:url";
import { findRepoRoot, loadConfig } from "./config-load.mjs";
import { argValue, fail, hasFlag, normalizeEmail, parseArgs, printJson, runCommand } from "./lib.mjs";
import { readPeopleFile } from "./people.mjs";
import { isBoundProjectId, readBootstrapMarker, writeBootstrapMarker } from "./bootstrap-project.mjs";

export const normalizeLogin = (login) => String(login || "").replace(/^@/, "").trim();

export const projectRoleFor = (role) => (role === "developer" ? "WRITER" : "READER");

export const collectInvitees = ({ people, extraGithub = [], extraEmail = [] } = {}) => {
  const out = [];
  const seenGithub = new Set();
  const seenEmail = new Set();
  const push = (entry) => {
    const github = normalizeLogin(entry.github);
    const email = normalizeEmail(entry.email);
    if (github) seenGithub.add(github.toLowerCase());
    if (email) seenEmail.add(email);
    if (github || email) out.push({ ...entry, github, email });
  };
  for (const person of people?.developers || []) {
    push({
      role: "developer",
      name: person.name || "",
      github: person.github,
      email: person.email,
    });
  }
  for (const person of people?.stakeholders || []) {
    push({
      role: "stakeholder",
      name: person.name || "",
      github: person.github,
      email: person.email,
    });
  }
  for (const login of extraGithub) {
    const github = normalizeLogin(login);
    if (!github || seenGithub.has(github.toLowerCase())) continue;
    push({ role: "developer", name: "", github, email: "" });
  }
  for (const emailRaw of extraEmail) {
    const email = normalizeEmail(emailRaw);
    if (!email || seenEmail.has(email)) continue;
    push({ role: "stakeholder", name: "", github: "", email });
  }
  return out;
};

export const planInvites = ({
  invitees = [],
  owner,
  repo,
  projectId,
  inviteOrg = false,
} = {}) => {
  if (!owner || !repo) throw new Error("github.owner and github.repo are required.");
  return invitees.map((person) => {
    const steps = [];
    if (person.github) {
      steps.push({
        kind: "repo",
        method: "PUT",
        path: `repos/${owner}/${repo}/collaborators/${person.github}`,
        permission: "push",
      });
      if (inviteOrg) {
        steps.push({
          kind: "org",
          method: "PUT",
          path: `orgs/${owner}/memberships/${person.github}`,
          role: "member",
        });
      }
      if (isBoundProjectId(projectId)) {
        steps.push({
          kind: "project",
          mutation: "updateProjectV2Collaborators",
          role: projectRoleFor(person.role),
        });
      }
    } else if (person.email) {
      if (inviteOrg) {
        steps.push({
          kind: "org-email",
          method: "POST",
          path: `orgs/${owner}/invitations`,
          email: person.email,
          role: "direct_member",
        });
      }
      steps.push({
        kind: "project",
        skip: "email-only: wait for a GitHub account before project collaborator",
      });
    }
    return { person, steps };
  });
};

export const projectCollaboratorsMutation = (projectId, userId, role) => ({
  query: `mutation($p:ID!,$c:[ProjectV2Collaborator!]!){ updateProjectV2Collaborators(input:{projectId:$p, collaborators:$c}){ collaborators(first:1){ totalCount } } }`,
  variables: { p: projectId, c: [{ userId, role }] },
});

const orgOwnerDenied = (stderr) =>
  /must be an organization owner|org owner|Resource not accessible|HTTP 403|status 403/i.test(
    String(stderr || ""),
  );

export const applyInvitePlan = ({
  plan,
  projectId,
  dryRun = true,
  runGh = (args) => runCommand("gh", args, { dryRun }),
} = {}) => {
  const results = [];
  for (const row of plan) {
    const applied = [];
    for (const step of row.steps) {
      if (step.skip) {
        applied.push({ ...step, status: "skipped" });
        continue;
      }
      if (dryRun) {
        applied.push({ ...step, status: "dry-run" });
        continue;
      }
      try {
        if (step.kind === "repo") {
          const result = runGh([
            "api",
            "--method",
            "PUT",
            step.path,
            "-f",
            `permission=${step.permission}`,
          ]);
          if (!result.ok) throw new Error(result.stderr || "repo invite failed");
          applied.push({ ...step, status: result.status === 204 ? "already" : "invited" });
        } else if (step.kind === "org") {
          const result = runGh(["api", "--method", "PUT", step.path, "-f", `role=${step.role}`]);
          if (!result.ok) {
            if (orgOwnerDenied(result.stderr)) {
              throw new Error(
                "Org invite needs an organization owner and admin:org (or repo) scope. Run: gh auth refresh -s admin:org",
              );
            }
            throw new Error(result.stderr || "org invite failed");
          }
          applied.push({ ...step, status: "invited" });
        } else if (step.kind === "org-email") {
          const result = runGh([
            "api",
            "--method",
            "POST",
            step.path,
            "-f",
            `email=${step.email}`,
            "-f",
            `role=${step.role}`,
          ]);
          if (!result.ok) {
            if (orgOwnerDenied(result.stderr)) {
              throw new Error(
                "Org invite needs an organization owner and admin:org (or repo) scope. Run: gh auth refresh -s admin:org",
              );
            }
            throw new Error(result.stderr || "org email invite failed");
          }
          applied.push({ ...step, status: "invited" });
        } else if (step.kind === "project") {
          const user = runGh(["api", `users/${row.person.github}`]);
          if (!user.ok) throw new Error(user.stderr || `could not resolve users/${row.person.github}`);
          const nodeId = JSON.parse(user.stdout || "{}").node_id;
          if (!nodeId) throw new Error(`users/${row.person.github} has no node_id yet`);
          const body = projectCollaboratorsMutation(projectId, nodeId, step.role);
          const result = runGh(["api", "graphql", "--input", "-"], { input: JSON.stringify(body) });
          if (!result.ok && !result.dryRun) throw new Error(result.stderr || "project collaborator failed");
          applied.push({ ...step, status: "invited" });
        }
      } catch (error) {
        applied.push({ ...step, status: "error", error: error.message });
      }
    }
    results.push({ person: row.person, steps: applied });
  }
  return results;
};

export const invitedSummary = (results) =>
  results.flatMap((row) => {
    const github = row.person.github || "";
    const email = row.person.email || "";
    return row.steps
      .filter((step) => step.status === "invited" || step.status === "already" || step.status === "dry-run")
      .map((step) => ({
        github,
        email,
        repo: step.kind === "repo",
        org: step.kind === "org" || step.kind === "org-email",
        project: step.kind === "project" && !step.skip,
      }));
  });

const parseList = (raw) =>
  String(raw || "")
    .split(/[,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

const main = () => {
  const args = parseArgs();
  const apply = hasFlag(args, "apply");
  const dryRun = !apply;
  const fromPeople = hasFlag(args, "from-people") || (!argValue(args, "github") && !argValue(args, "email"));
  try {
    const root = argValue(args, "workspace") || findRepoRoot();
    const loaded = loadConfig({ allowExample: true, root });
    const { people } = fromPeople ? readPeopleFile(root) : { people: { developers: [], stakeholders: [] } };
    const extraGithub = parseList(argValue(args, "github"));
    const extraEmail = parseList(argValue(args, "email"));
    const invitees = collectInvitees({ people: fromPeople ? people : { developers: [], stakeholders: [] }, extraGithub, extraEmail });
    if (!invitees.length) fail("No people to invite. Add people.json or pass --github / --email.");
    const plan = planInvites({
      invitees,
      owner: loaded.config.github.owner,
      repo: loaded.config.github.repo,
      projectId: loaded.config.github.projectId,
      inviteOrg: hasFlag(args, "org"),
    });
    const runGh = (ghArgs, extra = {}) =>
      runCommand("gh", ghArgs, { dryRun, spawn: extra.input ? { input: extra.input } : undefined });
    const results = applyInvitePlan({
      plan,
      projectId: loaded.config.github.projectId,
      dryRun,
      runGh,
    });
    if (!dryRun) {
      const { marker } = readBootstrapMarker(root);
      writeBootstrapMarker(root, {
        completedAt: marker?.completedAt || new Date().toISOString(),
        projectId: loaded.config.github.projectId,
        invited: [...(marker?.invited || []), ...invitedSummary(results)],
      });
    }
    printJson({ ok: true, dryRun, results });
  } catch (error) {
    fail(error.message);
  }
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) main();
