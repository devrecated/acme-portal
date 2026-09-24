#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const DEFAULT_GOOGLE_EMAIL_DOMAIN = "devrecated.co";

const AUTH_FILES = [
  "Cookies",
  "Cookies-journal",
  "Login Data",
  "Login Data-journal",
  "Login Data For Account",
  "Login Data For Account-journal",
  "Preferences",
  "Secure Preferences",
  "Web Data",
  "Web Data-journal",
  "Account Web Data",
  "Account Web Data-journal",
  "Trust Tokens",
  "Trust Tokens-journal",
];

const AUTH_DIRS = ["Accounts", "Network"];

export const defaultChromeUserDataDirs = (home = homedir()) => [
  join(home, "Library/Application Support/Google/Chrome"),
  join(home, "Library/Application Support/Google/Chrome Beta"),
  join(home, "Library/Application Support/Google/Chrome Canary"),
  join(home, "AppData/Local/Google/Chrome/User Data"),
  join(home, ".config/google-chrome"),
];

const readJson = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
};

export const emailsFromPreferences = (prefs) => {
  const emails = [];
  for (const account of prefs?.account_info || []) {
    if (account?.email) emails.push(String(account.email));
  }
  const allowed = prefs?.signin?.allowed_username;
  if (allowed) emails.push(String(allowed));
  return emails;
};

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

export const listChromeProfiles = (userDataDirs) => {
  const profiles = [];
  for (const userDataDir of userDataDirs) {
    const localState = readJson(join(userDataDir, "Local State"));
    const info = localState?.profile?.info_cache;
    if (!info || typeof info !== "object") continue;
    for (const [directory, meta] of Object.entries(info)) {
      const prefs = readJson(join(userDataDir, directory, "Preferences")) || {};
      const emails = [
        ...emailsFromPreferences(prefs),
        meta?.user_name,
      ]
        .map(normalizeEmail)
        .filter(Boolean);
      profiles.push({
        browser: "chrome",
        userDataDir,
        directory,
        name: meta?.name || directory,
        emails: [...new Set(emails)],
      });
    }
  }
  return profiles;
};

export const selectChromeProfile = (
  profiles,
  { email = "", domain = DEFAULT_GOOGLE_EMAIL_DOMAIN } = {},
) => {
  const exact = normalizeEmail(email);
  const host = String(domain || DEFAULT_GOOGLE_EMAIL_DOMAIN)
    .replace(/^@/, "")
    .toLowerCase();
  const matches = (profiles || []).filter((profile) => {
    if (exact) return profile.emails.includes(exact);
    return profile.emails.some((value) => value.endsWith(`@${host}`));
  });
  if (!matches.length) return null;
  return matches.find((profile) => profile.directory === "Default") || matches[0];
};

export const cloneChromeProfile = (profile, destDir) => {
  if (!profile?.userDataDir || !profile?.directory) {
    throw new Error("Chrome profile is missing userDataDir or directory.");
  }
  rmSync(destDir, { recursive: true, force: true });
  mkdirSync(join(destDir, profile.directory), { recursive: true });
  const localStateSrc = join(profile.userDataDir, "Local State");
  if (existsSync(localStateSrc)) {
    const localState = readJson(localStateSrc) || {};
    if (localState.profile && typeof localState.profile === "object") {
      localState.profile.last_used = profile.directory;
    }
    writeFileSync(join(destDir, "Local State"), `${JSON.stringify(localState)}\n`);
  }
  const srcProfile = join(profile.userDataDir, profile.directory);
  const destProfile = join(destDir, profile.directory);
  for (const name of AUTH_FILES) {
    const src = join(srcProfile, name);
    if (existsSync(src)) cpSync(src, join(destProfile, name));
  }
  for (const name of AUTH_DIRS) {
    const src = join(srcProfile, name);
    if (existsSync(src)) cpSync(src, join(destProfile, name), { recursive: true });
  }
  return { userDataDir: destDir, profileDirectory: profile.directory };
};
