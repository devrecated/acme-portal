import {
  Banknote,
  Contact2,
  LayoutDashboard,
  Target,
  Truck,
  Users,
} from "lucide-react"
import { NavLink } from "react-router"

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
} from "@/components/ui/sidebar"

interface NavItem {
  title: string
  to: string
  icon: typeof Truck
  permission: Permission
}

const SELLING: NavItem[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Inventory", to: "/inventory", icon: Truck, permission: "inventory.view" },
  { title: "Leads", to: "/leads", icon: Target, permission: "leads.view" },
  { title: "CRM", to: "/crm", icon: Contact2, permission: "crm.view" },
]

const OPERATIONS: NavItem[] = [
  { title: "Financing", to: "/financing", icon: Banknote, permission: "financing.view" },
  { title: "Users", to: "/users", icon: Users, permission: "users.view" },
]

export function AppSidebar() {
  const { can } = useAuth()

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
                <NavLink to={item.to} end={item.to === "/"}>
                  {({ isActive }) => (
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                      <span>
                        <item.icon />
                        <span>{item.title}</span>
                      </span>
                    </SidebarMenuButton>
                  )}
                </NavLink>
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
            <Truck className="size-4.5" />
          </div>
          <div className="grid flex-1 leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">Acme Fleet</span>
            <span className="truncate text-xs text-sidebar-foreground/60">
              Commercial vehicles
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Selling", SELLING)}
        {renderGroup("Operations", OPERATIONS)}
      </SidebarContent>
    </Sidebar>
  )
}
