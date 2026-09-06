/**
 * Domain model for Acme Fleet — exotic sports car sales.
 *
 * Every entity is a plain serialisable object so the same shapes work
 * against the in-memory repository today and a real backend later.
 */

export type ISODate = string

/* ---------------------------------- roles --------------------------------- */

export const USER_ROLES = [
  "admin",
  "sales_manager",
  "sales_rep",
  "finance",
  "viewer",
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  sales_manager: "Sales manager",
  sales_rep: "Sales rep",
  finance: "Finance",
  viewer: "Viewer",
}

export interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  status: "active" | "invited" | "suspended"
  phone?: string
  title?: string
  lastActiveAt?: ISODate
  createdAt: ISODate
}

/* -------------------------------- inventory ------------------------------- */

export const VEHICLE_STATUSES = [
  "available",
  "reconditioning",
  "in_transit",
  "pending_sale",
  "sold",
] as const

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number]

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  available: "Available",
  reconditioning: "Reconditioning",
  in_transit: "In transit",
  pending_sale: "Pending sale",
  sold: "Sold",
}

export const BODY_TYPES = [
  "Coupe",
  "Convertible",
  "Roadster",
  "Grand Tourer",
  "SUV",
  "Spyder",
] as const

export type BodyType = (typeof BODY_TYPES)[number]

/** How the desk groups a car for buyers — not a weight rating. */
export const GVWR_CLASSES = [
  "Supercar",
  "Hypercar",
  "Grand Tourer",
  "Sports car",
  "Luxury GT",
  "Performance SUV",
] as const

export type GvwrClass = (typeof GVWR_CLASSES)[number]

export const FUEL_TYPES = ["Gasoline", "Hybrid", "Electric"] as const

export type FuelType = (typeof FUEL_TYPES)[number]

export interface Vehicle {
  id: string
  stockNumber: string
  vin: string
  year: number
  make: string
  model: string
  bodyType: BodyType
  gvwrClass: GvwrClass
  fuel: FuelType
  mileage: number
  condition: "New" | "Used" | "Certified"
  status: VehicleStatus
  /** Asking price in whole dollars. */
  listPrice: number
  /** Acquisition cost in whole dollars. Drives the margin column. */
  cost: number
  location: string
  assignedRepId?: string
  soldAt?: ISODate
  createdAt: ISODate
  notes?: string
  /** Public path to a photo of this exact model. */
  imageUrl?: string
}

/* ---------------------------------- leads --------------------------------- */

export const LEAD_STAGES = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const

export type LeadStage = (typeof LEAD_STAGES)[number]

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
}

export const LEAD_SOURCES = [
  "Website",
  "Referral",
  "Trade show",
  "Cold outreach",
  "Repeat customer",
  "Marketplace",
] as const

export type LeadSource = (typeof LEAD_SOURCES)[number]

export interface Lead {
  id: string
  leadNumber: string
  contactName: string
  companyName?: string
  email: string
  phone: string
  stage: LeadStage
  priority: "low" | "medium" | "high"
  source: LeadSource
  /** Expected deal value in whole dollars. */
  value: number
  assignedRepId?: string
  vehicleIds: string[]
  unitsWanted: number
  nextFollowUpAt?: ISODate
  lastContactedAt?: ISODate
  createdAt: ISODate
  notes?: string
}

/* --------------------------------- financing ------------------------------ */

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "in_review",
  "approved",
  "declined",
  "funded",
] as const

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
  funded: "Funded",
}

export interface FinanceApplication {
  id: string
  applicationNumber: string
  applicantName: string
  companyName?: string
  contactId?: string
  vehicleId?: string
  lender: string
  status: ApplicationStatus
  /** Amount financed in whole dollars. */
  amount: number
  downPayment: number
  /** Annual percentage rate, e.g. 8.25. */
  rate: number
  /** Term in months. */
  termMonths: number
  creditScore?: number
  submittedAt?: ISODate
  decidedAt?: ISODate
  createdAt: ISODate
  notes?: string
}

/* ------------------------------------ crm --------------------------------- */

export const CONTACT_STAGES = [
  "prospect",
  "opportunity",
  "customer",
  "inactive",
] as const

export type ContactStage = (typeof CONTACT_STAGES)[number]

export const CONTACT_STAGE_LABELS: Record<ContactStage, string> = {
  prospect: "Prospect",
  opportunity: "Opportunity",
  customer: "Customer",
  inactive: "Inactive",
}

export interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  title?: string
  companyId?: string
  stage: ContactStage
  ownerId?: string
  lastActivityAt?: ISODate
  createdAt: ISODate
}

export interface Company {
  id: string
  name: string
  industry: string
  website?: string
  city: string
  state: string
  /** Number of cars the client already owns. */
  fleetSize: number
  ownerId?: string
  createdAt: ISODate
}

export const ACTIVITY_KINDS = ["call", "email", "meeting", "note", "task"] as const

export type ActivityKind = (typeof ACTIVITY_KINDS)[number]

export interface Activity {
  id: string
  kind: ActivityKind
  subject: string
  body?: string
  contactId?: string
  companyId?: string
  leadId?: string
  authorId: string
  createdAt: ISODate
}

/* -------------------------------- dashboard ------------------------------- */

export interface MonthlySales {
  month: string
  units: number
  revenue: number
}

export interface DashboardSummary {
  inventoryCount: number
  availableCount: number
  inventoryValue: number
  openLeads: number
  pipelineValue: number
  applicationsInReview: number
  fundedThisMonth: number
  unitsSoldThisMonth: number
  revenueThisMonth: number
  grossMarginThisMonth: number
  inventoryByStatus: { status: VehicleStatus; count: number }[]
  leadsByStage: { stage: LeadStage; count: number }[]
  monthlySales: MonthlySales[]
}
