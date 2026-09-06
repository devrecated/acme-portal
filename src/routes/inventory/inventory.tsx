"use client"

import { Car, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { useAuth } from "@/auth/auth-context"
import { DataTable, type Column } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { VehicleStatusBadge } from "@/components/common/status-badge"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useVehicles } from "@/data/queries"
import { formatCurrency, formatMiles } from "@/lib/format"
import { VehicleDetailSheet } from "@/routes/inventory/vehicle-detail-sheet"
import { VehicleFormDialog } from "@/routes/inventory/vehicle-form-dialog"
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
  type VehicleStatus,
} from "@/types"

export function InventoryPage() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { can } = useAuth()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<VehicleStatus | "all">("all")
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [editing, setEditing] = useState<Vehicle | undefined>()
  const [formOpen, setFormOpen] = useState(false)

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return vehicles.filter((vehicle) => {
      if (status !== "all" && vehicle.status !== status) return false
      if (!term) return true
      return [
        vehicle.stockNumber,
        vehicle.vin,
        vehicle.make,
        vehicle.model,
        vehicle.bodyType,
        vehicle.location,
        String(vehicle.year),
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [vehicles, search, status])

  const columns = useMemo<Column<Vehicle>[]>(() => {
    const base: Column<Vehicle>[] = [
      {
        key: "stock",
        header: "Stock",
        sortValue: (v) => v.stockNumber,
        cell: (v) => <span className="font-mono text-xs">{v.stockNumber}</span>,
      },
      {
        key: "vehicle",
        header: "Vehicle",
        sortValue: (v) => `${v.make} ${v.model}`,
        cell: (v) => (
          <div className="flex items-center gap-3">
            <VehiclePhoto
              vehicle={v}
              className="size-12 shrink-0 rounded-md"
            />
            <div className="space-y-0.5">
              <p className="font-medium">
                {v.year} {v.make} {v.model}
              </p>
              <p className="text-xs text-muted-foreground">
                {v.bodyType} · {v.gvwrClass} · {v.fuel}
              </p>
            </div>
          </div>
        ),
      },
      {
        key: "mileage",
        header: "Mileage",
        sortValue: (v) => v.mileage,
        className: "tabular-nums",
        cell: (v) => formatMiles(v.mileage),
      },
      {
        key: "status",
        header: "Status",
        sortValue: (v) => v.status,
        cell: (v) => <VehicleStatusBadge status={v.status} />,
      },
      {
        key: "location",
        header: "Location",
        sortValue: (v) => v.location,
        cell: (v) => <span className="text-muted-foreground">{v.location}</span>,
      },
      {
        key: "price",
        header: "Asking",
        sortValue: (v) => v.listPrice,
        className: "text-right tabular-nums font-medium",
        headerClassName: "text-right",
        cell: (v) => formatCurrency(v.listPrice),
      },
    ]

    if (can("inventory.viewCost")) {
      base.push({
        key: "margin",
        header: "Margin",
        sortValue: (v) => v.listPrice - v.cost,
        className: "text-right tabular-nums",
        headerClassName: "text-right",
        cell: (v) => (
          <span className="text-muted-foreground">
            {formatCurrency(v.listPrice - v.cost)}
          </span>
        ),
      })
    }

    return base
  }, [can])

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }

  const openEdit = (vehicle: Vehicle) => {
    setSelected(null)
    setEditing(vehicle)
    setFormOpen(true)
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        description={`${vehicles.length} cars on the books across every showroom.`}
        actions={
          can("inventory.edit") ? (
            <Button onClick={openCreate}>
              <Plus /> Add vehicle
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by stock number, VIN, make, model, or location"
            className="pl-9"
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as VehicleStatus | "all")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {VEHICLE_STATUSES.map((value) => (
              <SelectItem key={value} value={value}>
                {VEHICLE_STATUS_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(vehicle) => vehicle.id}
        onRowClick={setSelected}
        isLoading={isLoading}
        initialSort={{ key: "stock", direction: "desc" }}
        emptyState={
          <EmptyState
            icon={Car}
            title="No vehicles match those filters"
            description="Try a different search term or clear the status filter."
          />
        }
      />

      <VehicleDetailSheet
        vehicle={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        onEdit={openEdit}
      />
      <VehicleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        vehicle={editing}
      />
    </>
  )
}
