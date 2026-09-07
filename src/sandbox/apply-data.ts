/**
 * Copyright (c) 2026 Devrecated.
 */
import { repository } from "@/data/repository"
import type { SandboxPatch } from "@/sandbox/schema"

export async function applySandboxData(patch: SandboxPatch) {
  if (patch.data?.createLead) {
    const lead = patch.data.createLead
    const existing = await repository.listLeads()
    if (existing.some((row) => row.email === lead.email)) {
      // already applied in this tab
    } else await repository.createLead({
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      notes: lead.notes,
      value: lead.value,
      priority: lead.priority ?? "high",
      stage: "new",
      source: "Website",
      vehicleIds: [],
      unitsWanted: 1,
    })
  }

  if (patch.data?.markFirstAvailableSold) {
    const vehicles = await repository.listVehicles()
    const mark = "sandbox-sold-this-week"
    if (!vehicles.some((vehicle) => vehicle.notes?.includes(mark))) {
      const target = vehicles.find((vehicle) => vehicle.status === "available")
      if (target) {
        await repository.updateVehicle(target.id, {
          status: "sold",
          soldAt: new Date().toISOString(),
          notes: `${target.notes ?? ""} ${mark}`.trim(),
        })
      }
    }
  }
}

const THEME_STYLE_ID = "acme-sandbox-theme"

const themeVars = (theme: NonNullable<SandboxPatch["theme"]>) => {
  const background = theme.background
  const foreground = theme.foreground
  const primary = theme.primary
  const card = theme.card ?? background
  const sidebar = theme.sidebar ?? background
  const pairs: [string, string | undefined][] = [
    ["--background", background],
    ["--color-background", background],
    ["--foreground", foreground],
    ["--color-foreground", foreground],
    ["--primary", primary],
    ["--color-primary", primary],
    ["--card", card],
    ["--color-card", card],
    ["--popover", card],
    ["--sidebar", sidebar],
    ["--color-sidebar", sidebar],
    ["--radius", theme.radius],
  ]
  return pairs.filter((entry): entry is [string, string] => Boolean(entry[1]))
}

const isDarkHex = (value?: string) => {
  if (!value?.startsWith("#") || value.length < 7) return false
  const n = Number.parseInt(value.slice(1, 7), 16)
  if (!Number.isFinite(n)) return false
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return (r * 299 + g * 587 + b * 114) / 1000 < 140
}

export function applySandboxTheme(patch: SandboxPatch | null) {
  if (typeof document === "undefined") return
  const root = document.documentElement
  document.getElementById(THEME_STYLE_ID)?.remove()
  const theme = patch?.theme
  if (patch?.copy?.dealerName) {
    document.title = `${patch.copy.dealerName}`
  }
  if (!theme) {
    root.removeAttribute("data-sandbox-theme")
    root.style.removeProperty("color-scheme")
    for (const key of ["background", "foreground", "primary", "radius", "card", "popover", "sidebar"] as const) {
      root.style.removeProperty(`--${key}`)
      root.style.removeProperty(`--color-${key}`)
    }
    if (!patch?.copy?.dealerName) {
      document.title = "Acme Fleet"
    }
    return
  }

  const vars = themeVars(theme)
  for (const [name, value] of vars) {
    root.style.setProperty(name, value)
  }
  if (isDarkHex(theme.background)) {
    root.style.setProperty("color-scheme", "dark")
  }
  root.setAttribute("data-sandbox-theme", "on")
  const style = document.createElement("style")
  style.id = THEME_STYLE_ID
  const body = vars.map(([name, value]) => `${name}: ${value};`).join(" ")
  style.textContent = `:root, :root.dark, html.dark, [data-sandbox-theme="on"] { ${body} }`
  document.head.appendChild(style)
}
