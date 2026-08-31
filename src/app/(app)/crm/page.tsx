import { RequirePermission } from "@/auth/require-permission"
import { CrmPage } from "@/routes/crm"

export const metadata = { title: "CRM" }

export default function Page() {
  return (
    <RequirePermission permission="crm.view">
      <CrmPage />
    </RequirePermission>
  )
}
