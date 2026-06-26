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
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/browserbase-logo.jpeg"
            alt="Browserbase logo"
            width={28}
            height={28}
            className="rounded-[6px]"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            Browserbase <span className="text-muted-foreground font-normal">Bench</span>
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
            className="ml-2 hidden rounded-md bg-foreground px-3.5 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:inline-flex sm:items-center sm:gap-1"
          >
            Get a demo
            <span aria-hidden>{"›"}</span>
          </a>
        </nav>
      </div>
    </header>
  )
}
