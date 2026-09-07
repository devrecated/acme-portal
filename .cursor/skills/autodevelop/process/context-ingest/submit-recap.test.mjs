/**
 * Copyright (c) 2026 Devrecated.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { recapsEndpoint } from "./submit-recap.mjs";

test("recapsEndpoint maps the entitlement URL to /context/recaps", () => {
  assert.equal(recapsEndpoint("https://host.example/entitlement"), "https://host.example/context/recaps");
  assert.equal(recapsEndpoint("https://host.example"), "https://host.example/context/recaps");
  assert.equal(recapsEndpoint(""), "");
});
