const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})

const compactCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
})

const number = new Intl.NumberFormat("en-US")

const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

export const formatCurrency = (value: number) => currency.format(value)

export const formatCompactCurrency = (value: number) => compactCurrency.format(value)

export const formatNumber = (value: number) => number.format(value)

export const formatMiles = (value: number) => `${number.format(value)} mi`

export const formatDate = (value?: string) =>
  value ? shortDate.format(new Date(value)) : "—"

export const formatPercent = (value: number) => `${value.toFixed(2)}%`

/** "3 days ago" / "in 2 days", falling back to a date past a month out. */
export function formatRelative(value?: string): string {
  if (!value) return "—"
  const target = new Date(value).getTime()
  const diffDays = Math.round((target - Date.now()) / (24 * 60 * 60 * 1000))

  if (Math.abs(diffDays) > 30) return shortDate.format(new Date(value))
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  if (diffDays === -1) return "Yesterday"
  return diffDays > 0 ? `In ${diffDays} days` : `${Math.abs(diffDays)} days ago`
}

export const initials = (first: string, last: string) =>
  `${first.charAt(0)}${last.charAt(0)}`.toUpperCase()

/** Monthly payment for an amortising loan. Zero rate falls back to straight division. */
export function monthlyPayment(
  principal: number,
  annualRatePercent: number,
  termMonths: number,
): number {
  if (termMonths <= 0) return 0
  const monthlyRate = annualRatePercent / 100 / 12
  if (monthlyRate === 0) return principal / termMonths
  const factor = (1 + monthlyRate) ** termMonths
  return (principal * monthlyRate * factor) / (factor - 1)
}
