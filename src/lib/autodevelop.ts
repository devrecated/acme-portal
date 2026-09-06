/** Ticket UI origin. No secrets. Local sandbox default. */
export const ticketsOrigin = () =>
  (process.env.NEXT_PUBLIC_AUTODEVELOP_TICKETS_ORIGIN || "http://localhost:5174").replace(/\/$/, "")

export const ticketsHref = (view: "submit" | "mine") =>
  `${ticketsOrigin()}/?embed=1&view=${view}`

export const ticketsEmbedSrc = () => `${ticketsOrigin()}/embed.js`

export const ticketsTheme = JSON.stringify({
  primary: "#c2410c",
  radius: "8px",
})
