import assert from "node:assert/strict";
import test from "node:test";
import { findRepoRoot } from "../scripts/config-load.mjs";
import { checkFlows } from "./flows-check.mjs";
import { loadCatalog } from "./router.mjs";

const root = findRepoRoot();
const catalog = loadCatalog(root);

/** Problem kinds raised by a synthetic catalog, ignoring the prose checks. */
const kindsFor = (doc) =>
  new Set(
    checkFlows(root, doc)
      .problems.filter((item) => !item.kind.startsWith("page-"))
      .map((item) => item.kind),
  );

const minimal = () => ({
  gate_classes: { mail: { keywords: ["mail"] } },
  router: { fallback_bucket: "search" },
  mcp_buckets: {
    search: {
      title: "Search",
      tool: "bucket_search",
      when: ["which"],
      may_invoke: ["identify-skills"],
      must_never: ["Recurse identify-skills into itself"],
      loops: ["discovery"],
    },
  },
  loops: {
    discovery: {
      bucket: "search",
      gate_class: "none",
      resume_from: "identify-skills",
      steps: ["identify-skills", "find-skills"],
      optional: ["find-skills"],
    },
  },
  wrappers: {},
});

test("the repository as committed passes every flow check", () => {
  const { buckets, loops, wrappers, problems } = checkFlows(root);
  assert.deepEqual(problems, []);
  assert.equal(buckets, 8);
  assert.equal(loops, 7);
  assert.equal(wrappers, 8);
});

test("every catalog loop is named on the loops page and every tool on the buckets page", () => {
  const { problems } = checkFlows(root, catalog);
  assert.deepEqual(
    problems.filter((item) => item.kind.startsWith("page-")),
    [],
  );
});

test("a bucket short of eight is reported", () => {
  assert.ok(kindsFor(minimal()).has("bucket-count"));
});

test("an incomplete bucket is reported", () => {
  const doc = minimal();
  delete doc.mcp_buckets.search.tool;
  doc.mcp_buckets.search.must_never = [];
  const kinds = kindsFor(doc);
  assert.ok(kinds.has("bucket-field"));
});

test("a bucket pointing at a loop that does not exist is reported", () => {
  const doc = minimal();
  doc.mcp_buckets.search.loops = ["discovery", "ghost"];
  assert.ok(kindsFor(doc).has("bucket-loop"));
});

test("a bucket naming an unknown gate class is reported", () => {
  const doc = minimal();
  doc.mcp_buckets.search.gate_class = "nuclear";
  assert.ok(kindsFor(doc).has("bucket-gate"));
});

test("a fallback bucket that is not a bucket is reported", () => {
  const doc = minimal();
  doc.router.fallback_bucket = "nowhere";
  assert.ok(kindsFor(doc).has("router-fallback"));
});

test("a loop whose bucket does not list it back is reported", () => {
  const doc = minimal();
  doc.mcp_buckets.search.loops = [];
  assert.ok(kindsFor(doc).has("loop-backref"));
});

test("resume_from outside the steps is reported", () => {
  const doc = minimal();
  doc.loops.discovery.resume_from = "keep-going";
  assert.ok(kindsFor(doc).has("loop-resume"));
});

test("an optional step that is not a step is reported", () => {
  const doc = minimal();
  doc.loops.discovery.optional = ["never-listed"];
  assert.ok(kindsFor(doc).has("loop-optional"));
});

test("a wrapper pointing at an unknown bucket is reported", () => {
  const doc = minimal();
  doc.wrappers = { ui: { slash: "/ui", bucket: "ui", command: ".cursor/commands/ui.md" } };
  assert.ok(kindsFor(doc).has("wrapper-bucket"));
});

test("a wrapper pairing a loop with the wrong bucket is reported", () => {
  const doc = minimal();
  doc.mcp_buckets.board = {
    title: "Board",
    tool: "bucket_board",
    when: ["ticket"],
    may_invoke: ["create-ticket"],
    must_never: ["Deploy"],
    loops: [],
  };
  doc.wrappers = {
    "new-feature": {
      slash: "/new-feature",
      bucket: "board",
      loop: "discovery",
      command: ".cursor/commands/new-feature.md",
    },
  };
  assert.ok(kindsFor(doc).has("wrapper-loop"));
});

test("a wrapper whose command file is missing is reported", () => {
  const doc = minimal();
  doc.wrappers = {
    search: { slash: "/search", bucket: "search", command: ".cursor/commands/search.md" },
  };
  assert.ok(kindsFor(doc).has("wrapper-command"));
});

test("a wrapper whose slash does not match its key is reported", () => {
  const doc = minimal();
  doc.wrappers = {
    search: { slash: "/lookup", bucket: "search", command: ".cursor/commands/ui.md" },
  };
  assert.ok(kindsFor(doc).has("wrapper-slash"));
});

test("a missing flow page is reported", () => {
  const { problems } = checkFlows("/tmp/autodevelop-flows-check-nowhere", catalog);
  const kinds = problems.map((item) => item.kind);
  assert.ok(kinds.includes("page-missing"));
});
