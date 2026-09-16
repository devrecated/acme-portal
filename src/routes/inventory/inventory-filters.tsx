import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { BODY_TYPES, type Vehicle } from "@/types"

export const ANY_FILTER = "any"

export type InventorySpecFilters = {
  make: string
  model: string
  year: string
  bodyType: string
}

export const EMPTY_SPEC_FILTERS: InventorySpecFilters = {
  make: ANY_FILTER,
  model: ANY_FILTER,
  year: ANY_FILTER,
  bodyType: ANY_FILTER,
}

export function hasActiveSpecFilters(filters: InventorySpecFilters) {
  return (
    filters.make !== ANY_FILTER ||
    filters.model !== ANY_FILTER ||
    filters.year !== ANY_FILTER ||
    filters.bodyType !== ANY_FILTER
  )
}

export function vehicleMatchesSpec(vehicle: Vehicle, filters: InventorySpecFilters) {
  if (filters.make !== ANY_FILTER && vehicle.make !== filters.make) return false
  if (filters.model !== ANY_FILTER && vehicle.model !== filters.model) return false
  if (filters.year !== ANY_FILTER && String(vehicle.year) !== filters.year) {
    return false
  }
  if (filters.bodyType !== ANY_FILTER && vehicle.bodyType !== filters.bodyType) {
    return false
  }
  return true
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export function InventoryFilters({
  vehicles,
  filters,
  onChange,
  onClear,
}: {
  vehicles: Vehicle[]
  filters: InventorySpecFilters
  onChange: (next: InventorySpecFilters) => void
  onClear: () => void
}) {
  const makes = uniqueSorted(vehicles.map((vehicle) => vehicle.make))
  const models = uniqueSorted(
    vehicles
      .filter((vehicle) =>
        filters.make === ANY_FILTER ? true : vehicle.make === filters.make,
      )
      .map((vehicle) => vehicle.model),
  )
  const years = [
    ...new Set(vehicles.map((vehicle) => vehicle.year)),
  ].sort((a, b) => b - a)
  const bodyTypes = BODY_TYPES.filter((bodyType) =>
    vehicles.some((vehicle) => vehicle.bodyType === bodyType),
  )

  const setMake = (make: string) => {
    const nextModels = uniqueSorted(
      vehicles
        .filter((vehicle) => (make === ANY_FILTER ? true : vehicle.make === make))
        .map((vehicle) => vehicle.model),
    )
    const model =
      filters.model !== ANY_FILTER && nextModels.includes(filters.model)
        ? filters.model
        : ANY_FILTER
    onChange({ ...filters, make, model })
  }

  const clearVisible = hasActiveSpecFilters(filters)

  return (
    <fieldset className="rounded-xl border border-border/80 bg-muted/20 p-3">
      <legend className="sr-only">Narrow by make, model, year, and body style</legend>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="px-0.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Narrow the lot
        </p>
        {clearVisible ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="min-h-11 shrink-0 sm:min-h-7"
            onClick={onClear}
          >
            <X />
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterSelect
          id="inventory-filter-make"
          label="Make"
          value={filters.make}
          anyLabel="Any make"
          options={makes.map((value) => ({ value, label: value }))}
          onChange={setMake}
        />
        <FilterSelect
          id="inventory-filter-model"
          label="Model"
          value={filters.model}
          anyLabel="Any model"
          options={models.map((value) => ({ value, label: value }))}
          onChange={(model) => onChange({ ...filters, model })}
        />
        <FilterSelect
          id="inventory-filter-year"
          label="Year"
          value={filters.year}
          anyLabel="Any year"
          options={years.map((year) => ({
            value: String(year),
            label: String(year),
          }))}
          onChange={(year) => onChange({ ...filters, year })}
        />
        <FilterSelect
          id="inventory-filter-body"
          label="Body style"
          value={filters.bodyType}
          anyLabel="Any body style"
          options={bodyTypes.map((value) => ({ value, label: value }))}
          onChange={(bodyType) => onChange({ ...filters, bodyType })}
        />
      </div>
    </fieldset>
  )
}

function FilterSelect({
  id,
  label,
  value,
  anyLabel,
  options,
  onChange,
}: {
  id: string
  label: string
  value: string
  anyLabel: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          id={id}
          size="default"
          className="h-11 w-full min-h-11 sm:h-8 sm:min-h-8"
        >
          <SelectValue placeholder={anyLabel} />
        </SelectTrigger>
        <SelectContent position="popper" align="start">
          <SelectItem value={ANY_FILTER}>{anyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
