"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth } from "@/auth/auth-context"
import { PageSkeleton } from "@/components/common/page-skeleton"
import { AppBottomNav } from "@/components/layout/app-bottom-nav"
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
      const from = `${pathname}${window.location.search}`
      router.replace(`/sign-in?from=${encodeURIComponent(from)}`)
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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-3 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:ring-3 focus:ring-ring"
      >
        Skip to content
      </a>
      <AppSidebar />
      <SidebarInset>
        <AppTopbar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 scroll-mt-16 space-y-5 overflow-x-hidden px-4 py-4 pb-[max(5.5rem,calc(4.25rem+env(safe-area-inset-bottom)))] sm:space-y-6 sm:p-6 md:pb-6"
        >
          <PageEnter>{children}</PageEnter>
        </main>
        <AppBottomNav />
      </SidebarInset>
    </SidebarProvider>
  )
}
