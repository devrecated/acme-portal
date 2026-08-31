"use client"

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query"
import { toast } from "sonner"

import { repository } from "@/data/repository"
import type {
  Activity,
  Company,
  Contact,
  FinanceApplication,
  Lead,
  User,
  Vehicle,
} from "@/types"

export const queryKeys = {
  vehicles: ["vehicles"] as const,
  leads: ["leads"] as const,
  applications: ["applications"] as const,
  users: ["users"] as const,
  contacts: ["contacts"] as const,
  companies: ["companies"] as const,
  activities: ["activities"] as const,
  dashboard: ["dashboard"] as const,
}

/** Anything that changes a record also invalidates the dashboard rollups. */
const DERIVED_KEYS = [queryKeys.dashboard]

/* ---------------------------------- reads --------------------------------- */

export const useVehicles = () =>
  useQuery({ queryKey: queryKeys.vehicles, queryFn: () => repository.listVehicles() })

export const useLeads = () =>
  useQuery({ queryKey: queryKeys.leads, queryFn: () => repository.listLeads() })

export const useApplications = () =>
  useQuery({
    queryKey: queryKeys.applications,
    queryFn: () => repository.listApplications(),
  })

export const useUsers = () =>
  useQuery({ queryKey: queryKeys.users, queryFn: () => repository.listUsers() })

export const useContacts = () =>
  useQuery({ queryKey: queryKeys.contacts, queryFn: () => repository.listContacts() })

export const useCompanies = () =>
  useQuery({ queryKey: queryKeys.companies, queryFn: () => repository.listCompanies() })

export const useActivities = () =>
  useQuery({
    queryKey: queryKeys.activities,
    queryFn: () => repository.listActivities(),
  })

export const useDashboardSummary = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => repository.getDashboardSummary(),
  })

/* -------------------------------- mutations ------------------------------- */

type MutationConfig<TData, TVars> = Omit<
  UseMutationOptions<TData, Error, TVars>,
  "mutationFn"
>

/**
 * Wraps a repository write so every mutation invalidates the same way and
 * surfaces a toast, rather than repeating that in each feature.
 */
function useRepositoryMutation<TData, TVars>(
  mutationFn: (vars: TVars) => Promise<TData>,
  invalidate: readonly (readonly string[])[],
  successMessage: string,
  config?: MutationConfig<TData, TVars>,
) {
  const client = useQueryClient()
  return useMutation<TData, Error, TVars>({
    mutationFn,
    ...config,
    onSuccess: (...args) => {
      for (const key of [...invalidate, ...DERIVED_KEYS]) {
        void client.invalidateQueries({ queryKey: key })
      }
      toast.success(successMessage)
      config?.onSuccess?.(...args)
    },
    onError: (...args) => {
      toast.error(args[0].message || "Something went wrong")
      config?.onError?.(...args)
    },
  })
}

export const useCreateVehicle = () =>
  useRepositoryMutation(
    (input: Omit<Vehicle, "id" | "createdAt">) => repository.createVehicle(input),
    [queryKeys.vehicles],
    "Vehicle added to inventory",
  )

export const useUpdateVehicle = () =>
  useRepositoryMutation(
    ({ id, patch }: { id: string; patch: Partial<Vehicle> }) =>
      repository.updateVehicle(id, patch),
    [queryKeys.vehicles],
    "Vehicle updated",
  )

export const useDeleteVehicle = () =>
  useRepositoryMutation(
    (id: string) => repository.deleteVehicle(id),
    [queryKeys.vehicles],
    "Vehicle removed",
  )

export const useCreateLead = () =>
  useRepositoryMutation(
    (input: Omit<Lead, "id" | "createdAt" | "leadNumber">) =>
      repository.createLead(input),
    [queryKeys.leads],
    "Lead created",
  )

export const useUpdateLead = () =>
  useRepositoryMutation(
    ({ id, patch }: { id: string; patch: Partial<Lead> }) =>
      repository.updateLead(id, patch),
    [queryKeys.leads],
    "Lead updated",
  )

export const useDeleteLead = () =>
  useRepositoryMutation(
    (id: string) => repository.deleteLead(id),
    [queryKeys.leads],
    "Lead removed",
  )

export const useCreateApplication = () =>
  useRepositoryMutation(
    (input: Omit<FinanceApplication, "id" | "createdAt" | "applicationNumber">) =>
      repository.createApplication(input),
    [queryKeys.applications],
    "Application created",
  )

export const useUpdateApplication = () =>
  useRepositoryMutation(
    ({ id, patch }: { id: string; patch: Partial<FinanceApplication> }) =>
      repository.updateApplication(id, patch),
    [queryKeys.applications],
    "Application updated",
  )

export const useCreateUser = () =>
  useRepositoryMutation(
    (input: Omit<User, "id" | "createdAt">) => repository.createUser(input),
    [queryKeys.users],
    "Invitation sent",
  )

export const useUpdateUser = () =>
  useRepositoryMutation(
    ({ id, patch }: { id: string; patch: Partial<User> }) =>
      repository.updateUser(id, patch),
    [queryKeys.users],
    "User updated",
  )

export const useDeleteUser = () =>
  useRepositoryMutation(
    (id: string) => repository.deleteUser(id),
    [queryKeys.users],
    "User removed",
  )

export const useCreateContact = () =>
  useRepositoryMutation(
    (input: Omit<Contact, "id" | "createdAt">) => repository.createContact(input),
    [queryKeys.contacts],
    "Contact created",
  )

export const useUpdateContact = () =>
  useRepositoryMutation(
    ({ id, patch }: { id: string; patch: Partial<Contact> }) =>
      repository.updateContact(id, patch),
    [queryKeys.contacts],
    "Contact updated",
  )

export const useCreateCompany = () =>
  useRepositoryMutation(
    (input: Omit<Company, "id" | "createdAt">) => repository.createCompany(input),
    [queryKeys.companies],
    "Company created",
  )

export const useCreateActivity = () =>
  useRepositoryMutation(
    (input: Omit<Activity, "id" | "createdAt">) => repository.createActivity(input),
    [queryKeys.activities],
    "Activity logged",
  )
