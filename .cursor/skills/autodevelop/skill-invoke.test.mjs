import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { invokeMode, loadSkillInvoke, recordSkillInvoke } from "./skill-invoke.mjs";

const root = mkdtempSync(join(tmpdir(), "skill-invoke-"));
mkdirSync(join(root, ".cursor", "skills", "autodevelop"), { recursive: true });
writeFileSync(
  join(root, ".cursor", "skills", "autodevelop", "skill-invoke.yaml"),
  ["version: 1", "default: automatic", "skills:", "  rogue-worktree-cleanup:", "    invoke: manual", ""].join("\n"),
);

const doc = loadSkillInvoke(root);
assert.equal(doc.default, "automatic");
assert.equal(invokeMode("rogue-worktree-cleanup", root), "manual");
assert.equal(invokeMode("/rogue-worktree-cleanup", root), "manual");
assert.equal(invokeMode("identify-skills", root), "automatic");

const row = recordSkillInvoke({ name: "rogue-worktree-cleanup", mode: "manual", at: "2026-08-28T14:00:00.000Z" }, root);
assert.equal(row.name, "rogue-worktree-cleanup");
assert.equal(row.mode, "manual");
console.log("skill-invoke.test.mjs ok");
