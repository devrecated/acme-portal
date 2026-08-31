"use client"

import { ShieldOff } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, type ReactNode } from "react"

import { useAuth, type Permission } from "@/auth/auth-context"
import { PageSkeleton } from "@/components/common/page-skeleton"
import { Button } from "@/components/ui/button"

/** Gate for a whole route. Signed-out users go to the sign-in screen. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: Permission
  children: ReactNode
}) {
  const { user, can, ready } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (ready && !user) {
      router.replace(`/sign-in?from=${encodeURIComponent(pathname)}`)
    }
  }, [ready, user, pathname, router])

  if (!ready || !user) {
    return <PageSkeleton />
  }

  if (!can(permission)) {
    return <PermissionDenied />
  }

  return <>{children}</>
}

export function PermissionDenied() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <ShieldOff className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">You don't have access to this area</h2>
        <p className="text-sm text-muted-foreground">
          Ask an administrator to adjust your role if you need it.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={() => window.history.back()}>
        Go back
      </Button>
    </div>
  )
}

/** Inline gate for a single control or column. */
export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}) {
  const { can } = useAuth()
  return <>{can(permission) ? children : fallback}</>
}
