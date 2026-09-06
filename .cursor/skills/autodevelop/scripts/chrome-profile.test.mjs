/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  cloneChromeProfile,
  emailsFromPreferences,
  listChromeProfiles,
  selectChromeProfile,
} from "./chrome-profile.mjs";

test("emailsFromPreferences reads account_info", () => {
  assert.deepEqual(
    emailsFromPreferences({
      account_info: [{ email: "adam@devrecated.co" }],
      signin: { allowed_username: "other@example.com" },
    }),
    ["adam@devrecated.co", "other@example.com"],
  );
});

test("selectChromeProfile prefers Default @devrecated.co", () => {
  const profiles = [
    { directory: "Profile 3", emails: ["person@client.example"] },
    { directory: "Profile 4", emails: ["person@gmail.com"] },
    { directory: "Default", emails: ["adam@devrecated.co", "person@client.example"] },
  ];
  assert.equal(selectChromeProfile(profiles).directory, "Default");
  assert.equal(selectChromeProfile(profiles, { email: "person@gmail.com" }).directory, "Profile 4");
  assert.equal(selectChromeProfile(profiles, { domain: "nobody.example" }), null);
});

test("listChromeProfiles and cloneChromeProfile copy auth files only", () => {
  const homeChrome = mkdtempSync(join(tmpdir(), "chrome-root-"));
  const userDataDir = join(homeChrome, "Chrome");
  mkdirSync(join(userDataDir, "Default"), { recursive: true });
  writeFileSync(
    join(userDataDir, "Local State"),
    JSON.stringify({
      profile: { info_cache: { Default: { name: "devrecated.co", user_name: "adam@devrecated.co" } } },
    }),
  );
  writeFileSync(
    join(userDataDir, "Default", "Preferences"),
    JSON.stringify({ account_info: [{ email: "adam@devrecated.co" }] }),
  );
  writeFileSync(join(userDataDir, "Default", "Cookies"), "cookie-bytes");
  writeFileSync(join(userDataDir, "Default", "Cache"), "do-not-copy");

  const listed = listChromeProfiles([userDataDir]);
  assert.equal(listed.length, 1);
  assert.deepEqual(listed[0].emails, ["adam@devrecated.co"]);

  const dest = join(homeChrome, "clone");
  const cloned = cloneChromeProfile(listed[0], dest);
  assert.equal(cloned.profileDirectory, "Default");
  assert.equal(existsSync(join(dest, "Default", "Cookies")), true);
  assert.equal(existsSync(join(dest, "Default", "Cache")), false);
});
