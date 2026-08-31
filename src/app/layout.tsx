import type { Metadata } from "next"
import { Geist } from "next/font/google"

import { Providers } from "@/components/providers"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: "Acme Fleet",
    template: "%s · Acme Fleet",
  },
  description:
    "Acme Fleet — commercial vehicle sales portal for inventory, leads, financing, and CRM.",
  icons: {
    icon: "/favicon.svg",
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable} suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
