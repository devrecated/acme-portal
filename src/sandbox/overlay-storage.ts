/**
 * Copyright (c) 2026 Devrecated.
 *
 * Tab session only. Closing the tab drops the overlay. The published
 * page is never rewritten.
 */
import type { SandboxPatch } from "@/sandbox/schema"
import { sandboxPatchSchema } from "@/sandbox/schema"

const KEY = "acme-sandbox-overlay"

export function readOverlay(): SandboxPatch | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    return sandboxPatchSchema.parse(JSON.parse(raw))
  } catch {
    return null
  }
}

export function writeOverlay(patch: SandboxPatch | null) {
  if (typeof window === "undefined") return
  if (!patch) {
    window.sessionStorage.removeItem(KEY)
    return
  }
  window.sessionStorage.setItem(KEY, JSON.stringify(sandboxPatchSchema.parse(patch)))
}

export function clearOverlay() {
  writeOverlay(null)
}
