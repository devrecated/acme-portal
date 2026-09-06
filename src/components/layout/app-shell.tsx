"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/auth/auth-context"
import { PageSkeleton } from "@/components/common/page-skeleton"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { AppTopbar } from "@/components/layout/app-topbar"
import { PageEnter } from "@/components/motion/page-enter"
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
      <div className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
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
        <main className="flex-1 space-y-5 overflow-x-hidden px-4 py-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:p-6">
          <PageEnter>{children}</PageEnter>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
