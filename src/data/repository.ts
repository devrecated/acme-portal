import {
  seedActivities,
  seedApplications,
  seedCompanies,
  seedContacts,
  seedLeads,
  seedMonthlySales,
  seedUsers,
  seedVehicles,
} from "@/data/seed"
import type {
  Activity,
  Company,
  Contact,
  DashboardSummary,
  FinanceApplication,
  Lead,
  LeadStage,
  User,
  Vehicle,
  VehicleStatus,
} from "@/types"
import { LEAD_STAGES, VEHICLE_STATUSES } from "@/types"

/**
 * The single seam between the UI and its data source.
 *
 * Pages and hooks only ever talk to this interface, so swapping the
 * in-memory store for Firestore, Supabase, or a REST API means writing
 * one new implementation — no page changes.
 */
export interface DataRepository {
  listVehicles(): Promise<Vehicle[]>
  getVehicle(id: string): Promise<Vehicle | undefined>
  createVehicle(input: Omit<Vehicle, "id" | "createdAt">): Promise<Vehicle>
  updateVehicle(id: string, patch: Partial<Vehicle>): Promise<Vehicle>
  deleteVehicle(id: string): Promise<void>

  listLeads(): Promise<Lead[]>
  createLead(input: Omit<Lead, "id" | "createdAt" | "leadNumber">): Promise<Lead>
  updateLead(id: string, patch: Partial<Lead>): Promise<Lead>
  deleteLead(id: string): Promise<void>

  listApplications(): Promise<FinanceApplication[]>
  createApplication(
    input: Omit<FinanceApplication, "id" | "createdAt" | "applicationNumber">,
  ): Promise<FinanceApplication>
  updateApplication(
    id: string,
    patch: Partial<FinanceApplication>,
  ): Promise<FinanceApplication>

  listUsers(): Promise<User[]>
  createUser(input: Omit<User, "id" | "createdAt">): Promise<User>
  updateUser(id: string, patch: Partial<User>): Promise<User>
  deleteUser(id: string): Promise<void>

  listContacts(): Promise<Contact[]>
  createContact(input: Omit<Contact, "id" | "createdAt">): Promise<Contact>
  updateContact(id: string, patch: Partial<Contact>): Promise<Contact>

  listCompanies(): Promise<Company[]>
  createCompany(input: Omit<Company, "id" | "createdAt">): Promise<Company>

  listActivities(): Promise<Activity[]>
  createActivity(input: Omit<Activity, "id" | "createdAt">): Promise<Activity>

  getDashboardSummary(): Promise<DashboardSummary>
}

/** Latency floor so loading states are exercised during development. */
const LATENCY_MS = 180

const delay = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), LATENCY_MS))

const clone = <T,>(value: T): T => structuredClone(value)

const nextId = (prefix: string, existing: { id: string }[]) => {
  const highest = existing.reduce((max, row) => {
    const n = Number.parseInt(row.id.replace(`${prefix}-`, ""), 10)
    return Number.isFinite(n) && n > max ? n : max
  }, 0)
  return `${prefix}-${highest + 1}`
}

const startOfMonth = () => {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

/**
 * In-memory implementation. State lives for the lifetime of the tab, so
 * edits persist across navigation but reset on reload.
 */
export class InMemoryRepository implements DataRepository {
  private vehicles = clone(seedVehicles)
  private leads = clone(seedLeads)
  private applications = clone(seedApplications)
  private users = clone(seedUsers)
  private contacts = clone(seedContacts)
  private companies = clone(seedCompanies)
  private activities = clone(seedActivities)

  /* -------------------------------- vehicles ------------------------------ */

  listVehicles() {
    return delay(clone(this.vehicles))
  }

  getVehicle(id: string) {
    return delay(clone(this.vehicles.find((v) => v.id === id)))
  }

  createVehicle(input: Omit<Vehicle, "id" | "createdAt">) {
    const vehicle: Vehicle = {
      ...input,
      id: nextId("v", this.vehicles),
      createdAt: new Date().toISOString(),
    }
    this.vehicles = [vehicle, ...this.vehicles]
    return delay(clone(vehicle))
  }

  updateVehicle(id: string, patch: Partial<Vehicle>) {
    const index = this.vehicles.findIndex((v) => v.id === id)
    if (index === -1) throw new Error(`Vehicle ${id} not found`)
    const updated = { ...this.vehicles[index], ...patch }
    this.vehicles[index] = updated
    return delay(clone(updated))
  }

  deleteVehicle(id: string) {
    this.vehicles = this.vehicles.filter((v) => v.id !== id)
    return delay(undefined)
  }

  /* ---------------------------------- leads ------------------------------- */

  listLeads() {
    return delay(clone(this.leads))
  }

  createLead(input: Omit<Lead, "id" | "createdAt" | "leadNumber">) {
    const highest = this.leads.reduce((max, lead) => {
      const n = Number.parseInt(lead.leadNumber.replace("L-", ""), 10)
      return Number.isFinite(n) && n > max ? n : max
    }, 1000)
    const lead: Lead = {
      ...input,
      id: nextId("l", this.leads),
      leadNumber: `L-${highest + 1}`,
      createdAt: new Date().toISOString(),
    }
    this.leads = [lead, ...this.leads]
    return delay(clone(lead))
  }

  updateLead(id: string, patch: Partial<Lead>) {
    const index = this.leads.findIndex((l) => l.id === id)
    if (index === -1) throw new Error(`Lead ${id} not found`)
    const updated = { ...this.leads[index], ...patch }
    this.leads[index] = updated
    return delay(clone(updated))
  }

  deleteLead(id: string) {
    this.leads = this.leads.filter((l) => l.id !== id)
    return delay(undefined)
  }

  /* ------------------------------ applications ---------------------------- */

  listApplications() {
    return delay(clone(this.applications))
  }

  createApplication(
    input: Omit<FinanceApplication, "id" | "createdAt" | "applicationNumber">,
  ) {
    const highest = this.applications.reduce((max, app) => {
      const n = Number.parseInt(app.applicationNumber.replace("APP-", ""), 10)
      return Number.isFinite(n) && n > max ? n : max
    }, 3000)
    const application: FinanceApplication = {
      ...input,
      id: nextId("a", this.applications),
      applicationNumber: `APP-${highest + 1}`,
      createdAt: new Date().toISOString(),
    }
    this.applications = [application, ...this.applications]
    return delay(clone(application))
  }

  updateApplication(id: string, patch: Partial<FinanceApplication>) {
    const index = this.applications.findIndex((a) => a.id === id)
    if (index === -1) throw new Error(`Application ${id} not found`)
    const updated = { ...this.applications[index], ...patch }
    this.applications[index] = updated
    return delay(clone(updated))
  }

  /* ---------------------------------- users ------------------------------- */

  listUsers() {
    return delay(clone(this.users))
  }

  createUser(input: Omit<User, "id" | "createdAt">) {
    const user: User = {
      ...input,
      id: nextId("u", this.users),
      createdAt: new Date().toISOString(),
    }
    this.users = [...this.users, user]
    return delay(clone(user))
  }

  updateUser(id: string, patch: Partial<User>) {
    const index = this.users.findIndex((u) => u.id === id)
    if (index === -1) throw new Error(`User ${id} not found`)
    const updated = { ...this.users[index], ...patch }
    this.users[index] = updated
    return delay(clone(updated))
  }

  deleteUser(id: string) {
    this.users = this.users.filter((u) => u.id !== id)
    return delay(undefined)
  }

  /* --------------------------------- contacts ----------------------------- */

  listContacts() {
    return delay(clone(this.contacts))
  }

  createContact(input: Omit<Contact, "id" | "createdAt">) {
    const contact: Contact = {
      ...input,
      id: nextId("ct", this.contacts),
      createdAt: new Date().toISOString(),
    }
    this.contacts = [contact, ...this.contacts]
    return delay(clone(contact))
  }

  updateContact(id: string, patch: Partial<Contact>) {
    const index = this.contacts.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Contact ${id} not found`)
    const updated = { ...this.contacts[index], ...patch }
    this.contacts[index] = updated
    return delay(clone(updated))
  }

  /* -------------------------------- companies ----------------------------- */

  listCompanies() {
    return delay(clone(this.companies))
  }

  createCompany(input: Omit<Company, "id" | "createdAt">) {
    const company: Company = {
      ...input,
      id: nextId("c", this.companies),
      createdAt: new Date().toISOString(),
    }
    this.companies = [company, ...this.companies]
    return delay(clone(company))
  }

  /* -------------------------------- activities ---------------------------- */

  listActivities() {
    return delay(clone(this.activities))
  }

  createActivity(input: Omit<Activity, "id" | "createdAt">) {
    const activity: Activity = {
      ...input,
      id: nextId("ac", this.activities),
      createdAt: new Date().toISOString(),
    }
    this.activities = [activity, ...this.activities]
    return delay(clone(activity))
  }

  /* -------------------------------- dashboard ----------------------------- */

  getDashboardSummary(): Promise<DashboardSummary> {
    const monthStart = startOfMonth()
    const soldThisMonth = this.vehicles.filter(
      (v) => v.soldAt && new Date(v.soldAt) >= monthStart,
    )
    const openLeads = this.leads.filter(
      (l) => l.stage !== "won" && l.stage !== "lost",
    )
    const onHand = this.vehicles.filter((v) => v.status !== "sold")

    const summary: DashboardSummary = {
      inventoryCount: onHand.length,
      availableCount: onHand.filter((v) => v.status === "available").length,
      inventoryValue: onHand.reduce((sum, v) => sum + v.listPrice, 0),
      openLeads: openLeads.length,
      pipelineValue: openLeads.reduce((sum, l) => sum + l.value, 0),
      applicationsInReview: this.applications.filter(
        (a) => a.status === "in_review" || a.status === "submitted",
      ).length,
      fundedThisMonth: this.applications.filter(
        (a) => a.status === "funded" && a.decidedAt && new Date(a.decidedAt) >= monthStart,
      ).length,
      unitsSoldThisMonth: soldThisMonth.length,
      revenueThisMonth: soldThisMonth.reduce((sum, v) => sum + v.listPrice, 0),
      grossMarginThisMonth: soldThisMonth.reduce(
        (sum, v) => sum + (v.listPrice - v.cost),
        0,
      ),
      inventoryByStatus: VEHICLE_STATUSES.map((status: VehicleStatus) => ({
        status,
        count: this.vehicles.filter((v) => v.status === status).length,
      })),
      leadsByStage: LEAD_STAGES.map((stage: LeadStage) => ({
        stage,
        count: this.leads.filter((l) => l.stage === stage).length,
      })),
      monthlySales: clone(seedMonthlySales),
    }

    return delay(summary)
  }
}

export const repository: DataRepository = new InMemoryRepository()
