/**
 * Copyright (c) 2026 Devrecated.
 */
import assert from "node:assert/strict"
import { test } from "node:test"

import { isAllowedVisitorTicket, pointsAtConsumerRepo, sanitizeVisitorTryJob } from "./visitor-job.ts"

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
  ["repo with trailing slash", { owner: "devrecated", repo: "acme-portal/", url: null }],
  ["repo with .git and trailing slash", { owner: "devrecated", repo: "acme-portal.git/", url: null }],
  ["percent-encoded URL", { owner: null, repo: null, url: "https://github.com/devrecated/acme%2Dportal/issues/7" }],
  ["malformed percent escape beside a real URL", { owner: null, repo: null, url: "https://github.com/devrecated/acme-portal/issues/7?q=%E0%A4%A" }],
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

const ticketWith = (kanban: Record<string, unknown> | undefined) => ({
  id: "try-4",
  title: "Visitor prompt",
  source: "try",
  ...(kanban ? { kanban } : {}),
})

const sanitizeOne = (ticket: ReturnType<typeof ticketWith>) =>
  sanitizeVisitorTryJob({ status: "ready", tickets: [ticket] }).tickets?.[0]

const assertRewritten = (kanban: Record<string, unknown>) => {
  const before = ticketWith(kanban)
  assert.equal(isAllowedVisitorTicket(before), false, JSON.stringify(kanban))
  const after = sanitizeOne(before)
  assert.deepEqual(after?.kanban, {
    provider: "host",
    owner: null,
    repo: null,
    project: null,
    number: null,
    url: null,
  })
  assert.equal(after?.title, before.title)
}

test("rewrites a bare GitHub ticket that only carries a number", () => {
  assertRewritten({ provider: "github", number: 7 })
  assertRewritten({ provider: "github", project: "PVT_kwDOAB", number: 7, owner: null, repo: null, url: null })
})

test("rewrites a ticket with no provider", () => {
  assertRewritten({ number: 7 })
  assertRewritten({ provider: "", owner: null, repo: null, url: null, number: null })
})

test("rewrites real GitHub issues on any repo, not only the consumer repo", () => {
  assertRewritten({ provider: "github", owner: "devrecated", repo: "autodevelop", number: 1, url: "https://github.com/devrecated/autodevelop/issues/1" })
  assertRewritten({ provider: "linear", owner: null, repo: null, number: 12, url: "https://linear.app/acme/issue/ACM-12" })
})

test("rewrites lookalike and encoded refs that the matcher alone did not flag", () => {
  for (const kanban of [
    { provider: "github", owner: "devrecated", repo: "acme-portal-docs", url: null },
    { provider: "github", owner: "someone-else", repo: "acme-portal", url: null },
    { provider: "github", owner: null, repo: null, url: "git@github.com:devrecated/acme-portalxgit" },
    { provider: "github", owner: null, repo: null, url: "https://uploads.github.com/repos/devrecated/acme-portal/assets" },
    { provider: "github", owner: null, repo: null, url: "https://github.com/devrecated/acme%252Dportal/issues/7" },
  ]) {
    assertRewritten(kanban)
  }
})

test("rewrites a host ticket that carries a repo or URL", () => {
  assertRewritten({ provider: "host", owner: null, repo: null, url: "https://github.com/devrecated/acme-portal/issues/7" })
  assertRewritten({ provider: "host", owner: "devrecated", repo: "acme-portal", url: null })
  assertRewritten({ provider: "host", owner: null, repo: "other", url: null })
})

test("passes a valid host ticket through unchanged", () => {
  for (const kanban of [
    { provider: "host", owner: null, repo: null, project: null, number: null, url: null },
    { provider: " Host ", owner: "", repo: "  ", project: null, number: 3, url: null },
  ]) {
    const ticket = ticketWith(kanban)
    assert.equal(isAllowedVisitorTicket(ticket), true, JSON.stringify(kanban))
    assert.deepEqual(sanitizeOne(ticket), ticket)
  }
})

test("passes a ticket with no kanban through unchanged", () => {
  const ticket = ticketWith(undefined)
  assert.deepEqual(sanitizeOne(ticket), ticket)
})
