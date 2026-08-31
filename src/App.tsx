import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "next-themes"
import { lazy, Suspense } from "react"
import { BrowserRouter, Route, Routes } from "react-router"

import { AuthProvider } from "@/auth/auth-context"
import { RequirePermission } from "@/auth/require-permission"
import { AppShell } from "@/components/layout/app-shell"
import { Skeleton } from "@/components/ui/skeleton"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { NotFoundPage } from "@/routes/not-found"
import { SignInPage } from "@/routes/sign-in"

/*
 * Feature pages load on demand. It keeps the charting library off the
 * initial bundle for anyone who doesn't open the dashboard first.
 */
const DashboardPage = lazy(() =>
  import("@/routes/dashboard").then((m) => ({ default: m.DashboardPage })),
)
const InventoryPage = lazy(() =>
  import("@/routes/inventory/inventory").then((m) => ({ default: m.InventoryPage })),
)
const LeadsPage = lazy(() =>
  import("@/routes/leads/leads").then((m) => ({ default: m.LeadsPage })),
)
const CrmPage = lazy(() => import("@/routes/crm").then((m) => ({ default: m.CrmPage })))
const FinancingPage = lazy(() =>
  import("@/routes/financing").then((m) => ({ default: m.FinancingPage })),
)
const UsersPage = lazy(() =>
  import("@/routes/users").then((m) => ({ default: m.UsersPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
})

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            <BrowserRouter>
              <Routes>
                <Route path="/sign-in" element={<SignInPage />} />
                <Route element={<AppShell />}>
                  <Route index element={<Guarded permission="dashboard.view" page={<DashboardPage />} />} />
                  <Route
                    path="inventory"
                    element={<Guarded permission="inventory.view" page={<InventoryPage />} />}
                  />
                  <Route
                    path="leads"
                    element={<Guarded permission="leads.view" page={<LeadsPage />} />}
                  />
                  <Route
                    path="crm"
                    element={<Guarded permission="crm.view" page={<CrmPage />} />}
                  />
                  <Route
                    path="financing"
                    element={<Guarded permission="financing.view" page={<FinancingPage />} />}
                  />
                  <Route
                    path="users"
                    element={<Guarded permission="users.view" page={<UsersPage />} />}
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

function Guarded({
  permission,
  page,
}: {
  permission: React.ComponentProps<typeof RequirePermission>["permission"]
  page: React.ReactNode
}) {
  return (
    <RequirePermission permission={permission}>
      <Suspense fallback={<PageSkeleton />}>{page}</Suspense>
    </RequirePermission>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[104px]" />
        ))}
      </div>
      <Skeleton className="h-80" />
    </div>
  )
}
