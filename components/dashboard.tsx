"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpRight, Clock, Target, Zap, Trophy, Activity } from "lucide-react"
import {
  TASKS,
  MODELS,
  PROVIDERS,
  GROUPS,
  type ModelLabel,
  type ProviderId,
  statsFor,
  groupStatsFor,
  providerHasModel,
} from "@/lib/data"

const PROVIDER_META: Record<ProviderId, { name: string; varColor: string }> = {
  browserbase: { name: "Browserbase", varColor: "var(--bb)" },
  "browser-use": { name: "Browser Use", varColor: "var(--bu)" },
  browserless: { name: "Browserless", varColor: "var(--bl)" },
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`
}

export function Dashboard() {
  const [model, setModel] = useState<ModelLabel>("openai/gpt-5.4-mini")
  const [opponent, setOpponent] = useState<ProviderId>("browser-use")

  const bbStats = useMemo(() => statsFor("browserbase", model), [model])
  const oppHasModel = providerHasModel(opponent, model)
  const bbGroups = useMemo(() => groupStatsFor("browserbase", model), [model])

  return (
    <main className="mx-auto max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
      <Hero />

      {/* Controls */}
      <section className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Model</span>
          <div className="flex rounded-lg border border-border bg-background p-1">
            {MODELS.map((m) => (
              <button
                key={m}
                onClick={() => setModel(m)}
                className={`rounded-md px-3 py-1.5 font-mono text-xs font-medium transition-colors ${
                  model === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <p className="font-mono text-xs text-muted-foreground">
          21 tasks · 3 task families · deterministic graders · no LLM judge
        </p>
      </section>

      {/* Provider summary cards */}
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {PROVIDERS.map((p) => {
          const s = statsFor(p.id, model)
          const has = providerHasModel(p.id, model)
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
                  Not run for this model. Browserless requires an OpenAI model string.
                </div>
              )}
            </div>
          )
        })}
      </section>

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
          <HeadToHead model={model} opponent={opponent} />
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-border bg-card/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {PROVIDER_META[opponent].name} was not run on the{" "}
              <span className="font-mono text-foreground">{model}</span> model. Switch the model to{" "}
              <button
                onClick={() => setModel("openai/gpt-5.4-mini")}
                className="font-mono text-primary underline underline-offset-2"
              >
                openai/gpt-5.4-mini
              </button>{" "}
              to see this comparison.
            </p>
          </div>
        )}
      </section>

      {/* Full matrix */}
      <TaskMatrix model={model} />
    </main>
  )
}

function Hero() {
  const miniBB = statsFor("browserbase", "openai/gpt-5.4-mini")
  return (
    <section className="border-b border-border py-14 sm:py-20">
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        <Activity className="h-3.5 w-3.5 text-primary" />
        Deterministic browser-agent benchmark
      </div>
      <h1 className="mt-6 max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
        How <span className="bb-mark">Browserbase</span> agents perform under real pressure.
      </h1>
      <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
        A code-graded suite of 21 browser tasks run across providers and models. No self-reported success, no LLM
        judge — every pass is verified by a deterministic grader.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <HeroStat icon={Target} label="Tasks graded" value="21" />
        <HeroStat icon={Trophy} label="Neuron Arcade" value="100%" sub="Browserbase pass rate" />
        <HeroStat icon={Zap} label="Fastest family" value="56s" sub="avg arcade solve" />
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
}: {
  icon: typeof Target
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-primary" />
      <div className="mt-3 font-mono text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{sub ?? label}</div>
    </div>
  )
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
        On precision-grounding and DOM-traversal cabinets, Browserbase completes cleanly and fast — pass rate by task
        family for <span className="font-mono text-foreground">{model}</span>.
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
              <div
                className="h-full animate-grow rounded-full bg-primary"
                style={{ width: pct(g.rate) }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{GROUPS[g.group].description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HeadToHead({ model, opponent }: { model: ModelLabel; opponent: ProviderId }) {
  const bb = statsFor("browserbase", model)
  const opp = statsFor(opponent, model)
  const oppMeta = PROVIDER_META[opponent]

  const rows = TASKS.map((t) => {
    const a = t.results[model]?.browserbase
    const b = t.results[model]?.[opponent]
    return { task: t, a, b }
  }).filter((row) => row.a && row.b && row.a.status !== "na" && row.b.status !== "na")

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

function TaskMatrix({ model }: { model: ModelLabel }) {
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
            {TASKS.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{GROUPS[t.group].label}</td>
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
        Methodology: Browserbase and Browser Use rows reflect the latest deterministic comparison reports. Browserless
        rows cover the OpenAI overlap models; combinations not run are shown as n/a. Pass = grader-verified success.
      </p>
    </section>
  )
}
