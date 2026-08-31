import { RequirePermission } from "@/auth/require-permission"
import { DashboardPage } from "@/routes/dashboard"

export default function Page() {
  return (
    <RequirePermission permission="dashboard.view">
      <DashboardPage />
    </RequirePermission>
  )
}
