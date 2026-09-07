"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { useAuth } from "@/auth/auth-context"
import { PRIMARY_NAV, navItemActive } from "@/components/layout/app-nav"
import { cn } from "@/lib/utils"

export function AppBottomNav() {
  const { can } = useAuth()
  const pathname = usePathname()
  const items = PRIMARY_NAV.filter((item) => can(item.permission))

  if (items.length === 0) return null

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:hidden supports-[backdrop-filter]:bg-background/75 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex">
        {items.map((item) => {
          const active = navItemActive(pathname, item.to)
          return (
            <li key={item.to} className="flex-1">
              <Link
                href={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-xs",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.title}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
