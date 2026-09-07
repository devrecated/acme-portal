import type { Metadata, Viewport } from "next"
import { Geist, Instrument_Serif } from "next/font/google"
import Script from "next/script"

import { Providers } from "@/components/providers"
import { ticketsEmbedSrc } from "@/lib/autodevelop"

import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: {
    default: "Acme Fleet",
    template: "%s · Acme Fleet",
  },
  description:
    "Acme Fleet — exotic sports car sales portal for inventory, leads, financing, and CRM.",
  icons: {
    icon: "/favicon.svg",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1917" },
  ],
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${instrumentSerif.variable}`}
      suppressHydrationWarning
    >
      <body>
        <Providers>{children}</Providers>
        {ticketsEmbedSrc() ? (
          <Script src={ticketsEmbedSrc()} strategy="afterInteractive" />
        ) : null}
      </body>
    </html>
  )
}
