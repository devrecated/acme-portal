#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { createWriteStream, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { findRepoRoot } from "./config-load.mjs";
import { argValue, fail, parseArgs, printJson } from "./lib.mjs";
import { sessionDir } from "./session.mjs";

const IMAGE_MD = /!\[[^\]]*\]\((https?:[^)\s]+)\)/g;
const RAW_URL =
  /https?:\/\/(?:user-images\.githubusercontent\.com|github\.com\/user-attachments\/assets)\/[^\s)"']+/g;

export const extractImageUrls = (text) => {
  const urls = new Set();
  const body = String(text || "");
  for (const match of body.matchAll(IMAGE_MD)) urls.add(match[1]);
  for (const match of body.matchAll(RAW_URL)) urls.add(match[0]);
  return [...urls];
};

if (process.argv[1]?.endsWith("ingest-ticket-media.mjs")) {
  const args = parseArgs();
  try {
    const issue = argValue(args, "issue");
    const body = argValue(args, "body");
    if (!issue) fail("Missing --issue.");
    const urls = extractImageUrls(body);
    const root = findRepoRoot();
    const outDir = join(sessionDir(root), "assets", String(issue));
    mkdirSync(outDir, { recursive: true });
    const files = [];
    for (const [index, url] of urls.entries()) {
      const response = await fetch(url, { redirect: "follow" });
      if (!response.ok) continue;
      const ext = (url.split(".").pop() || "bin").replace(/[^a-zA-Z0-9].*$/, "") || "bin";
      const dest = join(outDir, `${index + 1}.${ext.slice(0, 8)}`);
      mkdirSync(dirname(dest), { recursive: true });
      await pipeline(Readable.fromWeb(response.body), createWriteStream(dest));
      files.push({ url, path: dest });
    }
    const manifest = join(outDir, "manifest.json");
    writeFileSync(manifest, `${JSON.stringify({ issue, files }, null, 2)}\n`);
    printJson({ ok: true, issue, count: files.length, manifest, files });
  } catch (error) {
    fail(error.message);
  }
}
