# Acme Fleet Portal

A dealer portal for commercial vehicle sales. Sales reps work leads and contacts,
the yard tracks inventory, and the finance desk moves credit applications from
submitted to funded.

The data layer is mock data held in memory. Every read and write goes through a
repository interface, so swapping in a real backend means writing one new
implementation rather than touching the UI.

## Running it

```bash
pnpm install
pnpm dev
```

The app serves on the port Vite picks (5173 unless it is taken). There is no
password — pick an identity on the sign-in screen and the app adopts that user's
role for the session.

| Script | What it does |
| --- | --- |
| `pnpm dev` | Dev server with HMR |
| `pnpm build` | Type-check, then produce a production bundle in `dist/` |
| `pnpm preview` | Serve the built bundle |
| `pnpm lint` | Oxlint |

## Features

**Dashboard** — units in stock, inventory value, open pipeline, and applications
awaiting credit, plus a twelve-month revenue chart, inventory status breakdown,
next follow-ups, and recent applications.

**Inventory** — searchable, filterable, sortable table of vehicles. Add and edit
through a validated form; open a row for a detail sheet. Cost and margin are
visible only to roles that carry `inventory.viewCost`.

**Leads** — a kanban board across the pipeline stages. Drag a card to move a lead;
the stage change persists.

**CRM** — contacts and companies in tabbed views, with a per-contact activity
timeline.

**Financing** — credit applications with an estimated monthly payment, and status
controls for the finance desk.

**Users** — invite users, change roles, and deactivate accounts.

## Roles

Permissions are declared in `src/auth/auth-context.tsx` and enforced two ways:
`RequirePermission` gates a route, and `Can` hides an element.

| Role | Reach |
| --- | --- |
| Admin | Everything, including editing users |
| Sales manager | Every selling feature, plus cost, margin, and the user list |
| Sales rep | Inventory, leads, and CRM with edit rights — no cost, no margin |
| Finance | Applications and inventory only; no leads, no CRM |
| Viewer | Read-only across the dashboard, inventory, leads, and CRM |

Sidebar entries hide themselves when the signed-in user lacks the permission, so
a rep never sees a link that would bounce them.

## How it is put together

```
src/
  auth/         session context and permission guards
  components/
    common/     PageHeader, StatCard, DataTable, StatusBadge, EmptyState
    layout/     sidebar, topbar, and the shell that routes into them
    ui/         shadcn/ui primitives
  data/         repository interface, in-memory implementation, seed, query hooks
  lib/          currency, date, and payment formatting
  routes/       one directory or file per feature
  types/        domain models and their enums
```

React 19 on Vite, routed with React Router. Styling is Tailwind CSS v4 with
shadcn/ui. Server state is TanStack Query; forms are React Hook Form with Zod
schemas. Charts are Recharts, icons are Lucide.

Feature routes are lazy-loaded. That keeps Recharts out of the initial bundle for
anyone who does not open the dashboard first.

### Replacing the mock data

`DataRepository` in `src/data/repository.ts` is the whole contract. Write a class
that satisfies it against a real API and swap the instance the query hooks
import. The seed lives in `src/data/seed.ts` and is deterministic, so screenshots
and demos stay stable.

## Conventions

Domain types and their allowed values live in `src/types/index.ts`. When you add
a status or a stage, add it there and to the tone map in
`components/common/status-badge.tsx` so it renders with the right colour.

Money is stored in whole dollars and formatted at the edge through
`lib/format.ts`. Do not format inside a component.
