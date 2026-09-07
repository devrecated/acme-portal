"use client"

import { Car, LayoutGrid, List, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { useAuth } from "@/auth/auth-context"
import { DataTable, type Column } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/empty-state"
import { FilterChip } from "@/components/common/filter-chip"
import { PageHeader } from "@/components/common/page-header"
import { VehicleStatusBadge } from "@/components/common/status-badge"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useVehicles } from "@/data/queries"
import { formatCurrency, formatMiles } from "@/lib/format"
import { InventoryCard } from "@/routes/inventory/inventory-card"
import { VehicleDetailSheet } from "@/routes/inventory/vehicle-detail-sheet"
import { VehicleFormDialog } from "@/routes/inventory/vehicle-form-dialog"
import {
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
  type VehicleStatus,
} from "@/types"

type InventoryView = "gallery" | "list"
type StatusFilter = VehicleStatus | "all"

export function InventoryPage() {
  const { data: vehicles = [], isLoading } = useVehicles()
  const { can } = useAuth()

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [view, setView] = useState<InventoryView>("gallery")
  const [selected, setSelected] = useState<Vehicle | null>(null)
  const [editing, setEditing] = useState<Vehicle | undefined>()
  const [formOpen, setFormOpen] = useState(false)

  const counts = useMemo(() => {
    const next: Record<StatusFilter, number> = {
      all: vehicles.length,
      available: 0,
      reconditioning: 0,
      in_transit: 0,
      pending_sale: 0,
      sold: 0,
    }
    for (const vehicle of vehicles) {
      next[vehicle.status] += 1
    }
    return next
  }, [vehicles])

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
      .toSorted((a, b) => b.stockNumber.localeCompare(a.stockNumber))
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
              width={72}
              height={48}
              className="size-12 shrink-0 rounded-md"
            />
            <div className="min-w-0 space-y-0.5">
              <p className="truncate font-medium">
                {v.year} {v.make} {v.model}
              </p>
              <p className="truncate text-xs text-muted-foreground">
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
        className: "hidden tabular-nums lg:table-cell",
        headerClassName: "hidden lg:table-cell",
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
        className: "hidden text-muted-foreground xl:table-cell",
        headerClassName: "hidden xl:table-cell",
        cell: (v) => v.location,
      },
      {
        key: "price",
        header: "Asking",
        sortValue: (v) => v.listPrice,
        className: "text-right font-medium tabular-nums",
        headerClassName: "text-right",
        cell: (v) => formatCurrency(v.listPrice),
      },
    ]

    if (can("inventory.viewCost")) {
      base.push({
        key: "margin",
        header: "Margin",
        sortValue: (v) => v.listPrice - v.cost,
        className: "hidden text-right tabular-nums text-muted-foreground xl:table-cell",
        headerClassName: "hidden text-right xl:table-cell",
        cell: (v) => formatCurrency(v.listPrice - v.cost),
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

  const filteredLabel =
    search || status !== "all"
      ? `${filtered.length} of ${vehicles.length} cars match`
      : `${vehicles.length} cars on the books across every showroom.`

  return (
    <>
      <PageHeader
        title="Inventory"
        description={filteredLabel}
        actions={
          can("inventory.edit") ? (
            <Button onClick={openCreate}>
              <Plus /> Add vehicle
            </Button>
          ) : null
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              name="inventory-search"
              autoComplete="off"
              spellCheck={false}
              aria-label="Search inventory"
              placeholder="Stock, VIN, make, model…"
              className="pl-9"
            />
          </div>
          <div
            role="group"
            aria-label="Inventory layout"
            className="inline-flex self-end rounded-lg border p-0.5 sm:self-auto"
          >
            <Button
              type="button"
              size="icon"
              variant={view === "gallery" ? "secondary" : "ghost"}
              aria-pressed={view === "gallery"}
              aria-label="Gallery view"
              onClick={() => setView("gallery")}
            >
              <LayoutGrid />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={view === "list" ? "secondary" : "ghost"}
              aria-pressed={view === "list"}
              aria-label="List view"
              onClick={() => setView("list")}
            >
              <List />
            </Button>
          </div>
        </div>

        <fieldset className="min-w-0">
          <legend className="sr-only">Filter by status</legend>
          <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            <FilterChip
              label="All"
              count={counts.all}
              active={status === "all"}
              onClick={() => setStatus("all")}
            />
            {VEHICLE_STATUSES.map((value) => (
              <FilterChip
                key={value}
                label={VEHICLE_STATUS_LABELS[value]}
                count={counts[value]}
                active={status === value}
                onClick={() => setStatus(value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="aspect-[16/10] rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl ring-1 ring-foreground/10">
          <EmptyState
            icon={Car}
            title="No vehicles match those filters"
            description="Try a different search term or clear the status filter."
          />
        </div>
      ) : view === "gallery" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((vehicle, index) => (
            <InventoryCard
              key={vehicle.id}
              vehicle={vehicle}
              priority={index < 3}
              onOpen={setSelected}
            />
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={filtered}
          getRowId={(vehicle) => vehicle.id}
          onRowClick={setSelected}
          isLoading={isLoading}
          initialSort={{ key: "stock", direction: "desc" }}
        />
      )}

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

