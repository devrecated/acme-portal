"use client"

import { LifeBuoy, Ticket } from "lucide-react"

import { ticketsHref, ticketsTheme } from "@/lib/autodevelop"

type View = "submit" | "mine"

const LABELS: Record<View, string> = {
  submit: "Request a change",
  mine: "My tickets",
}

export function AutodevelopTicketsLink({
  view,
  className,
  onClick,
}: {
  view: View
  className?: string
  onClick?: () => void
}) {
  const Icon = view === "submit" ? LifeBuoy : Ticket
  return (
    <a
      href={ticketsHref(view)}
      className={className}
      data-autodevelop="tickets"
      data-autodevelop-view={view}
      data-autodevelop-theme={ticketsTheme}
      onClick={onClick}
    >
      <Icon />
      <span>{LABELS[view]}</span>
    </a>
  )
}
