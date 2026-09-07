#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { fail, parseArgs, printJson } from "./lib.mjs";

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokens = (text) => new Set(normalize(text).split(" ").filter((w) => w.length > 2));

export const scoreOverlap = (a, b) => {
  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let hit = 0;
  for (const word of left) if (right.has(word)) hit += 1;
  return hit / Math.min(left.size, right.size);
};

export const findDuplicates = (drafts, openItems, threshold = 0.72) =>
  drafts.map((draft, index) => {
    let best = null;
    for (const item of openItems) {
      const score = Math.max(
        scoreOverlap(draft.title, item.title),
        scoreOverlap(`${draft.title} ${draft.excerpt || ""}`, `${item.title} ${item.body || ""}`),
      );
      if (score >= threshold && (!best || score > best.score)) {
        best = { score, number: item.number, title: item.title };
      }
    }
    return {
      index: index + 1,
      title: draft.title,
      possibleDuplicate: best ? `#${best.number}` : null,
      duplicateTitle: best?.title || null,
      score: best?.score || 0,
    };
  });

const args = parseArgs();
if (process.argv[1]?.endsWith("dedup-issues.mjs") && args.values.drafts) {
  try {
    const drafts = JSON.parse(args.values.drafts);
    const openItems = JSON.parse(args.values.open || "[]");
    printJson(findDuplicates(drafts, openItems));
  } catch (error) {
    fail(error.message);
  }
}
