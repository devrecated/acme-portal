import Link from "next/link"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">That page doesn't exist</h2>
        <p className="text-sm text-muted-foreground">
          The link may be out of date, or the record was removed.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href="/">Back to dashboard</Link>
      </Button>
    </div>
  )
}
