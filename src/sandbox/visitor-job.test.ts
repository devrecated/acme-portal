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

type KanbanRef = { owner: string | null; repo: string | null; url: string | null }

const consumerTicket = (kanban: KanbanRef) => ({
  id: "try-3",
  title: "Visitor prompt",
  source: "github",
  kanban: { provider: "github", project: null, number: 7, ...kanban },
})

for (const [label, kanban] of [
  ["REST API issue URL", { owner: null, repo: null, url: "https://api.github.com/repos/devrecated/acme-portal/issues/7" }],
  ["SSH remote URL", { owner: null, repo: null, url: "git@github.com:devrecated/acme-portal.git" }],
  ["mixed-case URL with whitespace", { owner: null, repo: null, url: "  HTTPS://GitHub.com/Devrecated/Acme-Portal  " }],
  ["repo with .git suffix", { owner: "devrecated", repo: "acme-portal.git", url: null }],
  ["owner and repo with whitespace", { owner: " Devrecated ", repo: "acme-portal\n", url: null }],
  ["owner/repo in the repo field", { owner: null, repo: "devrecated/acme-portal", url: null }],
  ["repo name without owner", { owner: "", repo: "acme-portal", url: null }],
] as const) {
  test(`rewrites tickets that name the consumer repo via ${label}`, () => {
    const ticket = consumerTicket(kanban)
    assert.equal(pointsAtConsumerRepo(ticket), true)
    const sanitized = sanitizeVisitorTryJob({ status: "ready", tickets: [ticket] })
    assert.equal(sanitized.tickets?.[0]?.kanban?.provider, "host")
    assert.equal(sanitized.tickets?.[0]?.kanban?.url, null)
    assert.equal(sanitized.tickets?.[0]?.kanban?.number, null)
  })
}

test("does not flag other repos that share a prefix or owner", () => {
  for (const kanban of [
    { owner: "devrecated", repo: "acme-portal-docs", url: null },
    { owner: "someone-else", repo: "acme-portal", url: null },
    { owner: null, repo: null, url: "https://github.com/devrecated/autodevelop/issues/1" },
    { owner: null, repo: null, url: "https://api.github.com/repos/devrecated/acme-portal-docs/issues/1" },
    { owner: null, repo: null, url: "git@github.com:devrecated/acme-portalxgit" },
  ]) {
    assert.equal(pointsAtConsumerRepo(consumerTicket(kanban)), false, JSON.stringify(kanban))
  }
})
