"use client"

import {
  Banknote,
  CircleDollarSign,
  Target,
  Truck,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
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
import { useApplications, useDashboardSummary, useLeads } from "@/data/queries"
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatRelative,
} from "@/lib/format"
import { VEHICLE_STATUS_LABELS } from "@/types"

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

  const followUps = leads
    .filter((lead) => lead.nextFollowUpAt)
    .toSorted((a, b) => a.nextFollowUpAt!.localeCompare(b.nextFollowUpAt!))
    .slice(0, 5)

  const recentApplications = applications
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5)

  const inventoryChartData =
    summary?.inventoryByStatus.map((row) => ({
      status: VEHICLE_STATUS_LABELS[row.status],
      count: row.count,
    })) ?? []

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Where the yard, the pipeline, and the finance desk stand today."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading || !summary ? (
          Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatCard
              label="Units in stock"
              value={formatNumber(summary.inventoryCount)}
              hint={`${summary.availableCount} available to sell`}
              icon={Truck}
              accent
            />
            <StatCard
              label="Inventory value"
              value={formatCompactCurrency(summary.inventoryValue)}
              hint="Combined asking price"
              icon={CircleDollarSign}
            />
            <StatCard
              label="Open pipeline"
              value={formatCompactCurrency(summary.pipelineValue)}
              hint={`${summary.openLeads} active leads`}
              icon={Target}
            />
            <StatCard
              label="Awaiting credit"
              value={formatNumber(summary.applicationsInReview)}
              hint={`${summary.fundedThisMonth} funded this month`}
              icon={Banknote}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Closed business over the last twelve months</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <ChartContainer config={revenueConfig} className="h-[260px] w-full">
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
              <Skeleton className="h-[260px] w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory by status</CardTitle>
            <CardDescription>Every unit currently on the books</CardDescription>
          </CardHeader>
          <CardContent>
            {summary ? (
              <ChartContainer config={inventoryConfig} className="h-[260px] w-full">
                <BarChart
                  data={inventoryChartData}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    tickLine={false}
                    axisLine={false}
                    width={96}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-[260px] w-full" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Next follow-ups"
          description="Leads with the soonest scheduled touch"
          to="/leads"
          icon={Target}
        >
          {followUps.map((lead) => (
            <li
              key={lead.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
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
          to="/financing"
          icon={Banknote}
        >
          {recentApplications.map((application) => (
            <li
              key={application.id}
              className="flex items-center justify-between gap-3 px-5 py-3"
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
    </>
  )
}

function ListCard({
  title,
  description,
  to,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  to: string
  icon: LucideIcon
  children: React.ReactNode
}) {
  return (
    <Card className="gap-0 pb-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y border-t">{children}</ul>
        <div className="border-t p-3">
          <Button asChild variant="ghost" size="sm" className="w-full">
            <Link href={to}>View all</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
