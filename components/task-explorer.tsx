"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, Copy, Check, Search, ExternalLink, Play } from "lucide-react"
import { TASKS, GROUPS, MODELS, PROVIDERS, type BenchTask, type ProviderId } from "@/lib/data"

const PROVIDER_COLOR: Record<ProviderId, string> = {
  browserbase: "var(--bb)",
  "browser-use": "var(--bu)",
  browserless: "var(--bl)",
}

export function TaskExplorer() {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(TASKS[0].id)
  const [showFrame, setShowFrame] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return TASKS
    return TASKS.filter(
      (t) => t.name.toLowerCase().includes(q) || GROUPS[t.group].label.toLowerCase().includes(q),
    )
  }, [query])

  const grouped = useMemo(() => {
    const map = new Map<string, BenchTask[]>()
    for (const t of filtered) {
      const arr = map.get(t.group) ?? []
      arr.push(t)
      map.set(t.group, arr)
    }
    return map
  }, [filtered])

  const selected = TASKS.find((t) => t.id === selectedId)!

  function handleSelect(id: string) {
    setSelectedId(id)
    setShowFrame(false)
  }

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <header className="border-b border-border pb-8">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Try the <span className="bb-mark">benchmark tasks</span>
        </h1>
        <p className="mt-3 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
          These are the exact live environments the agents are graded on. Pick a task, read the prompt the agent
          receives, then run it yourself to feel what makes it hard.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks..."
              className="w-full rounded-lg border border-border bg-card py-2.5 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            />
          </div>

          <div className="mt-4 space-y-5">
            {Array.from(grouped.entries()).map(([group, tasks]) => (
              <div key={group}>
                <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {GROUPS[group].label}
                </h3>
                <div className="mt-2 space-y-1">
                  {tasks.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelect(t.id)}
                      className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        t.id === selectedId
                          ? "bg-primary/15 font-medium text-foreground ring-1 ring-primary/40"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-1 text-sm text-muted-foreground">No tasks match “{query}”.</p>
            )}
          </div>
        </aside>

        {/* Detail */}
        <section className="min-w-0">
          <TaskDetail task={selected} showFrame={showFrame} onRun={() => setShowFrame(true)} />
        </section>
      </div>
    </main>
  )
}

function TaskDetail({ task, showFrame, onRun }: { task: BenchTask; showFrame: boolean; onRun: () => void }) {
  const [copied, setCopied] = useState(false)

  function copyPrompt() {
    navigator.clipboard.writeText(task.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {GROUPS[task.group].label}
          </span>
          <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight">{task.name}</h2>

        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agent prompt</div>
            <p className="mt-2 text-sm leading-relaxed">{task.prompt}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Success criteria
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{task.successCriteria}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={onRun}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Play className="h-4 w-4" /> Run task here
          </button>
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            <ExternalLink className="h-4 w-4" /> Open in new tab
          </a>
          <button
            onClick={copyPrompt}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {copied ? <Check className="h-4 w-4 text-pass" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy prompt"}
          </button>
        </div>
      </div>

      {/* Live frame */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full bg-fail/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-primary/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-pass/70" />
            <span className="ml-2 truncate">{task.url.replace("https://", "")}</span>
          </div>
          <a
            href={task.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
        {showFrame ? (
          <iframe
            src={task.url}
            title={task.name}
            className="h-[600px] w-full bg-background"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : (
          <button
            onClick={onRun}
            className="flex h-[360px] w-full flex-col items-center justify-center gap-3 text-muted-foreground transition-colors hover:bg-muted/20"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Play className="h-6 w-6 text-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">Load the live task</span>
            <span className="max-w-xs text-center text-xs">
              Some hosts block embedding. If it stays blank, use “Open in new tab”.
            </span>
          </button>
        )}
      </div>

      {/* Results recap */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-sm font-semibold">Agent results on this task</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Provider</th>
                {MODELS.map((m) => (
                  <th key={m} className="py-2 pr-4 font-mono font-medium">
                    {m}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PROVIDERS.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_COLOR[p.id] }} />
                      {p.name}
                    </span>
                  </td>
                  {MODELS.map((m) => {
                    const res = task.results[m]?.[p.id]
                    return (
                      <td key={m} className="py-2.5 pr-4">
                        {!res || res.status === "na" ? (
                          <span className="font-mono text-xs text-muted-foreground/50">n/a</span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                                res.status === "pass" ? "bg-pass/15 text-pass" : "bg-fail/15 text-fail"
                              }`}
                            >
                              {res.status.toUpperCase()}
                            </span>
                            {res.evidence && (
                              <span className="max-w-[160px] truncate font-mono text-[11px] text-muted-foreground">
                                {res.evidence}
                              </span>
                            )}
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
