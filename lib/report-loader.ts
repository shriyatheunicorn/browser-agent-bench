// SERVER ONLY. Reads the markdown reports in /reports at request/build time,
// parses the "Task Detail" tables, and merges the newest row for every
// model/task/provider across all report files. Commit fresh reports (e.g. the
// output of `npm run compare`) and the dashboard updates automatically.

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { type BenchData, type ProviderId, type Result, type Status } from "./types"
import { assembleBenchData, type BestRow } from "./assemble"
import { loadResultsData } from "./results-loader"

const REPORTS_DIR = path.join(process.cwd(), "reports")

function providerNameToId(name: string): ProviderId | null {
  const n = name.trim().toLowerCase()
  if (n.startsWith("browserbase")) return "browserbase"
  if (n.startsWith("browser use") || n.startsWith("browser-use")) return "browser-use"
  if (n.startsWith("browserless")) return "browserless"
  return null
}

// Parse a status cell like "pass, completed, 121.7s" or "fail, running, 184.0s".
function parseStatusCell(cell: string): { status: Status; timeSec: number | null; lifecycle: string } | null {
  const raw = cell.trim()
  if (!raw) return null
  const parts = raw.split(",").map((p) => p.trim())
  const grade = parts[0]?.toLowerCase()
  const status: Status = grade === "pass" ? "pass" : "fail"
  const lifecycle = parts[1] ?? ""
  let timeSec: number | null = null
  const m = raw.match(/([\d.]+)\s*s\b/)
  if (m) timeSec = Number.parseFloat(m[1])
  return { status, timeSec, lifecycle }
}

function splitRow(line: string): string[] {
  // "| a | b | c |" -> ["a","b","c"]
  return line
    .replace(/^\s*\|/, "")
    .replace(/\|\s*$/, "")
    .split("|")
    .map((c) => c.trim())
}

interface ParsedRow {
  model: string
  taskId: string
  provider: ProviderId
  result: Result
  generatedAt: number // epoch ms used for "newest wins"
}

function parseReport(content: string): { rows: ParsedRow[]; generatedAt: string | null } {
  const genMatch = content.match(/Generated at:\s*(\S+)/)
  const generatedAtIso = genMatch ? genMatch[1] : null
  const generatedAtMs = generatedAtIso ? Date.parse(generatedAtIso) : 0

  const lines = content.split("\n")
  const rows: ParsedRow[] = []

  // Locate the "Task Detail" section and its table.
  const detailIdx = lines.findIndex((l) => /^##\s+Task Detail/i.test(l))
  if (detailIdx === -1) return { rows, generatedAt: generatedAtIso }

  // Find the header row of the table (first line starting with "|" after the heading).
  let headerIdx = -1
  for (let i = detailIdx + 1; i < lines.length; i++) {
    if (lines[i].trim().startsWith("|")) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) return { rows, generatedAt: generatedAtIso }

  const header = splitRow(lines[headerIdx])
  // header: [Model, Task, <ProviderA>, <ProviderA result>, <ProviderB>, <ProviderB result>, ...]
  // Map each column index to a provider id for the *status* columns.
  const statusColToProvider = new Map<number, ProviderId>()
  for (let c = 2; c < header.length; c++) {
    const label = header[c]
    if (/result/i.test(label)) continue // skip evidence columns
    const pid = providerNameToId(label)
    if (pid) statusColToProvider.set(c, pid)
  }

  // Data rows start two lines after header (skip the |---|---| separator).
  for (let i = headerIdx + 2; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim().startsWith("|")) break // end of table
    const cells = splitRow(line)
    if (cells.length < 2) continue
    const model = cells[0]
    const taskId = cells[1]
    if (!model || !taskId) continue

    for (const [col, provider] of statusColToProvider) {
      const statusCell = cells[col] ?? ""
      const evidenceCell = cells[col + 1] ?? ""
      const parsed = parseStatusCell(statusCell)
      if (!parsed) continue // empty -> no data for this provider/task
      const evidence = evidenceCell.trim() || parsed.lifecycle
      rows.push({
        model,
        taskId,
        provider,
        result: { status: parsed.status, timeSec: parsed.timeSec, evidence },
        generatedAt: generatedAtMs,
      })
    }
  }

  return { rows, generatedAt: generatedAtIso }
}

// Reads /reports/*.md, merges newest rows, and returns the BenchData shape.
async function loadReportData(): Promise<BenchData> {
  let files: string[] = []
  try {
    files = (await readdir(REPORTS_DIR)).filter((f) => f.endsWith(".md"))
  } catch {
    files = []
  }

  // Merge rows across all reports, keeping the newest row per model/task/provider.
  const best = new Map<string, BestRow>()
  let newestGenerated: string | null = null
  let newestGeneratedMs = -1
  let sourceFile: string | null = null
  const rowGeneratedMs = new Map<string, number>()

  for (const file of files) {
    let content = ""
    try {
      content = await readFile(path.join(REPORTS_DIR, file), "utf8")
    } catch {
      continue
    }
    const { rows, generatedAt } = parseReport(content)
    const genMs = generatedAt ? Date.parse(generatedAt) : 0
    if (genMs > newestGeneratedMs) {
      newestGeneratedMs = genMs
      newestGenerated = generatedAt
      sourceFile = file
    }
    for (const row of rows) {
      const key = `${row.model}|||${row.taskId}|||${row.provider}`
      const prevMs = rowGeneratedMs.get(key)
      if (prevMs == null || row.generatedAt >= prevMs) {
        rowGeneratedMs.set(key, row.generatedAt)
        best.set(key, { model: row.model, taskId: row.taskId, provider: row.provider, result: row.result })
      }
    }
  }

  return assembleBenchData(best, newestGenerated, sourceFile)
}

// Public entry point: prefer raw results.jsonl, fall back to markdown reports.
export async function loadBenchData(): Promise<BenchData> {
  const fromResults = await loadResultsData()
  if (fromResults) return fromResults
  return loadReportData()
}
