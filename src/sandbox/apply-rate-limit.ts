/**
 * Copyright (c) 2026 Devrecated.
 */

const WINDOW_MS = 60_000
const MAX = 8
const hits = new Map<string, number[]>()

export function allowSandboxApply(key: string): boolean {
  const now = Date.now()
  const prior = (hits.get(key) ?? []).filter((at) => now - at < WINDOW_MS)
  if (prior.length >= MAX) {
    hits.set(key, prior)
    return false
  }
  prior.push(now)
  hits.set(key, prior)
  return true
}
