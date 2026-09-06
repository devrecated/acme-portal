"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { MoreHorizontal, Search, UserPlus, Users as UsersIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { useAuth } from "@/auth/auth-context"
import { DataTable, type Column } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from "@/data/queries"
import { formatRelative, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ROLE_LABELS, USER_ROLES, type User, type UserRole } from "@/types"

const STATUS_STYLES: Record<User["status"], string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  invited: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  suspended: "bg-muted text-muted-foreground",
}

export function UsersPage() {
  const { data: users = [], isLoading } = useUsers()
  const { user: currentUser, can } = useAuth()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()

  const [search, setSearch] = useState("")
  const [inviteOpen, setInviteOpen] = useState(false)

  const canEdit = can("users.edit")

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) =>
      [user.firstName, user.lastName, user.email, user.title ?? "", ROLE_LABELS[user.role]]
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
  }, [users, search])

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "Name",
      sortValue: (u) => `${u.lastName} ${u.firstName}`,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(u.firstName, u.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="font-medium">
              {u.firstName} {u.lastName}
              {u.id === currentUser?.id ? (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  (you)
                </span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "title",
      header: "Title",
      sortValue: (u) => u.title ?? "",
      cell: (u) => <span className="text-muted-foreground">{u.title ?? "—"}</span>,
    },
    {
      key: "role",
      header: "Role",
      sortValue: (u) => ROLE_LABELS[u.role],
      cell: (u) => <Badge variant="secondary">{ROLE_LABELS[u.role]}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortValue: (u) => u.status,
      cell: (u) => (
        <Badge variant="outline" className={cn("border-transparent", STATUS_STYLES[u.status])}>
          {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "lastActive",
      header: "Last active",
      sortValue: (u) => u.lastActiveAt ?? "",
      cell: (u) => (
        <span className="text-muted-foreground">{formatRelative(u.lastActiveAt)}</span>
      ),
    },
  ]

  if (canEdit) {
    columns.push({
      key: "actions",
      header: "",
      headerClassName: "w-10",
      cell: (u) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Actions for {u.firstName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Role</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={u.role}
              onValueChange={(role) =>
                updateUser.mutate({ id: u.id, patch: { role: role as UserRole } })
              }
            >
              {USER_ROLES.map((role) => (
                <DropdownMenuRadioItem key={role} value={role}>
                  {ROLE_LABELS[role]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            {u.status === "suspended" ? (
              <DropdownMenuItem
                onSelect={() =>
                  updateUser.mutate({ id: u.id, patch: { status: "active" } })
                }
              >
                Reactivate
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                disabled={u.id === currentUser?.id}
                onSelect={() =>
                  updateUser.mutate({ id: u.id, patch: { status: "suspended" } })
                }
              >
                Suspend
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              variant="destructive"
              disabled={u.id === currentUser?.id}
              onSelect={() => deleteUser.mutate(u.id)}
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    })
  }

  return (
    <>
      <PageHeader
        title="Users"
        description={`${users.filter((u) => u.status === "active").length} active teammates on this instance.`}
        actions={
          canEdit ? (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus /> Invite user
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or role"
          className="pl-9"
        />
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowId={(user) => user.id}
        isLoading={isLoading}
        initialSort={{ key: "name", direction: "asc" }}
        emptyState={
          <EmptyState
            icon={UsersIcon}
            title="No users match that search"
            description="Try a different name, email, or role."
          />
        }
      />

      <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  )
}

const inviteSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  title: z.string().optional(),
  role: z.enum(USER_ROLES),
})

type InviteValues = z.input<typeof inviteSchema>

function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const createUser = useCreateUser()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      title: "",
      role: "sales_rep",
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    await createUser.mutateAsync({ ...inviteSchema.parse(values), status: "invited" })
    reset()
    onOpenChange(false)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite a teammate</DialogTitle>
          <DialogDescription>
            They receive an invitation and pick their own password on first sign-in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className={cn(errors.firstName && "text-destructive")}>
                First name
              </Label>
              <Input {...register("firstName")} />
              {errors.firstName ? (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label className={cn(errors.lastName && "text-destructive")}>
                Last name
              </Label>
              <Input {...register("lastName")} />
              {errors.lastName ? (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={cn(errors.email && "text-destructive")}>Email</Label>
            <Input type="email" {...register("email")} placeholder="name@acmefleet.com" />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>Title</Label>
            <Input {...register("title")} placeholder="Client advisor" />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={watch("role")}
              onValueChange={(value) => setValue("role", value as UserRole)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {USER_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createUser.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createUser.isPending}>
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
