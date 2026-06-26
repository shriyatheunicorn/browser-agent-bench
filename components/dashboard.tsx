"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Clock, Target, Cpu, Trophy, Activity } from "lucide-react"
import {
  PROVIDERS,
  GROUPS,
  type BenchTask,
  type ModelLabel,
  type ProviderId,
  statsFor,
  groupStatsFor,
  providerHasModel,
} from "@/lib/types"

const PROVIDER_META: Record<ProviderId, { name: string; varColor: string }> = {
  browserbase: { name: "Browserbase", varColor: "var(--bb)" },
  "browser-use": { name: "Browser Use", varColor: "var(--bu)" },
  browserless: { name: "Browserless", varColor: "var(--bl)" },
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

function formatGenerated(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  // Pin to UTC so the server-rendered string always matches the client and
  // never depends on the runtime's local timezone (avoids hydration mismatch).
  return (
    d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  )
}

export interface DashboardProps {
  tasks: BenchTask[]
  models: string[]
  generatedAt: string | null
  sourceFile?: string | null
}

export function Dashboard({ tasks, models, generatedAt, sourceFile }: DashboardProps) {
  const sourceLabel = sourceFile?.includes("results") ? "/results" : "/reports"
  const defaultModel = models.includes("openai/gpt-5.4-mini") ? "openai/gpt-5.4-mini" : models[0]
  const [model, setModel] = useState<ModelLabel>(defaultModel)
  const [opponent, setOpponent] = useState<ProviderId>("browser-use")

  const bbStats = useMemo(() => statsFor(tasks, "browserbase", model), [tasks, model])
  const oppHasModel = providerHasModel(tasks, opponent, model)
  const bbGroups = useMemo(() => groupStatsFor(tasks, "browserbase", model), [tasks, model])

  const generatedLabel = formatGenerated(generatedAt)

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
        <Hero
          tasks={tasks}
          models={models}
          primaryModel={defaultModel}
          generatedLabel={generatedLabel}
          sourceLabel={sourceLabel}
        />

      {/* Controls */}
      <section className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Model</span>
          <div className="flex flex-wrap rounded-lg border border-border bg-background p-1">
            {models.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                  model === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {shortModel(m)}
              </button>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          {tasks.length} tasks · 3 task families · deterministic grading
        </p>
      </section>

      {/* Provider summary cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {PROVIDERS.map((p) => {
          const s = statsFor(tasks, p.id, model)
          const has = providerHasModel(tasks, p.id, model)
          const isBB = p.id === "browserbase"
          return (
            <div
              key={p.id}
              className={`relative overflow-hidden rounded-xl border bg-card p-5 ${
                isBB ? "border-primary/60 ring-1 ring-primary/30" : "border-border"
              }`}
            >
              {isBB && (
                <span className="absolute right-4 top-4 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Spotlight
                </span>
              )}
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                <h3 className="font-semibold">{p.name}</h3>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.blurb}</p>
              {has ? (
                <>
                  <div className="mt-5 flex items-end gap-2">
                    <span className="font-mono text-4xl font-bold tabular-nums" style={{ color: p.color }}>
                      {pct(s.rate)}
                    </span>
                    <span className="mb-1.5 text-sm text-muted-foreground">
                      {s.passed}/{s.total} passed
                    </span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full animate-grow rounded-full"
                      style={{ width: pct(s.rate), backgroundColor: p.color }}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    avg {s.avgTimeSec.toFixed(1)}s / task
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  No results for this model yet. Commit a report that includes {p.name} on{" "}
                  <span className="font-mono">{model}</span>.
                </div>
              )}
            </div>
          )
        })}
      </section>

      {/* Per-model leaderboard */}
      <ModelLeaderboard tasks={tasks} models={models} activeModel={model} onPickModel={setModel} />

      {/* Browserbase strengths */}
      <BrowserbaseStrengths model={model} groups={bbGroups} stats={bbStats} />

      {/* Head to head */}
      <section className="mt-12">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Head-to-head</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browserbase versus the field on the exact same tasks and model.
            </p>
          </div>
          <div className="flex rounded-lg border border-border bg-background p-1">
            {(["browser-use", "browserless"] as ProviderId[]).map((p) => (
              <button
                key={p}
                onClick={() => setOpponent(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  opponent === p ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                vs {PROVIDER_META[p].name}
              </button>
            ))}
          </div>
        </div>

        {oppHasModel ? (
          <HeadToHead tasks={tasks} model={model} opponent={opponent} />
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No {PROVIDER_META[opponent].name} results found for the{" "}
              <span className="font-mono text-foreground">{model}</span> model. Add a comparison report that includes{" "}
              {PROVIDER_META[opponent].name}, or switch models above.
            </p>
          </div>
        )}
      </section>

      {/* Full matrix */}
      <TaskMatrix tasks={tasks} model={model} />
    </main>
  )
}

function shortModel(m: string) {
  return m.includes("/") ? m.split("/").slice(1).join("/") : m
}

function ModelLeaderboard({
  tasks,
  models,
  activeModel,
  onPickModel,
}: {
  tasks: BenchTask[]
  models: string[]
  activeModel: ModelLabel
  onPickModel: (m: ModelLabel) => void
}) {
  // Build a row per (model, provider) that actually has data, then rank by
  // pass rate (ties broken by faster average time).
  const rows = useMemo(() => {
    const out: {
      model: string
      provider: ProviderId
      passed: number
      total: number
      rate: number
      avgTimeSec: number
    }[] = []
    for (const m of models) {
      for (const p of PROVIDERS) {
        if (!providerHasModel(tasks, p.id, m)) continue
        const s = statsFor(tasks, p.id, m)
        out.push({ model: m, provider: p.id, ...s })
      }
    }
    return out.sort((a, b) => b.rate - a.rate || a.avgTimeSec - b.avgTimeSec)
  }, [tasks, models])

  if (rows.length === 0) return null

  const topRate = rows[0].rate

  return (
    <section className="mt-12">
      <div className="flex flex-col gap-1">
        <span className="mono-label">Per-model results</span>
        <h2 className="text-2xl font-semibold tracking-tight">Model leaderboard</h2>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Every provider and model combination ranked by deterministic pass rate across all {tasks.length} tasks. Click a
          row to load that model into the views below.
        </p>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-border bg-card">
        <div className="hidden grid-cols-[2.5rem_1fr_1fr_8rem_5rem_5rem] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground sm:grid">
          <span>#</span>
          <span>Provider</span>
          <span>Model</span>
          <span>Pass rate</span>
          <span className="text-right">Solved</span>
          <span className="text-right">Avg</span>
        </div>
        <ul>
          {rows.map((r, i) => {
            const meta = PROVIDER_META[r.provider]
            const isBB = r.provider === "browserbase"
            const isActive = r.model === activeModel
            const isLeader = r.rate === topRate
            return (
              <li key={`${r.model}-${r.provider}`}>
                <button
                  onClick={() => onPickModel(r.model)}
                  className={`grid w-full grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-3 text-left transition-colors sm:grid-cols-[2.5rem_1fr_1fr_8rem_5rem_5rem] ${
                    isActive ? "bg-primary/[0.04]" : "hover:bg-muted/40"
                  } ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <span className="hidden font-mono text-sm tabular-nums text-muted-foreground sm:block">
                    {i + 1}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.varColor }} />
                    <span className={`text-sm font-medium ${isBB ? "text-primary" : "text-foreground"}`}>
                      {meta.name}
                    </span>
                    {isLeader && (
                      <Trophy className="h-3.5 w-3.5 text-primary" aria-label="Top pass rate" />
                    )}
                  </span>
                  <span className="truncate font-mono text-xs text-muted-foreground">{shortModel(r.model)}</span>
                  <span className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <span
                        className="block h-full rounded-full"
                        style={{ width: pct(r.rate), backgroundColor: meta.varColor }}
                      />
                    </span>
                    <span className="w-9 text-right font-mono text-sm font-semibold tabular-nums">{pct(r.rate)}</span>
                  </span>
                  <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {r.passed}/{r.total}
                  </span>
                  <span className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                    {r.avgTimeSec > 0 ? `${r.avgTimeSec.toFixed(1)}s` : "—"}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

function Hero({
  tasks,
  models,
  primaryModel,
  generatedLabel,
  sourceLabel,
}: {
  tasks: BenchTask[]
  models: string[]
  primaryModel: ModelLabel
  generatedLabel: string | null
  sourceLabel: string
}) {
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Verifiable browser agent benchmark
      </div>
      <h1 className="mt-6 max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        How <span className="bb-mark">Browserbase</span> agents perform under real pressure.
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        A code-graded suite of {tasks.length} browser tasks run across providers and models. Short and long horizon
        tasks, our task suites are broken down into binary assessments to ensure verifiability. There is no LLM judge,
        every pass is verified by a deterministic grader.
      </p>
      {generatedLabel && (
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-pass" /> Latest run parsed from{" "}
          <span className="text-foreground">{sourceLabel}</span> · {generatedLabel}
        </p>
      )}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <HeroStat icon={Target} label="Tasks graded" value={String(tasks.length)} href="/tasks" sub="Try the tasks" />
        <HeroStat icon={Cpu} label="Models" value={String(models.length)} sub="evaluated" />
        <HeroStat icon={Activity} label="Providers" value="3" sub="head-to-head" />
      </div>
    </section>
  )
}

function HeroStat({
  icon: Icon,
  label,
  value,
  sub,
  href,
}: {
  icon: typeof Target
  label: string
  value: string
  sub?: string
  href?: string
}) {
  const inner = (
    <>
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-3 font-mono text-2xl font-bold tabular-nums">{value}</div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {sub ?? label}
        {href && <ArrowUpRight className="h-3 w-3" />}
      </div>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="group rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary hover:bg-muted/40"
      >
        {inner}
      </Link>
    )
  }

  return <div className="rounded-xl border border-border bg-card p-4">{inner}</div>
}

function BrowserbaseStrengths({
  model,
  groups,
  stats,
}: {
  model: ModelLabel
  groups: ReturnType<typeof groupStatsFor>
  stats: ReturnType<typeof statsFor>
}) {
  return (
    <section className="mt-12 rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent p-6 sm:p-8">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-semibold tracking-tight">Where Browserbase shines</h2>
      </div>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Pass rate by task family for <span className="font-mono text-foreground">{model}</span> — overall{" "}
        <span className="font-mono text-foreground">
          {stats.passed}/{stats.total}
        </span>{" "}
        graded passes.
      </p>
      <div className="mt-6 space-y-4">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{GROUPS[g.group].label}</span>
              <span className="font-mono text-muted-foreground tabular-nums">
                {g.passed}/{g.total} · {pct(g.rate)}
              </span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full animate-grow rounded-full bg-primary" style={{ width: pct(g.rate) }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{GROUPS[g.group].description}</p>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-muted-foreground">No Browserbase results for this model yet.</p>
        )}
      </div>
    </section>
  )
}

function HeadToHead({ tasks, model, opponent }: { tasks: BenchTask[]; model: ModelLabel; opponent: ProviderId }) {
  const bb = statsFor(tasks, "browserbase", model)
  const opp = statsFor(tasks, opponent, model)
  const oppMeta = PROVIDER_META[opponent]

  const rows = tasks
    .map((t) => {
      const a = t.results[model]?.browserbase
      const b = t.results[model]?.[opponent]
      return { task: t, a, b }
    })
    .filter((row) => row.a && row.b && row.a.status !== "na" && row.b.status !== "na")

  let bbWins = 0
  let oppWins = 0
  let ties = 0
  for (const row of rows) {
    const aPass = row.a!.status === "pass"
    const bPass = row.b!.status === "pass"
    if (aPass && !bPass) bbWins++
    else if (!aPass && bPass) oppWins++
    else ties++
  }

  return (
    <div className="mt-5 space-y-6">
      {/* Score summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ScoreCard label="Browserbase win" value={bbWins} accent="var(--bb)" sub="tasks won outright" />
        <ScoreCard label="Tied" value={ties} accent="var(--muted-foreground)" sub="both pass or both fail" />
        <ScoreCard label={`${oppMeta.name} win`} value={oppWins} accent={oppMeta.varColor} sub="tasks won outright" />
      </div>

      {/* Dual rate bars */}
      <div className="rounded-xl border border-border bg-card p-5">
        <DualBar label="Browserbase" rate={bb.rate} count={`${bb.passed}/${bb.total}`} color="var(--bb)" />
        <div className="mt-4">
          <DualBar label={oppMeta.name} rate={opp.rate} count={`${opp.passed}/${opp.total}`} color={oppMeta.varColor} />
        </div>
        <div className="mt-5 flex flex-wrap gap-6 border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            Avg time — <span className="font-mono text-foreground">Browserbase {bb.avgTimeSec.toFixed(1)}s</span>
          </span>
          <span>
            <span className="font-mono text-foreground">
              {oppMeta.name} {opp.avgTimeSec.toFixed(1)}s
            </span>
          </span>
        </div>
      </div>

      {/* Per-task duel */}
      <div className="overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground">
          <span>Task</span>
          <span className="w-24 text-center">Browserbase</span>
          <span className="w-24 text-center">{oppMeta.name}</span>
        </div>
        {rows.map(({ task, a, b }) => (
          <div
            key={task.id}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border px-4 py-2.5 last:border-0 hover:bg-muted/20"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{task.name}</div>
              <div className="truncate font-mono text-[11px] text-muted-foreground">{GROUPS[task.group].label}</div>
            </div>
            <div className="w-24 text-center">
              <ResultChip status={a!.status} time={a!.timeSec} />
            </div>
            <div className="w-24 text-center">
              <ResultChip status={b!.status} time={b!.timeSec} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreCard({ label, value, accent, sub }: { label: string; value: number; accent: string; sub: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-3xl font-bold tabular-nums" style={{ color: accent }}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  )
}

function DualBar({ label, rate, count, color }: { label: string; rate: number; count: string; color: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="font-mono text-muted-foreground tabular-nums">
          {count} · {pct(rate)}
        </span>
      </div>
      <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full animate-grow rounded-full" style={{ width: pct(rate), backgroundColor: color }} />
      </div>
    </div>
  )
}

function ResultChip({ status, time }: { status: string; time: number | null }) {
  if (status === "pass") {
    return (
      <span className="inline-flex flex-col items-center">
        <span className="rounded-md bg-pass/15 px-2 py-0.5 text-[11px] font-semibold text-pass">PASS</span>
        {time != null && <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{time.toFixed(0)}s</span>}
      </span>
    )
  }
  return (
    <span className="inline-flex flex-col items-center">
      <span className="rounded-md bg-fail/15 px-2 py-0.5 text-[11px] font-semibold text-fail">FAIL</span>
      {time != null && <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">{time.toFixed(0)}s</span>}
    </span>
  )
}

function TaskMatrix({ tasks, model }: { tasks: BenchTask[]; model: ModelLabel }) {
  const order: ProviderId[] = ["browserbase", "browser-use", "browserless"]
  return (
    <section className="mt-12">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Full task matrix</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every task, every provider, for <span className="font-mono text-foreground">{model}</span>.
          </p>
        </div>
        <Link href="/tasks" className="hidden items-center gap-1 text-sm font-medium text-primary hover:underline sm:flex">
          Try the tasks yourself <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Task</th>
              <th className="px-4 py-3 font-medium">Family</th>
              {order.map((p) => (
                <th key={p} className="px-4 py-3 text-center font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PROVIDER_META[p].varColor }} />
                    {PROVIDER_META[p].name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{GROUPS[t.group]?.label ?? t.group}</td>
                {order.map((p) => {
                  const res = t.results[model]?.[p]
                  return (
                    <td key={p} className="px-4 py-3 text-center">
                      {!res || res.status === "na" ? (
                        <span className="font-mono text-xs text-muted-foreground/50">n/a</span>
                      ) : (
                        <ResultChip status={res.status} time={res.timeSec} />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        Methodology: rows are parsed directly from committed run artifacts (<span>results/*/results.jsonl</span>, with{" "}
        <span>/reports</span> as fallback). The newest run wins per task/model/provider. Combinations with no row are
        shown as n/a. Pass = grader-verified success.
      </p>
    </section>
  )
}
