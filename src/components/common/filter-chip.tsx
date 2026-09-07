import { cn } from "@/lib/utils"

export function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count?: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium ring-1 ring-foreground/10",
        "outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
        active &&
          "bg-foreground text-background ring-transparent hover:bg-foreground/90",
      )}
    >
      {label}
      {count != null ? (
        <span
          className={cn(
            "tabular-nums",
            active ? "opacity-80" : "text-muted-foreground",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
