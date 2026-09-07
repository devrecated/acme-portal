/**
 * Copyright (c) 2026 Devrecated.
 *
 * Same-origin poll for an Autodevelop Try job. Skips loopback Autodevelop on
 * Vercel. Host apply returns ready immediately, so this path is unused there.
 */
import { NextResponse } from "next/server"

import { isLoopbackOrigin } from "@/lib/autodevelop"

const autodevelopApiOrigin = () =>
  (process.env.AUTODEVELOP_API_ORIGIN || "http://127.0.0.1:8789").replace(/\/$/, "")

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: "Missing job id." }, { status: 400 })
  }

  const origin = autodevelopApiOrigin()
  if (isLoopbackOrigin(origin) && process.env.VERCEL) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  const response = await fetch(`${origin}/try/jobs/${encodeURIComponent(id)}`).catch(() => null)
  if (!response) {
    return NextResponse.json({ error: "Autodevelop is not reachable." }, { status: 502 })
  }
  const body = await response.json().catch(() => ({ error: "Autodevelop returned an unreadable response." }))
  return NextResponse.json(body, { status: response.status })
}
