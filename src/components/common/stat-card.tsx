import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = false,
  compact = false,
  className,
}: {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  accent?: boolean
  compact?: boolean
  className?: string
}) {
  return (
    <Card
      size={compact ? "sm" : "default"}
      className={cn(compact && "gap-0 py-0", className)}
    >
      <CardContent
        className={cn(
          "flex items-center justify-between gap-3",
          compact ? "px-3 py-2.5" : "p-5",
        )}
      >
        <div className={compact ? "space-y-0.5" : "space-y-1"}>
          <p className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          <p
            className={cn(
              "font-semibold tracking-tight tabular-nums",
              compact ? "text-lg sm:text-xl" : "text-2xl",
            )}
          >
            {value}
          </p>
          {hint ? (
            <p
              className={cn(
                "text-xs text-muted-foreground",
                compact && "hidden truncate sm:block",
              )}
            >
              {hint}
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-md",
            compact ? "size-8" : "size-9",
            accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className={compact ? "size-4" : "size-4.5"} aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
