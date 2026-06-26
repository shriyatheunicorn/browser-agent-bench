// SERVER ONLY. Reads the markdown reports in /reports at request/build time,
// parses the "Task Detail" tables, and merges the newest row for every
// model/task/provider across all report files. Commit fresh reports (e.g. the
// output of `npm run compare`) and the dashboard updates automatically.

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  type BenchData,
  type BenchTask,
  type ProviderId,
  type ProviderResults,
  type Result,
  type Status,
  MODELS,
  PROVIDERS,
  NA,
} from "./types"
import { TASK_META, TASK_META_BY_ID } from "./task-meta"

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

function emptyProviderResults(): ProviderResults {
  return {
    browserbase: { ...NA },
    "browser-use": { ...NA },
    browserless: { ...NA },
  }
}

export async function loadBenchData(): Promise<BenchData> {
  let files: string[] = []
  try {
    files = (await readdir(REPORTS_DIR)).filter((f) => f.endsWith(".md"))
  } catch {
    files = []
  }

  // Merge rows across all reports, keeping the newest row per model/task/provider.
  const best = new Map<string, ParsedRow>()
  let newestGenerated: string | null = null
  let newestGeneratedMs = -1
  let sourceFile: string | null = null

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
      const existing = best.get(key)
      if (!existing || row.generatedAt >= existing.generatedAt) {
        best.set(key, row)
      }
    }
  }

  // Discover models present in the data, ordered with the known MODELS first.
  const modelSet = new Set<string>()
  for (const row of best.values()) modelSet.add(row.model)
  const known = (MODELS as readonly string[]).filter((m) => modelSet.has(m))
  const extras = [...modelSet].filter((m) => !known.includes(m)).sort()
  const models = [...known, ...extras]
  if (models.length === 0) models.push(...MODELS)

  // Build the task list from curated metadata order; attach parsed results.
  const buildResultsForTask = (taskId: string): Record<string, ProviderResults> => {
    const byModel: Record<string, ProviderResults> = {}
    for (const model of models) {
      const pr = emptyProviderResults()
      for (const p of PROVIDERS) {
        const row = best.get(`${model}|||${taskId}|||${p.id}`)
        if (row) pr[p.id] = row.result
      }
      byModel[model] = pr
    }
    return byModel
  }

  const tasks: BenchTask[] = TASK_META.map((meta) => ({
    id: meta.id,
    name: meta.name,
    group: meta.group,
    url: meta.url,
    prompt: meta.prompt,
    successCriteria: meta.successCriteria,
    results: buildResultsForTask(meta.id),
  }))

  // Include any tasks that appear in reports but are missing from metadata.
  const knownIds = new Set(TASK_META.map((t) => t.id))
  const reportTaskIds = new Set([...best.values()].map((r) => r.taskId))
  for (const id of reportTaskIds) {
    if (knownIds.has(id)) continue
    const fallback = TASK_META_BY_ID[id]
    tasks.push({
      id,
      name: fallback?.name ?? id,
      group: fallback?.group ?? "custom",
      url: fallback?.url ?? "",
      prompt: fallback?.prompt ?? "Complete the task successfully.",
      successCriteria: fallback?.successCriteria ?? "Grader-verified completion.",
      results: buildResultsForTask(id),
    })
  }

  return { tasks, models, generatedAt: newestGenerated, sourceFile }
}
