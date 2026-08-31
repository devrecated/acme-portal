import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  APPLICATION_STATUS_LABELS,
  CONTACT_STAGE_LABELS,
  LEAD_STAGE_LABELS,
  VEHICLE_STATUS_LABELS,
  type ApplicationStatus,
  type ContactStage,
  type LeadStage,
  type VehicleStatus,
} from "@/types"

/**
 * Status colours are defined once here so a vehicle marked "sold" reads the
 * same on the dashboard, the inventory table, and a detail panel.
 */
const TONE = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  green: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-900 border-transparent dark:bg-amber-950 dark:text-amber-300",
  blue: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300",
  violet: "bg-violet-100 text-violet-800 border-transparent dark:bg-violet-950 dark:text-violet-300",
  red: "bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300",
} as const

type Tone = keyof typeof TONE

const VEHICLE_TONES: Record<VehicleStatus, Tone> = {
  available: "green",
  reconditioning: "amber",
  in_transit: "blue",
  pending_sale: "violet",
  sold: "neutral",
}

const LEAD_TONES: Record<LeadStage, Tone> = {
  new: "blue",
  contacted: "violet",
  qualified: "amber",
  proposal: "amber",
  won: "green",
  lost: "neutral",
}

const APPLICATION_TONES: Record<ApplicationStatus, Tone> = {
  draft: "neutral",
  submitted: "blue",
  in_review: "amber",
  approved: "green",
  declined: "red",
  funded: "green",
}

const CONTACT_TONES: Record<ContactStage, Tone> = {
  prospect: "blue",
  opportunity: "amber",
  customer: "green",
  inactive: "neutral",
}

function Pill({ tone, label }: { tone: Tone; label: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", TONE[tone])}>
      {label}
    </Badge>
  )
}

export const VehicleStatusBadge = ({ status }: { status: VehicleStatus }) => (
  <Pill tone={VEHICLE_TONES[status]} label={VEHICLE_STATUS_LABELS[status]} />
)

export const LeadStageBadge = ({ stage }: { stage: LeadStage }) => (
  <Pill tone={LEAD_TONES[stage]} label={LEAD_STAGE_LABELS[stage]} />
)

export const ApplicationStatusBadge = ({ status }: { status: ApplicationStatus }) => (
  <Pill tone={APPLICATION_TONES[status]} label={APPLICATION_STATUS_LABELS[status]} />
)

export const ContactStageBadge = ({ stage }: { stage: ContactStage }) => (
  <Pill tone={CONTACT_TONES[stage]} label={CONTACT_STAGE_LABELS[stage]} />
)

export const PriorityBadge = ({
  priority,
}: {
  priority: "low" | "medium" | "high"
}) => (
  <Pill
    tone={priority === "high" ? "red" : priority === "medium" ? "amber" : "neutral"}
    label={priority === "high" ? "High" : priority === "medium" ? "Medium" : "Low"}
  />
)
