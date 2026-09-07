import assert from "node:assert/strict";
import test from "node:test";
import {
  asList,
  decideRoute,
  gateClass,
  loadCatalog,
  scoreBuckets,
  tokenize,
} from "./router.mjs";

const catalog = loadCatalog();
const route = (utterance, signals = {}) => decideRoute(utterance, signals, catalog);

/** One representative utterance per bucket. Every bucket must be reachable. */
const BUCKET_FIXTURES = [
  ["board", "file a ticket on the board for this"],
  ["ui", "the component layout breaks on mobile"],
  ["build", "the api endpoint returns the wrong schema"],
  ["message", "email the stakeholder a recap"],
  ["ship", "promote to production"],
  ["docs", "update the handbook and the vitepress guide"],
  ["search", "which skill applies to this research"],
  ["secure", "a credential leaked into the env file"],
];

test("asList normalizes the shapes parseSimpleYaml returns", () => {
  assert.deepEqual(asList(["a", "b"]), ["a", "b"]);
  assert.deepEqual(asList([]), []);
  assert.deepEqual(asList("[]"), []);
  assert.deepEqual(asList(""), []);
  assert.deepEqual(asList(null), []);
  assert.deepEqual(asList("solo"), ["solo"]);
});

test("tokenize splits on punctuation and lowercases", () => {
  assert.deepEqual([...tokenize("Deploy, to PROD-now!")], ["deploy", "to", "prod", "now"]);
});

test("the catalog carries eight buckets and every wrapper points at one", () => {
  assert.equal(Object.keys(catalog.mcp_buckets).length, 8);
  for (const [name, wrapper] of Object.entries(catalog.wrappers)) {
    assert.ok(catalog.mcp_buckets[wrapper.bucket], `${name} points at unknown bucket ${wrapper.bucket}`);
    if (wrapper.loop) {
      assert.ok(catalog.loops[wrapper.loop], `${name} points at unknown loop ${wrapper.loop}`);
    }
  }
});

test("every bucket is reachable from a representative utterance", () => {
  for (const [bucket, utterance] of BUCKET_FIXTURES) {
    assert.equal(route(utterance).bucket, bucket, `"${utterance}" should land on ${bucket}`);
  }
});

test("gate classes are read off the utterance", () => {
  assert.equal(gateClass("send the digest", catalog).gate, "mail");
  assert.equal(gateClass("deploy to staging", catalog).gate, "deploy");
  assert.equal(gateClass("delete the old branch", catalog).gate, "destructive");
  assert.equal(gateClass("add a loading spinner", catalog).gate, "none");
});

test("mail and deploy always ask, even when one bucket wins outright", () => {
  const mail = route("email the stakeholder a recap");
  assert.equal(mail.bucket, "message");
  assert.equal(mail.gate, "mail");
  assert.equal(mail.ask, true);

  const deploy = route("deploy to staging");
  assert.equal(deploy.bucket, "ship");
  assert.equal(deploy.gate, "deploy");
  assert.equal(deploy.ask, true);
});

test("pinBucket skips scoring and still honors a mail gate", () => {
  const pinned = route("the api schema is wrong", { pinBucket: "ui" });
  assert.equal(pinned.bucket, "ui");
  assert.match(pinned.reason, /Pinned ui/);
  assert.equal(pinned.ask, false);

  const gated = route("email the stakeholder a recap", { pinBucket: "board" });
  assert.equal(gated.bucket, "board");
  assert.equal(gated.gate, "mail");
  assert.equal(gated.ask, true);
});

test("an explicit wrapper pins the bucket and beats the keywords", () => {
  const decision = route("the api schema is wrong", { wrapper: "/ui" });
  assert.equal(decision.bucket, "ui");
  assert.match(decision.reason, /Wrapper \/ui pins ui/);
  assert.equal(decision.ask, false);
});

test("a wrapper carries its loop and still cannot clear a gate", () => {
  const decision = route("send the weekly recap", { wrapper: "/communication" });
  assert.equal(decision.bucket, "message");
  assert.equal(decision.loop, "weekly_reporting");
  assert.equal(decision.ask, true);
  assert.equal(decision.gate, "mail");
});

test("a near tie asks and names both candidates", () => {
  const decision = route("the ticket list is broken");
  assert.equal(decision.ask, true);
  assert.match(decision.reason, /board 2 vs build 2 is within 2/);
  assert.deepEqual(
    decision.candidates.slice(0, 2).map((item) => item.bucket).toSorted(),
    ["board", "build"],
  );
});

test("an empty utterance routes to Search without asking", () => {
  const decision = route("");
  assert.equal(decision.bucket, "search");
  assert.equal(decision.ask, false);
  assert.match(decision.reason, /Falling back to Search/);
});

test("changed paths break a tie the words alone cannot", () => {
  const words = route("update the list");
  const withPaths = route("update the list", { paths: ["web/app/src/List.tsx"] });
  assert.notEqual(withPaths.bucket, words.bucket);
  assert.equal(withPaths.bucket, "ui");
  assert.ok(withPaths.candidates[0].matched.includes("web/"));
});

test("branch role lifts Ship only when the bucket claims that role", () => {
  const onStaging = scoreBuckets("push this", { branchRole: "staging" }, catalog);
  const ship = onStaging.find((item) => item.bucket === "ship");
  assert.ok(ship.matched.includes("branch:staging"));
  const ui = onStaging.find((item) => item.bucket === "ui");
  assert.equal(ui.score, 0);
});

test("session stickiness breaks an exact tie only", () => {
  const tie = route("the ticket list is broken", { previousBucket: "build" });
  assert.equal(tie.bucket, "build");
  assert.equal(tie.ask, false);
  assert.match(tie.reason, /Staying in build/);
});

test("session stickiness never overrides a gate", () => {
  const decision = route("delete the ticket", { previousBucket: "build" });
  assert.equal(decision.gate, "destructive");
  assert.equal(decision.ask, true);
  assert.doesNotMatch(decision.reason, /Staying in/);
});

test("a bucket with two loops does not guess between them", () => {
  assert.equal(route("the api endpoint returns the wrong schema").loop, null);
  assert.equal(route("debug this", { wrapper: "/debug" }).loop, "debug");
  assert.equal(route("testing", { wrapper: "/testing" }).loop, "testing");
});

test("the router advertises no side-effect authority", () => {
  const never = asList(catalog.router.never);
  for (const claim of ["write mail", "create an issue", "deploy"]) {
    assert.ok(never.includes(claim), `router.never must list ${claim}`);
  }
});
