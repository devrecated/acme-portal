"use client"

import { LogOut, Monitor, Moon, Sun, UserCog } from "lucide-react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/auth/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { seedUsers } from "@/data/seed"
import { initials } from "@/lib/format"
import { ROLE_LABELS } from "@/types"

const TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/inventory": "Inventory",
  "/leads": "Leads",
  "/crm": "CRM",
  "/financing": "Financing",
  "/users": "Users",
}

export function AppTopbar() {
  const { user, signOut, switchUser } = useAuth()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  const title = TITLES[pathname] ?? "Acme Fleet"

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-1 !h-4" />
      <span className="text-sm font-medium">{title}</span>

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Change theme">
              <Sun className="size-4 dark:hidden" />
              <Moon className="hidden size-4 dark:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
              <DropdownMenuRadioItem value="light">
                <Sun className="size-4" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="size-4" /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="size-4" /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2">
                <Avatar className="size-6">
                  <AvatarFallback className="text-[10px]">
                    {initials(user.firstName, user.lastName)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm sm:inline">{user.firstName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ROLE_LABELS[user.role]}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <UserCog className="size-4" /> View as
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {seedUsers
                    .filter((candidate) => candidate.status === "active")
                    .map((candidate) => (
                      <DropdownMenuItem
                        key={candidate.id}
                        onSelect={() => switchUser(candidate.id)}
                      >
                        <span className="flex-1">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {ROLE_LABELS[candidate.role]}
                        </span>
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </header>
  )
}
