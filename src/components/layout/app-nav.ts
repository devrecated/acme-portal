import { Banknote, Car, Contact2, LayoutDashboard, Target, Users } from "lucide-react"

import type { Permission } from "@/auth/auth-context"

export interface AppNavItem {
  title: string
  to: string
  icon: typeof Car
  permission: Permission
}

export const PRIMARY_NAV: AppNavItem[] = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard, permission: "dashboard.view" },
  { title: "Inventory", to: "/inventory", icon: Car, permission: "inventory.view" },
  { title: "Leads", to: "/leads", icon: Target, permission: "leads.view" },
  { title: "CRM", to: "/crm", icon: Contact2, permission: "crm.view" },
]

export const OPERATIONS_NAV: AppNavItem[] = [
  { title: "Financing", to: "/financing", icon: Banknote, permission: "financing.view" },
  { title: "Users", to: "/users", icon: Users, permission: "users.view" },
]

export function navItemActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname.startsWith(to)
}
