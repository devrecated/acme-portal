"use client"

import {
  Building2,
  CalendarClock,
  Contact2,
  Mail,
  NotebookPen,
  Phone,
  Search,
  StickyNote,
  type LucideIcon,
} from "lucide-react"
import { useMemo, useState } from "react"

import { DataTable, type Column } from "@/components/common/data-table"
import { EmptyState } from "@/components/common/empty-state"
import { PageHeader } from "@/components/common/page-header"
import { ContactStageBadge } from "@/components/common/status-badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useActivities, useCompanies, useContacts, useUsers } from "@/data/queries"
import { formatDate, formatNumber, formatRelative, initials } from "@/lib/format"
import type { ActivityKind, Company, Contact } from "@/types"

const ACTIVITY_ICONS: Record<ActivityKind, LucideIcon> = {
  call: Phone,
  email: Mail,
  meeting: CalendarClock,
  note: StickyNote,
  task: NotebookPen,
}

export function CrmPage() {
  const { data: contacts = [], isLoading: contactsLoading } = useContacts()
  const { data: companies = [], isLoading: companiesLoading } = useCompanies()
  const { data: users = [] } = useUsers()

  const [search, setSearch] = useState("")
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)

  const companyNames = useMemo(
    () => new Map(companies.map((company) => [company.id, company.name])),
    [companies],
  )

  const companyName = (id?: string) => (id ? companyNames.get(id) : undefined)

  const ownerName = (id?: string) => {
    const owner = users.find((user) => user.id === id)
    return owner ? `${owner.firstName} ${owner.lastName}` : "Unassigned"
  }

  const term = search.trim().toLowerCase()

  const filteredContacts = useMemo(() => {
    if (!term) return contacts
    return contacts.filter((contact) =>
      [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.title ?? "",
        (contact.companyId && companyNames.get(contact.companyId)) || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
  }, [contacts, companyNames, term])

  const filteredCompanies = useMemo(() => {
    if (!term) return companies
    return companies.filter((company) =>
      [company.name, company.industry, company.city, company.state]
        .join(" ")
        .toLowerCase()
        .includes(term),
    )
  }, [companies, term])

  const contactColumns: Column<Contact>[] = [
    {
      key: "name",
      header: "Contact",
      sortValue: (c) => `${c.lastName} ${c.firstName}`,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">
              {initials(c.firstName, c.lastName)}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-0.5">
            <p className="font-medium">
              {c.firstName} {c.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{c.title ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      sortValue: (c) => companyName(c.companyId) ?? "",
      cell: (c) => companyName(c.companyId) ?? "Independent",
    },
    {
      key: "email",
      header: "Email",
      sortValue: (c) => c.email,
      cell: (c) => <span className="text-muted-foreground">{c.email}</span>,
    },
    {
      key: "stage",
      header: "Stage",
      sortValue: (c) => c.stage,
      cell: (c) => <ContactStageBadge stage={c.stage} />,
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (c) => ownerName(c.ownerId),
      cell: (c) => <span className="text-muted-foreground">{ownerName(c.ownerId)}</span>,
    },
    {
      key: "activity",
      header: "Last activity",
      sortValue: (c) => c.lastActivityAt ?? "",
      cell: (c) => (
        <span className="text-muted-foreground">{formatRelative(c.lastActivityAt)}</span>
      ),
    },
  ]

  const companyColumns: Column<Company>[] = [
    {
      key: "name",
      header: "Company",
      sortValue: (c) => c.name,
      cell: (c) => (
        <div className="space-y-0.5">
          <p className="font-medium">{c.name}</p>
          <p className="text-xs text-muted-foreground">{c.industry}</p>
        </div>
      ),
    },
    {
      key: "location",
      header: "Location",
      sortValue: (c) => `${c.state} ${c.city}`,
      cell: (c) => (
        <span className="text-muted-foreground">
          {c.city}, {c.state}
        </span>
      ),
    },
    {
      key: "fleet",
      header: "Collection",
      sortValue: (c) => c.fleetSize,
      className: "tabular-nums",
      cell: (c) => `${formatNumber(c.fleetSize)} cars`,
    },
    {
      key: "contacts",
      header: "Contacts",
      sortValue: (c) => contacts.filter((ct) => ct.companyId === c.id).length,
      className: "tabular-nums",
      cell: (c) => (
        <Badge variant="secondary">
          {contacts.filter((contact) => contact.companyId === c.id).length}
        </Badge>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      sortValue: (c) => ownerName(c.ownerId),
      cell: (c) => <span className="text-muted-foreground">{ownerName(c.ownerId)}</span>,
    },
    {
      key: "website",
      header: "Website",
      cell: (c) =>
        c.website ? (
          <a
            href={`https://${c.website}`}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="text-primary hover:underline"
          >
            {c.website}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
  ]

  return (
    <>
      <PageHeader
        title="CRM"
        description="Every person and account Acme sells to, and what was said last."
      />

      <Tabs defaultValue="contacts" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="contacts">
              <Contact2 /> Contacts
              <Badge variant="secondary" className="ml-1.5">
                {contacts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="companies">
              <Building2 /> Companies
              <Badge variant="secondary" className="ml-1.5">
                {companies.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search contacts and companies"
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="contacts">
          <DataTable
            columns={contactColumns}
            rows={filteredContacts}
            getRowId={(contact) => contact.id}
            onRowClick={setSelectedContact}
            isLoading={contactsLoading}
            initialSort={{ key: "activity", direction: "desc" }}
            emptyState={
              <EmptyState
                icon={Contact2}
                title="No contacts match that search"
                description="Try a different name, company, or email."
              />
            }
          />
        </TabsContent>

        <TabsContent value="companies">
          <DataTable
            columns={companyColumns}
            rows={filteredCompanies}
            getRowId={(company) => company.id}
            isLoading={companiesLoading}
            initialSort={{ key: "fleet", direction: "desc" }}
            emptyState={
              <EmptyState
                icon={Building2}
                title="No companies match that search"
                description="Try a different name, industry, or city."
              />
            }
          />
        </TabsContent>
      </Tabs>

      <ContactSheet
        contact={selectedContact}
        onOpenChange={(open) => !open && setSelectedContact(null)}
      />
    </>
  )
}

function ContactSheet({
  contact,
  onOpenChange,
}: {
  contact: Contact | null
  onOpenChange: (open: boolean) => void
}) {
  const { data: companies = [] } = useCompanies()
  const { data: activities = [] } = useActivities()
  const { data: users = [] } = useUsers()

  if (!contact) return null

  const company = companies.find((candidate) => candidate.id === contact.companyId)
  const owner = users.find((user) => user.id === contact.ownerId)
  const timeline = activities
    .filter((activity) => activity.contactId === contact.id)
    .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="size-10">
                <AvatarFallback>
                  {initials(contact.firstName, contact.lastName)}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <SheetTitle>
                  {contact.firstName} {contact.lastName}
                </SheetTitle>
                <SheetDescription>
                  {contact.title ?? "—"}
                  {company ? ` · ${company.name}` : ""}
                </SheetDescription>
              </div>
            </div>
            <ContactStageBadge stage={contact.stage} />
          </div>
        </SheetHeader>

        <div className="space-y-6 px-4">
          <section className="grid grid-cols-2 gap-x-4 gap-y-4">
            <Detail label="Email">
              <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                {contact.email}
              </a>
            </Detail>
            <Detail label="Phone">{contact.phone}</Detail>
            <Detail label="Owner">
              {owner ? `${owner.firstName} ${owner.lastName}` : "Unassigned"}
            </Detail>
            <Detail label="Added">{formatDate(contact.createdAt)}</Detail>
            {company ? (
              <>
                <Detail label="Collection">{formatNumber(company.fleetSize)} cars</Detail>
                <Detail label="Location">
                  {company.city}, {company.state}
                </Detail>
              </>
            ) : null}
          </section>

          <Separator />

          <section className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">Activity</p>
            {timeline.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nothing logged against this contact yet.
              </p>
            ) : (
              <ol className="space-y-4">
                {timeline.map((activity) => {
                  const Icon = ACTIVITY_ICONS[activity.kind]
                  const author = users.find((user) => user.id === activity.authorId)
                  return (
                    <li key={activity.id} className="flex gap-3">
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted">
                        <Icon className="size-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-medium">{activity.subject}</p>
                        {activity.body ? (
                          <p className="text-sm text-muted-foreground">{activity.body}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground">
                          {author ? `${author.firstName} ${author.lastName} · ` : ""}
                          {formatRelative(activity.createdAt)}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function Detail({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{children}</div>
    </div>
  )
}
