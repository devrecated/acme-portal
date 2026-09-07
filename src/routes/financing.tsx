"use client"

import { Banknote, CheckCircle2, Clock, Search, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"

import { useAuth } from "@/auth/auth-context"
import { DataTable, type Column } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/empty-state"
import { FilterChip } from "@/components/common/filter-chip"
import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
import { ApplicationStatusBadge } from "@/components/common/status-badge"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { useApplications, useUpdateApplication, useVehicles } from "@/data/queries"
import {
  formatCompactCurrency,
  formatCurrency,
  formatDate,
  formatPercent,
  monthlyPayment,
} from "@/lib/format"
import {
  APPLICATION_STATUSES,
  APPLICATION_STATUS_LABELS,
  type ApplicationStatus,
  type FinanceApplication,
} from "@/types"

type StatusFilter = ApplicationStatus | "all"

export function FinancingPage() {
  const { data: applications = [], isLoading } = useApplications()
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [selected, setSelected] = useState<FinanceApplication | null>(null)

  const counts = useMemo(() => {
    const next: Record<StatusFilter, number> = {
      all: applications.length,
      draft: 0,
      submitted: 0,
      in_review: 0,
      approved: 0,
      declined: 0,
      funded: 0,
    }
    for (const application of applications) {
      next[application.status] += 1
    }
    return next
  }, [applications])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return applications.filter((application) => {
      if (status !== "all" && application.status !== status) return false
      if (!term) return true
      return [
        application.applicationNumber,
        application.applicantName,
        application.companyName ?? "",
        application.lender,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    })
  }, [applications, search, status])

  const pending = applications.filter(
    (a) => a.status === "submitted" || a.status === "in_review",
  )
  const approved = applications.filter((a) => a.status === "approved")
  const funded = applications.filter((a) => a.status === "funded")
  const decided = applications.filter(
    (a) => a.status === "approved" || a.status === "funded" || a.status === "declined",
  )
  const approvalRate = decided.length
    ? ((approved.length + funded.length) / decided.length) * 100
    : 0

  const columns: Column<FinanceApplication>[] = [
    {
      key: "number",
      header: "Application",
      sortValue: (a) => a.applicationNumber,
      cell: (a) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-mono text-xs text-muted-foreground">
            {a.applicationNumber}
          </p>
          <p className="truncate font-medium">{a.applicantName}</p>
        </div>
      ),
    },
    {
      key: "lender",
      header: "Lender",
      sortValue: (a) => a.lender,
      className: "hidden text-muted-foreground md:table-cell",
      headerClassName: "hidden md:table-cell",
      cell: (a) => a.lender,
    },
    {
      key: "amount",
      header: "Amount",
      sortValue: (a) => a.amount,
      className: "text-right font-medium tabular-nums",
      headerClassName: "text-right",
      cell: (a) => formatCurrency(a.amount),
    },
    {
      key: "terms",
      header: "Terms",
      sortValue: (a) => a.rate,
      className: "hidden tabular-nums lg:table-cell",
      headerClassName: "hidden lg:table-cell",
      cell: (a) => (
        <span className="text-muted-foreground">
          {formatPercent(a.rate)} · {a.termMonths} mo
        </span>
      ),
    },
    {
      key: "credit",
      header: "Credit",
      sortValue: (a) => a.creditScore ?? 0,
      className: "hidden tabular-nums xl:table-cell",
      headerClassName: "hidden xl:table-cell",
      cell: (a) => a.creditScore ?? "—",
    },
    {
      key: "status",
      header: "Status",
      sortValue: (a) => a.status,
      cell: (a) => <ApplicationStatusBadge status={a.status} />,
    },
    {
      key: "submitted",
      header: "Submitted",
      sortValue: (a) => a.submittedAt ?? "",
      className: "hidden xl:table-cell",
      headerClassName: "hidden xl:table-cell",
      cell: (a) => (
        <span className="text-muted-foreground">{formatDate(a.submittedAt)}</span>
      ),
    },
  ]

  const filteredLabel =
    search || status !== "all"
      ? `${filtered.length} of ${applications.length} applications match`
      : "Credit applications moving between the desk and our lenders."

  return (
    <>
      <PageHeader title="Financing" description={filteredLabel} />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard
          compact
          label="Awaiting decision"
          value={String(pending.length)}
          hint={formatCompactCurrency(pending.reduce((s, a) => s + a.amount, 0))}
          icon={Clock}
          accent
        />
        <StatCard
          compact
          label="Approved"
          value={String(approved.length)}
          hint="Ready to fund"
          icon={CheckCircle2}
        />
        <StatCard
          compact
          label="Funded"
          value={String(funded.length)}
          hint={formatCompactCurrency(funded.reduce((s, a) => s + a.amount, 0))}
          icon={Banknote}
        />
        <StatCard
          compact
          label="Approval rate"
          value={`${approvalRate.toFixed(0)}%`}
          hint={`${decided.length} decisions returned`}
          icon={TrendingUp}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            name="financing-search"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search applications"
            placeholder="Applicant, application number, lender…"
            className="pl-9"
          />
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
            {APPLICATION_STATUSES.map((value) => (
              <FilterChip
                key={value}
                label={APPLICATION_STATUS_LABELS[value]}
                count={counts[value]}
                active={status === value}
                onClick={() => setStatus(value)}
              />
            ))}
          </div>
        </fieldset>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(application) => application.id}
        onRowClick={setSelected}
        isLoading={isLoading}
        initialSort={{ key: "number", direction: "desc" }}
        emptyState={
          <EmptyState
            icon={Banknote}
            title="No applications match those filters"
            description="Try a different search term or clear the status filter."
          />
        }
      />

      <ApplicationSheet
        application={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  )
}

function ApplicationSheet({
  application,
  onOpenChange,
}: {
  application: FinanceApplication | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: vehicles = [] } = useVehicles()
  const updateApplication = useUpdateApplication()
  const { can } = useAuth()

  if (!application) return null

  const vehicle = vehicles.find((v) => v.id === application.vehicleId)
  const payment = monthlyPayment(
    application.amount,
    application.rate,
    application.termMonths,
  )

  const setStatus = (status: ApplicationStatus) => {
    const patch: Partial<FinanceApplication> = { status }
    if (status === "approved" || status === "declined" || status === "funded") {
      patch.decidedAt = new Date().toISOString()
    }
    if (status === "submitted" && !application.submittedAt) {
      patch.submittedAt = new Date().toISOString()
    }
    void updateApplication.mutateAsync({ id: application.id, patch })
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
        <SheetHeader className="border-b pr-14">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-pretty">{application.applicantName}</SheetTitle>
              <SheetDescription className="font-mono">
                {application.applicationNumber}
                {application.companyName ? ` · ${application.companyName}` : ""}
              </SheetDescription>
            </div>
            <ApplicationStatusBadge status={application.status} />
          </div>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <section className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3">
            <Detail label="Amount financed">
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(application.amount)}
              </span>
            </Detail>
            <Detail label="Estimated payment">
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(Math.round(payment))}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  /mo
                </span>
              </span>
            </Detail>
          </section>

          <section className="grid grid-cols-2 gap-x-4 gap-y-3.5">
            <Detail label="Lender">{application.lender}</Detail>
            <Detail label="Down payment">
              {formatCurrency(application.downPayment)}
            </Detail>
            <Detail label="Rate">{formatPercent(application.rate)}</Detail>
            <Detail label="Term">{application.termMonths} months</Detail>
            <Detail label="Credit score">{application.creditScore ?? "Not pulled"}</Detail>
            <Detail label="Submitted">{formatDate(application.submittedAt)}</Detail>
            <Detail label="Decided">{formatDate(application.decidedAt)}</Detail>
            <Detail label="Created">{formatDate(application.createdAt)}</Detail>
          </section>

          {vehicle ? (
            <>
              <Separator />
              <section className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Vehicle</p>
                <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-2.5">
                  <VehiclePhoto
                    vehicle={vehicle}
                    width={72}
                    height={48}
                    className="h-12 w-16 shrink-0 rounded-md"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {vehicle.stockNumber} · {vehicle.vin}
                    </p>
                  </div>
                </div>
              </section>
            </>
          ) : null}

          {application.notes ? (
            <>
              <Separator />
              <section className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="text-sm leading-relaxed">{application.notes}</p>
              </section>
            </>
          ) : null}
        </div>

        {can("financing.edit") ? (
          <SheetFooter>
            <p className="text-xs font-medium text-muted-foreground">Move to</p>
            <div className="flex flex-wrap gap-2">
              {APPLICATION_STATUSES.filter(
                (candidate) => candidate !== application.status,
              ).map((candidate) => (
                <Button
                  key={candidate}
                  variant="outline"
                  size="sm"
                  onClick={() => setStatus(candidate)}
                  disabled={updateApplication.isPending}
                >
                  {APPLICATION_STATUS_LABELS[candidate]}
                </Button>
              ))}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
