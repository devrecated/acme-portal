import test from "node:test";
import assert from "node:assert/strict";
import {
  HALF_LIFE_DAYS,
  PROD_HAZARD_WEIGHT,
  anscombe,
  clamp,
  combineComponentZ,
  countHygiene,
  daysBetween,
  empiricalBayes,
  hazardIntegral,
  intensityAt,
  issueHygieneFromHazard,
  median,
  riskFromHazard,
  skillFromQuality,
  softmaxLogContribution,
  trendScore,
} from "./math-model.mjs";

test("same events yield the same hazard", () => {
  const events = [
    { t: 0, w: 2 },
    { t: 10, w: 4 },
    { t: 40, w: 1 },
  ];
  const a = hazardIntegral(events, 80);
  const b = hazardIntegral(events, 80);
  assert.equal(a, b);
  assert.ok(a > 0);
});

test("a recent critical event raises intensity now more than an old one", () => {
  const recent = intensityAt([{ t: 88, w: 4 }], 90);
  const old = intensityAt([{ t: 0, w: 4 }], 90);
  assert.ok(recent > old, `recent λ ${recent} vs old λ ${old}`);
});

test("n=0 hygiene is 100", () => {
  assert.equal(issueHygieneFromHazard(0, 0), 100);
  assert.equal(countHygiene(0), 100);
});

test("production hazard is weighted higher than staging", () => {
  const events = [{ t: 10, w: 2 }];
  const H = hazardIntegral(events, 40);
  const stgOnly = issueHygieneFromHazard(H, 0);
  const prodOnly = issueHygieneFromHazard(0, H);
  assert.ok(prodOnly < stgOnly);
  assert.ok(Math.abs(Math.log(stgOnly / 100) + H) < 1e-9);
  assert.ok(Math.abs(Math.log(prodOnly / 100) + PROD_HAZARD_WEIGHT * H) < 1e-9);
});

test("empirical Bayes shrinks n=1 toward mu more than n=80", () => {
  const mu = 50;
  const raw = 90;
  const n1 = empiricalBayes(raw, mu, 1);
  const n80 = empiricalBayes(raw, mu, 80);
  assert.ok(Math.abs(n1 - mu) < Math.abs(n80 - mu));
  assert.ok(n80 > n1);
});

test("Anscombe is variance-stabilizing shape 2√(n+3/8)", () => {
  assert.ok(Math.abs(anscombe(0) - 2 * Math.sqrt(3 / 8)) < 1e-12);
  assert.ok(anscombe(10) > anscombe(1));
  assert.ok(countHygiene(10) < countHygiene(1));
  assert.ok(countHygiene(50) < countHygiene(10));
});

test("softmax-log contribution does not crush #2 when #1 has 10× lines", () => {
  const [a, b] = softmaxLogContribution([10_000, 1_000]);
  assert.equal(a, 100);
  assert.ok(b > 5, `second should stay visible, got ${b}`);
  assert.ok(b < 20);
});

test("intensity decays with the 90-day half-life", () => {
  const events = [{ t: 0, w: 1 }];
  const now = intensityAt(events, 0);
  const half = intensityAt(events, HALF_LIFE_DAYS);
  assert.ok(Math.abs(now - 1) < 1e-12);
  assert.ok(Math.abs(half - 0.5) < 1e-9);
});

test("trend is negative when intensity rose in the last 30 days", () => {
  const events = [{ t: 89, w: 4 }];
  const trend = trendScore(events, 90);
  assert.ok(trend < 0, `expected accelerating defects, got ${trend}`);
});

test("risk and skill maps are bounded", () => {
  assert.equal(riskFromHazard(0), 0);
  assert.ok(riskFromHazard(10) > 90);
  assert.equal(skillFromQuality(80, 0, 0), 80);
  assert.ok(skillFromQuality(80, 5, 0) < 80);
  assert.equal(clamp(120, 0, 100), 100);
});

test("daysBetween is signed days", () => {
  assert.equal(daysBetween("2026-01-01T00:00:00Z", "2026-01-02T00:00:00Z"), 1);
});

test("peer z-combination is 50 when everyone is identical", () => {
  const weights = { a: 0.5, b: 0.5 };
  const peer = { a: [10, 10, 10], b: [20, 20, 20] };
  const q = combineComponentZ({ a: 10, b: 20 }, weights, peer);
  assert.ok(Math.abs(q - 50) < 1e-6, q);
});

test("median of even list averages the middle pair", () => {
  assert.equal(median([1, 2, 3, 4]), 2.5);
});
