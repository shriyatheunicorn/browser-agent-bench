// SERVER ONLY. Reads raw results.jsonl files written by run-suite.mjs directly,
// so you can drop a run folder into /results, commit, and the dashboard updates
// without running `npm run compare`. Mirrors the recency logic in
// scripts/compare-results.mjs: newest run wins per provider/model/task/trial.

import { readdir, readFile, stat } from "node:fs/promises"
import path from "node:path"
import { type BenchData, type ProviderId, type Result, type Status } from "./types"
import { assembleBenchData, type BestRow } from "./assemble"

const RESULTS_DIR = path.join(process.cwd(), "results")

function providerToId(name: unknown): ProviderId | null {
  const n = String(name ?? "").trim().toLowerCase()
  if (n === "browserbase") return "browserbase"
  if (n === "browser-use") return "browser-use"
  if (n === "browserless") return "browserless"
  return null
}

// Run dir like "2026-06-26T11-32-30-123Z..." -> epoch ms (else null).
function parseRunTimeMs(runId: string): number | null {
  const match = runId.match(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z/)
  if (!match) return null
  const [, hourPrefix, minutes, seconds, milliseconds] = match
  const timeMs = Date.parse(`${hourPrefix}:${minutes}:${seconds}.${milliseconds}Z`)
  return Number.isNaN(timeMs) ? null : timeMs
}

function normalizeStatus(status: unknown): string {
  return String(status ?? "unknown").toLowerCase()
}

function toResult(row: any): Result {
  const skipped = normalizeStatus(row.status) === "skipped"
  if (skipped) return { status: "na", timeSec: null, evidence: "" }
  const status: Status = row.successCriteriaMet ? "pass" : "fail"
  const timeSec = typeof row.ms === "number" && Number.isFinite(row.ms) ? row.ms / 1000 : null
  const rawEvidence = row.resultText ?? row.output?.result ?? row.rawOutput ?? row.error ?? ""
  const evidence = String(rawEvidence).replace(/\s+/g, " ").trim().slice(0, 240)
  return { status, timeSec, evidence }
}

interface RankedRow {
  model: string
  taskId: string
  provider: ProviderId
  result: Result
  runTimeMs: number
  sourceLine: number
  globalOrder: number
}

function compareRecency(a: RankedRow, b: RankedRow): number {
  if (a.runTimeMs !== b.runTimeMs) return a.runTimeMs - b.runTimeMs
  if (a.sourceLine !== b.sourceLine) return a.sourceLine - b.sourceLine
  return a.globalOrder - b.globalOrder
}

export async function loadResultsData(): Promise<BenchData | null> {
  let runDirs: string[] = []
  try {
    const entries = await readdir(RESULTS_DIR, { withFileTypes: true })
    runDirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return null // no /results directory -> caller falls back to markdown
  }
  if (runDirs.length === 0) return null

  const ranked = new Map<string, RankedRow>()
  let globalOrder = 0
  let newestRunMs = -1

  for (const runId of runDirs) {
    const jsonlPath = path.join(RESULTS_DIR, runId, "results.jsonl")
    let content = ""
    try {
      content = await readFile(jsonlPath, "utf8")
    } catch {
      continue
    }
    let runTimeMs = parseRunTimeMs(runId)
    if (runTimeMs == null) {
      try {
        runTimeMs = (await stat(jsonlPath)).mtimeMs
      } catch {
        runTimeMs = 0
      }
    }
    newestRunMs = Math.max(newestRunMs, runTimeMs)

    const lines = content.split("\n")
    lines.forEach((line, index) => {
      if (!line.trim()) return
      let row: any
      try {
        row = JSON.parse(line)
      } catch {
        return // ignore partial lines from an in-progress run
      }
      const provider = providerToId(row.provider)
      const model = row.modelLabel
      const taskId = row.taskId
      if (!provider || !model || !taskId) return

      const candidate: RankedRow = {
        model,
        taskId,
        provider,
        result: toResult(row),
        runTimeMs: runTimeMs ?? 0,
        sourceLine: index + 1,
        globalOrder: globalOrder++,
      }
      const key = `${model}|||${taskId}|||${provider}`
      const existing = ranked.get(key)
      if (!existing || compareRecency(candidate, existing) > 0) {
        ranked.set(key, candidate)
      }
    })
  }

  if (ranked.size === 0) return null

  const best = new Map<string, BestRow>()
  for (const [key, r] of ranked) {
    best.set(key, { model: r.model, taskId: r.taskId, provider: r.provider, result: r.result })
  }

  const generatedAt = newestRunMs > 0 ? new Date(newestRunMs).toISOString() : null
  return assembleBenchData(best, generatedAt, "results/*/results.jsonl")
}
