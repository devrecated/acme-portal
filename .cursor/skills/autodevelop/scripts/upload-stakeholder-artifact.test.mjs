/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { plannedArtifactUploads } from "./send-stakeholder-mail.mjs";
import {
  SIGNED_URL_MAX_MS,
  SIGNED_URL_MAX_SECONDS,
  appendArtifactLinks,
  buildStakeholderStoragePath,
  contentTypeForFilename,
  safeArtifactFilename,
  uploadStakeholderArtifact,
} from "./upload-stakeholder-artifact.mjs";

test("signed URL max is 7 days", () => {
  assert.equal(SIGNED_URL_MAX_SECONDS, 604800);
  assert.equal(SIGNED_URL_MAX_MS, 7 * 24 * 60 * 60 * 1000);
});

test("buildStakeholderStoragePath uses tmp/stakeholder-share and UTC date", () => {
  const now = new Date("2026-08-20T15:04:05.000Z");
  assert.equal(
    buildStakeholderStoragePath("/Users/me/weekly-sync.pptx", now),
    "tmp/stakeholder-share/2026-08-20/weekly-sync.pptx",
  );
});

test("safeArtifactFilename strips directories and unsafe characters", () => {
  assert.equal(safeArtifactFilename("../secret deck.pptx"), "secret-deck.pptx");
  assert.equal(safeArtifactFilename("/etc/passwd"), "passwd");
});

test("contentTypeForFilename maps pdf and pptx", () => {
  assert.equal(contentTypeForFilename("a.pdf"), "application/pdf");
  assert.equal(
    contentTypeForFilename("a.pptx"),
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  );
});

test("appendArtifactLinks adds private 7-day anchors and escapes html", () => {
  const html = appendArtifactLinks("<p>Hi</p>", [
    { filename: "deck.pptx", url: "https://example.com/a?x=1&y=2" },
  ]);
  assert.match(html, /<p>Hi<\/p>/);
  assert.match(html, /expires in 7 days/);
  assert.match(html, /href="https:\/\/example.com\/a\?x=1&amp;y=2"/);
});

test("plannedArtifactUploads lists storage paths without signing", () => {
  const now = new Date("2026-08-21T00:00:00.000Z");
  assert.deepEqual(plannedArtifactUploads(["/tmp/Notes.pdf"], now), [
    { filename: "Notes.pdf", storagePath: "tmp/stakeholder-share/2026-08-21/Notes.pdf" },
  ]);
});

test("uploadStakeholderArtifact saves privately and signs for 7 days", async () => {
  const dir = mkdtempSync(join(tmpdir(), "firegit-share-"));
  const filePath = join(dir, "deck.pptx");
  writeFileSync(filePath, "pptx");
  let savedOpts;
  let signedOpts;
  const bucket = {
    file(storagePath) {
      return {
        save: async (_buf, opts) => {
          savedOpts = opts;
          assert.equal(storagePath, "tmp/stakeholder-share/2026-08-20/deck.pptx");
        },
        getSignedUrl: async (opts) => {
          signedOpts = opts;
          return ["https://signed.example/deck"];
        },
      };
    },
  };
  const before = Date.now();
  const out = await uploadStakeholderArtifact({
    bucket,
    filePath,
    now: new Date("2026-08-20T12:00:00.000Z"),
  });
  assert.equal(out.filename, "deck.pptx");
  assert.equal(out.storagePath, "tmp/stakeholder-share/2026-08-20/deck.pptx");
  assert.equal(out.url, "https://signed.example/deck");
  assert.equal(savedOpts.metadata.cacheControl, "private, max-age=0");
  assert.equal(savedOpts.public, undefined);
  assert.equal(signedOpts.version, "v4");
  assert.equal(signedOpts.action, "read");
  assert.ok(signedOpts.expires >= before + SIGNED_URL_MAX_MS);
  assert.ok(signedOpts.expires <= Date.now() + SIGNED_URL_MAX_MS);
});
