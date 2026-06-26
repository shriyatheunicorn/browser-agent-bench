import type { Metadata } from "next"
import localFont from "next/font/local"
import "./globals.css"
import { SiteNav } from "@/components/site-nav"
import { SiteFooter } from "@/components/site-footer"

// GT Planar — Browserbase display/heading typeface
const gtPlanar = localFont({
  src: [{ path: "../public/fonts/GT-Planar-Medium.woff2", weight: "500", style: "normal" }],
  variable: "--font-planar",
  display: "swap",
})

// Plain — Browserbase body/UI typeface
const plain = localFont({
  src: [
    { path: "../public/fonts/Plain-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Plain-Medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Plain-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-plain",
  display: "swap",
})

// GT Standard Mono — Browserbase monospace labels
const gtMono = localFont({
  src: [
    { path: "../public/fonts/GT-Standard-Mono-Regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/GT-Standard-Mono-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-gt-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Browserbase Bench — Agent Performance vs the Field",
  description:
    "A deterministic browser agent benchmark highlighting Browserbase performance across tasks and models, head-to-head against Browser Use and Browserless.",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="bg-background">
      <body className={`${gtPlanar.variable} ${plain.variable} ${gtMono.variable} font-sans antialiased`}>
        <SiteNav />
        {children}
        <SiteFooter />
      </body>
    </html>
  )
}
