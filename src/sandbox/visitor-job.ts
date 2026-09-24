/**
 * Copyright (c) 2026 Devrecated.
 *
 * Visitor Try may mint Autodevelop tickets. It must never name or write
 * github.com/devrecated/acme-portal, and must never apply file patches.
 */

export const CONSUMER_GITHUB_OWNER = "devrecated"
export const CONSUMER_GITHUB_REPO = "acme-portal"
export const CONSUMER_GITHUB_URL = "github.com/devrecated/acme-portal"

type Kanban = {
  provider?: string
  owner?: string | null
  repo?: string | null
  project?: string | null
  number?: number | null
  url?: string | null
}

type VisitorTicket = {
  id?: string
  title?: string
  status?: string
  source?: string
  kanban?: Kanban
}

export type VisitorTryJob = {
  tickets?: VisitorTicket[]
  files?: unknown
  [key: string]: unknown
}

const HOST_KANBAN: Kanban = {
  provider: "host",
  owner: null,
  repo: null,
  project: null,
  number: null,
  url: null,
}

export const pointsAtConsumerRepo = (ticket: VisitorTicket | undefined): boolean => {
  if (!ticket?.kanban) return false
  const owner = String(ticket.kanban.owner || "").toLowerCase()
  const repo = String(ticket.kanban.repo || "").toLowerCase()
  const url = String(ticket.kanban.url || "").toLowerCase()
  if (owner === CONSUMER_GITHUB_OWNER && repo === CONSUMER_GITHUB_REPO) return true
  return url.includes(CONSUMER_GITHUB_URL)
}

const hostOnlyTicket = (ticket: VisitorTicket): VisitorTicket => ({
  ...ticket,
  source: ticket.source || "try",
  kanban: { ...HOST_KANBAN },
})

/** Drop file payloads and rewrite tickets that name the consumer GitHub repo. */
export const sanitizeVisitorTryJob = <T extends object>(job: T): T => {
  const next = { ...(job as T & VisitorTryJob) }
  delete next.files
  if (Array.isArray(next.tickets)) {
    next.tickets = next.tickets.map((ticket) =>
      pointsAtConsumerRepo(ticket) ? hostOnlyTicket(ticket) : ticket,
    )
  }
  return next as T
}
