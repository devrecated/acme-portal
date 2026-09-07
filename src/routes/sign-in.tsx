"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { Car } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { useAuth } from "@/auth/auth-context"
import { PageSkeleton } from "@/components/common/page-skeleton"
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
import { safeReturnTo } from "@/lib/return-to"
import { useSandbox } from "@/sandbox/sandbox-context"
import { ROLE_LABELS } from "@/types"

gsap.registerPlugin(useGSAP)

/**
 * Stand-in for real authentication. Picking a teammate sets the session role,
 * which is what drives every permission check in the app.
 */
export function SignInPage() {
  const { user, signIn, ready } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = safeReturnTo(searchParams.get("from"))
  const root = useRef<HTMLDivElement>(null)
  const sandbox = useSandbox()

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } })
        tl.fromTo(
          "[data-motion='brand']",
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
        ).fromTo(
          ".account-choice",
          { autoAlpha: 0, y: 10 },
          { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.05 },
          "-=0.15",
        )
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  useEffect(() => {
    if (ready && user) {
      router.replace(from)
    }
  }, [ready, user, from, router])

  const handleSignIn = (id: string) => {
    signIn(id)
    router.replace(from)
  }

  if (!ready || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          <PageSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div
      ref={root}
      className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:p-6"
    >
      <div className="w-full max-w-md space-y-6">
        <div
          data-motion="brand"
          className="flex flex-col items-center gap-3 text-center"
        >
          <div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Car className="size-6" />
          </div>
          <div className="space-y-1">
            <h1
              data-feature-demo-anchor="sandbox-brand"
              className="font-heading text-pretty text-2xl font-semibold tracking-tight"
            >
              {sandbox.patch?.copy?.dealerName ?? "Acme Fleet"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {sandbox.patch?.copy?.dealerTagline ?? "Exotic sports car sales portal"}
            </p>
            <p className="text-xs text-muted-foreground">
              A Devrecated Solutions demo — Autodevelop
            </p>
          </div>
        </div>

        {sandbox.patch?.widgets?.topbarBanner?.text ? (
          <p
            data-feature-demo-anchor="sandbox-banner"
            className="rounded-md bg-primary px-3 py-2 text-center text-sm text-primary-foreground"
          >
            {sandbox.patch.widgets.topbarBanner.text} This tab only. Sign in to
            see the rest, or Reset to drop it.
          </p>
        ) : null}

        <Button className="min-h-11 w-full" onClick={sandbox.openDialog}>
          Try Autodevelop
        </Button>
        {sandbox.patch ? (
          <Button className="min-h-11 w-full" variant="outline" onClick={() => void sandbox.reset()}>
            Reset
          </Button>
        ) : null}

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
                  className="account-choice h-auto min-h-12 w-full justify-start gap-3 px-3 py-3"
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
                      <span className="sm:hidden">
                        {" "}
                        · {ROLE_LABELS[candidate.role]}
                      </span>
                    </span>
                  </span>
                  <span className="hidden text-xs text-muted-foreground sm:inline">
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
