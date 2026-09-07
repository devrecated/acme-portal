/**
 * Copyright (c) 2026 Devrecated.
 *
 * Deny-by-default patch a visitor prompt may apply. Unknown keys are stripped.
 */
import { z } from "zod"

export const featureDemoStepSchema = z.object({
  anchor: z.string().min(1).max(64),
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(280),
  action: z.enum(["open", "focus", "setValue"]).optional(),
})

export const sandboxPatchSchema = z.object({
  theme: z
    .object({
      background: z.string().max(32).optional(),
      foreground: z.string().max(32).optional(),
      primary: z.string().max(32).optional(),
      radius: z.string().max(16).optional(),
      card: z.string().max(32).optional(),
      sidebar: z.string().max(32).optional(),
    })
    .optional(),
  copy: z
    .object({
      dealerName: z.string().max(48).optional(),
      dealerTagline: z.string().max(80).optional(),
      dashboardTitle: z.string().max(80).optional(),
      dashboardDescription: z.string().max(160).optional(),
    })
    .optional(),
  data: z
    .object({
      createLead: z
        .object({
          contactName: z.string().max(64),
          email: z.string().max(80),
          phone: z.string().max(32),
          notes: z.string().max(200).optional(),
          value: z.number().int().min(10_000).max(2_000_000),
          priority: z.enum(["low", "medium", "high"]).optional(),
        })
        .optional(),
      markFirstAvailableSold: z.boolean().optional(),
    })
    .optional(),
  widgets: z
    .object({
      dashboardHighlightStat: z
        .object({
          label: z.string().max(40),
          value: z.string().max(24),
          hint: z.string().max(64).optional(),
        })
        .optional(),
      inventoryRibbon: z
        .object({
          text: z.string().max(48),
        })
        .optional(),
      topbarBanner: z
        .object({
          text: z.string().max(80),
        })
        .optional(),
    })
    .optional(),
  navigateTo: z.enum(["/", "/inventory", "/leads"]).optional(),
  featureDemo: z
    .object({
      id: z.string().max(64),
      introTitle: z.string().max(80),
      introBody: z.string().max(280),
      steps: z.array(featureDemoStepSchema).min(1).max(5),
    })
    .optional(),
})

export type SandboxPatch = z.infer<typeof sandboxPatchSchema>

export function overlayHasSurface(patch: SandboxPatch | null | undefined): patch is SandboxPatch {
  if (!patch) return false
  return Boolean(
    patch.theme?.background ||
      patch.theme?.primary ||
      patch.copy?.dealerName ||
      patch.copy?.dealerTagline ||
      patch.copy?.dashboardTitle ||
      patch.data?.createLead ||
      patch.data?.markFirstAvailableSold ||
      patch.widgets?.topbarBanner?.text ||
      patch.widgets?.inventoryRibbon?.text ||
      patch.widgets?.dashboardHighlightStat,
  )
}

export function parseSandboxOverlay(raw: unknown): SandboxPatch {
  const parsed = sandboxPatchSchema.safeParse(raw)
  if (!parsed.success || !overlayHasSurface(parsed.data)) {
    throw new Error("Autodevelop finished without a session preview.")
  }
  return parsed.data
}

export const applyRequestSchema = z.object({
  prompt: z.string().trim().min(8).max(400),
})

export const PROMPT_EXAMPLES = [
  "Add a sold-this-week ribbon on inventory and a dashboard stat for it.",
  "Restyle the portal as a dark midnight showroom and rename the dealer.",
  "Add a hot lead for a yellow Huracán and walk me to the kanban.",
] as const
