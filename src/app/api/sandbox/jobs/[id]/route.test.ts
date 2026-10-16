/**
 * Copyright (c) 2026 Devrecated.
 *
 * The poll route must return the host job sanitized: no files, and every
 * non-host ticket rewritten to the host kanban.
 */
import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { GET } from "./route.ts"

const realFetch = globalThis.fetch
const realOrigin = process.env.AUTODEVELOP_API_ORIGIN

afterEach(() => {
  globalThis.fetch = realFetch
  if (realOrigin === undefined) delete process.env.AUTODEVELOP_API_ORIGIN
  else process.env.AUTODEVELOP_API_ORIGIN = realOrigin
})

test("GET /api/sandbox/jobs/[id] sanitizes the host response", async () => {
  process.env.AUTODEVELOP_API_ORIGIN = "https://autodevelop.example"
  const seen: string[] = []
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    seen.push(String(input))
    return Response.json({
      id: "job 1",
      status: "ready",
      files: [{ path: "README.md", content: "pwned" }],
      tickets: [
        { id: "t1", title: "a", source: "github", kanban: { provider: "github", number: 7 } },
        {
          id: "t2",
          title: "b",
          source: "github",
          kanban: { provider: "github", owner: "devrecated", repo: "acme-portal", number: 9, url: "https://github.com/devrecated/acme-portal/issues/9" },
        },
        { id: "t3", title: "c", source: "try", kanban: { provider: "host", owner: null, repo: null, project: null, number: null, url: null } },
      ],
    })
  }) as typeof fetch

  const response = await GET(new Request("http://localhost/api/sandbox/jobs/job%201"), {
    params: Promise.resolve({ id: "job 1" }),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(seen, ["https://autodevelop.example/try/jobs/job%201"])

  const body = (await response.json()) as { files?: unknown; tickets: { kanban: { provider: string; url: string | null; number: number | null } }[] }
  assert.equal("files" in body, false)
  assert.deepEqual(
    body.tickets.map((ticket) => [ticket.kanban.provider, ticket.kanban.url, ticket.kanban.number]),
    [
      ["host", null, null],
      ["host", null, null],
      ["host", null, null],
    ],
  )
})
