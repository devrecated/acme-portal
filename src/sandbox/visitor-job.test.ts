/**
 * Copyright (c) 2026 Devrecated.
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { pointsAtConsumerRepo, sanitizeVisitorTryJob } from "./visitor-job.ts"

test("strips file payloads so a visitor job cannot write the tree", () => {
  const sanitized = sanitizeVisitorTryJob({
    status: "ready",
    files: [{ path: "README.md", language: "md", content: "pwned" }],
    tickets: [],
  })
  assert.equal("files" in sanitized, false)
})

test("rewrites tickets that name github.com/devrecated/acme-portal", () => {
  const sanitized = sanitizeVisitorTryJob({
    status: "ready",
    tickets: [
      {
        id: "try-1",
        title: "Visitor prompt",
        source: "github",
        kanban: {
          provider: "github",
          owner: "devrecated",
          repo: "acme-portal",
          project: "1",
          number: 99,
          url: "https://github.com/devrecated/acme-portal/issues/99",
        },
      },
    ],
  })
  const ticket = sanitized.tickets?.[0]
  assert.equal(pointsAtConsumerRepo(ticket), false)
  assert.equal(ticket?.kanban?.provider, "host")
  assert.equal(ticket?.kanban?.owner, null)
  assert.equal(ticket?.kanban?.repo, null)
  assert.equal(ticket?.kanban?.url, null)
  assert.equal(ticket?.kanban?.number, null)
})

test("leaves Autodevelop-only tickets untouched", () => {
  const ticket = {
    id: "try-2",
    title: "Session overlay",
    source: "try",
    kanban: {
      provider: "host",
      owner: null,
      repo: null,
      project: null,
      number: null,
      url: null,
    },
  }
  const sanitized = sanitizeVisitorTryJob({ status: "ready", tickets: [ticket] })
  assert.deepEqual(sanitized.tickets?.[0], ticket)
})
