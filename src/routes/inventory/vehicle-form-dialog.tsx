"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useCreateVehicle, useUpdateVehicle } from "@/data/queries"
import { cn } from "@/lib/utils"
import {
  BODY_TYPES,
  FUEL_TYPES,
  GVWR_CLASSES,
  VEHICLE_STATUSES,
  VEHICLE_STATUS_LABELS,
  type Vehicle,
} from "@/types"

const currentYear = new Date().getFullYear()

const schema = z.object({
  stockNumber: z.string().min(1, "Stock number is required"),
  vin: z
    .string()
    .length(17, "A VIN is exactly 17 characters")
    .regex(/^[A-HJ-NPR-Z0-9]+$/i, "A VIN cannot contain I, O, or Q"),
  year: z.coerce
    .number()
    .int()
    .min(1990, "Year looks too old")
    .max(currentYear + 2, "Year is in the future"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  bodyType: z.enum(BODY_TYPES),
  gvwrClass: z.enum(GVWR_CLASSES),
  fuel: z.enum(FUEL_TYPES),
  condition: z.enum(["New", "Used", "Certified"]),
  status: z.enum(VEHICLE_STATUSES),
  mileage: z.coerce.number().int().min(0, "Mileage cannot be negative"),
  listPrice: z.coerce.number().min(0, "Price cannot be negative"),
  cost: z.coerce.number().min(0, "Cost cannot be negative"),
  location: z.string().min(1, "Location is required"),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

const EMPTY: FormValues = {
  stockNumber: "",
  vin: "",
  year: currentYear,
  make: "",
  model: "",
  bodyType: "Coupe",
  gvwrClass: "Supercar",
  fuel: "Gasoline",
  condition: "Used",
  status: "available",
  mileage: 0,
  listPrice: 0,
  cost: 0,
  location: "Chicago, IL",
  notes: "",
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  vehicle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicle?: Vehicle
}) {
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const isEditing = Boolean(vehicle)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  })

  useEffect(() => {
    if (!open) return
    reset(vehicle ? { ...EMPTY, ...vehicle, notes: vehicle.notes ?? "" } : EMPTY)
  }, [open, vehicle, reset])

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values)
    if (vehicle) {
      await updateVehicle.mutateAsync({ id: vehicle.id, patch: parsed })
    } else {
      await createVehicle.mutateAsync(parsed)
    }
    onOpenChange(false)
  })

  const isPending = createVehicle.isPending || updateVehicle.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit vehicle" : "Add vehicle"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the unit's specification, pricing, or status."
              : "Enter the car's details to put it on the books."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stock number" error={errors.stockNumber?.message}>
              <Input {...register("stockNumber")} placeholder="AF-24127" />
            </Field>
            <Field label="VIN" error={errors.vin?.message}>
              <Input
                {...register("vin")}
                placeholder="ZHWUC1ZD8MLA10421"
                className="font-mono uppercase"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Year" error={errors.year?.message}>
              <Input type="number" {...register("year")} />
            </Field>
            <Field label="Make" error={errors.make?.message}>
              <Input {...register("make")} placeholder="Lamborghini" />
            </Field>
            <Field label="Model" error={errors.model?.message}>
              <Input {...register("model")} placeholder="Huracán EVO" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Body type">
              <SelectField
                value={watch("bodyType")}
                onChange={(v) => setValue("bodyType", v as FormValues["bodyType"])}
                options={BODY_TYPES.map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="Segment">
              <SelectField
                value={watch("gvwrClass")}
                onChange={(v) => setValue("gvwrClass", v as FormValues["gvwrClass"])}
                options={GVWR_CLASSES.map((v) => ({ value: v, label: v }))}
              />
            </Field>
            <Field label="Fuel">
              <SelectField
                value={watch("fuel")}
                onChange={(v) => setValue("fuel", v as FormValues["fuel"])}
                options={FUEL_TYPES.map((v) => ({ value: v, label: v }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Condition">
              <SelectField
                value={watch("condition")}
                onChange={(v) => setValue("condition", v as FormValues["condition"])}
                options={["New", "Used", "Certified"].map((v) => ({
                  value: v,
                  label: v,
                }))}
              />
            </Field>
            <Field label="Status">
              <SelectField
                value={watch("status")}
                onChange={(v) => setValue("status", v as FormValues["status"])}
                options={VEHICLE_STATUSES.map((v) => ({
                  value: v,
                  label: VEHICLE_STATUS_LABELS[v],
                }))}
              />
            </Field>
            <Field label="Mileage" error={errors.mileage?.message}>
              <Input type="number" {...register("mileage")} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Asking price" error={errors.listPrice?.message}>
              <Input type="number" {...register("listPrice")} />
            </Field>
            <Field label="Acquisition cost" error={errors.cost?.message}>
              <Input type="number" {...register("cost")} />
            </Field>
            <Field label="Location" error={errors.location?.message}>
              <Input {...register("location")} placeholder="Chicago, IL" />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea
              {...register("notes")}
              rows={3}
              placeholder="Recent service, damage, equipment, anything a buyer should know."
            />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isEditing ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <Label className={cn(error && "text-destructive")}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
