"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Trash2 } from "lucide-react"
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
import { useCreateLead, useDeleteLead, useUpdateLead, useUsers } from "@/data/queries"
import { cn } from "@/lib/utils"
import {
  LEAD_SOURCES,
  LEAD_STAGES,
  LEAD_STAGE_LABELS,
  type Lead,
} from "@/types"

const UNASSIGNED = "unassigned"

const schema = z.object({
  contactName: z.string().min(1, "Contact name is required"),
  companyName: z.string().optional(),
  email: z.email("Enter a valid email address"),
  phone: z.string().min(7, "Enter a contact number"),
  stage: z.enum(LEAD_STAGES),
  priority: z.enum(["low", "medium", "high"]),
  source: z.enum(LEAD_SOURCES),
  value: z.coerce.number().min(0, "Value cannot be negative"),
  unitsWanted: z.coerce.number().int().min(1, "At least one unit"),
  assignedRepId: z.string().optional(),
  nextFollowUpAt: z.string().optional(),
  notes: z.string().optional(),
})

type FormValues = z.input<typeof schema>

const EMPTY: FormValues = {
  contactName: "",
  companyName: "",
  email: "",
  phone: "",
  stage: "new",
  priority: "medium",
  source: "Website",
  value: 0,
  unitsWanted: 1,
  assignedRepId: UNASSIGNED,
  nextFollowUpAt: "",
  notes: "",
}

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "")

export function LeadFormDialog({
  open,
  onOpenChange,
  lead,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead?: Lead
}) {
  const { data: users = [] } = useUsers()
  const createLead = useCreateLead()
  const updateLead = useUpdateLead()
  const deleteLead = useDeleteLead()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  useEffect(() => {
    if (!open) return
    reset(
      lead
        ? {
            ...EMPTY,
            ...lead,
            companyName: lead.companyName ?? "",
            assignedRepId: lead.assignedRepId ?? UNASSIGNED,
            nextFollowUpAt: toDateInput(lead.nextFollowUpAt),
            notes: lead.notes ?? "",
          }
        : EMPTY,
    )
  }, [open, lead, reset])

  const onSubmit = handleSubmit(async (values) => {
    const parsed = schema.parse(values)
    const payload = {
      ...parsed,
      assignedRepId:
        parsed.assignedRepId === UNASSIGNED ? undefined : parsed.assignedRepId,
      nextFollowUpAt: parsed.nextFollowUpAt
        ? new Date(parsed.nextFollowUpAt).toISOString()
        : undefined,
    }

    if (lead) {
      await updateLead.mutateAsync({ id: lead.id, patch: payload })
    } else {
      await createLead.mutateAsync({ ...payload, vehicleIds: [] })
    }
    onOpenChange(false)
  })

  const handleDelete = async () => {
    if (!lead) return
    await deleteLead.mutateAsync(lead.id)
    onOpenChange(false)
  }

  const reps = users.filter(
    (user) => user.role === "sales_rep" || user.role === "sales_manager",
  )
  const isPending = createLead.isPending || updateLead.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{lead ? `Lead ${lead.leadNumber}` : "New lead"}</DialogTitle>
          <DialogDescription>
            {lead
              ? "Update the opportunity as the conversation moves along."
              : "Capture a new opportunity and put it into the pipeline."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Contact name" error={errors.contactName?.message}>
              <Input {...register("contactName")} placeholder="Alonzo Reyes" />
            </Field>
            <Field label="Company">
              <Input {...register("companyName")} placeholder="Meridian Private Office" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email" error={errors.email?.message}>
              <Input type="email" {...register("email")} placeholder="name@company.com" />
            </Field>
            <Field label="Phone" error={errors.phone?.message}>
              <Input {...register("phone")} placeholder="(312) 555-0100" />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Stage">
              <SelectField
                value={watch("stage")}
                onChange={(v) => setValue("stage", v as FormValues["stage"])}
                options={LEAD_STAGES.map((v) => ({
                  value: v,
                  label: LEAD_STAGE_LABELS[v],
                }))}
              />
            </Field>
            <Field label="Priority">
              <SelectField
                value={watch("priority")}
                onChange={(v) => setValue("priority", v as FormValues["priority"])}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </Field>
            <Field label="Source">
              <SelectField
                value={watch("source")}
                onChange={(v) => setValue("source", v as FormValues["source"])}
                options={LEAD_SOURCES.map((v) => ({ value: v, label: v }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Deal value" error={errors.value?.message}>
              <Input type="number" {...register("value")} />
            </Field>
            <Field label="Units wanted" error={errors.unitsWanted?.message}>
              <Input type="number" {...register("unitsWanted")} />
            </Field>
            <Field label="Next follow-up">
              <Input type="date" {...register("nextFollowUpAt")} />
            </Field>
          </div>

          <Field label="Assigned rep">
            <SelectField
              value={watch("assignedRepId") ?? UNASSIGNED}
              onChange={(v) => setValue("assignedRepId", v)}
              options={[
                { value: UNASSIGNED, label: "Unassigned" },
                ...reps.map((rep) => ({
                  value: rep.id,
                  label: `${rep.firstName} ${rep.lastName}`,
                })),
              ]}
            />
          </Field>

          <Field label="Notes">
            <Textarea
              {...register("notes")}
              rows={3}
              placeholder="What the customer is looking for, timing, competing quotes."
            />
          </Field>

          <DialogFooter className="sm:justify-between">
            {lead ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={deleteLead.isPending}
              >
                <Trash2 /> Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {lead ? "Save changes" : "Create lead"}
              </Button>
            </div>
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
