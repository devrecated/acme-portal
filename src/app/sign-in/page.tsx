import { Suspense } from "react"

import { PageSkeleton } from "@/components/common/page-skeleton"
import { SignInPage } from "@/routes/sign-in"

export const metadata = { title: "Sign in" }

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SignInPage />
    </Suspense>
  )
}
