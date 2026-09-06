import { Car } from "lucide-react"

import { cn } from "@/lib/utils"
import type { Vehicle } from "@/types"

type PhotoVehicle = Pick<Vehicle, "imageUrl" | "year" | "make" | "model">

export function VehiclePhoto({
  vehicle,
  className,
}: {
  vehicle: PhotoVehicle
  className?: string
}) {
  const alt = `${vehicle.year} ${vehicle.make} ${vehicle.model}`

  if (!vehicle.imageUrl) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className,
        )}
        aria-hidden
      >
        <Car className="size-5" />
      </div>
    )
  }

  return (
    // Local files in /public — next/image is unnecessary for these static thumbs.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={vehicle.imageUrl}
      alt={alt}
      className={cn("bg-muted object-cover", className)}
    />
  )
}
