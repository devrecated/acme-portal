import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { lstatSync } from "node:fs";
import { join } from "node:path";
import {
  formatWorktreeBlock,
  isLinkedWorktree,
  listCheckoutRows,
  listLinkedWorktrees,
  matchCheckouts,
  replyHasWorktreeFooter,
} from "./worktree-info.mjs";

const block = formatWorktreeBlock({
  directory: "/tmp/wt",
  branch: "feat/demo",
  commits: "abc123 feat: demo",
  created: "2026-08-28T12:00:00.000Z",
  pushed: false,
});

assert.equal(
  block,
  [
    "- worktree: /tmp/wt",
    "- branch: feat/demo",
    "- commits: abc123 feat: demo",
    "- created: 2026-08-28T12:00:00.000Z",
    "- pushed: false",
    "- checkout: cursor --reuse-window /tmp/wt",
  ].join("\n"),
);
assert.equal(replyHasWorktreeFooter(block), true);
assert.equal(replyHasWorktreeFooter("hello"), false);

const top = execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim();
// The suite also runs from linked worktrees, so take the expectation from git
// rather than assuming the primary checkout.
const linked = lstatSync(join(top, ".git")).isFile();
assert.equal(isLinkedWorktree(top), linked);
assert.equal(
  listLinkedWorktrees(top).some((row) => row.directory === top),
  linked,
);
assert.equal(
  listCheckoutRows(top).some((row) => row.directory === top),
  true,
);
const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { encoding: "utf8" }).trim();
const byBranch = matchCheckouts(branch, top);
assert.ok(byBranch.some((row) => row.directory === top));
assert.equal(matchCheckouts("no-such-worktree-zzz", top).length, 0);
console.log("worktree-info.test.mjs ok");
