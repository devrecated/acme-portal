import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: boolean
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <div
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md",
            accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="size-4.5" />
        </div>
      </CardContent>
    </Card>
  )
}
