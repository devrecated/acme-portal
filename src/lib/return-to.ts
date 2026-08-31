/** Keep post-sign-in redirects on same-origin paths only. */
export function safeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/"
  return value
}
