/**
 * Copyright (c) 2026 Devrecated.
 *
 * Spotlight + Show Me. No Joyride. Buttons ≥ 44px.
 */
"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { writeFeatureDemo } from "@/components/feature-demo/featureDemoStorage"
import type { SandboxPatch } from "@/sandbox/schema"

type Demo = NonNullable<SandboxPatch["featureDemo"]>

export function FeatureDemo({
  demo,
  onDismiss,
}: {
  demo: Demo
  onDismiss: () => void
}) {
  const [mode, setMode] = useState<"intro" | "walk">("intro")
  const [step, setStep] = useState(0)
  const [box, setBox] = useState<DOMRect | null>(null)

  const current = mode === "walk" ? demo.steps[step] : null
  const anchorId = current?.anchor ?? demo.steps[0]?.anchor

  useEffect(() => {
    if (!anchorId) return
    const node = document.querySelector(`[data-feature-demo-anchor="${anchorId}"]`)
    if (!(node instanceof HTMLElement)) {
      setBox(null)
      return
    }
    const update = () => setBox(node.getBoundingClientRect())
    update()
    window.addEventListener("resize", update)
    window.addEventListener("scroll", update, true)
    return () => {
      window.removeEventListener("resize", update)
      window.removeEventListener("scroll", update, true)
    }
  }, [anchorId, mode, step])

  const cardStyle = useMemo(() => {
    if (!box) {
      return { top: "30%", left: "50%", transform: "translateX(-50%)" } as const
    }
    const top = Math.min(window.innerHeight - 220, box.bottom + 12)
    const left = Math.min(window.innerWidth - 320, Math.max(12, box.left))
    return { top, left } as const
  }, [box])

  const finish = (choice: "skipped" | "completed") => {
    writeFeatureDemo(demo.id, choice)
    onDismiss()
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-[40]">
      <div className="pointer-events-auto absolute inset-0 top-24 bg-black/30" aria-hidden />
      {box ? (
        <div
          className="pointer-events-none absolute z-[81] ring-2 ring-background"
          style={{
            top: box.top - 6,
            left: box.left - 6,
            width: box.width + 12,
            height: box.height + 12,
          }}
        />
      ) : null}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feature-demo-title"
        className="pointer-events-auto absolute z-[82] w-[min(22rem,calc(100vw-1.5rem))] border bg-background p-4 shadow-lg"
        style={cardStyle}
      >
        {mode === "intro" ? (
          <>
            <h2 id="feature-demo-title" className="text-base font-semibold">
              {demo.introTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{demo.introBody}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="min-h-11" onClick={() => setMode("walk")}>
                Show Me
              </Button>
              <Button className="min-h-11" variant="outline" onClick={() => finish("skipped")}>
                Got It
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Step {step + 1} of {demo.steps.length}
            </p>
            <h2 id="feature-demo-title" className="mt-1 text-base font-semibold">
              {current?.title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{current?.body}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="min-h-11"
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((n) => Math.max(0, n - 1))}
              >
                Back
              </Button>
              {step < demo.steps.length - 1 ? (
                <Button className="min-h-11" onClick={() => setStep((n) => n + 1)}>
                  Next
                </Button>
              ) : (
                <Button className="min-h-11" onClick={() => finish("completed")}>
                  Done
                </Button>
              )}
              <Button className="min-h-11" variant="ghost" onClick={() => finish("skipped")}>
                Skip
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
