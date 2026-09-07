"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import {
  Banknote,
  CircleDollarSign,
  Target,
  Car,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import { useRef } from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"

import { PageHeader } from "@/components/common/page-header"
import { StatCard } from "@/components/common/stat-card"
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
import { VEHICLE_STATUS_LABELS } from "@/types"

gsap.registerPlugin(useGSAP)

const revenueConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
} satisfies ChartConfig

const inventoryConfig = {
  count: { label: "Units", color: "var(--chart-1)" },
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
          ".motion-stat",
          { autoAlpha: 0, y: 14 },
          { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" },
        )
        gsap.fromTo(
          ".motion-panel",
          { autoAlpha: 0, y: 18 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.45,
            stagger: 0.08,
            delay: 0.12,
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

  const inventoryChartData =
    summary?.inventoryByStatus.map((row) => ({
      status: VEHICLE_STATUS_LABELS[row.status],
      count: row.count,
    })) ?? []

  const featured =
    vehicles.find((vehicle) => vehicle.status === "available" && vehicle.imageUrl) ??
    vehicles.find((vehicle) => vehicle.imageUrl)
  const sandbox = useSandbox()
  const highlight = sandbox.patch?.widgets?.dashboardHighlightStat
  const title = sandbox.patch?.copy?.dashboardTitle ?? "Dashboard"
  const description =
    sandbox.patch?.copy?.dashboardDescription ??
    "Where the showroom, the pipeline, and the finance desk stand today."

  return (
    <div ref={root} className="space-y-4">
      <PageHeader
        title={title}
        description={description}
      />

      <div className={`grid grid-cols-2 gap-3 ${highlight ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
        {isLoading || !summary ? (
          Array.from({ length: highlight ? 5 : 4 }, (_, i) => <Skeleton key={i} className="h-[72px]" />)
        ) : (
          <>
            {highlight ? (
              <div data-feature-demo-anchor="sandbox-stat">
                <StatCard
                  compact
                  label={highlight.label}
                  value={highlight.value}
                  hint={highlight.hint}
                  icon={Target}
                  accent
                  className="motion-stat"
                />
              </div>
            ) : null}
            <StatCard
              compact
              label="Units in stock"
              value={formatNumber(summary.inventoryCount)}
              hint={`${summary.availableCount} available to sell`}
              icon={Car}
              accent
              className="motion-stat"
            />
            <StatCard
              compact
              label="Inventory value"
              value={formatCompactCurrency(summary.inventoryValue)}
              hint="Combined asking price"
              icon={CircleDollarSign}
              className="motion-stat"
            />
            <StatCard
              compact
              label="Open pipeline"
              value={formatCompactCurrency(summary.pipelineValue)}
              hint={`${summary.openLeads} active leads`}
              icon={Target}
              className="motion-stat"
            />
            <StatCard
              compact
              label="Awaiting credit"
              value={formatNumber(summary.applicationsInReview)}
              hint={`${summary.fundedThisMonth} funded this month`}
              icon={Banknote}
              className="motion-stat"
            />
          </>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-5 lg:items-stretch">
        <Card className="motion-panel overflow-hidden py-0 lg:col-span-2">
          {featured ? (
            <Link
              href="/inventory"
              className="relative block h-40 outline-none lg:h-full lg:min-h-52 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <VehiclePhoto
                vehicle={featured}
                width={800}
                height={450}
                fetchPriority="high"
                className="h-full w-full"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3 pt-10 text-white">
                <p className="text-pretty text-sm font-medium">
                  {featured.year} {featured.make} {featured.model}
                </p>
                <p className="text-xs text-white/80">
                  {featured.stockNumber} · {formatCurrency(featured.listPrice)} · On
                  the floor
                </p>
              </div>
            </Link>
          ) : (
            <CardHeader className="py-6">
              <CardTitle>Showroom</CardTitle>
              <CardDescription>No vehicle photos on the books yet.</CardDescription>
            </CardHeader>
          )}
        </Card>

        <Card size="sm" className="motion-panel lg:col-span-3">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Closed business over the last twelve months</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <ChartContainer config={revenueConfig} className="h-36 w-full lg:h-40">
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
              <Skeleton className="h-36 w-full lg:h-40" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Card size="sm" className="motion-panel">
          <CardHeader>
            <CardTitle>Inventory by status</CardTitle>
            <CardDescription>Every unit currently on the books</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <ChartContainer config={inventoryConfig} className="h-36 w-full">
                <BarChart
                  data={inventoryChartData}
                  layout="vertical"
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    width={88}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-36 w-full" />
            )}
          </CardContent>
        </Card>

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
