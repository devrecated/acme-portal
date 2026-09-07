/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  docsNeedAuth,
  exportUrl,
  extractDocsImageUrls,
  extractDocsTitle,
  parseDocId,
  parseDocTab,
} from "./fetch-gdoc.mjs";

const DOC_URL =
  "https://docs.google.com/document/d/104dhDCTkxDbOtUfItZ50hWfdVyamS0d5tw3dkf-hJ7E/edit?tab=t.kvbw662r5hdq";

test("parseDocId and parseDocTab read the edit URL", () => {
  assert.equal(parseDocId(DOC_URL), "104dhDCTkxDbOtUfItZ50hWfdVyamS0d5tw3dkf-hJ7E");
  assert.equal(parseDocTab(DOC_URL), "t.kvbw662r5hdq");
  assert.equal(parseDocId("not-a-doc"), "");
  assert.equal(parseDocTab("https://docs.google.com/document/d/abc/edit"), "");
});

test("exportUrl keeps format and optional tab", () => {
  assert.equal(
    exportUrl("AbC123", "txt"),
    "https://docs.google.com/document/d/AbC123/export?format=txt",
  );
  assert.equal(
    exportUrl("AbC123", "html", "t.kvbw662r5hdq"),
    "https://docs.google.com/document/d/AbC123/export?format=html&tab=t.kvbw662r5hdq",
  );
});

test("docsNeedAuth is only 401/403", () => {
  assert.equal(docsNeedAuth(401), true);
  assert.equal(docsNeedAuth(403), true);
  assert.equal(docsNeedAuth(404), false);
  assert.equal(docsNeedAuth(200), false);
});

test("extractDocsTitle and extractDocsImageUrls", () => {
  const html = `
    <html><head><title>Standup notes - Google Docs</title></head>
    <body><img src="https://lh3.googleusercontent.com/docsz/abc"><img src="data:image/png;base64,xx"></body>
  `;
  assert.equal(extractDocsTitle(html), "Standup notes");
  assert.deepEqual(extractDocsImageUrls(html), ["https://lh3.googleusercontent.com/docsz/abc"]);
});
