"use client"

import { Plus } from "lucide-react"
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { createPortal } from "react-dom"

import { useAuth } from "@/auth/auth-context"
import { PageHeader } from "@/components/common/page-header"
import { PriorityBadge } from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useLeads, useReorderLead } from "@/data/queries"
import { formatCompactCurrency, formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"
import { LeadFormDialog } from "@/routes/leads/lead-form-dialog"
import { LEAD_STAGES, LEAD_STAGE_LABELS, type Lead, type LeadStage } from "@/types"

const STAGE_EMPTY: Record<LeadStage, string> = {
  new: "New inquiries land here",
  contacted: "Leads you have reached out to",
  qualified: "Ready for a proposal",
  proposal: "Offers out with the buyer",
  won: "Closed and delivered",
  lost: "Did not convert",
}

const DRAG_THRESHOLD = 6
const EMPTY_LEADS: Lead[] = []

type Board = Record<LeadStage, string[]>
type Over = { stage: LeadStage; index: number }

type DragSession = {
  id: string
  pointerId: number
  offsetX: number
  offsetY: number
  width: number
  height: number
  origin: Over
}

function emptyBoard(): Board {
  return {
    new: [],
    contacted: [],
    qualified: [],
    proposal: [],
    won: [],
    lost: [],
  }
}

function boardFromLeads(leads: Lead[]): Board {
  const next = emptyBoard()
  const sorted = leads.toSorted((a, b) => {
    if (a.stage !== b.stage) return 0
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.createdAt.localeCompare(b.createdAt)
  })
  for (const lead of sorted) next[lead.stage].push(lead.id)
  return next
}

function moveOnBoard(board: Board, id: string, stage: LeadStage, index: number): Board {
  const next = emptyBoard()
  for (const column of LEAD_STAGES) {
    next[column] = board[column].filter((item) => item !== id)
  }
  const at = Math.max(0, Math.min(index, next[stage].length))
  next[stage] = [...next[stage].slice(0, at), id, ...next[stage].slice(at)]
  return next
}

function sameOver(a: Over | null, b: Over | null) {
  return a?.stage === b?.stage && a?.index === b?.index
}

function hitTest(clientX: number, clientY: number, draggingId: string): Over | null {
  const stack = document.elementsFromPoint(clientX, clientY)
  const column = stack
    .find((node) => node instanceof HTMLElement && node.dataset.leadStage)
    ?.closest("[data-lead-stage]")
  if (!(column instanceof HTMLElement) || !column.dataset.leadStage) return null

  const stage = column.dataset.leadStage as LeadStage
  const cards = [...column.querySelectorAll<HTMLElement>("[data-lead-slot]")].filter(
    (node) => node.dataset.leadSlot !== draggingId,
  )
  for (const [index, card] of cards.entries()) {
    const rect = card.getBoundingClientRect()
    if (clientY < rect.top + rect.height / 2) return { stage, index }
  }
  return { stage, index: cards.length }
}

export function LeadsPage() {
  const { data, isLoading } = useLeads()
  const leads = data ?? EMPTY_LEADS
  const reorderLead = useReorderLead()
  const { can } = useAuth()
  const canEdit = can("leads.edit")

  const [board, setBoard] = useState<Board>(emptyBoard)
  const [over, setOver] = useState<Over | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Lead | undefined>()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const boardEl = useRef<HTMLDivElement>(null)
  const floatEl = useRef<HTMLDivElement>(null)
  const drag = useRef<DragSession | null>(null)
  const pending = useRef<{
    id: string
    x: number
    y: number
    pointerId: number
  } | null>(null)
  const overRef = useRef<Over | null>(null)
  const flipFrom = useRef<Map<string, DOMRect> | null>(null)
  const raf = useRef<number>(0)
  const pointer = useRef({ x: 0, y: 0 })
  const dragEndedAt = useRef(0)
  const boardRef = useRef(board)
  boardRef.current = board

  const byId = useMemo(() => new Map(leads.map((lead) => [lead.id, lead])), [leads])

  useEffect(() => {
    if (drag.current || !data) return
    setBoard(boardFromLeads(data))
  }, [data])

  const preview = useMemo(() => {
    if (!draggingId || !over) return board
    return moveOnBoard(board, draggingId, over.stage, over.index)
  }, [board, draggingId, over])

  useLayoutEffect(() => {
    const first = flipFrom.current
    const root = boardEl.current
    flipFrom.current = null
    if (!first || !root) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    for (const node of root.querySelectorAll<HTMLElement>("[data-lead-slot]")) {
      const id = node.dataset.leadSlot
      if (!id) continue
      const before = first.get(id)
      if (!before) continue
      const after = node.getBoundingClientRect()
      const dx = before.left - after.left
      const dy = before.top - after.top
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue
      node.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }],
        { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" },
      )
    }
  }, [preview, draggingId])

  const pipelineValue = leads
    .filter((lead) => lead.stage !== "won" && lead.stage !== "lost")
    .reduce((sum, lead) => sum + lead.value, 0)

  const captureRects = () => {
    const root = boardEl.current
    if (!root) return
    flipFrom.current = new Map(
      [...root.querySelectorAll<HTMLElement>("[data-lead-slot]")].flatMap((node) => {
        const id = node.dataset.leadSlot
        return id ? [[id, node.getBoundingClientRect()] as const] : []
      }),
    )
  }

  const setOverIfChanged = (next: Over | null) => {
    if (sameOver(overRef.current, next)) return
    captureRects()
    overRef.current = next
    setOver(next)
  }

  const endDrag = (commit: boolean) => {
    const session = drag.current
    const destination = overRef.current
    drag.current = null
    pending.current = null
    overRef.current = null
    dragEndedAt.current = Date.now()
    setDraggingId(null)
    setOver(null)

    if (!session) return
    if (
      commit &&
      destination &&
      (destination.stage !== session.origin.stage ||
        destination.index !== session.origin.index)
    ) {
      setBoard((current) =>
        moveOnBoard(current, session.id, destination.stage, destination.index),
      )
      void reorderLead.mutateAsync({
        id: session.id,
        stage: destination.stage,
        index: destination.index,
      })
    }
  }

  const placeFloater = (clientX: number, clientY: number) => {
    const session = drag.current
    const floater = floatEl.current
    if (!session || !floater) return
    floater.style.transform = `translate(${clientX - session.offsetX}px, ${clientY - session.offsetY}px)`
  }

  const onPointerMove = (event: PointerEvent) => {
    pointer.current = { x: event.clientX, y: event.clientY }
    const waiting = pending.current
    if (waiting && !drag.current) {
      const dx = event.clientX - waiting.x
      const dy = event.clientY - waiting.y
      if (dx * dx + dy * dy < DRAG_THRESHOLD * DRAG_THRESHOLD) return
      const snapshot = boardRef.current
      const card = boardEl.current?.querySelector<HTMLElement>(
        `[data-lead-slot="${waiting.id}"]`,
      )
      if (!card) return
      const rect = card.getBoundingClientRect()
      const originStage = LEAD_STAGES.find((stage) =>
        snapshot[stage].includes(waiting.id),
      )
      if (!originStage) return
      const originIndex = snapshot[originStage].indexOf(waiting.id)
      drag.current = {
        id: waiting.id,
        pointerId: waiting.pointerId,
        offsetX: waiting.x - rect.left,
        offsetY: waiting.y - rect.top,
        width: rect.width,
        height: rect.height,
        origin: { stage: originStage, index: originIndex },
      }
      pending.current = null
      overRef.current = { stage: originStage, index: originIndex }
      setDraggingId(waiting.id)
      setOver({ stage: originStage, index: originIndex })
    }

    const session = drag.current
    if (!session) return
    event.preventDefault()
    placeFloater(event.clientX, event.clientY)
    if (raf.current) cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(() => {
      setOverIfChanged(hitTest(event.clientX, event.clientY, session.id))
    })
  }

  const onPointerUp = () => {
    if (drag.current) endDrag(true)
    pending.current = null
  }

  const onPointerMoveRef = useRef(onPointerMove)
  const onPointerUpRef = useRef(onPointerUp)
  onPointerMoveRef.current = onPointerMove
  onPointerUpRef.current = onPointerUp

  useLayoutEffect(() => {
    if (!draggingId) return
    placeFloater(pointer.current.x, pointer.current.y)
  }, [draggingId])

  useEffect(() => {
    const move = (event: PointerEvent) => onPointerMoveRef.current(event)
    const up = () => onPointerUpRef.current()
    window.addEventListener("pointermove", move, { passive: false })
    window.addEventListener("pointerup", up)
    window.addEventListener("pointercancel", up)
    return () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("pointercancel", up)
      if (raf.current) cancelAnimationFrame(raf.current)
    }
  }, [])

  const startPending = (event: ReactPointerEvent, id: string) => {
    if (!canEdit || event.button !== 0) return
    pending.current = {
      id,
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
    }
  }

  const openLead = (lead: Lead) => {
    if (drag.current || Date.now() - dragEndedAt.current < 250) return
    setEditing(lead)
    setFormOpen(true)
  }

  const draggingLead = draggingId ? byId.get(draggingId) : undefined

  return (
    <>
      <PageHeader
        title="Leads"
        description={`${formatCompactCurrency(pipelineValue)} in open pipeline across ${leads.length} leads.`}
        actions={
          canEdit ? (
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
        <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0">
          {LEAD_STAGES.map((stage) => (
            <Skeleton key={stage} className="h-72 w-[min(100%,18rem)] shrink-0 lg:w-auto" />
          ))}
        </div>
      ) : (
        <div
          ref={boardEl}
          data-feature-demo-anchor="sandbox-leads-board"
          className={cn(
            "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0",
            draggingId && "select-none touch-none",
          )}
        >
          {LEAD_STAGES.map((stage) => {
            const ids = preview[stage]
            const stageLeads = ids
              .map((id) => byId.get(id))
              .filter((lead): lead is Lead => Boolean(lead))
            const stageValue = stageLeads.reduce((sum, lead) => sum + lead.value, 0)

            return (
              <section
                key={stage}
                data-lead-stage={stage}
                className={cn(
                  "flex min-h-72 w-[min(100%,18rem)] shrink-0 snap-start flex-col rounded-xl bg-muted/40 ring-1 ring-foreground/10 lg:w-auto",
                  over?.stage === stage && draggingId && "bg-primary/10 ring-2 ring-primary/40",
                )}
              >
                <header className="flex items-center justify-between gap-2 px-3 py-2.5">
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

                <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
                  {ids.map((id) => {
                    const lead = byId.get(id)
                    if (!lead) return null
                    if (id === draggingId) {
                      return (
                        <div
                          key={id}
                          data-lead-slot={id}
                          className="rounded-lg ring-2 ring-dashed ring-primary/35"
                          style={{ height: drag.current?.height ?? 96 }}
                        />
                      )
                    }
                    return (
                      <LeadCard
                        key={id}
                        lead={lead}
                        canEdit={canEdit}
                        onPointerDown={(event) => startPending(event, id)}
                        onOpen={() => openLead(lead)}
                      />
                    )
                  })}
                  {ids.length === 0 ? (
                    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
                      {STAGE_EMPTY[stage]}
                    </p>
                  ) : null}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {draggingLead && drag.current
        ? createPortal(
            <div
              ref={floatEl}
              className="pointer-events-none fixed top-0 left-0 z-50 rotate-1"
              style={{
                width: drag.current.width,
                transform: `translate(-9999px, -9999px)`,
              }}
            >
              <LeadCard lead={draggingLead} canEdit={false} floating />
            </div>,
            document.body,
          )
        : null}

      <LeadFormDialog open={formOpen} onOpenChange={setFormOpen} lead={editing} />
    </>
  )
}

function LeadCard({
  lead,
  canEdit,
  floating = false,
  onPointerDown,
  onOpen,
}: {
  lead: Lead
  canEdit: boolean
  floating?: boolean
  onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void
  onOpen?: () => void
}) {
  return (
    <article
      data-lead-slot={floating ? undefined : lead.id}
      onPointerDown={onPointerDown}
      onClick={() => onOpen?.()}
      className={cn(
        "rounded-lg bg-card p-2.5 ring-1 ring-foreground/10",
        canEdit && "cursor-grab active:cursor-grabbing",
        floating && "shadow-xl ring-foreground/15",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{lead.contactName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {lead.companyName ?? "Independent"}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold tabular-nums">
          {formatCompactCurrency(lead.value)}
        </span>
        <PriorityBadge priority={lead.priority} />
      </div>

      <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono">{lead.leadNumber}</span>
        <span>
          {lead.unitsWanted} {lead.unitsWanted === 1 ? "unit" : "units"}
        </span>
      </div>

      {lead.nextFollowUpAt ? (
        <p className="mt-2 border-t border-foreground/8 pt-1.5 text-xs text-muted-foreground">
          Follow up {formatRelative(lead.nextFollowUpAt).toLowerCase()}
        </p>
      ) : null}
    </article>
  )
}
