/**
 * Copyright (c) 2026 Devrecated
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  COLLIDING_SKILLS,
  applyImport,
  installUserLocalPlugin,
  listCollidingSkillDirs,
  planImport,
  remainingSkillsByCategory,
  renderCategoriesMarkdown,
} from "./import-autodevelop.mjs";

test("collision list is unique and complete", () => {
  assert.equal(new Set(COLLIDING_SKILLS).size, COLLIDING_SKILLS.length);
  assert.ok(COLLIDING_SKILLS.length >= 90, `expected 90+ colliding names, got ${COLLIDING_SKILLS.length}`);
  assert.ok(COLLIDING_SKILLS.includes("onboard-client"));
  assert.ok(COLLIDING_SKILLS.includes("identify-skills"));
});

test("listCollidingSkillDirs only matches allowlisted SKILL.md folders", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-import-"));
  mkdirSync(join(root, "tickets", "ask-adam"), { recursive: true });
  mkdirSync(join(root, "tickets", "keep-me"), { recursive: true });
  mkdirSync(join(root, "gsap", "unique-wave"), { recursive: true });
  writeFileSync(join(root, "tickets", "ask-adam", "SKILL.md"), "# ask-adam\n");
  writeFileSync(join(root, "tickets", "keep-me", "SKILL.md"), "# keep\n");
  writeFileSync(join(root, "gsap", "unique-wave", "SKILL.md"), "# gsap\n");
  const found = listCollidingSkillDirs(root);
  assert.deepEqual(
    found.map((item) => `${item.category}/${item.name}`),
    ["tickets/ask-adam"],
  );
});

const writeKit = () => {
  const kit = mkdtempSync(join(tmpdir(), "ad-import-kit-"));
  mkdirSync(join(kit, ".cursor-plugin"), { recursive: true });
  mkdirSync(join(kit, ".cursor-template", "commands"), { recursive: true });
  mkdirSync(join(kit, ".cursor-template", "skills", "autodevelop", "mcp"), { recursive: true });
  writeFileSync(join(kit, ".cursor-plugin", "plugin.json"), JSON.stringify({ name: "autodevelop" }));
  writeFileSync(join(kit, ".cursor-template", "commands", "import-autodevelop.md"), "# import\n");
  writeFileSync(join(kit, ".cursor-template", "skills", "autodevelop", "mcp", "server.mjs"), "export {}\n");
  writeFileSync(
    join(kit, "mcp.json"),
    JSON.stringify({
      mcpServers: {
        autodevelop: { args: ["${PLUGIN_ROOT}/.cursor/skills/autodevelop/mcp/server.mjs"] },
      },
    }),
  );
  return kit;
};

test("applyImport copies a real plugin directory and removes collisions", () => {
  const home = mkdtempSync(join(tmpdir(), "ad-home-"));
  const skills = join(home, ".cursor", "skills");
  mkdirSync(join(skills, "tickets", "ask-adam"), { recursive: true });
  mkdirSync(join(skills, "gsap", "unique-wave"), { recursive: true });
  writeFileSync(join(skills, "tickets", "ask-adam", "SKILL.md"), "# ask-adam\n");
  writeFileSync(join(skills, "gsap", "unique-wave", "SKILL.md"), "# gsap\n");
  const kitRoot = writeKit();
  const plan = planImport({ kitRoot, home });
  assert.match(plan.commandSource, /\.cursor-template\/commands\/import-autodevelop\.md$/);
  applyImport(plan);
  assert.equal(lstatSync(plan.pluginLink).isSymbolicLink(), false);
  assert.equal(lstatSync(plan.pluginLink).isDirectory(), true);
  assert.equal(existsSync(join(plan.pluginLink, ".cursor-plugin", "plugin.json")), true);
  assert.match(
    readFileSync(join(plan.pluginLink, "mcp.json"), "utf8"),
    /\.cursor-template\/skills\/autodevelop\/mcp\/server\.mjs/,
  );
  assert.equal(existsSync(join(skills, "tickets", "ask-adam")), false);
  assert.equal(existsSync(join(skills, "gsap", "unique-wave", "SKILL.md")), true);
  const md = readFileSync(join(skills, "CATEGORIES.md"), "utf8");
  assert.match(md, /unique-wave/);
  assert.doesNotMatch(md, /ask-adam/);
  assert.deepEqual(remainingSkillsByCategory(skills).gsap, ["unique-wave"]);
  assert.match(renderCategoriesMarkdown({ gsap: ["unique-wave"] }), /## gsap \(1\)/);
});

test("installUserLocalPlugin replaces an out-of-tree symlink", () => {
  const home = mkdtempSync(join(tmpdir(), "ad-plugin-home-"));
  const kit = writeKit();
  const dest = join(home, ".cursor", "plugins", "local", "autodevelop");
  mkdirSync(join(home, ".cursor", "plugins", "local"), { recursive: true });
  symlinkSync(kit, dest);
  installUserLocalPlugin(kit, dest);
  assert.equal(lstatSync(dest).isSymbolicLink(), false);
  assert.equal(existsSync(join(dest, ".cursor-plugin", "plugin.json")), true);
});
