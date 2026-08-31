"use client"

import { TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <TriangleAlert className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">
          Try again. If it keeps happening, sign out and pick a different account.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  )
}
