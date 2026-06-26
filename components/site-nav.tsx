"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"

const links = [
  { href: "/", label: "Benchmark" },
  { href: "/tasks", label: "Try Tasks" },
]

export function SiteNav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/browserbase-logo.jpeg"
            alt="Browserbase logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="font-mono text-sm font-semibold tracking-tight">
            browserbase<span className="text-primary">/bench</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href)
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            )
          })}
          <a
            href="https://browserbase.com"
            target="_blank"
            rel="noreferrer"
            className="ml-2 hidden rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 sm:inline-block"
          >
            Get Browserbase
          </a>
        </nav>
      </div>
    </header>
  )
}
