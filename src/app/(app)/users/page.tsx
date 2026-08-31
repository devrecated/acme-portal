import { RequirePermission } from "@/auth/require-permission"
import { UsersPage } from "@/routes/users"

export const metadata = { title: "Users" }

export default function Page() {
  return (
    <RequirePermission permission="users.view">
      <UsersPage />
    </RequirePermission>
  )
}
