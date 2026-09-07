/** Ticket UI and Try origins. No secrets. Loopback only for local development. */

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]"])

export const isLoopbackOrigin = (value: string) => {
  try {
    return LOOPBACK.has(new URL(value).hostname)
  } catch {
    return false
  }
}

const pageIsRemote = () => {
  if (typeof window !== "undefined") {
    return !LOOPBACK.has(window.location.hostname)
  }
  return Boolean(process.env.VERCEL)
}

const stripSlash = (value: string) => value.replace(/\/$/, "")

const configuredTicketsOrigin = () =>
  stripSlash(process.env.NEXT_PUBLIC_AUTODEVELOP_TICKETS_ORIGIN || "")

const configuredTryOrigin = () =>
  stripSlash(process.env.NEXT_PUBLIC_AUTODEVELOP_TRY_ORIGIN || "")

const localTicketsDefault = () => (process.env.VERCEL ? "" : "http://localhost:5174")

/** Public ticket UI origin, or empty when only a loopback default exists on a remote host. */
export const ticketsOrigin = () => {
  const configured = configuredTicketsOrigin()
  const raw = configured || localTicketsDefault()
  if (!raw) return ""
  if (pageIsRemote() && isLoopbackOrigin(raw)) return ""
  return raw
}

/** Public Autodevelop Try origin. Empty when the live page must use /api/sandbox/apply. */
export const tryOrigin = () => {
  const raw = configuredTryOrigin() || ticketsOrigin()
  if (!raw) return ""
  if (pageIsRemote() && isLoopbackOrigin(raw)) return ""
  return raw
}

export const ticketsHref = (view: "submit" | "mine") => {
  const origin = ticketsOrigin()
  if (!origin) return "#"
  return `${origin}/?embed=1&view=${view}`
}

export const ticketsEmbedSrc = () => {
  const origin = ticketsOrigin()
  return origin ? `${origin}/embed.js` : ""
}

export const ticketsTheme = JSON.stringify({
  primary: "#c2410c",
  radius: "8px",
})
