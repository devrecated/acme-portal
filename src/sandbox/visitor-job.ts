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

/** Percent-decode once so `acme%2Dportal` compares like `acme-portal`. */
const decode = (value: string): string => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Trim, lowercase, decode, and drop trailing `/` and `.git` (`acme-portal.git/`). */
const normalize = (value: unknown): string =>
  decode(String(value ?? ""))
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "")
    .replace(/\.git$/, "")

/**
 * GitHub URL forms that name the consumer repo but do not contain
 * CONSUMER_GITHUB_URL verbatim: REST API (`api.github.com/repos/...`) and
 * SSH remotes (`git@github.com:...`), with or without `.git`.
 */
const CONSUMER_URL_PATTERN = new RegExp(
  String.raw`(?:^|[^a-z0-9.-])(?:www\.)?(?:api\.github\.com/repos/|github\.com[/:])` +
    String.raw`${CONSUMER_GITHUB_OWNER}/${CONSUMER_GITHUB_REPO}(?:\.git)?(?:$|[/?#])`,
)

export const pointsAtConsumerRepo = (ticket: VisitorTicket | undefined): boolean => {
  if (!ticket?.kanban) return false
  const owner = normalize(ticket.kanban.owner)
  const repo = normalize(ticket.kanban.repo)
  const url = decode(String(ticket.kanban.url ?? "")).trim().toLowerCase()
  if (repo === CONSUMER_GITHUB_REPO && (owner === CONSUMER_GITHUB_OWNER || owner === "")) return true
  // Some providers put "owner/repo" in the repo field and leave owner empty.
  if (repo === `${CONSUMER_GITHUB_OWNER}/${CONSUMER_GITHUB_REPO}`) return true
  return url.includes(CONSUMER_GITHUB_URL) || CONSUMER_URL_PATTERN.test(url)
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
