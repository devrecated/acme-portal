/**
 * Copyright (c) 2026 Devrecated.
 *
 * featureDemo:v1 — dismissed state only. No names, emails, or prompts.
 */
const KEY = "featureDemo:v1"

type RecordShape = { dismissed: true; choice: "skipped" | "completed" }

const isLocalHost = () => {
  if (typeof window === "undefined") return false
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
}

export const shouldHideFeatureDemo = () => {
  if (typeof window === "undefined") return false
  const flag = new URLSearchParams(window.location.search).get("featureDemo")
  if (flag === "0") return true
  if (flag === "1") return false
  return false
}

export const shouldForceFeatureDemo = () => {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).get("featureDemo") === "1"
}

export function readFeatureDemo(id: string): RecordShape | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Record<string, RecordShape>
    return parsed[id] ?? null
  } catch {
    return null
  }
}

export function writeFeatureDemo(id: string, choice: "skipped" | "completed") {
  if (typeof window === "undefined") return
  try {
    const raw = window.sessionStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Record<string, RecordShape>) : {}
    parsed[id] = { dismissed: true, choice }
    window.sessionStorage.setItem(KEY, JSON.stringify(parsed))
  } catch {
    // quota or private mode
  }
}

export function clearFeatureDemo() {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(KEY)
}

export function shouldShowFeatureDemo(id: string, forceApply: boolean) {
  if (shouldHideFeatureDemo()) return false
  if (shouldForceFeatureDemo() || forceApply || isLocalHost()) {
    if (forceApply) return true
  }
  return !readFeatureDemo(id)
}
