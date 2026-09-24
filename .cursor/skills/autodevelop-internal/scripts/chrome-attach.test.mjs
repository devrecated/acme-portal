/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { appleScriptQuote } from "./chrome-attach.mjs";

test("appleScriptQuote escapes quotes and backslashes", () => {
  assert.equal(appleScriptQuote("plain"), `"plain"`);
  assert.equal(appleScriptQuote('say "hi"'), `"say \\"hi\\""`);
  assert.equal(appleScriptQuote("a\\b"), `"a\\\\b"`);
});
