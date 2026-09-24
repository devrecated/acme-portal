#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  chromeIsRunning,
  fetchViaExistingChrome,
  findCdpEndpoint,
} from "./chrome-attach.mjs";
import {
  DEFAULT_GOOGLE_EMAIL_DOMAIN,
  defaultChromeUserDataDirs,
  listChromeProfiles,
  selectChromeProfile,
} from "./chrome-profile.mjs";
import { findRepoRoot } from "./config-load.mjs";
import { argValue, fail, hasFlag, parseArgs, printJson } from "./lib.mjs";
import { sessionDir } from "./session.mjs";

const EXPORT_FORMATS = ["txt", "html"];
const DOC_READY = ".kix-appview-editor, .kix-page, [aria-label='Document content']";
const SIGN_IN_MS = 300_000;
const READY_MS = 120_000;

export const parseDocId = (url) => {
  const match = String(url || "").match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : "";
};

export const parseDocTab = (url) => {
  try {
    return new URL(String(url || "")).searchParams.get("tab") || "";
  } catch {
    const match = String(url || "").match(/[?&]tab=([^&#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
};

export const exportUrl = (id, format, tab = "") => {
  const url = new URL(`https://docs.google.com/document/d/${id}/export`);
  url.searchParams.set("format", format);
  if (tab) url.searchParams.set("tab", tab);
  return url.href;
};

export const docsNeedAuth = (status) => status === 401 || status === 403;

export const extractDocsTitle = (html) => {
  const match = String(html || "").match(/<title>([^<]+)<\/title>/i);
  if (!match) return "";
  return match[1].replace(/\s*[-–—]\s*Google Docs\s*$/i, "").trim();
};

export const extractDocsImageUrls = (html) => {
  const urls = new Set();
  for (const match of String(html || "").matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) {
    const src = match[1];
    if (src && !src.startsWith("data:")) urls.add(src);
  }
  return [...urls];
};

export const playwrightProfileDir = (root) => join(sessionDir(root), "playwright-profile");

export const resolveDeviceChromeProfile = ({
  email = "",
  domain = DEFAULT_GOOGLE_EMAIL_DOMAIN,
  home,
} = {}) => {
  const profiles = listChromeProfiles(defaultChromeUserDataDirs(home));
  const selected = selectChromeProfile(profiles, { email, domain });
  if (!selected) {
    const seen = profiles.flatMap((profile) => profile.emails).join(", ") || "none";
    throw new Error(
      `No Chrome profile on this device is signed in as @${String(domain).replace(/^@/, "")} (or --email). Found: ${seen}`,
    );
  }
  return selected;
};

export const importChromium = async () => {
  const errors = [];
  for (const spec of ["playwright", "@playwright/test"]) {
    try {
      const mod = await import(spec);
      if (mod.chromium) return mod.chromium;
      errors.push(`${spec}: no chromium export`);
    } catch (error) {
      errors.push(`${spec}: ${error.message}`);
    }
  }
  throw new Error(
    `Playwright is required to open Google Docs. Install playwright or @playwright/test. ${errors.join("; ")}`,
  );
};

const writeExport = (outDir, format, body) => {
  const path = join(outDir, `export.${format}`);
  writeFileSync(path, body);
  return path;
};

const writeCaptured = (outDir, { txt, html, visible }) => {
  const files = {
    txt: writeExport(outDir, "txt", txt || visible || ""),
    html: writeExport(outDir, "html", html || ""),
  };
  const visiblePath = join(outDir, "visible.txt");
  writeFileSync(visiblePath, visible || txt || "");
  return { files, visiblePath };
};

const pageVisibleText = async (page) =>
  page.evaluate(() => {
    const root =
      document.querySelector(".kix-appview-editor") ||
      document.querySelector("[role='textbox']") ||
      document.body;
    return (root?.innerText || "").trim();
  });

const captureFromPage = async ({ page, context, id, tab, outDir }) => {
  const written = {};
  let usedExport = false;
  for (const format of EXPORT_FORMATS) {
    const response = await context.request.get(exportUrl(id, format, tab));
    if (response.ok()) {
      written[format] = writeExport(outDir, format, await response.text());
      usedExport = true;
      continue;
    }
    if (format === "txt") {
      const visible = await pageVisibleText(page);
      if (!visible) throw new Error(`Authenticated Docs export failed: ${response.status()}`);
      written.txt = writeExport(outDir, "txt", visible);
      continue;
    }
    written.html = writeExport(outDir, "html", await page.content());
  }
  const visible = await pageVisibleText(page);
  const visiblePath = join(outDir, "visible.txt");
  writeFileSync(visiblePath, visible);
  const images = await page.evaluate(() =>
    [...document.querySelectorAll("img")]
      .map((img) => img.src)
      .filter((src) => src && !src.startsWith("data:")),
  );
  return { usedExport, files: written, visiblePath, images };
};

export const fetchAnonymousExports = async (id, tab = "") => {
  const files = {};
  for (const format of EXPORT_FORMATS) {
    const response = await fetch(exportUrl(id, format, tab), { redirect: "follow" });
    if (docsNeedAuth(response.status)) {
      return { ok: false, status: response.status, files: {} };
    }
    if (!response.ok) {
      throw new Error(`Docs export failed: ${response.status}`);
    }
    files[format] = await response.text();
  }
  return { ok: true, status: 200, files };
};

const launchDocsContext = async (chromium, { userDataDir, profileDirectory, headless }) => {
  const shared = {
    channel: "chrome",
    headless,
    viewport: { width: 1400, height: 900 },
    acceptDownloads: true,
    ignoreDefaultArgs: ["--enable-automation"],
    args: [
      `--profile-directory=${profileDirectory}`,
      "--disable-session-crashed-bubble",
      "--hide-crash-restore-bubble",
    ],
  };
  return chromium.launchPersistentContext(userDataDir, shared);
};

const waitForSignedInDoc = async (page, id) => {
  await page.waitForFunction(
    () => {
      const host = location.hostname;
      if (host.includes("accounts.google.com")) return true;
      return Boolean(
        document.querySelector(".kix-appview-editor, .kix-page, [aria-label='Document content']"),
      );
    },
    { timeout: READY_MS },
  );
  if (!page.url().includes("accounts.google.com")) return;
  process.stderr.write("Sign in to Google in the Playwright window, then wait for the doc to open.\n");
  await page.waitForURL(
    (next) => next.hostname.includes("docs.google.com") && next.pathname.includes(`/d/${id}`),
    { timeout: SIGN_IN_MS },
  );
  await page.waitForSelector(DOC_READY, { timeout: READY_MS });
};

const fetchViaCdp = async ({ cdpUrl, url, id, tab, outDir }) => {
  const chromium = await importChromium();
  const browser = await chromium.connectOverCDP(cdpUrl);
  try {
    const context = browser.contexts()[0] || (await browser.newContext());
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: READY_MS });
    await waitForSignedInDoc(page, id);
    const captured = await captureFromPage({ page, context, id, tab, outDir });
    await page.close();
    return { method: "cdp", ...captured };
  } finally {
    // connectOverCDP: do not close the user's Chrome.
  }
};

export const fetchPlaywrightExports = async ({
  url,
  id,
  tab = "",
  outDir,
  headless = false,
  email = "",
  domain = DEFAULT_GOOGLE_EMAIL_DOMAIN,
}) => {
  const selected = resolveDeviceChromeProfile({ email, domain });
  process.stderr.write(
    `Using Chrome profile ${selected.directory} (${selected.emails[0] || domain}).\n`,
  );

  const cdpUrl = await findCdpEndpoint(selected.userDataDir);
  if (cdpUrl) {
    process.stderr.write(`Attaching Playwright to existing Chrome at ${cdpUrl}.\n`);
    return fetchViaCdp({ cdpUrl, url, id, tab, outDir });
  }

  if (chromeIsRunning(selected.userDataDir)) {
    process.stderr.write("Chrome is already open with that profile. Opening the doc in that window.\n");
    const captured = await fetchViaExistingChrome({
      url,
      id,
      exportTxtUrl: exportUrl(id, "txt", tab),
      exportHtmlUrl: exportUrl(id, "html", tab),
    });
    const written = writeCaptured(outDir, captured);
    return {
      method: captured.method,
      usedExport: Boolean(captured.txt),
      files: written.files,
      visiblePath: written.visiblePath,
      images: extractDocsImageUrls(captured.html),
    };
  }

  try {
    const chromium = await importChromium();
    const context = await launchDocsContext(chromium, {
      userDataDir: selected.userDataDir,
      profileDirectory: selected.directory,
      headless,
    });
    try {
      const page = context.pages()[0] || (await context.newPage());
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: READY_MS });
      await waitForSignedInDoc(page, id);
      const captured = await captureFromPage({ page, context, id, tab, outDir });
      return { method: "playwright", ...captured };
    } finally {
      await context.close();
    }
  } catch (error) {
    process.stderr.write(
      `Playwright could not take the Chrome profile (${error.message}). Opening the doc in the running Chrome instead.\n`,
    );
    const captured = await fetchViaExistingChrome({
      url,
      id,
      exportTxtUrl: exportUrl(id, "txt", tab),
      exportHtmlUrl: exportUrl(id, "html", tab),
    });
    const written = writeCaptured(outDir, captured);
    return {
      method: captured.method,
      usedExport: Boolean(captured.txt),
      files: written.files,
      visiblePath: written.visiblePath,
      images: extractDocsImageUrls(captured.html),
    };
  }
};

const writeAnonymousFiles = (outDir, files) => {
  const written = {};
  for (const format of EXPORT_FORMATS) {
    written[format] = writeExport(outDir, format, files[format]);
  }
  return written;
};

if (process.argv[1]?.endsWith("fetch-gdoc.mjs")) {
  const args = parseArgs();
  try {
    const url = argValue(args, "url") || args.positional[0];
    const id = parseDocId(url);
    const tab = parseDocTab(url);
    if (!id) fail("Pass a Google Docs URL with /document/d/<id>.");
    const root = findRepoRoot();
    const outDir = join(sessionDir(root), "gdoc", id);
    mkdirSync(outDir, { recursive: true });
    const forcePlaywright = hasFlag(args, "playwright");
    const headless = hasFlag(args, "headless");
    const email = argValue(args, "email");
    const domain = argValue(args, "domain", DEFAULT_GOOGLE_EMAIL_DOMAIN);

    let written = {};
    let method = "anonymous";
    let images = [];
    let visiblePath = null;

    if (!forcePlaywright) {
      const anon = await fetchAnonymousExports(id, tab);
      if (anon.ok) {
        written = writeAnonymousFiles(outDir, anon.files);
      } else if (docsNeedAuth(anon.status)) {
        process.stderr.write(`Docs export returned ${anon.status}. Opening the doc in Playwright.\n`);
        const viaBrowser = await fetchPlaywrightExports({
          url,
          id,
          tab,
          outDir,
          root,
          headless,
          email,
          domain,
        });
        written = viaBrowser.files;
        method = viaBrowser.method;
        images = viaBrowser.images;
        visiblePath = viaBrowser.visiblePath;
      } else {
        fail(`Docs export failed: ${anon.status}`);
      }
    } else {
      const viaBrowser = await fetchPlaywrightExports({
        url,
        id,
        tab,
        outDir,
        root,
        headless,
        email,
        domain,
      });
      written = viaBrowser.files;
      method = viaBrowser.method;
      images = viaBrowser.images;
      visiblePath = viaBrowser.visiblePath;
    }

    const html = written.html ? readFileSync(written.html, "utf8") : "";
    const title = extractDocsTitle(html);
    const exportImages = extractDocsImageUrls(html);
    printJson({
      ok: true,
      id,
      tab,
      title,
      method,
      files: written,
      visiblePath,
      images: [...new Set([...exportImages, ...images])],
    });
  } catch (error) {
    fail(error.message);
  }
}
