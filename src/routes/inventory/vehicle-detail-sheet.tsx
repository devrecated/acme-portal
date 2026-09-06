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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </SheetTitle>
              <SheetDescription className="font-mono">
                {vehicle.stockNumber} · {vehicle.vin}
              </SheetDescription>
            </div>
            <VehicleStatusBadge status={vehicle.status} />
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <VehiclePhoto
            vehicle={vehicle}
            className="aspect-[16/9] w-full rounded-lg"
          />

          <section className="grid grid-cols-2 gap-4">
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

          <Separator />

          <section className="grid grid-cols-2 gap-x-4 gap-y-4">
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
