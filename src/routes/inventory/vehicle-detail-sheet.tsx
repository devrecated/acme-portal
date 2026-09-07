import { Pencil, Trash2 } from "lucide-react"
import type { ReactNode } from "react"

import { Can } from "@/auth/require-permission"
import { VehicleStatusBadge } from "@/components/common/status-badge"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useDeleteVehicle, useUsers } from "@/data/queries"
import { formatCurrency, formatDate, formatMiles } from "@/lib/format"
import type { Vehicle } from "@/types"

export function VehicleDetailSheet({
  vehicle,
  onOpenChange,
  onEdit,
}: {
  vehicle: Vehicle | null
  onOpenChange: (open: boolean) => void
  onEdit: (vehicle: Vehicle) => void
}) {
  const { data: users = [] } = useUsers()
  const deleteVehicle = useDeleteVehicle()

  if (!vehicle) return null

  const rep = users.find((user) => user.id === vehicle.assignedRepId)
  const margin = vehicle.listPrice - vehicle.cost
  const marginPercent = vehicle.listPrice
    ? (margin / vehicle.listPrice) * 100
    : 0

  const handleDelete = async () => {
    await deleteVehicle.mutateAsync(vehicle.id)
    onOpenChange(false)
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <div className="relative">
          <VehiclePhoto
            vehicle={vehicle}
            width={800}
            height={450}
            fetchPriority="high"
            className="aspect-[16/10] w-full"
          />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pr-14">
            <span className="rounded-md bg-black/45 px-1.5 py-0.5 font-mono text-[10px] tracking-wide text-white/90 backdrop-blur-sm">
              {vehicle.stockNumber}
            </span>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-16">
            <SheetHeader className="p-0">
              <SheetTitle className="text-pretty text-white">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </SheetTitle>
              <SheetDescription className="font-mono text-white/75">
                {vehicle.vin}
              </SheetDescription>
            </SheetHeader>
          </div>
        </div>

        <div className="space-y-5 p-4">
          <section className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
            <Detail label="Asking price">
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(vehicle.listPrice)}
              </span>
            </Detail>
            <Can permission="inventory.viewCost">
              <Detail label="Gross margin">
                <span className="text-lg font-semibold tabular-nums">
                  {formatCurrency(margin)}
                </span>
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {marginPercent.toFixed(1)}%
                </span>
              </Detail>
            </Can>
          </section>

          <section className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Detail label="Body type">{vehicle.bodyType}</Detail>
            <Detail label="Segment">{vehicle.gvwrClass}</Detail>
            <Detail label="Fuel">{vehicle.fuel}</Detail>
            <Detail label="Condition">{vehicle.condition}</Detail>
            <Detail label="Mileage">{formatMiles(vehicle.mileage)}</Detail>
            <Detail label="Location">{vehicle.location}</Detail>
            <Can permission="inventory.viewCost">
              <Detail label="Acquisition cost">{formatCurrency(vehicle.cost)}</Detail>
            </Can>
            <Detail label="Assigned rep">
              {rep ? `${rep.firstName} ${rep.lastName}` : "Unassigned"}
            </Detail>
            <Detail label="Added">{formatDate(vehicle.createdAt)}</Detail>
            {vehicle.soldAt ? (
              <Detail label="Sold">{formatDate(vehicle.soldAt)}</Detail>
            ) : null}
          </section>

          {vehicle.notes ? (
            <>
              <Separator />
              <section className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="text-sm leading-relaxed">{vehicle.notes}</p>
              </section>
            </>
          ) : null}
        </div>

        <SheetFooter>
          <Can permission="inventory.edit">
            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => onEdit(vehicle)}>
                <Pencil /> Edit
              </Button>
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteVehicle.isPending}
              >
                <Trash2 /> Remove
              </Button>
            </div>
          </Can>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
