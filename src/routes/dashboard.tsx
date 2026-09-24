"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  Banknote,
  Target,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { PageHeader } from "@/components/common/page-header"
import { VehiclePhoto } from "@/components/common/vehicle-photo"
import {
  ApplicationStatusBadge,
  LeadStageBadge,
} from "@/components/common/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useApplications,
  useDashboardSummary,
  useLeads,
  useVehicles,
} from "@/data/queries"
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatRelative,
} from "@/lib/format"
import { useSandbox } from "@/sandbox/sandbox-context"

gsap.registerPlugin(useGSAP)

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

export function DashboardPage() {
  const { data: summary, isLoading } = useDashboardSummary()
  const { data: leads = [] } = useLeads()
  const { data: applications = [] } = useApplications()
  const { data: vehicles = [] } = useVehicles()
  const root = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (isLoading || !summary) return
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".motion-hero",
          { autoAlpha: 0, scale: 1.02 },
          { autoAlpha: 1, scale: 1, duration: 0.65, ease: "power2.out" },
        )
        gsap.fromTo(
          ".motion-hero-copy",
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.5, delay: 0.18, ease: "power2.out" },
        )
        gsap.fromTo(
          ".motion-stat",
          { autoAlpha: 0, y: 10 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.35,
            stagger: 0.05,
            delay: 0.28,
            ease: "power2.out",
          },
        )
        gsap.fromTo(
          ".motion-panel",
          { autoAlpha: 0, y: 16 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.4,
            stagger: 0.07,
            delay: 0.36,
            ease: "power2.out",
          },
        )
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [isLoading, summary] },
  )

  const followUps = leads
    .filter((lead) => lead.nextFollowUpAt)
    .toSorted((a, b) => a.nextFollowUpAt!.localeCompare(b.nextFollowUpAt!))
    .slice(0, 4)

  const recentApplications = applications
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4)

  const featured =
    vehicles.find((vehicle) => vehicle.status === "available" && vehicle.imageUrl) ??
    vehicles.find((vehicle) => vehicle.imageUrl)
  const sandbox = useSandbox()
  const highlight = sandbox.patch?.widgets?.dashboardHighlightStat
  const title = sandbox.patch?.copy?.dashboardTitle ?? "On the floor"
  const description =
    sandbox.patch?.copy?.dashboardDescription ??
    "Featured stock, the pipeline, and the finance desk — one glance."

  return (
    <div ref={root} className="space-y-5">
      <PageHeader title={title} description={description} />

      <section className="motion-hero relative overflow-hidden rounded-xl bg-foreground/5">
        {featured ? (
          <Link
            href="/inventory"
            className="group relative block min-h-[280px] outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-[360px]"
          >
            <VehiclePhoto
              vehicle={featured}
              width={1600}
              height={900}
              fetchPriority="high"
              className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.02]"
            />
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/10"
            />
            <div className="motion-hero-copy absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:p-7 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl space-y-2 text-white">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                  Featured · {featured.stockNumber}
                </p>
                <h2 className="font-heading text-pretty text-3xl leading-tight tracking-tight sm:text-4xl md:text-5xl">
                  {featured.year} {featured.make} {featured.model}
                </h2>
                <p className="text-sm text-white/80 sm:text-base">
                  {featured.location} · {formatNumber(featured.mileage)} mi ·{" "}
                  {featured.condition}
                </p>
              </div>
              <div className="shrink-0 space-y-1 md:text-right">
                <p className="font-heading text-3xl tracking-tight text-white tabular-nums sm:text-4xl">
                  {formatCurrency(featured.listPrice)}
                </p>
                <p className="text-xs text-white/65">Asking · open inventory</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="flex min-h-52 items-center justify-center p-8 text-center">
            <div className="space-y-1">
              <p className="font-heading text-2xl">Showroom</p>
              <p className="text-sm text-muted-foreground">
                No vehicle photos on the books yet.
              </p>
            </div>
          </div>
        )}
      </section>

      <div
        className={`motion-panel grid gap-px overflow-hidden rounded-xl border bg-border ${
          highlight ? "grid-cols-2 sm:grid-cols-3 xl:grid-cols-5" : "grid-cols-2 xl:grid-cols-4"
        }`}
      >
        {isLoading || !summary ? (
          Array.from({ length: highlight ? 5 : 4 }, (_, i) => (
            <Skeleton key={i} className="h-[76px] rounded-none" />
          ))
        ) : (
          <>
            {highlight ? (
              <div
                data-feature-demo-anchor="sandbox-stat"
                className="motion-stat bg-card px-3 py-3 sm:px-4"
              >
                <StatCell
                  label={highlight.label}
                  value={highlight.value}
                  hint={highlight.hint}
                  accent
                />
              </div>
            ) : null}
            <div className="motion-stat bg-card px-3 py-3 sm:px-4">
              <StatCell
                label="Units in stock"
                value={formatNumber(summary.inventoryCount)}
                hint={`${summary.availableCount} available`}
              />
            </div>
            <div className="motion-stat bg-card px-3 py-3 sm:px-4">
              <StatCell
                label="Inventory value"
                value={formatCompactCurrency(summary.inventoryValue)}
                hint="Combined asking"
              />
            </div>
            <div className="motion-stat bg-card px-3 py-3 sm:px-4">
              <StatCell
                label="Open pipeline"
                value={formatCompactCurrency(summary.pipelineValue)}
                hint={`${summary.openLeads} active leads`}
              />
            </div>
            <div className="motion-stat bg-card px-3 py-3 sm:px-4">
              <StatCell
                label="Awaiting credit"
                value={formatNumber(summary.applicationsInReview)}
                hint={`${summary.fundedThisMonth} funded this month`}
              />
            </div>
          </>
        )}
      </div>

      <Card size="sm" className="motion-panel">
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
          <CardDescription>Closed business over the last twelve months</CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <ChartContainer config={revenueConfig} className="h-40 w-full md:h-48">
              <AreaChart data={summary.monthlySales} margin={{ left: 4, right: 4 }}>
                <defs>
                  <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-revenue)"
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={52}
                  tickFormatter={(value: number) => formatCompactCurrency(value)}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                <Area
                  dataKey="revenue"
                  type="monotone"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  fill="url(#revenueFill)"
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <Skeleton className="h-40 w-full md:h-48" />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        <ListCard
          title="Next follow-ups"
          description="Leads with the soonest scheduled touch"
          empty="No follow-ups scheduled."
          to="/leads"
          icon={Target}
        >
          {followUps.map((lead) => (
            <li
              key={lead.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium">{lead.contactName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {lead.companyName ?? "Independent"} · {formatCurrency(lead.value)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatRelative(lead.nextFollowUpAt)}
                </span>
                <LeadStageBadge stage={lead.stage} />
              </div>
            </li>
          ))}
        </ListCard>

        <ListCard
          title="Recent applications"
          description="Latest credit activity from the finance desk"
          empty="No credit applications yet."
          to="/financing"
          icon={Banknote}
        >
          {recentApplications.map((application) => (
            <li
              key={application.id}
              className="flex items-center justify-between gap-3 px-3 py-2"
            >
              <div className="min-w-0 space-y-0.5">
                <p className="truncate text-sm font-medium">
                  {application.applicantName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  <Badge variant="secondary" className="mr-1.5 font-mono text-[10px]">
                    {application.applicationNumber}
                  </Badge>
                  {formatCurrency(application.amount)} · {application.lender}
                </p>
              </div>
              <ApplicationStatusBadge status={application.status} />
            </li>
          ))}
        </ListCard>
      </div>
    </div>
  )
}

function StatCell({
  label,
  value,
  hint,
  accent = false,
}: {
  label: string
  value: string
  hint?: string
  accent?: boolean
}) {
  return (
    <div className="space-y-0.5">
      <p
        className={`text-[11px] font-medium uppercase tracking-wide ${
          accent ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
        {value}
      </p>
      {hint ? (
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{hint}</p>
      ) : null}
    </div>
  )
}

function ListCard({
  title,
  description,
  empty,
  to,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  empty: string
  to: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const hasRows = items.filter(Boolean).length > 0

  return (
    <Card size="sm" className="motion-panel gap-0 pb-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {hasRows ? (
          <ul className="divide-y border-t">{children}</ul>
        ) : (
          <p className="border-t px-3 py-6 text-center text-sm text-muted-foreground">
            {empty}
          </p>
        )}
        <div className="border-t p-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={to}>View all</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
