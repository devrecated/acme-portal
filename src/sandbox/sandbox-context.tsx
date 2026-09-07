/**
 * Copyright (c) 2026 Devrecated.
 */
"use client"

import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { toast } from "sonner"

import { clearFeatureDemo } from "@/components/feature-demo/featureDemoStorage"
import { queryKeys } from "@/data/queries"
import { repository } from "@/data/repository"
import { startTryJob, waitForTryJob, type TryJob } from "@/lib/autodevelop-try"
import { applySandboxData, applySandboxTheme } from "@/sandbox/apply-data"
import { clearOverlay, readOverlay, writeOverlay } from "@/sandbox/overlay-storage"
import { parseSandboxOverlay, type SandboxPatch } from "@/sandbox/schema"

type SandboxContextValue = {
  patch: SandboxPatch | null
  applying: boolean
  job: TryJob | null
  dialogOpen: boolean
  demoOpen: boolean
  openDialog: () => void
  closeDialog: () => void
  applyPrompt: (prompt: string) => Promise<void>
  reset: () => Promise<void>
  dismissDemo: () => void
}

const SandboxContext = createContext<SandboxContextValue | null>(null)

export function SandboxProvider({ children }: { children: ReactNode }) {
  const [patch, setPatch] = useState<SandboxPatch | null>(null)
  const [applying, setApplying] = useState(false)
  const [job, setJob] = useState<TryJob | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [demoOpen, setDemoOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const invalidate = useCallback(async () => {
    await Promise.all(
      Object.values(queryKeys).map((key) => queryClient.invalidateQueries({ queryKey: key })),
    )
  }, [queryClient])

  const dropTryQuery = useCallback(() => {
    if (searchParams.get("try") !== "1") return
    const next = new URLSearchParams(searchParams.toString())
    next.delete("try")
    const query = next.toString()
    router.replace(query ? `${pathname}?${query}` : pathname || "/")
  }, [pathname, router, searchParams])

  const commitPatch = useCallback(
    async (next: SandboxPatch, { replay }: { replay: boolean }) => {
      setDialogOpen(false)
      if (!replay) {
        await applySandboxData(next)
      }
      applySandboxTheme(next)
      writeOverlay(next)
      setPatch(next)
      await invalidate()
      if (next.navigateTo && next.navigateTo !== pathname) {
        router.push(next.navigateTo)
      } else {
        dropTryQuery()
      }
      if (next.featureDemo) setDemoOpen(true)
    },
    [dropTryQuery, invalidate, pathname, router],
  )

  useEffect(() => {
    if (hydrated) return
    const stored = readOverlay()
    applySandboxTheme(stored)
    setPatch(stored)
    if (stored) {
      void applySandboxData(stored).then(() => invalidate())
    }
    if (searchParams.get("try") === "1" && !stored) {
      setDialogOpen(true)
    }
    setHydrated(true)
  }, [hydrated, invalidate, searchParams])

  useEffect(() => {
    if (!hydrated) return
    const stored = readOverlay()
    applySandboxTheme(stored)
    setPatch(stored)
  }, [hydrated, pathname])

  const applyPrompt = useCallback(
    async (prompt: string) => {
      setApplying(true)
      setJob(null)
      try {
        const started = await startTryJob(prompt)
        const finished = await waitForTryJob(started, setJob)
        const overlay = parseSandboxOverlay(finished.overlay)
        const tabStep = {
          id: "tab",
          label: "Updating this tab",
          status: "running" as const,
          at: new Date().toISOString(),
        }
        setJob({
          ...finished,
          overlay,
          steps: [...(finished.steps ?? []), tabStep],
        })
        await commitPatch(overlay, { replay: false })
        setJob({
          ...finished,
          overlay,
          steps: [...(finished.steps ?? []), { ...tabStep, status: "done" }],
        })
        setJob(null)
        toast.success("Autodevelop applied this for the tab only. Close the tab or Reset to drop it.")
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Apply failed")
      } finally {
        setApplying(false)
      }
    },
    [commitPatch],
  )

  const reset = useCallback(async () => {
    repository.reset()
    applySandboxTheme(null)
    clearOverlay()
    clearFeatureDemo()
    setPatch(null)
    setJob(null)
    setDemoOpen(false)
    invalidate()
    toast.message("This tab is back to the stock demo.")
  }, [invalidate])

  const value = useMemo<SandboxContextValue>(
    () => ({
      patch,
      applying,
      job,
      dialogOpen,
      demoOpen,
      openDialog: () => {
        if (!applying) setJob(null)
        setDialogOpen(true)
      },
      closeDialog: () => setDialogOpen(false),
      applyPrompt,
      reset,
      dismissDemo: () => setDemoOpen(false),
    }),
    [applyPrompt, applying, demoOpen, dialogOpen, job, patch, reset],
  )

  return <SandboxContext.Provider value={value}>{children}</SandboxContext.Provider>
}

export function useSandbox() {
  const value = useContext(SandboxContext)
  if (!value) {
    throw new Error("useSandbox must be used under SandboxProvider")
  }
  return value
}

export function useSandboxOptional() {
  return useContext(SandboxContext)
}
