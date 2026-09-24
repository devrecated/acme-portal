#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { runCommand } from "./lib.mjs";

export const DEFAULT_CDP_URL = "http://127.0.0.1:9222";

export const appleScriptQuote = (value) =>
  `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;

export const chromeIsRunning = (userDataDir) => {
  if (userDataDir) {
    try {
      lstatSync(join(userDataDir, "SingletonLock"));
      return true;
    } catch {
      // fall through to process check
    }
  }
  const processes = runCommand("osascript", [
    "-e",
    'tell application "System Events" to (name of processes) contains "Google Chrome"',
  ]);
  return processes.ok && processes.stdout.trim().toLowerCase() === "true";
};

export const runOsascript = (source) => {
  const result = runCommand("osascript", ["-e", source]);
  if (!result.ok) throw new Error((result.stderr || "osascript failed").trim());
  return String(result.stdout || "").replace(/\n$/, "");
};

export const findCdpEndpoint = async (userDataDir, fallback = DEFAULT_CDP_URL) => {
  const portFile = userDataDir ? join(userDataDir, "DevToolsActivePort") : "";
  const candidates = [];
  if (portFile && existsSync(portFile)) {
    const [port] = readFileSync(portFile, "utf8").split(/\r?\n/);
    if (/^\d+$/.test(port)) candidates.push(`http://127.0.0.1:${port}`);
  }
  candidates.push(fallback);
  for (const url of [...new Set(candidates)]) {
    try {
      const response = await fetch(`${url}/json/version`);
      if (response.ok) return url;
    } catch {
      // try next
    }
  }
  return "";
};

export const openChromeTab = (url) => {
  runOsascript(`
    tell application "Google Chrome"
      activate
      if (count of windows) is 0 then make new window
      tell front window
        make new tab with properties {URL:${appleScriptQuote(url)}}
      end tell
    end tell
  `);
};

export const chromeTabUrls = () =>
  runOsascript(`
    tell application "Google Chrome"
      set urls to {}
      repeat with w in windows
        repeat with t in tabs of w
          set end of urls to (URL of t)
        end repeat
      end repeat
      set AppleScript's text item delimiters to linefeed
      return urls as text
    end tell
  `)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

export const chromeExecuteJs = (javascript, urlContains = "") => {
  const js = appleScriptQuote(javascript);
  const needle = appleScriptQuote(urlContains);
  const source = urlContains
    ? `
      tell application "Google Chrome"
        repeat with w in windows
          repeat with t in tabs of w
            if URL of t contains ${needle} then
              return execute t javascript ${js}
            end if
          end repeat
        end repeat
        error "No Chrome tab matches ${urlContains}"
      end tell
    `
    : `
      tell application "Google Chrome"
        return execute active tab of front window javascript ${js}
      end tell
    `;
  return runOsascript(source);
};

export const closeChromeTabsMatching = (urlContains) => {
  if (!urlContains) return;
  runOsascript(`
    tell application "Google Chrome"
      repeat with w in windows
        set closable to {}
        repeat with t in tabs of w
          if URL of t contains ${appleScriptQuote(urlContains)} then
            set end of closable to t
          end if
        end repeat
        repeat with t in closable
          close t
        end repeat
      end repeat
    end tell
  `);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const waitForChromeUrl = async (urlContains, timeoutMs = 120_000) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const urls = chromeTabUrls();
    const hit = urls.find((url) => url.includes(urlContains));
    if (hit && !hit.includes("accounts.google.com")) return hit;
    if (hit && hit.includes("accounts.google.com")) {
      throw new Error("Chrome opened Google sign-in. The running window is not the signed-in @devrecated.co profile.");
    }
    await sleep(1000);
  }
  throw new Error(`Timed out waiting for Chrome tab: ${urlContains}`);
};

const VISIBLE_JS = `
(() => {
  const root = document.querySelector(".kix-appview-editor") || document.querySelector("[role='textbox']") || document.body;
  return (root && root.innerText || "").trim();
})()
`;

const downloadsDir = () => join(homedir(), "Downloads");

export const newestDownloadSince = (sinceMs, extensions) => {
  const dir = downloadsDir();
  if (!existsSync(dir)) return "";
  const allowed = new Set((extensions || []).map((ext) => ext.toLowerCase()));
  let best = null;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
    if (allowed.size && !allowed.has(ext)) continue;
    const path = join(dir, name);
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.mtimeMs < sinceMs) continue;
    if (!best || stat.mtimeMs > best.mtimeMs) best = { path, mtimeMs: stat.mtimeMs };
  }
  return best?.path || "";
};

const waitForDownload = async (sinceMs, extensions, timeoutMs) => {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const path = newestDownloadSince(sinceMs, extensions);
    if (path) return path;
    await sleep(500);
  }
  throw new Error(`Chrome did not download a ${extensions.join("/")} export. Check the Downloads folder.`);
};

const fetchViaChromeDownloads = async ({ exportTxtUrl, exportHtmlUrl, timeoutMs }) => {
  const since = Date.now() - 1500;
  openChromeTab(exportTxtUrl);
  const txtPath = await waitForDownload(since, [".txt"], timeoutMs);
  const txt = readFileSync(txtPath, "utf8");
  let html = "";
  try {
    const htmlSince = Date.now() - 500;
    openChromeTab(exportHtmlUrl);
    const htmlPath = await waitForDownload(htmlSince, [".html", ".htm", ".zip"], Math.min(timeoutMs, 20_000));
    if (htmlPath.endsWith(".html") || htmlPath.endsWith(".htm")) html = readFileSync(htmlPath, "utf8");
  } catch {
    html = "";
  }
  return { method: "chrome-download", visible: txt, txt, html };
};

export const fetchViaExistingChrome = async ({ url, id, exportTxtUrl, exportHtmlUrl, timeoutMs = 120_000 }) => {
  openChromeTab(url);
  await waitForChromeUrl(`/d/${id}`, timeoutMs);
  try {
    const started = Date.now();
    let visible = "";
    while (Date.now() - started < timeoutMs) {
      visible = chromeExecuteJs(VISIBLE_JS, `/d/${id}`);
      if (visible && visible.length > 20) break;
      await sleep(1000);
    }
    if (!visible) throw new Error("Chrome opened the doc but no text was readable.");

    openChromeTab(exportTxtUrl);
    await waitForChromeUrl("/export?format=txt", timeoutMs);
    const txt = chromeExecuteJs("document.body.innerText", "/export?format=txt");
    closeChromeTabsMatching("/export?format=txt");

    openChromeTab(exportHtmlUrl);
    await waitForChromeUrl("/export?format=html", timeoutMs);
    const html = chromeExecuteJs("document.documentElement.outerHTML", "/export?format=html");
    closeChromeTabsMatching("/export?format=html");

    return { method: "chrome-app", visible, txt, html };
  } catch (error) {
    if (!String(error.message).includes("AppleScript is turned off") && !String(error.message).includes("Executing JavaScript")) {
      throw error;
    }
    process.stderr.write("Chrome blocks AppleScript JS. Downloading the Doc export in that signed-in window instead.\n");
    return fetchViaChromeDownloads({ exportTxtUrl, exportHtmlUrl, timeoutMs });
  }
};
