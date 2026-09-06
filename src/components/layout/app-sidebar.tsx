"use client"

import {
  Banknote,
  Contact2,
  LayoutDashboard,
  Target,
  Car,
  Users,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AutodevelopTicketsLink } from "@/components/autodevelop-tickets"
import { useAuth, type Permission } from "@/auth/auth-context"
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

interface NavItem {
  title: string
  to: string
  icon: typeof Car
  permission: Permission
}

const SELLING: NavItem[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Inventory", to: "/inventory", icon: Car, permission: "inventory.view" },
  { title: "Leads", to: "/leads", icon: Target, permission: "leads.view" },
  { title: "CRM", to: "/crm", icon: Contact2, permission: "crm.view" },
]

const OPERATIONS: NavItem[] = [
  { title: "Financing", to: "/financing", icon: Banknote, permission: "financing.view" },
  { title: "Users", to: "/users", icon: Users, permission: "users.view" },
]

export function AppSidebar() {
  const { can } = useAuth()
  const pathname = usePathname()
  const { isMobile, setOpenMobile } = useSidebar()

  const renderGroup = (label: string, items: NavItem[]) => {
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
                  isActive={item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)}
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
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Car className="size-4.5" />
          </div>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Acme Fleet</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              Exotic sports cars
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Selling", SELLING)}
        {renderGroup("Operations", OPERATIONS)}
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
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
