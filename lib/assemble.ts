// Client-safe (no filesystem) assembler that turns a flat map of the newest
// result per model/task/provider into the BenchData shape the UI consumes.
// Shared by the markdown report loader and the raw results.jsonl loader.

import {
  type BenchData,
  type BenchTask,
  type ProviderId,
  type ProviderResults,
  type Result,
  MODELS,
  PROVIDERS,
  NA,
} from "./types"
import { TASK_META, TASK_META_BY_ID } from "./task-meta"

export interface BestRow {
  model: string
  taskId: string
  provider: ProviderId
  result: Result
}

function emptyProviderResults(): ProviderResults {
  return {
    browserbase: { ...NA },
    "browser-use": { ...NA },
    browserless: { ...NA },
  }
}

export function assembleBenchData(
  best: Map<string, BestRow>,
  generatedAt: string | null,
  sourceFile: string | null,
): BenchData {
  // Discover models present in the data, ordered with the known MODELS first.
  const modelSet = new Set<string>()
  for (const row of best.values()) modelSet.add(row.model)
  const known = (MODELS as readonly string[]).filter((m) => modelSet.has(m))
  const extras = [...modelSet].filter((m) => !known.includes(m)).sort()
  const models = [...known, ...extras]
  if (models.length === 0) models.push(...MODELS)

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

  // Include any tasks that appear in the data but are missing from metadata.
  const knownIds = new Set(TASK_META.map((t) => t.id))
  const dataTaskIds = new Set([...best.values()].map((r) => r.taskId))
  for (const id of dataTaskIds) {
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

  return { tasks, models, generatedAt, sourceFile }
}
