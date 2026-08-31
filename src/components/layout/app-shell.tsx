import { Navigate, Outlet, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname }} replace />
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <main className="flex-1 space-y-6 p-4 sm:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
