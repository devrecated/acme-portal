#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { fail, parseArgs, printJson } from "./lib.mjs";

const AC_LINE = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/;

export const parseAcceptance = (body) =>
  String(body || "")
    .split("\n")
    .flatMap((line) => {
      const match = line.match(AC_LINE);
      if (!match) return [];
      return [{ checked: match[1].toLowerCase() === "x", text: match[2].trim() }];
    });

export const verifyAcceptance = ({ body, localScreenshots = [] }) => {
  const items = parseAcceptance(body);
  const shots = localScreenshots.map((path) => String(path));
  return items.map((item, index) => {
    const hasShot = shots.length > index;
    let result = "unclear";
    if (item.checked && hasShot) result = "pass";
    else if (!item.checked && !hasShot) result = "fail";
    else if (!item.checked) result = "unclear";
    return { text: item.text, checked: item.checked, screenshot: shots[index] || null, result };
  });
};

if (process.argv[1]?.endsWith("verify-ac.mjs")) {
  const args = parseArgs();
  try {
    const body = args.values.body || "";
    const shots = args.values.screenshots ? JSON.parse(args.values.screenshots) : [];
    printJson(verifyAcceptance({ body, localScreenshots: shots }));
  } catch (error) {
    fail(error.message);
  }
}
