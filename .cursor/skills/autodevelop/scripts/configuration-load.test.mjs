/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { findKitRoot } from "./config-load.mjs";
import {
  DEFAULT_KNOBS,
  coerceKnob,
  expandHyperparameters,
  kitConfigurationDir,
  loadConfiguration,
  missingSourceFields,
  needsExpansion,
  resolveHyperparameters,
  summarizeConfiguration,
  writeExpandedYaml,
} from "./configuration-load.mjs";

const writeInstanceConfig = (relName, files) => {
  const root = mkdtempSync(join(tmpdir(), "ad-configuration-"));
  const instanceDir = join(root, ".cursor/skills", relName, "autodevelop", ".configuration");
  mkdirSync(instanceDir, { recursive: true });
  for (const [filename, body] of Object.entries(files)) {
    writeFileSync(join(instanceDir, filename), body);
  }
  return { root, instanceDir };
};

test("coerceKnob parses floats and rejects out-of-range values", () => {
  assert.equal(coerceKnob("temperature", "0.2"), 0.2);
  assert.equal(coerceKnob("temperature", 0.2), 0.2);
  assert.equal(coerceKnob("risk_level", "0"), 0);
  assert.equal(coerceKnob("tone", "coaching"), "coaching");
  assert.throws(() => coerceKnob("temperature", 3), /0–2/);
  assert.throws(() => coerceKnob("risk_level", 9), /0–3/);
  assert.throws(() => coerceKnob("tone", "casual"), /professional/);
  assert.throws(() => coerceKnob("retrieval_limit", 0.5), /integer/);
});

test("needsExpansion is true when precision is low or fields are missing", () => {
  assert.equal(needsExpansion({ ...DEFAULT_KNOBS, precision: "high" }), false);
  assert.equal(needsExpansion({ ...DEFAULT_KNOBS, precision: "low" }), true);
  assert.equal(needsExpansion({ precision: "high", temperature: 0.2 }), true);
  assert.deepEqual(missingSourceFields({ temperature: 0.2 }).includes("tone"), true);
});

test("resolveHyperparameters consumes yaml when precision is low", () => {
  const resolved = resolveHyperparameters({
    config: { precision: "low", temperature: 0.1 },
    yaml: { ...DEFAULT_KNOBS, precision: "low", temperature: 0.5, retrieval_limit: 12 },
  });
  assert.equal(resolved.needsExpand, true);
  assert.equal(resolved.consume, "yaml");
  assert.equal(resolved.knobs.temperature, 0.1);
  assert.equal(resolved.knobs.retrieval_limit, 12);
  assert.equal(resolved.knobs.tone, "professional");
});

test("resolveHyperparameters consumes config when high precision and complete", () => {
  const resolved = resolveHyperparameters({
    config: { ...DEFAULT_KNOBS, precision: "high", temperature: 0.3, risk_level: 2 },
    yaml: { ...DEFAULT_KNOBS, temperature: 0.9 },
  });
  assert.equal(resolved.needsExpand, false);
  assert.equal(resolved.consume, "config");
  assert.equal(resolved.knobs.temperature, 0.3);
  assert.equal(resolved.knobs.risk_level, 2);
});

test("expandHyperparameters fills missing fields inside documented ranges", () => {
  const expanded = expandHyperparameters({ precision: "low", temperature: 0.15, tone: "concise" });
  assert.equal(expanded.precision, "low");
  assert.equal(expanded.temperature, 0.15);
  assert.equal(expanded.tone, "concise");
  assert.equal(expanded.retrieval_limit, DEFAULT_KNOBS.retrieval_limit);
  assert.equal(expanded.expansion.generated, true);
  assert.match(expanded.expansion.system_suffix, /concise/);
  assert.equal(expanded.expansion.tools.context_ask.retrieval_limit, DEFAULT_KNOBS.retrieval_limit);
  assert.ok(expanded.expansion.risk.max_temperature <= 2);
});

test("loadConfiguration uses kit examples when the instance folder is missing", () => {
  const root = mkdtempSync(join(tmpdir(), "ad-configuration-miss-"));
  mkdirSync(join(root, ".cursor/skills"), { recursive: true });
  const loaded = loadConfiguration({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.path, null);
  assert.ok(loaded.names.includes("hyperparameters"));
  assert.equal(loaded.sources["hyperparameters.config"], "default");
  assert.equal(loaded.sources["hyperparameters.yaml"], "default");
  assert.equal(loaded.needsExpand, false);
  assert.equal(loaded.consume, "config");
  assert.equal(loaded.knobs.temperature, 0.2);
  assert.equal(loaded.knobs.risk_level, 1);
  assert.equal(loaded.knobs.tone, "professional");
  assert.equal(loaded.knobs.retrieval_limit, 8);
  assert.equal(loaded.knobs.context_budget, 12000);
  const summary = summarizeConfiguration(loaded);
  assert.deepEqual(summary.files.sort(), ["hyperparameters.config", "hyperparameters.yaml"]);
  assert.equal(summary.precision, "high");
  assert.equal(JSON.stringify(summary).includes("0.2"), false);
});

test("loadConfiguration merges an instance override over kit defaults", () => {
  const { root } = writeInstanceConfig("acme", {
    "hyperparameters.config": [
      "precision: high",
      "temperature: 0.4",
      "risk_level: 2",
      "tone: concise",
      "top_p: 0.9",
      "max_output_tokens: 2048",
      "presence_penalty: 0",
      "frequency_penalty: 0",
      "context_budget: 8000",
      "retrieval_limit: 6",
      "citation_required: 1",
      "timeout_ms: 20000",
      "retry_count: 0",
      "instruction_strength: 1",
      "",
    ].join("\n"),
  });
  const loaded = loadConfiguration({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.instance, "acme");
  assert.equal(loaded.sources["hyperparameters.config"], "instance");
  assert.equal(loaded.sources["hyperparameters.yaml"], "default");
  assert.equal(loaded.knobs.temperature, 0.4);
  assert.equal(loaded.knobs.risk_level, 2);
  assert.equal(loaded.knobs.tone, "concise");
  assert.equal(loaded.knobs.retrieval_limit, 6);
  assert.equal(loaded.knobs.max_output_tokens, 2048);
  assert.equal(loaded.needsExpand, false);
});

test("loadConfiguration flags needsExpand for a sparse instance config", () => {
  const { root } = writeInstanceConfig("acme", {
    "hyperparameters.config": ["precision: low", "temperature: 0.05", ""].join("\n"),
    "hyperparameters.yaml": [
      "precision: low",
      "temperature: 0.05",
      "risk_level: 0",
      "tone: formal",
      "top_p: 1",
      "max_output_tokens: 512",
      "presence_penalty: 0",
      "frequency_penalty: 0",
      "context_budget: 4000",
      "retrieval_limit: 4",
      "citation_required: 1",
      "timeout_ms: 15000",
      "retry_count: 2",
      "instruction_strength: 3",
      "",
    ].join("\n"),
  });
  const loaded = loadConfiguration({ root, kitRoot: findKitRoot() });
  assert.equal(loaded.needsExpand, true);
  assert.equal(loaded.consume, "yaml");
  assert.equal(loaded.knobs.temperature, 0.05);
  assert.equal(loaded.knobs.tone, "formal");
  assert.equal(loaded.knobs.retrieval_limit, 4);
  assert.equal(loaded.knobs.risk_level, 0);
});

test("writeExpandedYaml fills yaml from a sparse config", () => {
  const { root, instanceDir } = writeInstanceConfig("acme", {
    "hyperparameters.config": ["precision: low", "temperature: 0.25", "tone: coaching", ""].join("\n"),
  });
  const dest = join(instanceDir, "hyperparameters.yaml");
  const result = writeExpandedYaml({ root, kitRoot: findKitRoot(), dest });
  assert.equal(result.wrote, dest);
  const raw = readFileSync(dest, "utf8");
  assert.match(raw, /temperature: 0.3|temperature: 0.25/);
  assert.match(raw, /tone: coaching/);
  assert.match(raw, /expansion:/);
  const reloaded = loadConfiguration({ root, kitRoot: findKitRoot() });
  assert.equal(reloaded.knobs.tone, "coaching");
  assert.equal(reloaded.knobs.temperature, 0.25);
});

test("kitConfigurationDir points at shipped examples", () => {
  const dir = kitConfigurationDir(findKitRoot());
  assert.ok(dir.endsWith(".cursor/skills/autodevelop/.configuration"));
});
