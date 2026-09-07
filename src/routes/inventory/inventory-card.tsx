"use client"

import { VehicleStatusBadge } from "@/components/common/status-badge"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import { formatCurrency, formatMiles } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSandboxOptional } from "@/sandbox/sandbox-context"
import type { Vehicle } from "@/types"

export function InventoryCard({
  vehicle,
  priority = false,
  onOpen,
}: {
  vehicle: Vehicle
  priority?: boolean
  onOpen: (vehicle: Vehicle) => void
}) {
  const sandbox = useSandboxOptional()
  const ribbon = sandbox?.patch?.widgets?.inventoryRibbon?.text

  return (
    <button
      type="button"
      onClick={() => onOpen(vehicle)}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl bg-card text-left ring-1 ring-foreground/10",
        "outline-none transition-[box-shadow,transform] focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <VehiclePhoto
        vehicle={vehicle}
        width={640}
        height={400}
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? "eager" : "lazy"}
        className="aspect-[16/10] w-full motion-safe:duration-500 motion-safe:group-hover:scale-[1.03] motion-safe:transition-transform"
      />
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-2.5">
        <span className="rounded-md bg-black/45 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-white/90 backdrop-blur-sm">
          {vehicle.stockNumber}
        </span>
        <div className="flex flex-col items-end gap-1">
          {ribbon ? (
            <span
              data-feature-demo-anchor="sandbox-ribbon"
              className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-primary-foreground"
            >
              {ribbon}
            </span>
          ) : null}
          <VehicleStatusBadge status={vehicle.status} />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 pt-12 text-white">
        <p className="text-pretty text-sm font-medium">
          {vehicle.year} {vehicle.make} {vehicle.model}
        </p>
        <p className="truncate text-xs text-white/75">
          {vehicle.bodyType} · {formatMiles(vehicle.mileage)} · {vehicle.location}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums">
          {formatCurrency(vehicle.listPrice)}
        </p>
      </div>
    </button>
  )
}
