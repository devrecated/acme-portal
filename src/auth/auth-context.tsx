"use client"

import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { seedUsers } from "@/data/seed"
import type { User, UserRole } from "@/types"

const STORAGE_KEY = "acme-portal:session:v1"

/**
 * Which roles may reach each protected area. Routes declare the permission
 * they need and `RequirePermission` resolves it against the signed-in role.
 */
export const PERMISSIONS = {
  "dashboard.view": ["admin", "sales_manager", "sales_rep", "finance", "viewer"],
  "inventory.view": ["admin", "sales_manager", "sales_rep", "finance", "viewer"],
  "inventory.edit": ["admin", "sales_manager", "sales_rep"],
  "financing.view": ["admin", "sales_manager", "finance"],
  "financing.edit": ["admin", "finance"],
  "leads.view": ["admin", "sales_manager", "sales_rep", "viewer"],
  "leads.edit": ["admin", "sales_manager", "sales_rep"],
  "crm.view": ["admin", "sales_manager", "sales_rep", "viewer"],
  "crm.edit": ["admin", "sales_manager", "sales_rep"],
  "users.view": ["admin", "sales_manager"],
  "users.edit": ["admin"],
  /** Cost and margin columns are withheld from reps and viewers. */
  "inventory.viewCost": ["admin", "sales_manager", "finance"],
} satisfies Record<string, readonly UserRole[]>

export type Permission = keyof typeof PERMISSIONS

interface AuthContextValue {
  user: User | null
  /** False until localStorage has been read, so SSR and the first paint match. */
  ready: boolean
  signIn: (userId: string) => void
  signOut: () => void
  /** Demo affordance: view the portal as any seeded teammate. */
  switchUser: (userId: string) => void
  can: (permission: Permission) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const readStoredUserId = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const writeStoredUserId = (id: string | null) => {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Private browsing or disabled storage. Session stays in memory.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setUserId(readStoredUserId())
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    writeStoredUserId(userId)
  }, [ready, userId])

  const user = useMemo(
    () => seedUsers.find((candidate) => candidate.id === userId) ?? null,
    [userId],
  )

  const signIn = useCallback((id: string) => setUserId(id), [])
  const signOut = useCallback(() => setUserId(null), [])

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false
      return (PERMISSIONS[permission] as readonly UserRole[]).includes(user.role)
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ user, ready, signIn, signOut, switchUser: signIn, can }),
    [user, ready, signIn, signOut, can],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth() {
  const context = use(AuthContext)
  if (!context) throw new Error("useAuth must be used inside AuthProvider")
  return context
}
