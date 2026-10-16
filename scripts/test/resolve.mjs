/**
 * Copyright (c) 2026 Devrecated.
 *
 * Resolve hook for tests: `@/x` -> `src/x(.ts|.tsx|/index.ts)`, and extensionless
 * `next/*` subpaths -> `next/*.js` (the package has no exports map).
 */
import { existsSync } from "node:fs"

const SRC = new URL("../../src/", import.meta.url)
const EXTENSIONS = ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const base = new URL(specifier.slice(2), SRC)
    for (const ext of EXTENSIONS) {
      const candidate = new URL(base.href + ext)
      if (ext === "" && !/\.[cm]?[jt]sx?$/.test(candidate.pathname)) continue
      if (existsSync(candidate)) return nextResolve(candidate.href, context)
    }
  }
  if (/^next\/[a-z-]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context)
  }
  return nextResolve(specifier, context)
}

