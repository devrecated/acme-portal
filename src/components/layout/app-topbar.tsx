"use client"

import { LogOut, Monitor, Moon, Sun, UserCog } from "lucide-react"

import { AutodevelopTicketsLink } from "@/components/autodevelop-tickets"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"

import { useAuth } from "@/auth/auth-context"
import { useSandbox } from "@/sandbox/sandbox-context"
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
  const sandbox = useSandbox()

  const title = TITLES[pathname] ?? "Acme Fleet"
  const banner = sandbox.patch?.widgets?.topbarBanner?.text
  const dealerName = sandbox.patch?.copy?.dealerName

  return (
    <header className="sticky top-0 z-50 shrink-0 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur supports-[backdrop-filter]:bg-background/75">
      {sandbox.patch ? (
        <p
          data-feature-demo-anchor="sandbox-banner"
          className="border-b bg-primary px-4 py-2 text-center text-sm text-primary-foreground"
        >
          {banner ? `${banner} ` : null}
          This tab only. Close it or Reset to drop the overlay.
        </p>
      ) : null}
      <div className="flex min-h-14 items-center gap-2 px-4">
      <SidebarTrigger className="-ml-1 size-9" />
      <Separator orientation="vertical" className="mr-1 hidden !h-4 sm:block" />
      <span className="hidden text-sm font-medium sm:inline">
        {title}
        {dealerName ? ` · ${dealerName}` : ""}
      </span>

      <div className="ml-auto flex items-center gap-1">
        <Button className="min-h-11" variant="outline" onClick={sandbox.openDialog}>
          Try Autodevelop
        </Button>
        {sandbox.patch ? (
          <Button className="min-h-11" variant="ghost" onClick={() => void sandbox.reset()}>
            Reset
          </Button>
        ) : null}
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
              <Button
                variant="ghost"
                className="h-9 gap-2 px-2"
                aria-label={`Account menu for ${user.firstName} ${user.lastName}`}
              >
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
              <DropdownMenuItem asChild>
                <AutodevelopTicketsLink view="mine" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      </div>
    </header>
  )
}
