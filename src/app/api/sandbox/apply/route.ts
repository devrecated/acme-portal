/**
 * Copyright (c) 2026 Devrecated.
 *
 * Same-origin Try apply. Forwards to a public Autodevelop API when configured.
 * On Vercel, loopback Autodevelop is skipped and a host-equivalent overlay is
 * returned so the live demo still changes. Does not write git or deploy.
 */
import { NextResponse } from "next/server"

import { isLoopbackOrigin } from "@/lib/autodevelop"
import { allowSandboxApply } from "@/sandbox/apply-rate-limit"
import { applyRequestSchema, parseSandboxOverlay } from "@/sandbox/schema"
import { generateHostTryPreview } from "@/sandbox/try-preview"

const autodevelopApiOrigin = () =>
  (process.env.AUTODEVELOP_API_ORIGIN || "http://127.0.0.1:8789").replace(/\/$/, "")

const shouldForwardToAutodevelop = (origin: string) => {
  if (isLoopbackOrigin(origin) && process.env.VERCEL) return false
  return Boolean(origin)
}

const hostJob = (prompt: string) => {
  const preview = generateHostTryPreview(prompt)
  const at = new Date().toISOString()
  const id = crypto.randomUUID()
  return {
    id,
    job_id: id,
    status: "ready",
    steps: [
      { id: "received", label: "Received the prompt", status: "done", at },
      { id: "generate", label: "Building session preview", status: "done", at },
      { id: "ready", label: "Session preview ready", status: "done", at },
    ],
    tickets: [
      {
        id: `try-${id.slice(0, 8)}`,
        title: prompt.trim().slice(0, 72),
        status: "preview",
        source: "try",
        kanban: {
          provider: "host",
          owner: null,
          repo: null,
          project: null,
          number: null,
          url: null,
        },
      },
    ],
    overlay: preview.overlay,
    summary: preview.summary,
  }
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"
  if (!allowSandboxApply(ip)) {
    return NextResponse.json({ error: "Too many applies. Wait a minute." }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "Send a JSON body with prompt." }, { status: 400 })
  }

  const parsed = applyRequestSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Prompt must be between 8 and 400 characters." },
      { status: 400 },
    )
  }

  const origin = autodevelopApiOrigin()
  if (shouldForwardToAutodevelop(origin)) {
    const response = await fetch(`${origin}/try/apply`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: parsed.data.prompt }),
    }).catch(() => null)

    if (response?.ok) {
      const body = (await response.json().catch(() => null)) as { overlay?: unknown } | null
      try {
        if (body) {
          parseSandboxOverlay(body.overlay)
          return NextResponse.json(body, { status: response.status })
        }
      } catch {
        // Autodevelop answered without a usable overlay. Use the host preview.
      }
    }
  }

  return NextResponse.json(hostJob(parsed.data.prompt))
}
