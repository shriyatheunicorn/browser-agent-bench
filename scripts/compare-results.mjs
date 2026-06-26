#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const suiteRoot = resolve(__dirname, "..");
const resultsRoot = resolve(readArg("--results") ?? join(suiteRoot, "results"));
const outputPath = resolve(
  readArg("--output") ?? join(suiteRoot, "reports", "latest-provider-comparison.md"),
);
const includeDetails = !hasFlag("--no-details");
const knownProviders = ["browserbase", "browser-use", "browserless"];
const providerNames = {
  browserbase: "Browserbase",
  "browser-use": "Browser Use",
  browserless: "Browserless",
};

const rows = readResultRows(resultsRoot).filter((row) => knownProviders.includes(row.provider));
const latestRows = [...latestByTask(rows).values()];
const activeProviders = knownProviders.filter((provider) => latestRows.some((row) => row.provider === provider));
const comparableRows = filterComparableRows(latestRows, activeProviders);
const aggregate = aggregateRows(comparableRows);
const report = renderReport({
  rows,
  latestRows,
  comparableRows,
  aggregate,
  resultsRoot,
  outputPath,
  includeDetails,
  activeProviders,
});

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${report}\n`);
console.log(`Wrote ${relative(process.cwd(), outputPath)}`);

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return null;
  return process.argv[index + 1] ?? "";
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function readResultRows(root) {
  if (!existsSync(root)) return [];

  const runDirs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(root, entry.name))
    .sort();

  const resultRows = [];
  let globalOrder = 0;

  for (const runDir of runDirs) {
    const resultsPath = join(runDir, "results.jsonl");
    if (!existsSync(resultsPath)) continue;

    const runId = runDir.split("/").at(-1);
    const fallbackTimeMs = statSync(resultsPath).mtimeMs;
    const runTimeMs = parseRunTimeMs(runId) ?? fallbackTimeMs;
    const lines = readFileSync(resultsPath, "utf8").split("\n");

    lines.forEach((line, index) => {
      if (!line.trim()) return;
      try {
        const row = JSON.parse(line);
        resultRows.push({
          ...row,
          _runId: runId,
          _runTimeMs: runTimeMs,
          _sourceFile: resultsPath,
          _sourceLine: index + 1,
          _globalOrder: globalOrder,
        });
        globalOrder += 1;
      } catch {
        // Ignore partial lines from a run that is still appending to results.jsonl.
      }
    });
  }

  return resultRows;
}

function parseRunTimeMs(runId) {
  const match = runId.match(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z/);
  if (!match) return null;

  const [, hourPrefix, minutes, seconds, milliseconds] = match;
  const timestamp = `${hourPrefix}:${minutes}:${seconds}.${milliseconds}Z`;
  const timeMs = Date.parse(timestamp);
  return Number.isNaN(timeMs) ? null : timeMs;
}

function latestByTask(resultRows) {
  const latest = new Map();

  for (const row of resultRows) {
    const key = [row.provider, row.modelLabel, row.taskId, row.trial ?? 1].join("\0");
    const previous = latest.get(key);
    if (!previous || compareRecency(row, previous) > 0) {
      latest.set(key, row);
    }
  }

  return latest;
}

function filterComparableRows(resultRows, providers) {
  const providersByModelTask = new Map();

  for (const row of resultRows) {
    const key = [row.modelLabel, row.taskId, row.trial ?? 1].join("\0");
    const providerSet = providersByModelTask.get(key) ?? new Set();
    providerSet.add(row.provider);
    providersByModelTask.set(key, providerSet);
  }

  return resultRows.filter((row) => {
    const key = [row.modelLabel, row.taskId, row.trial ?? 1].join("\0");
    const providerSet = providersByModelTask.get(key);
    return providers.every((provider) => providerSet?.has(provider));
  });
}

function compareRecency(a, b) {
  if (a._runTimeMs !== b._runTimeMs) return a._runTimeMs - b._runTimeMs;
  if (a._sourceLine !== b._sourceLine) return a._sourceLine - b._sourceLine;
  return a._globalOrder - b._globalOrder;
}

function aggregateRows(resultRows) {
  const byProviderModel = new Map();

  for (const row of resultRows) {
    const key = [row.provider, row.modelLabel].join("\0");
    const current =
      byProviderModel.get(key) ??
      {
        provider: row.provider,
        modelLabel: row.modelLabel,
        total: 0,
        passed: 0,
        failed: 0,
        msTotal: 0,
        msCount: 0,
        costTotal: 0,
        costCount: 0,
        statusCounts: new Map(),
        sourceRuns: new Set(),
        latestRunTimeMs: 0,
      };

    current.total += 1;
    if (row.successCriteriaMet) current.passed += 1;
    else current.failed += 1;

    if (typeof row.ms === "number" && Number.isFinite(row.ms)) {
      current.msTotal += row.ms;
      current.msCount += 1;
    }

    const cost = Number(row.costUsd);
    if (Number.isFinite(cost)) {
      current.costTotal += cost;
      current.costCount += 1;
    }

    increment(current.statusCounts, normalizeStatus(row.status));
    current.sourceRuns.add(row._runId);
    current.latestRunTimeMs = Math.max(current.latestRunTimeMs, row._runTimeMs);
    byProviderModel.set(key, current);
  }

  return byProviderModel;
}

function increment(map, key) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function renderReport({
  rows,
  latestRows,
  comparableRows,
  aggregate,
  resultsRoot,
  outputPath,
  includeDetails,
  activeProviders,
}) {
  const generatedAt = new Date().toISOString();
  const latestRunTimeMs = Math.max(0, ...rows.map((row) => row._runTimeMs));
  const models = unique(comparableRows.map((row) => row.modelLabel)).sort(compareModels);
  const unmatchedCount = latestRows.length - comparableRows.length;
  const resultPath = relative(dirname(outputPath), resultsRoot) || ".";
  const activeRunNote = rows.some((row) => row._runId.includes("__pid-"))
    ? "If a benchmark process is still running, rerun `npm run compare` after it exits to refresh this snapshot."
    : null;
  const titleProviders = activeProviders.map((provider) => providerNames[provider]).join(" vs ");

  const lines = [
    `# Latest ${titleProviders || "Provider"} Results`,
    "",
    `Generated at: ${generatedAt}`,
    `Latest result folder timestamp: ${latestRunTimeMs ? new Date(latestRunTimeMs).toISOString() : "n/a"}`,
    `Results source: \`${resultPath}\``,
    "",
    "This report uses the newest available row for each provider/model/task/trial from local `results.jsonl` files.",
    "The side-by-side summary includes only tasks that have rows for every active provider for the same model.",
  ];

  if (unmatchedCount > 0) {
    lines.push(`${unmatchedCount} provider-only latest row(s) were omitted from the side-by-side comparison.`);
  }

  if (activeRunNote) {
    lines.push(activeRunNote);
  }

  lines.push("", "## Per-Model Summary", "");
  lines.push(
    [
      renderModelSummaryHeader(activeProviders),
      renderModelSummaryAlignment(activeProviders),
      ...models.map((model) => renderModelSummaryRow(model, aggregate, activeProviders)),
    ].join("\n"),
  );

  if (includeDetails) {
    lines.push("", "## Task Detail", "");
    lines.push(
      [
        renderTaskHeader(activeProviders),
        renderTaskAlignment(activeProviders),
        ...models.flatMap((model) =>
          unique(comparableRows.filter((row) => row.modelLabel === model).map((row) => row.taskId))
            .sort(compareTasks)
            .map((taskId) => renderTaskRow(model, taskId, latestRows, activeProviders))
            .filter(Boolean),
        ),
      ].join("\n"),
    );
  }

  return lines.join("\n");
}

function renderModelSummaryHeader(providers) {
  const columns = ["Model"];
  for (const provider of providers) {
    columns.push(providerNames[provider], `${providerNames[provider]} data`);
  }
  columns.push("Browserbase - Browser Use");
  return renderMarkdownRow(columns);
}

function renderModelSummaryAlignment(providers) {
  const columns = ["---"];
  for (const _provider of providers) {
    columns.push("---:", "---");
  }
  columns.push("---:");
  return renderMarkdownRow(columns);
}

function renderModelSummaryRow(model, aggregate, providers) {
  const browserbase = aggregate.get(["browserbase", model].join("\0"));
  const browserUse = aggregate.get(["browser-use", model].join("\0"));
  const delta =
    browserbase && browserUse
      ? `${formatSignedPct(passRate(browserbase) - passRate(browserUse))} pp`
      : "n/a";

  const columns = [model];
  for (const provider of providers) {
    const summary = aggregate.get([provider, model].join("\0"));
    columns.push(renderAggregate(summary), renderAggregateSource(summary));
  }
  columns.push(delta);
  return renderMarkdownRow(columns);
}

function renderAggregate(summary) {
  if (!summary) return "n/a";

  const passText = `${summary.passed}/${summary.total} (${formatPct(passRate(summary))})`;
  const durationText = summary.msCount ? `avg ${formatSeconds(summary.msTotal / summary.msCount)}` : "avg n/a";
  const costText = summary.costCount ? `cost $${summary.costTotal.toFixed(3)}` : null;
  return [passText, durationText, costText].filter(Boolean).join(", ");
}

function renderAggregateSource(summary) {
  if (!summary) return "n/a";

  const statuses = [...summary.statusCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([status, count]) => `${status}:${count}`)
    .join(" ");

  return `${summary.sourceRuns.size} run(s), latest ${new Date(summary.latestRunTimeMs).toISOString()}, ${statuses}`;
}

function renderTaskHeader(providers) {
  const columns = ["Model", "Task"];
  for (const provider of providers) {
    columns.push(providerNames[provider], `${providerNames[provider]} result`);
  }
  return renderMarkdownRow(columns);
}

function renderTaskAlignment(providers) {
  const columns = ["---", "---"];
  for (const _provider of providers) {
    columns.push("---", "---");
  }
  return renderMarkdownRow(columns);
}

function renderTaskRow(model, taskId, latestRows, providers) {
  const providerRows = providers.map((provider) =>
    latestRows.find((row) => row.provider === provider && row.modelLabel === model && row.taskId === taskId),
  );
  if (providerRows.every((row) => !row)) return null;

  const columns = [model, taskId];
  for (const row of providerRows) {
    columns.push(renderTaskOutcome(row), renderTaskResult(row));
  }
  return renderMarkdownRow(columns);
}

function renderTaskOutcome(row) {
  if (!row) return "n/a";
  const grade = row.successCriteriaMet ? "pass" : "fail";
  return `${grade}, ${normalizeStatus(row.status)}, ${formatSeconds(row.ms)}`;
}

function renderTaskResult(row) {
  if (!row) return "n/a";
  const value = row.resultText ?? row.output?.result ?? row.rawOutput ?? row.error ?? "";
  return clip(String(value).replace(/\s+/g, " "), 96);
}

function passRate(summary) {
  return summary.total ? (summary.passed / summary.total) * 100 : 0;
}

function formatPct(value) {
  return `${value.toFixed(1)}%`;
}

function formatSignedPct(value) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}`;
}

function formatSeconds(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return `${(value / 1000).toFixed(1)}s`;
}

function normalizeStatus(status) {
  return String(status ?? "unknown").toLowerCase();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function compareModels(a, b) {
  if (a === "default") return -1;
  if (b === "default") return 1;
  return a.localeCompare(b);
}

function compareTasks(a, b) {
  return taskSortKey(a).localeCompare(taskSortKey(b));
}

function taskSortKey(taskId) {
  if (taskId.startsWith("humanbenchmark-")) return `3-${taskId}`;
  if (taskId.startsWith("neuron-")) return `2-${taskId}`;
  return `1-${taskId}`;
}

function clip(value, maxLength) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}

function md(value) {
  return toAscii(String(value ?? ""))
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ")
    .trim();
}

function renderMarkdownRow(columns) {
  return columns.map((column) => md(column)).join(" | ").replace(/^/, "| ").replace(/$/, " |");
}

function toAscii(value) {
  return value
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2192/g, "->")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}
