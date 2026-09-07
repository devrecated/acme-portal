#!/usr/bin/env node
/**
 * Copyright (c) 2026 Devrecated
 * SPDX-License-Identifier: MIT
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

/** Google Cloud Storage V4 signed URL hard cap (7 days). */
export const SIGNED_URL_MAX_SECONDS = 7 * 24 * 60 * 60;
export const SIGNED_URL_MAX_MS = SIGNED_URL_MAX_SECONDS * 1000;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const safeArtifactFilename = (filePath) => {
  const name = basename(filePath).replace(/[^a-zA-Z0-9._-]+/g, "-");
  if (!name || name === "." || name === "..") {
    throw new Error("Invalid attachment filename.");
  }
  return name;
};

export const buildStakeholderStoragePath = (filePath, now = new Date()) => {
  const day = new Date(now).toISOString().slice(0, 10);
  return `tmp/stakeholder-share/${day}/${safeArtifactFilename(filePath)}`;
};

export const contentTypeForFilename = (name) => {
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".pptx")) {
    return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }
  if (name.endsWith(".ppt")) return "application/vnd.ms-powerpoint";
  if (name.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (name.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
};

export const appendArtifactLinks = (html, artifacts) => {
  if (!artifacts.length) return html;
  const items = artifacts
    .map(
      (artifact) =>
        `<li><a href="${escapeHtml(artifact.url)}">${escapeHtml(artifact.filename)}</a> (private, expires in 7 days)</li>`,
    )
    .join("");
  return `${html}\n<p>Files</p>\n<ul>${items}</ul>`;
};

export const uploadStakeholderArtifact = async ({ bucket, filePath, now = new Date() }) => {
  const filename = safeArtifactFilename(filePath);
  const storagePath = buildStakeholderStoragePath(filePath, now);
  const file = bucket.file(storagePath);
  await file.save(readFileSync(filePath), {
    resumable: false,
    metadata: {
      contentType: contentTypeForFilename(filename),
      cacheControl: "private, max-age=0",
    },
  });
  const [url] = await file.getSignedUrl({
    version: "v4",
    action: "read",
    expires: Date.now() + SIGNED_URL_MAX_MS,
  });
  return { filename, storagePath, url };
};
