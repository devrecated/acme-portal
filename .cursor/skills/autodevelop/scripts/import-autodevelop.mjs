#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * Install Autodevelop as a user-scope Cursor plugin and drop colliding ~/.cursor/skills.
 */
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findKitRoot } from "./config-load.mjs";

export const USER_SKILL_CATEGORIES = [
  "agent",
  "architecture",
  "capacitor",
  "docs",
  "frontend",
  "gsap",
  "quality",
  "react",
  "shipping",
  "testing",
  "tickets",
];

/** Leaf folder names that Autodevelop already ships. Do not add unique user skills. */
export const COLLIDING_SKILLS = [
  "add-msm-secrets",
  "adding-api-docs",
  "adding-e2e-tests",
  "adding-feature-flags",
  "api-smoke-testing",
  "architecture-decision-records",
  "ask-adam",
  "ask-stakeholder",
  "auditing-performance",
  "auditing-security",
  "bootstrap",
  "capacitor-best-practices",
  "checkout-worktree",
  "code-review",
  "codebase-design",
  "commit-push-branch",
  "commit-push-master",
  "commit-push-release",
  "commit-risk-audit",
  "contribute-upstream",
  "create-branch",
  "create-ticket",
  "creating-pr",
  "database-design",
  "dependabot-triage",
  "deploy-pr-preview",
  "deploy-production-local",
  "deploy-staging-local",
  "diagnosing-bugs",
  "domain-modeling",
  "email-release-digest",
  "feature-demo",
  "find-skills",
  "fixing-broken-links",
  "form-testing",
  "frontend-architect",
  "frontend-design",
  "gemini-notes-to-project",
  "gsap-core",
  "identify-skills",
  "implement",
  "implement-from-plan",
  "improve-codebase-architecture",
  "ingest-notes-to-project",
  "keep-going",
  "keep-secrets-local",
  "mail-voice-dontbeweird",
  "mobile-ux-optimizer",
  "network-request-auditing",
  "new-feature-demo",
  "new-gh-repo",
  "onboard-client",
  "pdf",
  "pptx",
  "promote-master-to-release",
  "prototype",
  "provision-production-release",
  "pull-project-work",
  "react-best-practices",
  "record-docs-media",
  "recording-browser-flow-as-test",
  "remove-tickets",
  "request-prod-approval",
  "research",
  "resolving-merge-conflicts",
  "reviewing-code",
  "rogue-worktree-cleanup",
  "seo-analysis",
  "seo-auditing",
  "setting-up-ci",
  "setup-matt-pocock-skills",
  "share-stakeholder-update",
  "start-work-update",
  "stakeholder-mail-voice",
  "stakeholder-scheduled-email",
  "suggesting-skills",
  "systematic-debugging",
  "tdd",
  "ticket-progress",
  "to-spec",
  "to-tickets",
  "triage",
  "ui-ux-pro-max",
  "update-autodevelop-docs",
  "verify-ticket",
  "vitepress-docs",
  "wayfinder",
  "web-design-expert",
  "web-design-guidelines",
  "web-search-intense",
  "webapp-testing",
  "weekly-delivery-value",
  "weekly-status-update",
  "wizard",
];

const colliding = new Set(COLLIDING_SKILLS);

export const userCursorDir = (home = homedir()) => join(home, ".cursor");

export const listCollidingSkillDirs = (skillsRoot) => {
  if (!existsSync(skillsRoot)) return [];
  const found = [];
  for (const category of USER_SKILL_CATEGORIES) {
    const catDir = join(skillsRoot, category);
    if (!existsSync(catDir)) continue;
    for (const name of readdirSync(catDir, { withFileTypes: true })) {
      if (!name.isDirectory() || !colliding.has(name.name)) continue;
      const dir = join(catDir, name.name);
      if (!existsSync(join(dir, "SKILL.md"))) continue;
      found.push({ category, name: name.name, path: dir });
    }
  }
  return found.toSorted((a, b) => a.path.localeCompare(b.path));
};

export const remainingSkillsByCategory = (skillsRoot) => {
  const groups = {};
  if (!existsSync(skillsRoot)) return groups;
  for (const category of USER_SKILL_CATEGORIES) {
    const catDir = join(skillsRoot, category);
    if (!existsSync(catDir)) continue;
    const names = readdirSync(catDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && existsSync(join(catDir, entry.name, "SKILL.md")))
      .map((entry) => entry.name)
      .sort();
    if (names.length) groups[category] = names;
  }
  return groups;
};

export const renderCategoriesMarkdown = (groups) => {
  const lines = [
    "# Skills by category",
    "",
    "Layout: `~/.cursor/skills/<category>/<skill-name>/SKILL.md`",
    "",
    "**Categories are one word.** Skill names are unchanged (hyphens allowed).",
    "",
    "Root extras (`scripts/`, `commit-push-shared.md`, `deploy-local-shared.md`) are not skills.",
    "",
  ];
  for (const category of USER_SKILL_CATEGORIES) {
    const names = groups[category];
    if (!names?.length) continue;
    lines.push(`## ${category} (${names.length})`, "", names.map((name) => `\`${name}\``).join(" · "), "");
  }
  return `${lines.join("\n").trim()}\n`;
};

/** Cursor rejects local plugins whose symlink target is outside ~/.cursor/plugins/local. */
export const pluginMcpJson = (raw) =>
  String(raw || "").replaceAll("/.cursor/skills/autodevelop/", "/.cursor-template/skills/autodevelop/");

export const removeInstallPath = (path) => {
  if (!existsSync(path)) return;
  if (lstatSync(path).isSymbolicLink()) {
    unlinkSync(path);
    return;
  }
  rmSync(path, { recursive: true, force: true });
};

export const installUserLocalPlugin = (kitRoot, dest) => {
  const pluginDir = join(kitRoot, ".cursor-plugin");
  const templateDir = join(kitRoot, ".cursor-template");
  const mcpSrc = join(kitRoot, "mcp.json");
  if (!existsSync(join(pluginDir, "plugin.json"))) {
    throw new Error("Missing .cursor-plugin/plugin.json");
  }
  if (!existsSync(templateDir)) {
    throw new Error("Missing .cursor-template/");
  }
  if (!existsSync(mcpSrc)) {
    throw new Error("Missing mcp.json");
  }
  if (resolve(kitRoot) === resolve(dest)) return dest;
  mkdirSync(dirname(dest), { recursive: true });
  removeInstallPath(dest);
  mkdirSync(dest, { recursive: true });
  cpSync(pluginDir, join(dest, ".cursor-plugin"), { recursive: true });
  cpSync(templateDir, join(dest, ".cursor-template"), { recursive: true });
  writeFileSync(join(dest, "mcp.json"), pluginMcpJson(readFileSync(mcpSrc, "utf8")));
  return dest;
};

export const planImport = ({ kitRoot = findKitRoot(), home = homedir() } = {}) => {
  const cursor = userCursorDir(home);
  const skillsRoot = join(cursor, "skills");
  return {
    kitRoot,
    pluginLink: join(cursor, "plugins", "local", "autodevelop"),
    commandLink: join(cursor, "commands", "import-autodevelop.md"),
    commandSource: existsSync(join(kitRoot, ".cursor-template", "commands", "import-autodevelop.md"))
      ? join(kitRoot, ".cursor-template", "commands", "import-autodevelop.md")
      : join(kitRoot, ".cursor", "commands", "import-autodevelop.md"),
    colliding: listCollidingSkillDirs(skillsRoot),
    categoriesPath: join(skillsRoot, "CATEGORIES.md"),
  };
};

export const applyImport = (plan) => {
  installUserLocalPlugin(plan.kitRoot, plan.pluginLink);
  if (existsSync(plan.commandSource)) {
    mkdirSync(dirname(plan.commandLink), { recursive: true });
    removeInstallPath(plan.commandLink);
    cpSync(plan.commandSource, plan.commandLink);
  }
  for (const item of plan.colliding) {
    rmSync(item.path, { recursive: true, force: true });
  }
  const groups = remainingSkillsByCategory(dirname(plan.categoriesPath));
  writeFileSync(plan.categoriesPath, renderCategoriesMarkdown(groups));
  return plan;
};

const printPlan = (plan, applied) => {
  const lines = [
    applied ? "Applied Autodevelop user import." : "Dry-run (pass --apply to write).",
    `Kit: ${plan.kitRoot}`,
    `Plugin directory: ${plan.pluginLink}`,
    `Command file: ${plan.commandLink}`,
    `Colliding skills (${plan.colliding.length}):`,
    ...plan.colliding.map((item) => `  ${item.category}/${item.name}`),
    applied ? "Reload Cursor (Developer: Reload Window)." : "No files changed.",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
};

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const apply = process.argv.includes("--apply");
  const plan = planImport();
  if (apply) applyImport(plan);
  printPlan(plan, apply);
}
