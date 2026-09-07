"use client"

import { Car } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AutodevelopTicketsLink } from "@/components/autodevelop-tickets"
import { useAuth } from "@/auth/auth-context"
import { useSandbox } from "@/sandbox/sandbox-context"
import {
  OPERATIONS_NAV,
  PRIMARY_NAV,
  type AppNavItem,
  navItemActive,
} from "@/components/layout/app-nav"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar() {
  const { can } = useAuth()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()
  const sandbox = useSandbox()
  const dealerName = sandbox.patch?.copy?.dealerName ?? "Acme Fleet"
  const tagline = sandbox.patch?.copy?.dealerTagline ?? "Exotic sports cars"

  const renderGroup = (label: string, items: AppNavItem[]) => {
    const visible = items.filter((item) => can(item.permission))
    if (visible.length === 0) return null

    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  isActive={navItemActive(pathname, item.to)}
                  tooltip={item.title}
                >
                  <Link
                    href={item.to}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div
          data-feature-demo-anchor="sandbox-brand"
          className="flex items-center gap-2.5 px-2 py-1.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Car className="size-4.5" />
          </div>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-heading text-sm font-semibold">{dealerName}</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              {tagline}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Selling", PRIMARY_NAV)}
        {renderGroup("Operations", OPERATIONS_NAV)}
        <SidebarGroup>
          <SidebarGroupLabel>Support</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Request a change">
                  <AutodevelopTicketsLink
                    view="submit"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Devrecated Solutions">
                  <a
                    href={process.env.NEXT_PUBLIC_COMPANY_ORIGIN ?? "http://localhost:3001"}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  >
                    <span>Devrecated Solutions</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
