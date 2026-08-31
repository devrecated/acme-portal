import { RequirePermission } from "@/auth/require-permission"
import { LeadsPage } from "@/routes/leads/leads"

export const metadata = { title: "Leads" }

export default function Page() {
  return (
    <RequirePermission permission="leads.view">
      <LeadsPage />
    </RequirePermission>
  )
}
