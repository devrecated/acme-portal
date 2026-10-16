/**
 * Copyright (c) 2026 Devrecated.
 *
 * `node --import ./scripts/test/register.mjs --test` lets route tests import
 * `@/...` aliases and `next/server` the way Next resolves them at build time.
 */
import { register } from "node:module"

register("./resolve.mjs", import.meta.url)
