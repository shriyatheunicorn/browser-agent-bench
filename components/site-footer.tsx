import Link from "next/link"

const cols: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Benchmark",
    links: [
      { label: "Results dashboard", href: "/" },
      { label: "Try the tasks", href: "/tasks" },
      { label: "Task families", href: "/tasks" },
    ],
  },
  {
    heading: "Providers",
    links: [
      { label: "Browserbase", href: "https://browserbase.com" },
      { label: "Browser Use", href: "https://browser-use.com" },
      { label: "Browserless", href: "https://browserless.io" },
    ],
  },
  {
    heading: "Method",
    links: [
      { label: "Deterministic graders", href: "/" },
      { label: "No LLM judge", href: "/" },
      { label: "21 graded tasks", href: "/" },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <p className="max-w-xs text-pretty text-sm leading-relaxed text-primary-foreground/90">
              An open browser-agent benchmark. Spin up a browser, connect your model, and measure real task completion.
            </p>
            <a
              href="https://browserbase.com"
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1 rounded-md bg-background px-4 py-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              Try Browserbase <span aria-hidden>{"›"}</span>
            </a>
          </div>
          {cols.map((col) => (
            <div key={col.heading}>
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-primary-foreground/70">
                {col.heading}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-primary-foreground/90 transition-opacity hover:opacity-70">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-end justify-between gap-4 border-t border-primary-foreground/20 pt-6">
          <span className="text-xs text-primary-foreground/70">
            Browserbase Bench — results reflect the latest deterministic comparison reports.
          </span>
          <span aria-hidden className="font-mono text-7xl font-black leading-none tracking-tighter sm:text-8xl">
            B
          </span>
        </div>
      </div>
    </footer>
  )
}
