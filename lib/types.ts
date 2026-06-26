// Shared types, constants, and pure helpers for the benchmark UI.
// No filesystem access here so this module is safe to import from client components.

export type ProviderId = "browserbase" | "browser-use" | "browserless"
export type Status = "pass" | "fail" | "na"

export interface Result {
  status: Status
  timeSec: number | null
  evidence: string
}

export type ProviderResults = Record<ProviderId, Result>

export interface BenchTask {
  id: string
  name: string
  group: string
  url: string
  prompt: string
  successCriteria: string
  results: Record<string, ProviderResults> // keyed by model label
}

export interface BenchData {
  tasks: BenchTask[]
  models: string[]
  generatedAt: string | null
  sourceFile: string | null
}

export const MODELS = [
  "openai/gpt-5.4-mini",
  "anthropic/claude-opus-4-6",
  "anthropic/claude-sonnet-4-6",
] as const
export type ModelLabel = string

export const PROVIDERS: { id: ProviderId; name: string; color: string; blurb: string }[] = [
  { id: "browserbase", name: "Browserbase", color: "var(--bb)", blurb: "Managed headless browser infrastructure" },
  { id: "browser-use", name: "Browser Use", color: "var(--bu)", blurb: "Open-source browser agent framework" },
  { id: "browserless", name: "Browserless", color: "var(--bl)", blurb: "Hosted MCP browser via OpenAI Responses" },
]

export const GROUPS: Record<string, { label: string; description: string }> = {
  "neuron-arcade": {
    label: "Neuron Arcade",
    description: "Precision grounding, sequencing, and DOM-traversal cabinets.",
  },
  custom: {
    label: "Custom Workflows",
    description: "Multi-step business tasks: forms, dashboards, reconciliation, security.",
  },
  "human-benchmark": {
    label: "Human Benchmark",
    description: "Classic reaction, memory, and typing tests built for humans.",
  },
}

export const NA: Result = { status: "na", timeSec: null, evidence: "" }

// ---------------- Derived helpers (operate on a tasks array) ----------------

export function providerHasModel(tasks: BenchTask[], provider: ProviderId, model: ModelLabel): boolean {
  return tasks.some((t) => t.results[model]?.[provider]?.status !== "na" && t.results[model]?.[provider] != null)
}

export interface ProviderStats {
  passed: number
  total: number
  rate: number
  avgTimeSec: number
}

export function statsFor(tasks: BenchTask[], provider: ProviderId, model: ModelLabel): ProviderStats {
  let passed = 0
  let total = 0
  let timeSum = 0
  let timeCount = 0
  for (const t of tasks) {
    const res = t.results[model]?.[provider]
    if (!res || res.status === "na") continue
    total += 1
    if (res.status === "pass") passed += 1
    if (res.timeSec != null) {
      timeSum += res.timeSec
      timeCount += 1
    }
  }
  return {
    passed,
    total,
    rate: total ? passed / total : 0,
    avgTimeSec: timeCount ? timeSum / timeCount : 0,
  }
}

export interface GroupStat {
  group: string
  label: string
  passed: number
  total: number
  rate: number
}

export function groupStatsFor(tasks: BenchTask[], provider: ProviderId, model: ModelLabel): GroupStat[] {
  const map = new Map<string, { passed: number; total: number }>()
  for (const t of tasks) {
    const res = t.results[model]?.[provider]
    if (!res || res.status === "na") continue
    const cur = map.get(t.group) ?? { passed: 0, total: 0 }
    cur.total += 1
    if (res.status === "pass") cur.passed += 1
    map.set(t.group, cur)
  }
  return Object.keys(GROUPS)
    .filter((g) => map.has(g))
    .map((g) => {
      const v = map.get(g)!
      return {
        group: g,
        label: GROUPS[g].label,
        passed: v.passed,
        total: v.total,
        rate: v.total ? v.passed / v.total : 0,
      }
    })
}
