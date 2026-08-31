"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/auth/auth-context"
import { PageSkeleton } from "@/components/common/page-skeleton"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export function AppShell({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/sign-in?from=${encodeURIComponent(pathname)}`)
    }
  }, [ready, user, pathname, router])

  if (!ready || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="w-full max-w-4xl">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <main className="flex-1 space-y-6 p-4 sm:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
