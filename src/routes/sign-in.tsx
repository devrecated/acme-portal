import { Truck } from "lucide-react"
import { Navigate, useLocation, useNavigate } from "react-router"

import { useAuth } from "@/auth/auth-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { seedUsers } from "@/data/seed"
import { initials } from "@/lib/format"
import { ROLE_LABELS } from "@/types"

/**
 * Stand-in for real authentication. Picking a teammate sets the session role,
 * which is what drives every permission check in the app.
 */
export function SignInPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  if (user) {
    const from = (location.state as { from?: string } | null)?.from ?? "/"
    return <Navigate to={from} replace />
  }

  const handleSignIn = (id: string) => {
    signIn(id)
    navigate((location.state as { from?: string } | null)?.from ?? "/", {
      replace: true,
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Truck className="size-6" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">Acme Fleet</h1>
            <p className="text-sm text-muted-foreground">
              Commercial vehicle sales portal
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Choose an account</CardTitle>
            <CardDescription>
              Each teammate carries a different role, so the navigation and
              permissions change with your selection.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {seedUsers
              .filter((candidate) => candidate.status === "active")
              .map((candidate) => (
                <Button
                  key={candidate.id}
                  variant="ghost"
                  className="h-auto w-full justify-start gap-3 px-3 py-2.5"
                  onClick={() => handleSignIn(candidate.id)}
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="text-xs">
                      {initials(candidate.firstName, candidate.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left">
                    <span className="block text-sm font-medium">
                      {candidate.firstName} {candidate.lastName}
                    </span>
                    <span className="block text-xs font-normal text-muted-foreground">
                      {candidate.title}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ROLE_LABELS[candidate.role]}
                  </span>
                </Button>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
