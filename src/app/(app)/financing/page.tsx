import { RequirePermission } from "@/auth/require-permission"
import { FinancingPage } from "@/routes/financing"

export const metadata = { title: "Financing" }

export default function Page() {
  return (
    <RequirePermission permission="financing.view">
      <FinancingPage />
    </RequirePermission>
  )
}
