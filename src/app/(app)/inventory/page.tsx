import { RequirePermission } from "@/auth/require-permission"
import { InventoryPage } from "@/routes/inventory/inventory"

export const metadata = { title: "Inventory" }

export default function Page() {
  return (
    <RequirePermission permission="inventory.view">
      <InventoryPage />
    </RequirePermission>
  )
}
