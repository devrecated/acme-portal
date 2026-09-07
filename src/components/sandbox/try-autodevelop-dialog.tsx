/**
 * Copyright (c) 2026 Devrecated.
 */
"use client"

import { useState } from "react"

import { FeatureDemo } from "@/components/feature-demo/feature-demo"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { PROMPT_EXAMPLES } from "@/sandbox/schema"
import { useSandbox } from "@/sandbox/sandbox-context"

export function TryAutodevelopHost() {
  const sandbox = useSandbox()
  const [prompt, setPrompt] = useState<string>(PROMPT_EXAMPLES[0])

  return (
    <>
      <Dialog open={sandbox.dialogOpen} onOpenChange={(open) => (open ? sandbox.openDialog() : sandbox.closeDialog())}>
        <DialogContent className="sm:max-w-lg" showCloseButton>
          <DialogHeader>
            <DialogTitle>Try Autodevelop</DialogTitle>
            <DialogDescription>
              Autodevelop builds a session preview. The live pages update in
              this tab only. Close the tab or Reset to drop them. Production
              git is not written.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            disabled={sandbox.applying}
            aria-label="Change to apply"
            className="min-h-28"
          />
          {sandbox.applying ? (
            <div className="space-y-2 rounded-md border p-3 text-sm" aria-live="polite">
              <p className="font-medium">Autodevelop is working</p>
              <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
                {(sandbox.job?.steps ?? [{ id: "received", label: "Sending the prompt to Autodevelop", status: "running" }]).map(
                  (step) => (
                    <li key={`${step.id}-${step.at ?? step.label}`}>
                      {step.label}
                      {step.status === "running" ? "…" : ""}
                    </li>
                  ),
                )}
              </ol>
              {sandbox.job?.tickets?.[0] ? (
                <p>
                  Ticket: {sandbox.job.tickets[0].title}
                </p>
              ) : null}
            </div>
          ) : (
            <ul className="space-y-2">
              {PROMPT_EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    type="button"
                    className="min-h-11 w-full text-left text-sm text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => setPrompt(example)}
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              className="min-h-11"
              disabled={sandbox.applying || prompt.trim().length < 8}
              onClick={() => void sandbox.applyPrompt(prompt)}
            >
              {sandbox.applying ? "Autodevelop is working…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {sandbox.demoOpen && sandbox.patch?.featureDemo ? (
        <FeatureDemo demo={sandbox.patch.featureDemo} onDismiss={sandbox.dismissDemo} />
      ) : null}
    </>
  )
}
