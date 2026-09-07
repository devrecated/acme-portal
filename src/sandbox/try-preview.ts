/**
 * Copyright (c) 2026 Devrecated.
 *
 * Host-equivalent session overlay when a public Autodevelop Try origin is
 * not configured. Same schema Autodevelop returns from /try/apply. Does not
 * write git or create GitHub issues.
 */
import type { SandboxPatch } from "@/sandbox/schema"

export type HostTryPreview = {
  overlay: SandboxPatch
  summary: string
}

const clip = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 1)}…`

const GENERIC_DEALER = /^(dealer|portal|showroom|theme)$/i

const extractDealerName = (prompt: string) => {
  const quoted = prompt.match(/[“"]([^”"]{2,40})[”"]/)
  if (quoted?.[1] && !GENERIC_DEALER.test(quoted[1].trim())) return quoted[1].trim()
  const rename = prompt.match(/rename(?:\s+the)?(?:\s+dealer)?\s+to\s+([A-Z][\w\s]{1,32})/i)
  if (rename?.[1] && !GENERIC_DEALER.test(rename[1].trim())) return rename[1].trim()
  if (/midnight|showroom|dark/.test(prompt.toLowerCase())) return "Midnight Motor"
  return undefined
}

const soldWeek = (): HostTryPreview => ({
  summary: "Inventory now flags units sold this week.",
  overlay: {
    widgets: {
      dashboardHighlightStat: {
        label: "Sold this week",
        value: "3",
        hint: "Built by Autodevelop for this session",
      },
      inventoryRibbon: { text: "Sold this week" },
      topbarBanner: { text: "Inventory now flags units sold this week." },
    },
    data: { markFirstAvailableSold: true },
    navigateTo: "/inventory",
    featureDemo: {
      id: "sandbox-sold-week",
      introTitle: "Sold-this-week is live",
      introBody: "Autodevelop built a dashboard stat, an inventory ribbon, and marked a unit sold.",
      steps: [
        {
          anchor: "sandbox-ribbon",
          title: "Inventory ribbon",
          body: "Cards now carry a Sold this week ribbon so the floor change is obvious.",
        },
        {
          anchor: "sandbox-banner",
          title: "Session banner",
          body: "The top bar states the overlay. Open Dashboard next if you want the new stat.",
        },
      ],
    },
  },
})

const midnight = (dealerName: string): HostTryPreview => ({
  summary: `${dealerName} is running a midnight theme for this session.`,
  overlay: {
    theme: {
      background: "#0b1220",
      foreground: "#e8eefc",
      primary: "#7aa2ff",
      radius: "0px",
      card: "#121a2b",
      sidebar: "#070b14",
    },
    copy: {
      dealerName,
      dealerTagline: "Midnight showroom",
      dashboardTitle: "Night floor",
      dashboardDescription: "A darker desk. Same inventory, leads, and credit pipeline.",
    },
    widgets: {
      topbarBanner: { text: `${dealerName} is running a midnight theme for this session.` },
    },
    navigateTo: "/",
    featureDemo: {
      id: "sandbox-midnight",
      introTitle: "Showroom restyle",
      introBody: "Autodevelop changed theme tokens and the dealer name for this browser session only.",
      steps: [
        {
          anchor: "sandbox-brand",
          title: "Dealer name",
          body: "The sidebar wordmark is the name from your prompt.",
        },
        {
          anchor: "sandbox-banner",
          title: "Session banner",
          body: "The top bar states that this theme is a session overlay.",
        },
      ],
    },
  },
})

const huracanLead = (): HostTryPreview => ({
  summary: "New hot lead: yellow Huracán.",
  overlay: {
    data: {
      createLead: {
        contactName: "Elena Voss",
        email: "elena.voss@collector.example",
        phone: "(312) 555-0199",
        notes: "Wants the yellow Huracán on the floor this week.",
        value: 289_000,
        priority: "high",
      },
    },
    widgets: {
      topbarBanner: { text: "New hot lead: yellow Huracán." },
    },
    navigateTo: "/leads",
    featureDemo: {
      id: "sandbox-huracan-lead",
      introTitle: "Hot lead added",
      introBody: "Autodevelop placed a high-priority lead on the New column of the kanban.",
      steps: [
        {
          anchor: "sandbox-leads-board",
          title: "Leads board",
          body: "Elena Voss is in New. Drag the card if you want to move the stage.",
        },
      ],
    },
  },
})

const fallback = (prompt: string): HostTryPreview => {
  const named = extractDealerName(prompt)
  return {
    summary: clip(`Applied: ${prompt}`, 80),
    overlay: {
      copy: named
        ? { dealerName: named, dealerTagline: "Session overlay" }
        : { dealerTagline: "Session overlay" },
      widgets: {
        topbarBanner: { text: clip(`Applied: ${prompt}`, 80) },
        dashboardHighlightStat: {
          label: "Sandbox apply",
          value: "1",
          hint: "This session",
        },
      },
      navigateTo: "/",
      featureDemo: {
        id: "sandbox-generic",
        introTitle: "Your change is on the floor",
        introBody: "Autodevelop wrote a session banner and a dashboard stat. Reset clears them.",
        steps: [
          {
            anchor: "sandbox-banner",
            title: "Session banner",
            body: "The top bar repeats the change you asked for.",
          },
          {
            anchor: "sandbox-stat",
            title: "Dashboard stat",
            body: "A Sandbox apply card marks that this session is not stock seed data.",
          },
        ],
      },
    },
  }
}

export const generateHostTryPreview = (prompt: string): HostTryPreview => {
  const text = prompt.trim()
  const lower = text.toLowerCase()
  if (/ribbon|sold this week|sold-this-week/.test(lower)) return soldWeek()
  if (/hurac[aá]n|hot lead|kanban/.test(lower)) return huracanLead()
  if (/midnight|restyle|dark/.test(lower)) {
    return midnight(extractDealerName(text) ?? "Midnight Motor")
  }
  return fallback(text)
}
