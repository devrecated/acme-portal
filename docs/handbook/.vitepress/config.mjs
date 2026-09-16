/**
 * Copyright (c) 2026 Devrecated.
 * Tenant handbook. Capture writes guides, changelog, media, and sidebar.json.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const sidebarFile = join(siteRoot, ".vitepress/sidebar.json");

const capturedSidebar = () => {
  if (!existsSync(sidebarFile)) return [];
  try {
    return JSON.parse(readFileSync(sidebarFile, "utf8"));
  } catch {
    return [];
  }
};

export default defineConfig({
  title: "Acme Portal Docs",
  description: "Internal guides for Acme Fleet.",
  cleanUrls: true,
  appearance: "dark",
  lastUpdated: true,
  ignoreDeadLinks: true,
  themeConfig: {
    siteTitle: "Acme Portal Docs",
    nav: [
      { text: "Guides", link: "/guides/" },
      { text: "What’s new", link: "/changelog" },
    ],
    sidebar: capturedSidebar(),
    outline: { level: [2, 3] },
    search: { provider: "local" },
  },
});
