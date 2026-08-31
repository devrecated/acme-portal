"use client"

import { GripVertical, Plus } from "lucide-react"
import { useMemo, useState } from "react"

import { useAuth } from "@/auth/auth-context"
import { PageHeader } from "@/components/common/page-header"
import { PriorityBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLeads, useUpdateLead } from "@/data/queries"
import { formatCompactCurrency, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LeadFormDialog } from "@/routes/leads/lead-form-dialog"
import { LEAD_STAGES, LEAD_STAGE_LABELS, type Lead, type LeadStage } from "@/types"

export function LeadsPage() {
  const { data: leads = [], isLoading } = useLeads()
  const updateLead = useUpdateLead()
  const { can } = useAuth()

  const [dragging, setDragging] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<LeadStage | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | undefined>()

  const byStage = useMemo(() => {
    const grouped = new Map<LeadStage, Lead[]>(
      LEAD_STAGES.map((stage) => [stage, [] as Lead[]]),
    )
    for (const lead of leads) grouped.get(lead.stage)?.push(lead)
    return grouped
  }, [leads])

  const pipelineValue = leads
    .filter((lead) => lead.stage !== "won" && lead.stage !== "lost")
    .reduce((sum, lead) => sum + lead.value, 0)

  const moveLead = (leadId: string, stage: LeadStage) => {
    const lead = leads.find((candidate) => candidate.id === leadId)
    if (!lead || lead.stage === stage) return
    void updateLead.mutateAsync({ id: leadId, patch: { stage } })
  }

  const handleDrop = (stage: LeadStage) => {
    if (dragging) moveLead(dragging, stage)
    setDragging(null)
    setDropTarget(null)
  }

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${formatCompactCurrency(pipelineValue)} in open pipeline across ${leads.length} leads.`}
        actions={
          can("leads.edit") ? (
            <Button
              onClick={() => {
                setEditing(undefined)
                setFormOpen(true)
              }}
            >
              <Plus /> New lead
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-6">
          {LEAD_STAGES.map((stage) => (
            <Skeleton key={stage} className="h-72" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-6">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = byStage.get(stage) ?? []
            const stageValue = stageLeads.reduce((sum, lead) => sum + lead.value, 0)

            return (
              <section
                key={stage}
                onDragOver={(event) => {
                  if (!dragging) return
                  event.preventDefault()
                  setDropTarget(stage)
                }}
                onDragLeave={() => setDropTarget((c) => (c === stage ? null : c))}
                onDrop={() => handleDrop(stage)}
                className={cn(
                  "flex min-h-72 flex-col rounded-lg border bg-muted/40 transition-colors",
                  dropTarget === stage && "border-primary bg-primary/5",
                )}
              >
                <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {LEAD_STAGE_LABELS[stage]}
                    </p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatCompactCurrency(stageValue)}
                    </p>
                  </div>
                  <Badge variant="secondary" className="tabular-nums">
                    {stageLeads.length}
                  </Badge>
                </header>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {stageLeads.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      draggable={can("leads.edit")}
                      isDragging={dragging === lead.id}
                      onDragStart={() => setDragging(lead.id)}
                      onDragEnd={() => {
                        setDragging(null)
                        setDropTarget(null)
                      }}
                      onClick={() => {
                        if (!can("leads.edit")) return
                        setEditing(lead)
                        setFormOpen(true)
                      }}
                    />
                  ))}
                  {stageLeads.length === 0 ? (
                    <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                      Nothing here
                    </p>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
    </>
  )
}

function LeadCard({
  lead,
  draggable,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  lead: Lead
  draggable: boolean
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}) {
  return (
    <article
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        "group space-y-2 rounded-md border bg-card p-2.5 shadow-xs transition-opacity",
        draggable && "cursor-pointer",
        isDragging && "opacity-40",
      )}
    >
      <div className="flex items-start gap-1.5">
        {draggable ? (
          <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground" />
        ) : null}
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-medium">{lead.contactName}</p>
          <p className="truncate text-xs text-muted-foreground">
            {lead.companyName ?? "Independent"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatCompactCurrency(lead.value)}
        </span>
        <PriorityBadge priority={lead.priority} />
      </div>

      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{lead.leadNumber}</span>
        <span>
          {lead.unitsWanted} {lead.unitsWanted === 1 ? "unit" : "units"}
        </span>
      </div>

      {lead.nextFollowUpAt ? (
        <p className="border-t pt-1.5 text-xs text-muted-foreground">
          Follow up {formatRelative(lead.nextFollowUpAt).toLowerCase()}
        </p>
      ) : null}
    </article>
  )
}
