"use client"

import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { usePathname } from "next/navigation"
import { useRef, type ReactNode } from "react"

gsap.registerPlugin(useGSAP)

export function PageEnter({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        {
          motion: "(prefers-reduced-motion: no-preference)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (context) => {
          if (context.conditions?.reduce) return
          gsap.fromTo(
            root.current,
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.42, ease: "power2.out" },
          )
        },
      )
      return () => mm.revert()
    },
    { scope: root, dependencies: [pathname] },
  )

  return <div ref={root}>{children}</div>
}
