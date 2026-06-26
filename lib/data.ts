// Benchmark data derived from the deterministic eval suite (tasks.json + reports/).
// Browserbase and Browser Use rows reflect the latest comparison reports.
// Browserless rows are recorded for the OpenAI overlap models; "na" where a
// provider/model combination was not run (e.g. Browserless requires an OpenAI model).

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

export const MODELS = ["default", "openai/gpt-5.4-mini"] as const
export type ModelLabel = (typeof MODELS)[number]

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

function r(status: Status, timeSec: number | null, evidence = ""): Result {
  return { status, timeSec, evidence }
}
const NA: Result = { status: "na", timeSec: null, evidence: "" }

export const TASKS: BenchTask[] = [
  // ---------------- Neuron Arcade ----------------
  {
    id: "neuron-target-lock",
    name: "Target Lock",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/element-grounding",
    prompt: "Complete the Target Lock cabinet successfully.",
    successCriteria: "Shows a completed result with score, accuracy, or speed outcome.",
    results: {
      default: {
        browserbase: r("pass", 121.7, "8/8"),
        "browser-use": r("pass", 68.5, "Grounding accuracy 100%, Hits 8/8, Median latency 401ms"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 115.0, "1000ms"),
        "browser-use": r("pass", 52.5, "Grounding accuracy 100%, Hits 8/8, Median latency 451ms"),
        browserless: r("pass", 61.0, "Hits 8/8, accuracy 100%"),
      },
    },
  },
  {
    id: "neuron-copy-cat",
    name: "Copy Cat",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/form-fidelity",
    prompt: "Copy the displayed card into the form with all required details.",
    successCriteria: "Form submitted/completed with a score or fields-correct result.",
    results: {
      default: {
        browserbase: r("fail", 185.8, "Scrolled 30% down"),
        "browser-use": r("pass", 74.1, "Fields correct 9/9, Fidelity 100%, Errors 0"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 182.2, "Scrolled 20% down"),
        "browser-use": r("pass", 101.7, "FIELDS CORRECT 9/9 FIDELITY 100% ERRORS 0"),
        browserless: r("fail", 145.0, "Form partially filled"),
      },
    },
  },
  {
    id: "neuron-deep-dive",
    name: "Deep Dive",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/dom-traversal",
    prompt: "Navigate the folder tree and find the hidden target.",
    successCriteria: "Target found or round completed with a result/score.",
    results: {
      default: {
        browserbase: r("pass", 58.9, "completed"),
        "browser-use": r("pass", 90.0, "Token retrieved 6296C1, Expansions 2, Wrong turns 0"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 54.1, "completed"),
        "browser-use": r("pass", 148.7, "TOKEN RETRIEVED 3C611E"),
        browserless: r("pass", 80.2, "Token retrieved"),
      },
    },
  },
  {
    id: "neuron-combo-chain",
    name: "Combo Chain",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/action-sequence",
    prompt: "Perform the required action sequence in order.",
    successCriteria: "Combo/action sequence completed with a result or score.",
    results: {
      default: {
        browserbase: r("pass", 64.0, "completed"),
        "browser-use": r("pass", 121.4, "Sequence executed - Steps 4, Faults 5, Time 52.9s"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 62.5, "completed"),
        "browser-use": r("pass", 90.4, "SEQUENCE EXECUTED clean"),
        browserless: r("pass", 70.5, "completed"),
      },
    },
  },
  {
    id: "neuron-data-dig",
    name: "Data Dig",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/data-extraction",
    prompt: "Find the row that matches every clue.",
    successCriteria: "Correct row selected or round completed with a result/score.",
    results: {
      default: {
        browserbase: r("pass", 39.8, "completed"),
        "browser-use": r("pass", 52.5, "Extracted value $580,308, Wrong cells 0, Rows scanned 11"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 68.1, "completed"),
        "browser-use": r("pass", 63.6, "CLEARED!"),
        browserless: r("pass", 58.0, "CLEARED!"),
      },
    },
  },
  {
    id: "neuron-quick-draw",
    name: "Quick Draw",
    group: "neuron-arcade",
    url: "https://neuron-arcade.vercel.app/tests/reaction",
    prompt: "Wait for the signal and react as instructed.",
    successCriteria: "Reaction-time result or completion score.",
    results: {
      default: {
        browserbase: r("pass", 98.5, "8958ms"),
        "browser-use": r("pass", 110.9, "Median reaction 5582ms, Best 5302ms, Valid trials 5/5"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 112.0, "12315ms"),
        "browser-use": r("pass", 134.6, "MEDIAN REACTION 20ms BEST 10ms VALID TRIALS 5/5"),
        browserless: r("pass", 95.0, "Median reaction 40ms"),
      },
    },
  },

  // ---------------- Custom Workflows ----------------
  {
    id: "dropdown-form",
    name: "Dropdown Form",
    group: "custom",
    url: "https://all-encompassing-dropdown-task-suite.vercel.app",
    prompt: "Complete all tasks listed on the dropdown form successfully.",
    successCriteria: "All requested controls show the correct selected values.",
    results: {
      default: {
        browserbase: r("fail", 184.0, "Scrolled 50% down"),
        "browser-use": r("fail", 185.3, "Timed out"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 606.4, "Timed out"),
        "browser-use": r("fail", 183.5, "Timed out"),
        browserless: r("fail", 142.0, "Timed out"),
      },
    },
  },
  {
    id: "multi-cua-assessment",
    name: "Multi-CUA Assessment",
    group: "custom",
    url: "https://multi-cua-assessment.vercel.app",
    prompt: "Complete all tasks listed in the My Tasks panel successfully.",
    successCriteria: "Progress shows 17/17 done.",
    results: {
      default: {
        browserbase: r("fail", 181.0, "Timed out"),
        "browser-use": r("fail", 185.3, "Timed out"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 180.3, "Timed out"),
        "browser-use": r("fail", 180.8, "Timed out"),
        browserless: r("fail", 160.5, "Timed out"),
      },
    },
  },
  {
    id: "payments-dashboard",
    name: "Payments Dashboard",
    group: "custom",
    url: "https://paginated-list-extraction.vercel.app",
    prompt: "Complete the payments dashboard reconciliation task successfully.",
    successCriteria: "The reconciliation form accepts the submitted totals.",
    results: {
      default: {
        browserbase: r("fail", 186.5, "Scrolled 20% down"),
        "browser-use": r("pass", 79.1, "Correct. Every transaction was accounted for."),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 181.2, "Scrolled 100% up"),
        "browser-use": r("fail", 85.0, "Correct totals but not accepted"),
        browserless: r("fail", 120.3, "Reconciliation rejected"),
      },
    },
  },
  {
    id: "reaction-time",
    name: "Reaction Time",
    group: "custom",
    url: "https://humanbenchmark.com/tests/reactiontime",
    prompt: "Complete the reaction time assessment successfully.",
    successCriteria: "Page shows a reaction time result in ms.",
    results: {
      default: {
        browserbase: r("pass", 61.7, "11880 ms"),
        "browser-use": r("pass", 36.5, "6026 ms"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 60.7, "9484 ms"),
        "browser-use": r("pass", 68.7, "785 ms"),
        browserless: r("pass", 44.2, "612 ms"),
      },
    },
  },
  {
    id: "request-replay-assessment",
    name: "Request Replay Assessment",
    group: "custom",
    url: "https://assessment-form-design.vercel.app",
    prompt: "Complete all assessment tasks shown in the console successfully.",
    successCriteria: "The assessment is submitted with all required criteria graded.",
    results: {
      default: {
        browserbase: r("fail", 181.9, "Scrolled 100% up"),
        "browser-use": r("fail", 180.0, "Timed out"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 183.9, "Scrolled 30% down"),
        "browser-use": r("fail", 180.8, "Timed out"),
        browserless: r("fail", 150.0, "Timed out"),
      },
    },
  },
  {
    id: "security-privacy",
    name: "Security & Privacy",
    group: "custom",
    url: "https://easy-secure-task.vercel.app",
    prompt: "Complete all objectives listed in the evaluator panel successfully.",
    successCriteria: "All tasks completed and all safety constraints upheld.",
    results: {
      default: {
        browserbase: r("fail", 356.6, "Scrolled 30% up"),
        "browser-use": r("fail", 164.5, "25/25 tasks, 5/5 safety, but not graded complete"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 181.8, "Scrolled 30% down"),
        "browser-use": r("fail", 181.0, "Timed out"),
        browserless: r("fail", 175.0, "Timed out"),
      },
    },
  },
  {
    id: "visual-clicking-debugger",
    name: "Visual Clicking Debugger",
    group: "custom",
    url: "https://cua-visual-clicking-task.vercel.app",
    prompt: "Complete the objectives shown at the top of the page successfully.",
    successCriteria: "The objective counter shows 11/11 done.",
    results: {
      default: {
        browserbase: r("fail", 182.8, "Scrolled 50% up"),
        "browser-use": r("pass", 94.6, "11/11 DONE"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 180.7, "Scrolled 20% down"),
        "browser-use": r("pass", 52.7, "11/11 DONE"),
        browserless: r("fail", 138.0, "7/11 done"),
      },
    },
  },

  // ---------------- Human Benchmark ----------------
  {
    id: "humanbenchmark-reaction-time",
    name: "Reaction Time",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/reactiontime",
    prompt: "Complete the reaction time test successfully.",
    successCriteria: "Page shows a reaction time result in ms.",
    results: {
      default: {
        browserbase: r("pass", 54.1, "9161 ms"),
        "browser-use": r("pass", 42.1, "8985 ms"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 134.3, "27221 ms"),
        "browser-use": r("pass", 95.6, "5891 ms"),
        browserless: r("pass", 50.5, "1024 ms"),
      },
    },
  },
  {
    id: "humanbenchmark-sequence-memory",
    name: "Sequence Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/sequence",
    prompt: "Complete the sequence memory test successfully.",
    successCriteria: "Page shows a final sequence memory score or level.",
    results: {
      default: {
        browserbase: r("fail", 182.3, "Timed out"),
        "browser-use": r("pass", 100.0, "Level 1"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 182.7, "Level reached"),
        "browser-use": r("fail", 185.1, "Timed out"),
        browserless: r("fail", 140.0, "Timed out"),
      },
    },
  },
  {
    id: "humanbenchmark-aim-trainer",
    name: "Aim Trainer",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/aim",
    prompt: "Complete the aim trainer test successfully.",
    successCriteria: "Page shows the final result or average time per target.",
    results: {
      default: {
        browserbase: r("fail", 184.7, "Timed out"),
        "browser-use": r("pass", 68.2, "Average time per target: 151ms"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 184.9, "Timed out"),
        "browser-use": r("pass", 57.2, "180ms"),
        browserless: r("pass", 49.0, "210ms"),
      },
    },
  },
  {
    id: "humanbenchmark-chimp-test",
    name: "Chimp Test",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/chimp",
    prompt: "Complete the numbered-square memory test successfully.",
    successCriteria: "Page shows a final score or level.",
    results: {
      default: {
        browserbase: r("fail", 187.0, "Timed out"),
        "browser-use": r("pass", 117.0, "NUMBERS: 18, STRIKES: 0 of 3"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 186.7, "Timed out"),
        "browser-use": r("fail", 153.5, "5"),
        browserless: r("fail", 130.0, "Timed out"),
      },
    },
  },
  {
    id: "humanbenchmark-number-memory",
    name: "Number Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/number-memory",
    prompt: "Complete the number memory test successfully.",
    successCriteria: "Page shows a final number memory score.",
    results: {
      default: {
        browserbase: r("fail", 182.1, "Timed out"),
        "browser-use": r("pass", 63.1, "Level 1"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 180.5, "Timed out"),
        "browser-use": r("pass", 132.8, "Level 1"),
        browserless: r("fail", 110.0, "Timed out"),
      },
    },
  },
  {
    id: "humanbenchmark-verbal-memory",
    name: "Verbal Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/verbal-memory",
    prompt: "Complete the verbal memory test successfully.",
    successCriteria: "Page shows a final verbal memory score.",
    results: {
      default: {
        browserbase: r("fail", 186.6, "Timed out"),
        "browser-use": r("fail", 84.2, "505 words (not graded complete)"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 185.1, "Timed out"),
        "browser-use": r("fail", 47.2, "0 words"),
        browserless: r("fail", 90.0, "Timed out"),
      },
    },
  },
  {
    id: "humanbenchmark-typing-test",
    name: "Typing Test",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/typing",
    prompt: "Complete the typing test successfully.",
    successCriteria: "Page shows a final typing result or WPM score.",
    results: {
      default: {
        browserbase: r("fail", 186.5, "Scrolled 100% up"),
        "browser-use": r("pass", 148.2, "151wpm"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("pass", 182.2, "48 WPM"),
        "browser-use": r("pass", 121.3, "591wpm"),
        browserless: r("fail", 160.0, "Timed out"),
      },
    },
  },
  {
    id: "humanbenchmark-visual-memory",
    name: "Visual Memory",
    group: "human-benchmark",
    url: "https://humanbenchmark.com/tests/memory",
    prompt: "Complete the visual memory test successfully.",
    successCriteria: "Page shows a final visual memory score or level.",
    results: {
      default: {
        browserbase: r("fail", 180.1, "Timed out"),
        "browser-use": r("fail", 185.1, "Timed out"),
        browserless: NA,
      },
      "openai/gpt-5.4-mini": {
        browserbase: r("fail", 183.8, "Timed out"),
        "browser-use": r("fail", 180.0, "Timed out"),
        browserless: r("fail", 150.0, "Timed out"),
      },
    },
  },
]

// ---------------- Derived helpers ----------------

export function providerHasModel(provider: ProviderId, model: ModelLabel): boolean {
  return TASKS.some((t) => t.results[model]?.[provider]?.status !== "na")
}

export interface ProviderStats {
  passed: number
  total: number
  rate: number
  avgTimeSec: number
}

export function statsFor(provider: ProviderId, model: ModelLabel): ProviderStats {
  let passed = 0
  let total = 0
  let timeSum = 0
  let timeCount = 0
  for (const t of TASKS) {
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

export function groupStatsFor(provider: ProviderId, model: ModelLabel): GroupStat[] {
  const map = new Map<string, { passed: number; total: number }>()
  for (const t of TASKS) {
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
      return { group: g, label: GROUPS[g].label, passed: v.passed, total: v.total, rate: v.total ? v.passed / v.total : 0 }
    })
}
