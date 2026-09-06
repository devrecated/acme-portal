import test from "node:test";
import assert from "node:assert/strict";
import { extractInventoryPaths, parsePlanTodos, pathExistsInRepo } from "./plan-parse.mjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("parsePlanTodos reads pending items", () => {
  const md = `---
todos:
  - id: one
    content: "Do the thing"
    status: pending
  - id: two
    content: Done
    status: completed
---
# Title
`;
  const todos = parsePlanTodos(md);
  assert.equal(todos.length, 2);
  assert.equal(todos[0].id, "one");
  assert.equal(todos[0].status, "pending");
  assert.equal(todos[1].status, "completed");
});

test("extractInventoryPaths keeps repo paths", () => {
  const paths = extractInventoryPaths(
    "See [x](.cursor/skills/autodevelop/foo/SKILL.md) and `scripts/deploy-hosting-dev.sh`",
  );
  assert.ok(paths.includes(".cursor/skills/autodevelop/foo/SKILL.md"));
  assert.ok(paths.includes("scripts/deploy-hosting-dev.sh"));
});

test("pathExistsInRepo treats origin-folder moves as present", () => {
  assert.equal(pathExistsInRepo(repoRoot, ".cursor/local/gh-projects/session.json"), true);
  assert.equal(
    pathExistsInRepo(repoRoot, ".cursor/skills/autodevelop/ingest-notes-to-project/SKILL.md"),
    true,
  );
  assert.equal(pathExistsInRepo(repoRoot, ".cursor/hooks/lib.mjs"), true);
  assert.equal(
    pathExistsInRepo(repoRoot, ".cursor/skills/autodevelop/config.json"),
    true,
  );
  assert.equal(pathExistsInRepo(repoRoot, ".cursor/skills/does-not-exist/SKILL.md"), false);
  assert.equal(pathExistsInRepo(repoRoot, ".cursor/plans/*.plan.md"), true);
});
