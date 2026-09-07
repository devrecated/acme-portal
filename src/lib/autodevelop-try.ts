/**
 * Copyright (c) 2026 Devrecated.
 *
 * Browser client for visitor Try. Uses a public Autodevelop origin when
 * configured. Otherwise same-origin /api/sandbox/apply.
 */
import { tryOrigin } from "@/lib/autodevelop"
import { overlayHasSurface, type SandboxPatch } from "@/sandbox/schema"

export type TryStep = {
  id: string
  label: string
  status: "running" | "done" | "failed"
  at: string
}

export type TryTicket = {
  id: string
  title: string
  status: string
  source: string
  kanban: {
    provider: string
    owner: string | null
    repo: string | null
    project: string | null
    number: number | null
    url: string | null
  }
}

export type TryJob = {
  id?: string
  job_id?: string
  status: string
  steps?: TryStep[]
  tickets?: TryTicket[]
  overlay?: SandboxPatch
  files?: { path: string; language: string; content: string }[]
  summary?: string
  error?: string
}

const parseJob = async (response: Response): Promise<TryJob> => {
  const body = (await response.json()) as TryJob & { error?: string }
  if (!response.ok) {
    throw new Error(body.error || "Autodevelop could not start that change.")
  }
  return body
}

const postApply = async (url: string, prompt: string) => {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt }),
  })
  return parseJob(response)
}

const applyUrls = () => {
  const host = tryOrigin()
  return host ? [`${host}/try/apply`, "/api/sandbox/apply"] : ["/api/sandbox/apply"]
}

const jobUrls = (id: string) => {
  const host = tryOrigin()
  return host ? [`${host}/try/jobs/${id}`, `/api/sandbox/jobs/${id}`] : [`/api/sandbox/jobs/${id}`]
}

export async function startTryJob(prompt: string): Promise<TryJob> {
  let lastError: unknown
  for (const url of applyUrls()) {
    try {
      return await postApply(url, prompt)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Autodevelop could not start that change.")
}

export async function readTryJob(job: TryJob): Promise<TryJob> {
  const id = job.job_id || job.id
  if (!id) return job
  for (const url of jobUrls(id)) {
    try {
      const response = await fetch(url)
      if (!response.ok) continue
      return parseJob(response)
    } catch {
      // try the next origin
    }
  }
  return job
}

export async function waitForTryJob(
  started: TryJob,
  onUpdate: (job: TryJob) => void,
): Promise<TryJob> {
  let current = started
  onUpdate(current)
  for (let i = 0; i < 40; i += 1) {
    if (current.status === "failed") {
      throw new Error(current.error || "Autodevelop could not finish that change.")
    }
    if (current.status === "ready" && overlayHasSurface(current.overlay)) {
      return current
    }
    await new Promise((resolve) => setTimeout(resolve, 280))
    current = await readTryJob(current)
    onUpdate(current)
  }
  if (current.status === "ready" && !overlayHasSurface(current.overlay)) {
    throw new Error("Autodevelop finished without a session preview.")
  }
  throw new Error("Autodevelop is still working. Try again in a moment.")
}
