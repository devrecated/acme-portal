"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
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
import { seedUsers, seedVehicles } from "@/data/seed"
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

  const hero =
    seedVehicles.find((vehicle) => vehicle.status === "available" && vehicle.imageUrl) ??
    seedVehicles.find((vehicle) => vehicle.imageUrl)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "power2.out" } })
        tl.fromTo(
          "[data-motion='stage']",
          { autoAlpha: 0, scale: 1.04 },
          { autoAlpha: 1, scale: 1, duration: 0.7 },
        )
          .fromTo(
            "[data-motion='brand']",
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.45 },
            "-=0.35",
          )
          .fromTo(
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

  const dealerName = sandbox.patch?.copy?.dealerName ?? "Acme Fleet"
  const tagline =
    sandbox.patch?.copy?.dealerTagline ?? "Exotic sports car sales portal"

  return (
    <div ref={root} className="relative min-h-dvh overflow-hidden">
      <div data-motion="stage" className="absolute inset-0">
        {hero?.imageUrl ? (
          // Local seed photos in /public — same pattern as VehiclePhoto.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt=""
            className="h-full w-full object-cover"
            fetchPriority="high"
          />
        ) : (
          <div className="h-full w-full bg-foreground" />
        )}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/45"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30"
        />
      </div>

      <div className="relative z-10 grid min-h-dvh lg:grid-cols-[minmax(0,1.1fr)_minmax(22rem,26rem)]">
        <div className="flex flex-col justify-between px-6 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-10 sm:py-12 lg:px-14">
          <div
            data-motion="brand"
            data-feature-demo-anchor="sandbox-brand"
            className="max-w-xl space-y-4 text-white"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-white/65">
              Devrecated · Autodevelop demo
            </p>
            <h1 className="font-heading text-pretty text-5xl leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
              {dealerName}
            </h1>
            <p className="max-w-md text-base text-white/80 sm:text-lg">{tagline}</p>
            {hero ? (
              <p className="pt-2 text-sm text-white/55">
                On the floor · {hero.year} {hero.make} {hero.model}
              </p>
            ) : null}
          </div>

          <p className="mt-10 hidden max-w-sm text-sm text-white/45 lg:block">
            Pick a teammate to enter the showroom. Roles change what you can
            see and edit.
          </p>
        </div>

        <div className="flex items-end px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:items-center sm:px-8 lg:bg-black/25 lg:px-8 lg:backdrop-blur-md">
          <div className="mx-auto w-full max-w-md space-y-4 py-6 sm:py-8">
            {sandbox.patch?.widgets?.topbarBanner?.text ? (
              <p
                data-feature-demo-anchor="sandbox-banner"
                className="rounded-md bg-primary px-3 py-2 text-center text-sm text-primary-foreground"
              >
                {sandbox.patch.widgets.topbarBanner.text} This tab only. Sign in
                to see the rest, or Reset to drop it.
              </p>
            ) : null}

            <Card className="border-white/10 bg-background/95 shadow-xl backdrop-blur-sm">
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

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                className="min-h-11 flex-1"
                variant="secondary"
                onClick={sandbox.openDialog}
              >
                Try Autodevelop
              </Button>
              {sandbox.patch ? (
                <Button
                  className="min-h-11 flex-1"
                  variant="outline"
                  onClick={() => void sandbox.reset()}
                >
                  Reset
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
