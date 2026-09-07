# Acme Fleet Portal

**[Live demo →](https://acme-portal-five.vercel.app)**

This repository is a **demonstration of [Autodevelop](https://devrecated.github.io/autodevelop/)**, Devrecated’s Cursor plugin for GitHub Projects, tickets, and confirmed stakeholder mail. The product you see here — an exotic sports car dealer portal — was built as a working example of what Autodevelop can produce: a real app, with real roles, shipped from tickets instead of a meeting.

It is not a production dealership system. The data is mock and held in memory. Use it to see the plugin’s process, then install Autodevelop on your own product repo.

## What Autodevelop is

Official vendor plugins give the agent an API. Autodevelop gives the agent a **process**.

On most projects the hard part is not writing code; it is keeping requests, decisions, and delivery aligned. Autodevelop makes that alignment a byproduct of doing the work:

- **Tickets are the source of truth.** A chat request, a note, or a URL becomes a GitHub Project issue with acceptance criteria. Nothing ships without a ticket.
- **A complete paper trail.** Claim, progress, verification, pull request, preview, and stakeholder email all write back to the ticket.
- **Confirmed stakeholder mail.** Email goes out only after an explicit confirm, and only to allowlisted recipients. Hooks never send mail on their own.
- **Ship gates.** Staging and production deploys wait for exact phrases in chat so nothing reaches an environment by accident.
- **Asynchronous, 24/7 communication.** Stakeholders use tickets and confirmed email instead of synchronous calls. Developers stay in the editor.

The public handbook is at [devrecated.github.io/autodevelop](https://devprecated.github.io/autodevelop/). Start with the [Client guide](https://devprecated.github.io/autodevelop/guide.html).

## What this demo shows

Acme Fleet is a dealer portal for Lamborghini, Ferrari, Porsche, McLaren, and Bentley. Sales reps work leads and collectors, the showroom tracks inventory, and the finance desk moves credit applications from submitted to funded.

Open the [live demo](https://acme-portal-five.vercel.app), pick an identity on the sign-in screen (there is no password), and switch roles. The sidebar, cost columns, and edit controls change with the signed-in permission set — the same kind of product surface Autodevelop is meant to keep delivering against tickets.

| Role | Reach |
| --- | --- |
| Admin | Everything, including editing users |
| Sales manager | Every selling feature, plus cost, margin, and the user list |
| Sales rep | Inventory, leads, and CRM with edit rights — no cost, no margin |
| Finance | Applications and inventory only; no leads, no CRM |
| Viewer | Read-only across the dashboard, inventory, leads, and CRM |

**Dashboard** — units in stock, inventory value, open pipeline, applications awaiting credit, a twelve-month revenue chart, and next follow-ups.

**Inventory** — searchable, filterable, sortable vehicles. Add and edit through a validated form. Cost and margin stay hidden from roles without `inventory.viewCost`.

**Leads** — a kanban board. Drag a card to change stage; the change persists for the session.

**CRM** — contacts and companies, with a per-contact activity timeline.

**Financing** — credit applications with an estimated monthly payment and status controls for the finance desk.

**Users** — invite teammates, change roles, and deactivate accounts.

## Install Autodevelop

Install the plugin **once at user scope**. Instance bindings (board ids, people, mail allowlist, policies) stay in the consumer repo — this one uses `.cursor/skills/acme/autodevelop/`.

From the Autodevelop kit repo:

```bash
pnpm autodevelop:import
pnpm autodevelop:import --apply
```

The first command is a dry-run. After `--apply`, reload Cursor (**Developer: Reload Window**). Same outcome as Customize → Install → **user**, or:

```bash
ln -sfn /path/to/autodevelop ~/.cursor/plugins/local/autodevelop
```

Then:

1. Paste the operator-issued subscription token under **Plugins → Configure**. Do not commit it.
2. Sign in: `pnpm autodevelop login` (or `npx @devprecated/autodevelop login` when the thin package is published).
3. An operator with `org.manage` opens **Connect GitHub** in the operator console and installs the Autodevelop GitHub App.
4. Bind the consumer instance (`config.json`, `people.json`, `.policies/`). Say **bootstrap** only if field ids are still missing.
5. Run `pnpm doctor`. It never writes mail and never invents a confirm token.

Cloud Agents do not load `~/.cursor` plugins. Copy the kit into that workspace, or install the plugin at project scope. Do not copy another client’s instance folder.

Full sequence: [Install](https://devprecated.github.io/autodevelop/install.html) · [Configure](https://devprecated.github.io/autodevelop/configure.html) · [Initial setup](https://devprecated.github.io/autodevelop/workflows/initial-setup.html)

## Capabilities

These are the workflows a team actually runs. Each starts from chat; the agent does not invent a ticket or send mail without the matching phrase.

| You want to… | What you say / do |
| --- | --- |
| Turn a request into work | Notes, a URL, or a chat ask → numbered preview → **create** (or **use #N**) |
| Claim the next item | **pull-project-work**, then pick a ticket |
| Keep the audit trail | Progress comments, then **verify-ticket** against acceptance criteria |
| Mail a stakeholder | Review to / subject / body / ticket. Recipients must be on the allowlist. Explicit yes, then the confirm token |
| Land work on this repo | `YES PUSH TO MASTER` (this demo is single-branch) |
| Ship | `DEPLOYED TO STAGING` or `DEPLOYED TO PRODUCTION` after the matching git gate |

Skills are grouped into tickets, mail, ship, and setup. Slash wrappers (`/ui`, `/backend`, `/new-feature`, `/debug`, `/testing`, `/communication`, `/release`) pick a bucket so you do not have to name a skill. The [skill catalog](https://devprecated.github.io/autodevelop/skill-catalog.html) is the public inventory.

This Acme instance is bound in `.cursor/skills/acme/autodevelop/config.json`. It is single-branch: shared work lands on `master`. There is no separate production branch.

## Run the demo locally

```bash
pnpm install
pnpm dev
```

The app serves on the port Next.js picks (3000 unless it is taken).

| Script | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build |
| `pnpm lint` | Oxlint |
| `pnpm run deploy` | Production deploy to Vercel |

## How the portal is put together

```
src/
  app/          Next.js App Router pages and layouts
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

Next.js App Router on React 19. Styling is Tailwind CSS v4 with shadcn/ui. Server state is TanStack Query; forms are React Hook Form with Zod schemas. Charts are Recharts, icons are Lucide.

`DataRepository` in `src/data/repository.ts` is the whole contract with the UI. The seed in `src/data/seed.ts` is deterministic, so screenshots and demos stay stable. Money is stored in whole dollars and formatted through `lib/format.ts`.

## Try Autodevelop

A visitor can type a change from **Try Autodevelop** (sign-in and the top bar, or `?try=1`). Autodevelop builds a session preview. The published UI updates in that tab only. Close the tab or Reset to drop the overlay. Visitor prompts do not write this repository. Operator notes: [docs/TRY-AUTODEVELOP.md](docs/TRY-AUTODEVELOP.md).

This portal is a Devrecated Solutions demo of Autodevelop.

## Further reading

- Live app: [acme-portal-five.vercel.app](https://acme-portal-five.vercel.app)
- Autodevelop handbook: [devrecated.github.io/autodevelop](https://devprecated.github.io/autodevelop/)
- [What Autodevelop is](https://devprecated.github.io/autodevelop/overview.html)
- [Client guide](https://devprecated.github.io/autodevelop/guide.html)
- [Onboard a client](https://devprecated.github.io/autodevelop/onboard-client.html)
