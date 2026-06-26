import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUITE_NAME = process.env.SUITE_NAME ?? "browserbase-agent-suite";
const TASKS_FILE = resolve(process.env.TASKS_FILE ?? join(__dirname, "tasks.json"));
const MODELS_FILE = process.env.MODELS_FILE ? resolve(process.env.MODELS_FILE) : null;
const RESULTS_ROOT = resolve(process.env.RESULTS_ROOT ?? join(__dirname, "results"));
const BROWSERBASE_API_MODE = process.env.BROWSERBASE_API_MODE ?? "demo";
const BROWSERBASE_AGENT_BASE =
  process.env.BROWSERBASE_AGENT_BASE ??
  (BROWSERBASE_API_MODE === "runs"
    ? "https://api.browserbase.com"
    : "https://bb-agent-api-demo.vercel.app");
const BROWSERBASE_AGENT_RUNS_PATH = process.env.BROWSERBASE_AGENT_RUNS_PATH ?? "/v1/agents/runs";
const BROWSERBASE_AGENT_ID =
  process.env.BROWSERBASE_AGENT_ID ?? "1a67efdd-1854-44c1-be15-bf73278e0747";
const BROWSERBASE_AGENT_CONFIG_ID =
  process.env.BROWSERBASE_AGENT_CONFIG_ID ??
  process.env.AGENTS_API_DEMO_CONFIG_ID ??
  "1a67efdd-1854-44c1-be15-bf73278e0747";
const BROWSERBASE_AGENT_API_KEY =
  process.env.BROWSERBASE_AGENT_API_KEY ?? process.env.BB_AGENT_API_KEY ?? process.env.BROWSERBASE_API_KEY ?? "";
const BROWSERBASE_API_KEY_HEADER = process.env.BROWSERBASE_API_KEY_HEADER ?? "x-bb-api-key";
const BROWSERBASE_TRANSPORT =
  process.env.BROWSERBASE_TRANSPORT ??
  (BROWSERBASE_AGENT_BASE.includes(".vercel.app") ? "vercel-curl" : "fetch");
const BB_USER_ID =
  process.env.BB_USER_ID ??
  process.env.AGENTS_API_DEMO_USER_ID ??
  "f1b61fb6-a9c5-4ebb-826a-1e2d273864ac";
const PROVIDERS = csvEnv("PROVIDERS", "browserbase");
const TRIALS = numberEnv("TRIALS", 1);
const CONCURRENCY = numberEnv("CONCURRENCY", 1);
const POLL_MS = numberEnv("POLL_MS", 5000);
const TIMEOUT_MS = numberEnv("TIMEOUT_MS", 10 * 60 * 1000);
const SEND_MODEL_PARAM = boolEnv("SEND_MODEL_PARAM", true);
const BROWSERBASE_SEND_MODEL_PARAM = boolEnv("BROWSERBASE_SEND_MODEL_PARAM", SEND_MODEL_PARAM);
const BROWSER_USE_SEND_MODEL_PARAM = boolEnv("BROWSER_USE_SEND_MODEL_PARAM", SEND_MODEL_PARAM);
const BROWSERLESS_AGENT_MODE = process.env.BROWSERLESS_AGENT_MODE ?? "openai-responses";
const BROWSERLESS_OPENAI_BASE = process.env.BROWSERLESS_OPENAI_BASE ?? "https://api.openai.com/v1";
const BROWSERLESS_OPENAI_API_KEY = process.env.BROWSERLESS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "";
const BROWSERLESS_API_KEY = process.env.BROWSERLESS_API_KEY ?? process.env.BROWSERLESS_TOKEN ?? "";
const BROWSERLESS_MCP_SERVER_URL = process.env.BROWSERLESS_MCP_SERVER_URL ?? "https://mcp.browserless.io/mcp";
const BROWSERLESS_API_URL = process.env.BROWSERLESS_API_URL ?? "";
const BROWSERLESS_AGENT_ENDPOINT = process.env.BROWSERLESS_AGENT_ENDPOINT ?? "";
const BROWSERLESS_AGENT_API_KEY =
  process.env.BROWSERLESS_AGENT_API_KEY ?? process.env.BROWSERLESS_API_KEY ?? process.env.BROWSERLESS_TOKEN ?? "";
const DRY_RUN = boolEnv("DRY_RUN", false);
const SELF_TEST = boolEnv("SELF_TEST", false);
const RESUME = boolEnv("RESUME", false);
const MODEL_PARAM_NAME = process.env.MODEL_PARAM_NAME ?? "model";
const BROWSERBASE_MODEL_PARAM_NAME = process.env.BROWSERBASE_MODEL_PARAM_NAME ?? MODEL_PARAM_NAME;
const BROWSER_USE_MODEL_PARAM_NAME = process.env.BROWSER_USE_MODEL_PARAM_NAME ?? MODEL_PARAM_NAME;
const TASK_IDS = csvEnv("TASK_IDS");
const TASK_GROUPS = csvEnv("TASK_GROUPS");

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const runId = process.env.RUN_ID ?? `${stamp}__${slug(SUITE_NAME)}__pid-${process.pid}`;
const runRoot = join(RESULTS_ROOT, runId);
const jsonlPath = join(runRoot, "results.jsonl");
const summaryPath = join(runRoot, "summary.json");

const tasks = readJson(TASKS_FILE);
const models = readModels();
const selectedTasks = filterTasks(tasks);
const rows = [];

validateTasks(selectedTasks);
validateProviders(PROVIDERS);
mkdirSync(runRoot, { recursive: true });
if (RESUME && existsSync(jsonlPath)) {
  const existingRows = readJsonl(jsonlPath);
  rows.push(...existingRows);
}
const completedTrialKeys = new Set(rows.map((row) => trialKey(row)));

console.log(`Suite: ${SUITE_NAME}`);
console.log(`Run folder: ${runRoot}`);
console.log(`Providers: ${PROVIDERS.join(", ")}`);
console.log(`Tasks: ${selectedTasks.length}`);
console.log(`Models: ${models.map((model) => model.label).join(", ")}`);
console.log(`Trials per task/model: ${TRIALS}`);
console.log(`Concurrency: ${CONCURRENCY}`);
if (RESUME) console.log(`Resume: loaded ${rows.length} existing row(s)`);

if (SELF_TEST) {
  const selfTest = runSelfTest();
  writeFileSync(summaryPath, `${JSON.stringify(selfTest, null, 2)}\n`);
  console.log(`SELF_TEST=true, no provider runs started.`);
  console.log(`Grader self-test: ${selfTest.pass ? "pass" : "fail"}`);
  console.log(`Wrote ${summaryPath}`);
  process.exit(selfTest.pass ? 0 : 1);
}

if (DRY_RUN) {
  const matrix = buildPlannedMatrix();
  const dryRunSummary = {
    suite: SUITE_NAME,
    dryRun: true,
    runRoot,
    trials: TRIALS,
    providers: PROVIDERS,
    models,
    tasks: selectedTasks,
    plannedRuns: matrix.length,
    executableRuns: matrix.filter((entry) => entry.requestedModel).length,
    skippedRuns: matrix.filter((entry) => !entry.requestedModel).length,
    matrix,
  };
  writeFileSync(summaryPath, `${JSON.stringify(dryRunSummary, null, 2)}\n`);
  console.log(`DRY_RUN=true, no provider runs started.`);
  console.log(`Executable runs: ${dryRunSummary.executableRuns}`);
  console.log(`Skipped runs: ${dryRunSummary.skippedRuns}`);
  console.log(`Wrote ${summaryPath}`);
  process.exit(0);
}

await runTrialEntries(buildTrialEntries(), CONCURRENCY);

const summary = buildSummary(rows);
writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
console.log(`Wrote ${jsonlPath}`);
console.log(`Wrote ${summaryPath}`);

function buildTrialEntries() {
  const entries = [];
  for (const model of models) {
    for (const provider of PROVIDERS) {
      for (const task of selectedTasks) {
        for (let trial = 1; trial <= TRIALS; trial += 1) {
          const rowBase = {
            suite: SUITE_NAME,
            provider,
            modelLabel: model.label,
            requestedModel: getProviderModel(model, provider),
            taskId: task.id,
            taskName: task.name,
            taskGroup: task.group ?? null,
            url: task.url,
            trial,
          };
          if (!completedTrialKeys.has(trialKey(rowBase))) {
            entries.push({ provider, task, model, trial, rowBase });
          }
        }
      }
    }
  }
  return entries;
}

async function runTrialEntries(entries, concurrency) {
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, entries.length));
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < entries.length) {
        const entry = entries[nextIndex++];
        await runTrialEntry(entry);
      }
    }),
  );
}

async function runTrialEntry({ provider, task, model, trial, rowBase }) {
  try {
    const row = rowBase.requestedModel
      ? await runProviderTrial(provider, task, model, trial, rowBase)
      : await runSkippedTrial(task, model, trial, rowBase);
    rows.push(row);
    completedTrialKeys.add(trialKey(row));
    writeFileSync(jsonlPath, `${JSON.stringify(row)}\n`, { flag: "a" });
    console.log(
      `${provider} ${model.label} ${task.id} trial ${trial}: ${row.status} success=${row.successCriteriaMet} ${
        row.runUrl ?? row.sessionId ?? row.responseId ?? row.agentRunId ?? ""
      }`,
    );
  } catch (error) {
    const row = {
      ...rowBase,
      status: "error",
      success: false,
      successCriteriaMet: false,
      error: error instanceof Error ? error.message : String(error),
    };
    rows.push(row);
    completedTrialKeys.add(trialKey(row));
    writeFileSync(jsonlPath, `${JSON.stringify(row)}\n`, { flag: "a" });
    console.log(`${provider} ${model.label} ${task.id} trial ${trial}: ERROR ${row.error}`);
  }
}

async function runProviderTrial(provider, task, model, trial, rowBase) {
  if (provider === "browserbase") return runBrowserbaseTrial(task, model, trial, rowBase);
  if (provider === "browser-use") return runBrowserUseTrial(task, model, trial, rowBase);
  if (provider === "browserless") return runBrowserlessTrial(task, model, trial, rowBase);
  throw new Error(`Unsupported provider "${provider}".`);
}

async function runBrowserbaseTrial(task, model, trial, rowBase) {
  const startedAt = Date.now();
  const modelSlug = slug(model.label);
  const taskSlug = slug(task.id);
  const trialDir = join(runRoot, "runs", rowBase.provider, modelSlug, taskSlug, `trial-${trial}`);
  mkdirSync(trialDir, { recursive: true });

  const taskPrompt = buildTaskPrompt(task, model);
  const requestBody =
    BROWSERBASE_API_MODE === "runs"
      ? {
          task: taskPrompt,
          agentId: BROWSERBASE_AGENT_ID,
        }
      : {
          prompt: taskPrompt,
          ...(BROWSERBASE_AGENT_CONFIG_ID ? { configId: BROWSERBASE_AGENT_CONFIG_ID } : {}),
        };
  if (BROWSERBASE_SEND_MODEL_PARAM && rowBase.requestedModel) {
    if (!isProviderDefaultModel(rowBase.provider, rowBase.requestedModel)) {
      requestBody[BROWSERBASE_MODEL_PARAM_NAME] = rowBase.requestedModel;
    }
  }

  const startRaw = await startBrowserbaseRun(requestBody);
  writeFileSync(join(trialDir, "start-response.json"), `${prettyJson(startRaw)}\n`);

  const start = safeJsonParse(startRaw);
  const runId = getBrowserbaseRunId(start);
  if (!runId) throw new Error(`Browserbase did not return runId: ${startRaw}`);

  const runUrl = getBrowserbaseRunUrl(start, runId);
  let lastArtifact = "";
  let parsed = null;
  let extracted = null;
  let run = start;
  let status = normalizeBrowserbaseRunStatus(start.status ?? "RUNNING");

  while (Date.now() - startedAt < TIMEOUT_MS) {
    if (BROWSERBASE_API_MODE === "runs") {
      run = await browserbaseAgentRequest(`${BROWSERBASE_AGENT_RUNS_PATH}/${runId}`);
      lastArtifact = JSON.stringify(run, null, 2);
      extracted = extractBrowserbaseAgentApiOutput(run);
      status = normalizeBrowserbaseRunStatus(run.status ?? status);
    } else {
      run = getBrowserbaseDemoRun(runId);
      lastArtifact = JSON.stringify(run, null, 2);
      parsed = { run, initialEvents: [], decoded: lastArtifact, raw: lastArtifact };
      extracted = extractBrowserbaseDemoOutput(run);
      status = normalizeBrowserbaseRunStatus(extracted.status ?? run.status ?? status);
    }

    if (isTerminalStatus(status)) break;
    await sleep(POLL_MS);
  }

  const artifactName = "run.json";
  writeFileSync(join(trialDir, artifactName), lastArtifact);

  const terminal = isTerminalStatus(status);
  const outputJson = extracted?.json ?? null;
  const rawOutput = extracted?.rawOutput ?? "";
  const deterministicGrade = gradeTask(task, outputJson, rawOutput, parsed?.raw ?? parsed?.decoded ?? "");

  const row = {
    ...rowBase,
    runId,
    runUrl,
    status,
    success: extracted?.success ?? parsed?.run?.result?.success ?? boolFromUnknown(run?.success) ?? null,
    successCriteriaMet: deterministicGrade.pass,
    deterministicGrade,
    error: terminal ? null : `Timed out after ${TIMEOUT_MS}ms while status was ${status}`,
    ms: Date.now() - startedAt,
    reportedModel: extractBrowserbaseReportedModel(start, parsed, run),
    output: outputJson,
    rawOutput,
    resultText: outputJson?.result ?? outputJson?.score ?? extractResultText(rawOutput),
    agentMode: start.agentMode ?? null,
    browserbaseApiMode: BROWSERBASE_API_MODE,
    browserbaseAgentConfigId: BROWSERBASE_API_MODE === "demo" ? BROWSERBASE_AGENT_CONFIG_ID : null,
    browserbaseSessionId: getBrowserbaseSessionId(start, parsed, run),
    trialDir,
    startedResponse: start,
  };

  writeFileSync(join(trialDir, "summary.json"), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

async function runBrowserlessTrial(task, model, trial, rowBase) {
  const startedAt = Date.now();
  const modelSlug = slug(model.label);
  const taskSlug = slug(task.id);
  const trialDir = join(runRoot, "runs", rowBase.provider, modelSlug, taskSlug, `trial-${trial}`);
  mkdirSync(trialDir, { recursive: true });

  const taskPrompt = buildTaskPrompt(task, model);
  const requestBody = buildBrowserlessRequestBody(taskPrompt, rowBase.requestedModel, task);
  writeFileSync(join(trialDir, "request.json"), `${JSON.stringify(redactBrowserlessRequest(requestBody), null, 2)}\n`);

  const response =
    BROWSERLESS_AGENT_MODE === "endpoint"
      ? await browserlessEndpointRequest(requestBody)
      : await browserlessOpenAIResponsesRequest(requestBody);
  writeFileSync(join(trialDir, "response.json"), `${JSON.stringify(redactBrowserlessResponse(response), null, 2)}\n`);

  const rawOutput = normalizeBrowserlessOutput(response);
  const outputJson = extractBrowserlessOutputJson(response, rawOutput);
  const deterministicGrade = gradeTask(task, outputJson, rawOutput, JSON.stringify(response));
  const status = normalizeBrowserlessStatus(response);
  const terminal = isTerminalStatus(status);

  const row = {
    ...rowBase,
    responseId: response.id ?? response.responseId ?? response.response_id ?? null,
    agentRunId: response.runId ?? response.run_id ?? response.agentRunId ?? response.agent_run_id ?? null,
    status,
    success: response.success ?? response.isTaskSuccessful ?? response.is_task_successful ?? null,
    successCriteriaMet: deterministicGrade.pass,
    deterministicGrade,
    error: terminal ? extractBrowserlessError(response) : `Timed out after ${TIMEOUT_MS}ms while status was ${status}`,
    ms: Date.now() - startedAt,
    reportedModel: response.model ?? response.modelName ?? response.model_name ?? rowBase.requestedModel,
    output: outputJson,
    rawOutput,
    resultText: outputJson?.result ?? outputJson?.score ?? extractResultText(rawOutput),
    browserlessAgentMode: BROWSERLESS_AGENT_MODE,
    browserlessMcpServerUrl: BROWSERLESS_AGENT_MODE === "openai-responses" ? BROWSERLESS_MCP_SERVER_URL : null,
    browserlessApiUrl: BROWSERLESS_API_URL || null,
    usage: response.usage ?? null,
    trialDir,
  };

  writeFileSync(join(trialDir, "summary.json"), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

async function runBrowserUseTrial(task, model, trial, rowBase) {
  const startedAt = Date.now();
  const modelSlug = slug(model.label);
  const taskSlug = slug(task.id);
  const trialDir = join(runRoot, "runs", rowBase.provider, modelSlug, taskSlug, `trial-${trial}`);
  mkdirSync(trialDir, { recursive: true });

  const requestBody = {
    task: buildTaskPrompt(task, model),
    output_schema: buildBrowserUseOutputSchema(task),
  };
  if (BROWSER_USE_SEND_MODEL_PARAM && rowBase.requestedModel) {
    requestBody[BROWSER_USE_MODEL_PARAM_NAME] = rowBase.requestedModel;
  }

  const created = await browserUseRequest("/sessions", {
    method: "POST",
    body: JSON.stringify(requestBody),
  });
  writeFileSync(join(trialDir, "start-response.json"), `${JSON.stringify(redactBrowserUseSession(created), null, 2)}\n`);

  const sessionId = getBrowserUseSessionId(created);
  if (!sessionId) {
    throw new Error(`Browser Use did not return a session id: ${JSON.stringify(created)}`);
  }

  let session = created;
  while (!isBrowserUseTerminal(session) && Date.now() - startedAt < TIMEOUT_MS) {
    await sleep(POLL_MS);
    session = await browserUseRequest(`/sessions/${sessionId}`);
  }

  writeFileSync(join(trialDir, "session.json"), `${JSON.stringify(redactBrowserUseSession(session), null, 2)}\n`);

  const terminal = isBrowserUseTerminal(session);
  const rawOutput = normalizeBrowserUseOutput(session.output);
  const outputJson =
    typeof session.output === "string"
      ? extractFirstJsonObject(session.output)
      : session.output && typeof session.output === "object"
        ? session.output
        : extractFirstJsonObject(rawOutput);
  const deterministicGrade = gradeTask(task, outputJson, rawOutput, JSON.stringify(session));
  const status = session.status ?? session.state ?? (terminal ? "completed" : "unknown");

  const row = {
    ...rowBase,
    sessionId,
    status,
    success: session.isTaskSuccessful ?? session.is_task_successful ?? null,
    successCriteriaMet: deterministicGrade.pass,
    deterministicGrade,
    error: terminal ? null : `Timed out after ${TIMEOUT_MS}ms while status was ${status}`,
    ms: Date.now() - startedAt,
    reportedModel: session.model ?? session.llmModel ?? session.llm_model ?? created.model ?? null,
    output: outputJson,
    rawOutput,
    resultText: outputJson?.result ?? outputJson?.score ?? extractResultText(rawOutput),
    costUsd: session.totalCostUsd ?? session.total_cost_usd ?? null,
    stepCount: session.stepCount ?? session.step_count ?? null,
    trialDir,
  };

  writeFileSync(join(trialDir, "summary.json"), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

async function runSkippedTrial(task, model, trial, rowBase) {
  const trialDir = join(
    runRoot,
    "runs",
    rowBase.provider,
    slug(model.label),
    slug(task.id),
    `trial-${trial}`,
  );
  mkdirSync(trialDir, { recursive: true });

  const row = {
    ...rowBase,
    status: "skipped",
    success: false,
    successCriteriaMet: false,
    deterministicGrade: {
      type: task.grader?.type ?? "unknown",
      pass: false,
      reason: `No ${rowBase.provider} model value configured for model label "${model.label}".`,
    },
    error: `Unsupported or unconfigured model for provider ${rowBase.provider}: ${model.label}`,
    ms: 0,
    reportedModel: null,
    output: null,
    rawOutput: "",
    resultText: null,
    trialDir,
  };

  writeFileSync(join(trialDir, "summary.json"), `${JSON.stringify(row, null, 2)}\n`);
  return row;
}

function buildTaskPrompt(task, model) {
  const expectedSelectionKeys = Object.keys(task.grader?.expected ?? {});
  const outputShape =
    task.grader?.type === "jsonSelections"
      ? `{
  "selections": {${expectedSelectionKeys.map((key) => `"${key}": "..."`).join(", ")}},
  "result": "<short visible completion status>",
  "evidence": "<short evidence from the page>",
  "notes": []
}`
      : `{
  "result": "<visible result, score, counter, or submitted status>",
  "evidence": "<short exact evidence copied from the page>",
  "notes": []
}`;

  return `Go to ${task.url}

Task:
${task.prompt}

Success criteria:
${task.successCriteria}

When you finish, inspect the visible page result/evaluator state. Return only valid JSON matching this shape:
${outputShape}

If you cannot complete the task, leave the relevant result fields empty and explain why in "notes".
The eval harness grades deterministically from your returned visible result/evidence; do not infer success.
Do not wrap the JSON in markdown.

Eval metadata:
- modelLabel: ${model.label}
- taskId: ${task.id}`;
}

function buildBrowserUseOutputSchema(task) {
  if (task.grader?.type === "jsonSelections") {
    return {
      type: "object",
      properties: {
        selections: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        result: { type: "string" },
        evidence: { type: "string" },
        notes: {
          type: "array",
          items: { type: "string" },
        },
      },
      required: ["selections"],
    };
  }

  return {
    type: "object",
    properties: {
      result: { type: "string" },
      evidence: { type: "string" },
      notes: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["result", "evidence"],
  };
}

function buildBrowserlessRequestBody(taskPrompt, requestedModel, task) {
  if (BROWSERLESS_AGENT_MODE === "endpoint") {
    return {
      task: taskPrompt,
      model: requestedModel,
      output_schema: buildBrowserUseOutputSchema(task),
    };
  }

  if (BROWSERLESS_AGENT_MODE !== "openai-responses") {
    throw new Error('BROWSERLESS_AGENT_MODE must be "openai-responses" or "endpoint".');
  }

  const browserlessHeaders = {
    Authorization: `Bearer ${BROWSERLESS_API_KEY}`,
    ...(BROWSERLESS_API_URL ? { "x-browserless-api-url": BROWSERLESS_API_URL } : {}),
  };

  return {
    model: requestedModel,
    instructions:
      "You are a browser benchmark agent. Use the Browserless MCP tools to complete the task in a real browser. Return only the JSON requested by the task prompt, with no markdown fences or commentary.",
    tools: [
      {
        type: "mcp",
        server_label: "browserless",
        server_url: BROWSERLESS_MCP_SERVER_URL,
        headers: browserlessHeaders,
        require_approval: "never",
      },
    ],
    input: taskPrompt,
  };
}

async function browserlessOpenAIResponsesRequest(requestBody) {
  if (!BROWSERLESS_OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY or BROWSERLESS_OPENAI_API_KEY is required for provider browserless.");
  }
  if (!BROWSERLESS_API_KEY) {
    throw new Error("BROWSERLESS_API_KEY or BROWSERLESS_TOKEN is required for provider browserless.");
  }

  const response = await fetch(`${BROWSERLESS_OPENAI_BASE}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${BROWSERLESS_OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  const json = safeJsonParse(text) ?? { raw: text };
  if (!response.ok) {
    throw new Error(`Browserless OpenAI Responses ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function browserlessEndpointRequest(requestBody) {
  if (!BROWSERLESS_AGENT_ENDPOINT) {
    throw new Error("BROWSERLESS_AGENT_ENDPOINT is required when BROWSERLESS_AGENT_MODE=endpoint.");
  }

  const response = await fetch(BROWSERLESS_AGENT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(BROWSERLESS_AGENT_API_KEY ? { Authorization: `Bearer ${BROWSERLESS_AGENT_API_KEY}` } : {}),
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const text = await response.text();
  const json = safeJsonParse(text) ?? { raw: text };
  if (!response.ok) {
    throw new Error(`Browserless Agent endpoint ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function normalizeBrowserlessOutput(response) {
  if (typeof response.output_text === "string") return response.output_text;
  if (typeof response.outputText === "string") return response.outputText;
  if (typeof response.output === "string") return response.output;
  if (response.output && typeof response.output === "object") {
    const text = extractOpenAIOutputText(response.output);
    if (text) return text;
    return JSON.stringify(response.output);
  }
  if (typeof response.result === "string") return response.result;
  if (response.result && typeof response.result === "object") return JSON.stringify(response.result);
  if (typeof response.raw === "string") return response.raw;
  return JSON.stringify(response);
}

function extractOpenAIOutputText(output) {
  if (!Array.isArray(output)) return "";
  const texts = [];
  for (const item of output) {
    if (typeof item?.content === "string") texts.push(item.content);
    if (Array.isArray(item?.content)) {
      for (const content of item.content) {
        if (typeof content?.text === "string") texts.push(content.text);
        if (typeof content?.content === "string") texts.push(content.content);
      }
    }
  }
  return texts.join("\n").trim();
}

function extractBrowserlessOutputJson(response, rawOutput) {
  if (response.result && typeof response.result === "object") return response.result;
  if (response.output && typeof response.output === "object" && !Array.isArray(response.output)) return response.output;
  return extractFirstJsonObject(rawOutput);
}

function normalizeBrowserlessStatus(response) {
  const status = response.status ?? response.state;
  if (status) return status;
  if (response.error) return "failed";
  if (response.output_text ?? response.outputText ?? response.output ?? response.result) return "completed";
  return "unknown";
}

function extractBrowserlessError(response) {
  if (!response.error) return null;
  return typeof response.error === "string" ? response.error : JSON.stringify(response.error);
}

function redactBrowserlessRequest(requestBody) {
  const clone = JSON.parse(JSON.stringify(requestBody));
  const headers = clone.tools?.[0]?.headers;
  if (headers?.Authorization) headers.Authorization = "[redacted]";
  return clone;
}

function redactBrowserlessResponse(response) {
  if (!response || typeof response !== "object") return response;
  const clone = JSON.parse(JSON.stringify(response));
  for (const key of ["apiKey", "api_key", "token", "authorization"]) {
    if (clone[key]) clone[key] = "[redacted]";
  }
  return clone;
}

async function browserUseRequest(path, options = {}) {
  const apiKey = process.env.BROWSER_USE_API_KEY;
  if (!apiKey) throw new Error("BROWSER_USE_API_KEY is not set");

  let response;
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      response = await fetch(`https://api.browser-use.com/api/v3${path}`, {
        ...options,
        headers: {
          "X-Browser-Use-API-Key": apiKey,
          "Content-Type": "application/json",
          ...(options.headers ?? {}),
        },
      });
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 3) throw error;
      await sleep(1000 * attempt);
    }
  }

  const text = await response.text();
  const json = safeJsonParse(text) ?? { raw: text };
  if (!response.ok) {
    throw new Error(`Browser Use ${response.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function getBrowserUseSessionId(session) {
  return session.id ?? session.sessionId ?? session.session_id;
}

function isBrowserUseTerminal(session) {
  const status = String(session.status ?? session.state ?? "").toLowerCase();
  return (
    ["completed", "complete", "finished", "failed", "stopped", "cancelled", "canceled"].includes(status) ||
    Boolean(session.completedAt ?? session.completed_at ?? session.finishedAt ?? session.finished_at)
  );
}

function normalizeBrowserUseOutput(output) {
  if (typeof output === "string") return output;
  if (output == null) return "";
  return JSON.stringify(output);
}

function redactBrowserUseSession(session) {
  if (!session || typeof session !== "object") return session;
  const clone = JSON.parse(JSON.stringify(session));
  for (const key of ["apiKey", "api_key", "token", "authorization"]) {
    if (clone[key]) clone[key] = "[redacted]";
  }
  return clone;
}

function parseBrowserbaseRunHtml(html) {
  const decoded = decodeHtmlAndFlightEscapes(html);
  const runMatch = decoded.match(/"run":\{"id":"[^"]+"[\s\S]*?\},"initialEvents":/);
  const eventsMatch = decoded.match(/"initialEvents":\[[\s\S]*?\],"prevRunId"/);

  let run = null;
  let initialEvents = [];

  if (runMatch) {
    run = safeJsonParse(`{${runMatch[0].slice(0, -',"initialEvents":'.length)}}`)?.run ?? null;
  }

  if (eventsMatch) {
    initialEvents =
      safeJsonParse(`{${eventsMatch[0].slice(0, -',"prevRunId"'.length)}}`)?.initialEvents ?? [];
  }

  return { run, initialEvents, decoded, raw: html };
}

function extractBrowserbaseOutput(parsed) {
  const candidates = [];
  const completedEvent = parsed.initialEvents?.find((event) => event.type === "run.completed");

  if (parsed.run?.result?.output) candidates.push(parsed.run.result.output);
  if (parsed.run?.result?.message) candidates.push(parsed.run.result.message);
  if (completedEvent?.data?.result?.output) candidates.push(completedEvent.data.result.output);
  if (completedEvent?.data?.result?.message) candidates.push(completedEvent.data.result.message);

  for (const event of parsed.initialEvents ?? []) {
    if (event?.data?.text) candidates.push(event.data.text);
    if (event?.data?.result?.output) candidates.push(event.data.result.output);
    if (event?.data?.result?.message) candidates.push(event.data.result.message);
  }

  const fallbackStatus = parsed.decoded.includes('"type":"run.completed"') ? "completed" : null;
  const fallbackSuccess = /"type":"run\.completed"[\s\S]{0,50000}"success":true/.test(parsed.decoded)
    ? true
    : null;

  for (const candidate of candidates) {
    const json = extractFirstJsonObject(candidate);
    if (json) {
      return {
        json,
        rawOutput: candidate,
        status: parsed.run?.status ?? fallbackStatus,
        success: parsed.run?.result?.success ?? fallbackSuccess,
      };
    }
  }

  return {
    json: null,
    rawOutput: candidates[0] ?? extractFallbackOutput(parsed.raw ?? parsed.decoded),
    status: parsed.run?.status ?? fallbackStatus,
    success: parsed.run?.result?.success ?? fallbackSuccess,
  };
}

function extractFirstJsonObject(text) {
  if (!text) return null;

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = safeJsonParse(fenced[1]);
    if (parsed) return parsed;
  }

  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i += 1) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) return safeJsonParse(text.slice(start, i + 1));
  }

  return null;
}

function buildSummary(allRows) {
  const byModel = new Map();
  const byTask = new Map();

  for (const row of allRows) {
    incrementSummary(byModel, row.modelLabel, row);
    incrementSummary(byTask, row.taskId, row);
  }

  return {
    suite: SUITE_NAME,
    browserbaseAgentBase: BROWSERBASE_AGENT_BASE,
    browserbaseApiMode: BROWSERBASE_API_MODE,
    browserbaseAgentRunsPath: BROWSERBASE_API_MODE === "runs" ? BROWSERBASE_AGENT_RUNS_PATH : null,
    browserbaseAgentId: BROWSERBASE_API_MODE === "runs" ? BROWSERBASE_AGENT_ID : null,
    browserbaseAgentConfigId: BROWSERBASE_API_MODE === "demo" ? BROWSERBASE_AGENT_CONFIG_ID : null,
    bbUserId: BB_USER_ID,
    runRoot,
    createdAt: new Date().toISOString(),
    trials: TRIALS,
    providers: PROVIDERS,
    timeoutMs: TIMEOUT_MS,
    sendModelParam: SEND_MODEL_PARAM,
    modelParamName: SEND_MODEL_PARAM ? MODEL_PARAM_NAME : null,
    browserbaseSendModelParam: BROWSERBASE_SEND_MODEL_PARAM,
    browserUseSendModelParam: BROWSER_USE_SEND_MODEL_PARAM,
    browserbaseModelParamName: BROWSERBASE_SEND_MODEL_PARAM ? BROWSERBASE_MODEL_PARAM_NAME : null,
    browserUseModelParamName: BROWSER_USE_SEND_MODEL_PARAM ? BROWSER_USE_MODEL_PARAM_NAME : null,
    models,
    taskCount: selectedTasks.length,
    tasks: selectedTasks,
    totals: summarizeRows(allRows),
    byModel: Object.fromEntries(byModel),
    byTask: Object.fromEntries(byTask),
    resultsJsonl: jsonlPath,
  };
}

function gradeTask(task, outputJson, rawOutput, decodedRunPage) {
  const grader = task.grader ?? { type: "regex", patterns: [] };
  const evidenceText = normalizeEvidenceText(outputJson, rawOutput, decodedRunPage);

  if (grader.type === "counter") {
    return gradeCounter(grader, evidenceText);
  }

  if (grader.type === "jsonSelections") {
    return gradeJsonSelections(grader, outputJson, evidenceText);
  }

  if (grader.type === "regex") {
    return gradeRegex(grader, evidenceText);
  }

  return {
    type: grader.type ?? "unknown",
    pass: false,
    reason: `Unsupported deterministic grader type: ${grader.type}`,
    evidenceText,
  };
}

function runSelfTest() {
  const cases = [
    {
      name: "reaction time ms",
      task: { grader: { type: "regex", patterns: ["\\b\\d+(?:\\.\\d+)?\\s*ms\\b"] } },
      outputJson: { result: "8342 ms", evidence: "Click to keep going" },
      expected: true,
    },
    {
      name: "visual counter",
      task: { grader: { type: "counter", done: 11, total: 11 } },
      outputJson: { result: "11/11 done", evidence: "Objective counter shows 11/11 done" },
      expected: true,
    },
    {
      name: "multi counter incomplete",
      task: { grader: { type: "counter", done: 17, total: 17 } },
      outputJson: { result: "16/17 done" },
      expected: false,
    },
    {
      name: "dropdown selections exact",
      task: {
        grader: {
          type: "jsonSelections",
          expected: {
            "1": "loc-4096",
            "13": "apple,apricot,banana,blackberry,blueberry,cantaloupe,cherry",
          },
        },
      },
      outputJson: {
        selections: {
          "1": "loc-4096",
          "13": "apple, apricot, banana, blackberry, blueberry, cantaloupe, cherry",
        },
      },
      expected: true,
    },
  ];

  const results = cases.map((testCase) => {
    const grade = gradeTask(testCase.task, testCase.outputJson, "", "");
    return {
      name: testCase.name,
      expected: testCase.expected,
      actual: grade.pass,
      pass: grade.pass === testCase.expected,
      grade,
    };
  });

  return {
    suite: SUITE_NAME,
    selfTest: true,
    pass: results.every((result) => result.pass),
    results,
  };
}

function gradeCounter(grader, evidenceText) {
  const done = Number(grader.done);
  const total = Number(grader.total);
  const escaped = `${done}\\s*\\/\\s*${total}`;
  const patterns = [
    new RegExp(`\\b${escaped}\\b`, "i"),
    new RegExp(`\\b${done}\\s+of\\s+${total}\\b`, "i"),
  ];
  const matched = patterns.some((pattern) => pattern.test(evidenceText));
  return {
    type: "counter",
    pass: matched,
    expected: `${done}/${total}`,
    matched,
    reason: matched ? "Counter matched expected value." : `Expected counter ${done}/${total} not found.`,
  };
}

function gradeRegex(grader, evidenceText) {
  const checks = (grader.patterns ?? []).map((pattern) => {
    const regex = new RegExp(pattern, "i");
    const match = regex.exec(evidenceText);
    return {
      pattern,
      pass: Boolean(match),
      match: match?.[0] ?? null,
    };
  });

  const pass = checks.length > 0 && checks.every((check) => check.pass);
  return {
    type: "regex",
    pass,
    checks,
    reason: pass ? "All regex checks matched." : "One or more regex checks did not match.",
  };
}

function gradeJsonSelections(grader, outputJson, evidenceText) {
  const expected = grader.expected ?? {};
  const selections = outputJson?.selections ?? extractSelectionsFromText(evidenceText);
  const fields = Object.entries(expected).map(([field, expectedValue]) => {
    const actual = normalizeValue(selections?.[field]);
    const expectedNormalized = normalizeValue(expectedValue);
    return {
      field,
      expected: expectedNormalized,
      actual,
      pass: actual === expectedNormalized,
    };
  });

  return {
    type: "jsonSelections",
    pass: fields.length > 0 && fields.every((field) => field.pass),
    passed: fields.filter((field) => field.pass).length,
    total: fields.length,
    fields,
    reason: fields.every((field) => field.pass)
      ? "All expected selections matched."
      : "One or more expected selections did not match.",
  };
}

function extractSelectionsFromText(text) {
  const selections = {};
  const patterns = [
    /(?:field|task|control)\s*#?\s*(\d{1,2})\D{0,30}(?:selected|value)\s*[:=]\s*([a-z0-9,+._ -]+)/gi,
    /"(\d{1,2})"\s*:\s*"([^"]+)"/g,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      selections[match[1]] = match[2];
    }
  }

  return selections;
}

function normalizeEvidenceText(outputJson, rawOutput, decodedRunPage) {
  const parts = [
    outputJson?.result,
    outputJson?.evidence,
    outputJson?.score,
    outputJson?.counter,
    Array.isArray(outputJson?.notes) ? outputJson.notes.join(" ") : outputJson?.notes,
    outputJson ? JSON.stringify(outputJson) : "",
    rawOutput,
    extractFallbackOutput(decodedRunPage),
  ];

  return parts
    .filter(Boolean)
    .join("\n")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeValue(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s*,\s*/g, ",")
    .replace(/\s+/g, " ");
}

function incrementSummary(map, key, row) {
  const current = map.get(key) ?? { total: 0, successCriteriaMet: 0, terminal: 0, errors: 0, skipped: 0 };
  current.total += 1;
  if (row.successCriteriaMet) current.successCriteriaMet += 1;
  if (isTerminalStatus(row.status)) current.terminal += 1;
  if (row.error) current.errors += 1;
  if (row.status === "skipped") current.skipped += 1;
  map.set(key, current);
}

function summarizeRows(allRows) {
  return allRows.reduce(
    (summary, row) => {
      summary.total += 1;
      if (row.successCriteriaMet) summary.successCriteriaMet += 1;
      if (isTerminalStatus(row.status)) summary.terminal += 1;
      if (row.error) summary.errors += 1;
      if (row.status === "skipped") summary.skipped += 1;
      return summary;
    },
    { total: 0, successCriteriaMet: 0, terminal: 0, errors: 0, skipped: 0 },
  );
}

function filterTasks(allTasks) {
  return allTasks.filter((task) => {
    if (TASK_IDS.length > 0 && !TASK_IDS.includes(task.id)) return false;
    if (TASK_GROUPS.length > 0 && !TASK_GROUPS.includes(task.group)) return false;
    return true;
  });
}

function validateTasks(allTasks) {
  if (allTasks.length === 0) {
    throw new Error("No tasks selected. Check TASK_IDS or TASK_GROUPS filters.");
  }

  const seen = new Set();
  for (const task of allTasks) {
    for (const field of ["id", "name", "url", "prompt", "successCriteria"]) {
      if (!task[field]) throw new Error(`Task is missing ${field}: ${JSON.stringify(task)}`);
    }
    if (seen.has(task.id)) throw new Error(`Duplicate task id: ${task.id}`);
    seen.add(task.id);
  }
}

function validateProvider(provider) {
  if (!["browserbase", "browser-use", "browserless"].includes(provider)) {
    throw new Error(`Unsupported provider "${provider}". Use browserbase, browser-use, or browserless.`);
  }
}

function validateProviders(providers) {
  if (providers.length === 0) throw new Error("PROVIDERS selected no providers.");
  for (const provider of providers) validateProvider(provider);
}

function readModels() {
  if (MODELS_FILE && existsSync(MODELS_FILE)) {
    return normalizeModels(readJson(MODELS_FILE));
  }

  const modelLabels = csvEnv("MODEL_LABELS");
  if (modelLabels.length > 0) {
    return modelLabels.map((label) => ({ label }));
  }

  const singleLabel = process.env.MODEL_LABEL ?? process.env.MODEL ?? "default";
  return [{ label: singleLabel }];
}

function normalizeModels(value) {
  if (!Array.isArray(value)) throw new Error("Models file must contain a JSON array.");
  return value.map((entry) => {
    if (typeof entry === "string") return { label: entry };
    if (entry?.label) return entry;
    throw new Error(`Invalid model entry: ${JSON.stringify(entry)}`);
  });
}

function buildPlannedMatrix() {
  const matrix = [];
  for (const model of models) {
    for (const provider of PROVIDERS) {
      for (const task of selectedTasks) {
        for (let trial = 1; trial <= TRIALS; trial += 1) {
          matrix.push({
            provider,
            modelLabel: model.label,
            requestedModel: getProviderModel(model, provider),
            taskId: task.id,
            trial,
          });
        }
      }
    }
  }
  return matrix;
}

function getProviderModel(model, provider) {
  if (model.providers && Object.hasOwn(model.providers, provider)) {
    return normalizeOptionalModel(model.providers[provider]);
  }

  if (provider === "browserbase" && Object.hasOwn(model, "browserbaseModel")) {
    return normalizeOptionalModel(model.browserbaseModel);
  }

  if (provider === "browser-use" && Object.hasOwn(model, "browserUseModel")) {
    return normalizeOptionalModel(model.browserUseModel);
  }

  if (provider === "browserless" && Object.hasOwn(model, "browserlessModel")) {
    return normalizeOptionalModel(model.browserlessModel);
  }

  return normalizeOptionalModel(model.value ?? model.label);
}

function isProviderDefaultModel(provider, value) {
  return provider === "browserbase" && ["default", "browserbase-default"].includes(String(value ?? "").toLowerCase());
}

function normalizeOptionalModel(value) {
  if (value == null || value === false) return null;
  if (typeof value === "object" && Object.hasOwn(value, "model")) {
    return normalizeOptionalModel(value.model);
  }
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function extractBrowserbaseReportedModel(start, parsed, run) {
  return (
    start?.model ??
    start?.modelName ??
    start?.configSnapshot?.model ??
    start?.configSnapshot?.modelName ??
    start?.config_snapshot?.model ??
    start?.config_snapshot?.model_name ??
    parsed?.run?.model ??
    parsed?.run?.modelName ??
    parsed?.run?.model_name ??
    parsed?.run?.config_snapshot?.model ??
    parsed?.run?.config_snapshot?.modelName ??
    parsed?.run?.config_snapshot?.model_name ??
    run?.model ??
    run?.modelName ??
    run?.model_name ??
    null
  );
}

async function browserbaseAgentRequest(path, options = {}) {
  const response = await fetch(`${BROWSERBASE_AGENT_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      [BROWSERBASE_API_KEY_HEADER]: BROWSERBASE_AGENT_API_KEY,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  const json = safeJsonParse(text);
  if (!response.ok) {
    throw new Error(`Browserbase Agents API ${response.status}: ${json ? JSON.stringify(json) : text}`);
  }
  if (!json) {
    throw new Error(`Browserbase Agents API returned non-JSON: ${text.slice(0, 500)}`);
  }
  return json;
}

function extractBrowserbaseAgentApiOutput(run) {
  const rawOutput =
    typeof run?.result === "string"
      ? run.result
      : run?.result
        ? JSON.stringify(run.result)
        : run?.cause
          ? JSON.stringify(run.cause)
          : "";
  const json =
    run?.result && typeof run.result === "object"
      ? run.result
      : extractFirstJsonObject(rawOutput) ?? (run?.result ? { result: String(run.result) } : null);

  return {
    json,
    rawOutput,
    status: run?.status,
    success: run?.status === "COMPLETED" ? true : run?.status === "FAILED" ? false : null,
  };
}

function getBrowserbaseDemoRun(runId) {
  const raw = vercelCurl(`${BROWSERBASE_AGENT_BASE}/api/runs/${runId}`, [
    "-H",
    `cookie: user_id=${BB_USER_ID}`,
  ]);
  const json = safeJsonParse(raw);
  if (!json) {
    throw new Error(`Browserbase demo run status returned non-JSON: ${raw.slice(0, 500)}`);
  }
  return json;
}

function extractBrowserbaseDemoOutput(run) {
  const rawOutput =
    typeof run?.result === "string"
      ? run.result
      : run?.result
        ? JSON.stringify(run.result)
        : run?.error
          ? JSON.stringify(run.error)
          : "";
  const json =
    run?.result?.output && typeof run.result.output === "object"
      ? run.result.output
      : run?.result && typeof run.result === "object"
        ? extractFirstJsonObject(run.result.output ?? run.result.message) ?? run.result
        : extractFirstJsonObject(rawOutput) ?? (rawOutput ? { result: rawOutput } : null);

  return {
    json,
    rawOutput,
    status: run?.status,
    success: run?.result?.success ?? (run?.status === "completed" ? true : run?.status === "failed" ? false : null),
  };
}

async function startBrowserbaseRun(requestBody) {
  if (BROWSERBASE_API_MODE === "demo") {
    return vercelCurl(`${BROWSERBASE_AGENT_BASE}/api/v1/agent`, [
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-H",
      `x-user-id: ${BB_USER_ID}`,
      "-d",
      JSON.stringify(requestBody),
    ]);
  }

  if (BROWSERBASE_API_MODE !== "runs") {
    throw new Error('BROWSERBASE_API_MODE must be "demo" or "runs".');
  }

  if (!BROWSERBASE_AGENT_API_KEY) {
    throw new Error("BROWSERBASE_AGENT_API_KEY is required when BROWSERBASE_API_MODE=runs.");
  }

  if (BROWSERBASE_TRANSPORT === "vercel-curl") {
    return vercelCurl(`${BROWSERBASE_AGENT_BASE}${BROWSERBASE_AGENT_RUNS_PATH}`, [
      "-X",
      "POST",
      "-H",
      "Content-Type: application/json",
      "-H",
      `${BROWSERBASE_API_KEY_HEADER}: ${BROWSERBASE_AGENT_API_KEY}`,
      "-d",
      JSON.stringify(requestBody),
    ]);
  }

  if (BROWSERBASE_TRANSPORT !== "fetch") {
    throw new Error('BROWSERBASE_TRANSPORT must be "fetch" or "vercel-curl".');
  }

  const response = await fetch(`${BROWSERBASE_AGENT_BASE}${BROWSERBASE_AGENT_RUNS_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      [BROWSERBASE_API_KEY_HEADER]: BROWSERBASE_AGENT_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Browserbase Agent ${response.status}: ${text}`);
  }
  return text;
}

function getBrowserbaseRunId(start) {
  return (
    start?.runId ??
    start?.run_id ??
    start?.id ??
    start?.run?.id ??
    start?.data?.runId ??
    start?.data?.run_id ??
    start?.data?.id ??
    null
  );
}

function getBrowserbaseRunUrl(start, runId) {
  return (
    start?.runUrl ??
    start?.run_url ??
    start?.url ??
    start?.run?.url ??
    start?.data?.runUrl ??
    start?.data?.run_url ??
    start?.data?.url ??
    (BROWSERBASE_API_MODE === "runs"
      ? `${BROWSERBASE_AGENT_BASE}${BROWSERBASE_AGENT_RUNS_PATH}/${runId}`
      : `${BROWSERBASE_AGENT_BASE}/agents/runs/${runId}`)
  );
}

function getBrowserbaseSessionId(start, parsed, run) {
  return (
    start?.sessionId ??
    start?.session_id ??
    start?.browserbaseSessionId ??
    start?.browserbase_session_id ??
    start?.browserSessionId ??
    start?.browser_session_id ??
    start?.data?.sessionId ??
    start?.data?.session_id ??
    start?.data?.browserbaseSessionId ??
    start?.data?.browserbase_session_id ??
    parsed?.run?.sessionId ??
    parsed?.run?.session_id ??
    parsed?.run?.browserbaseSessionId ??
    parsed?.run?.browserbase_session_id ??
    run?.sessionId ??
    run?.session_id ??
    null
  );
}

function vercelCurl(url, args = []) {
  const forwardedArgs = args.length > 0 ? ["--", ...args] : [];
  return execFileSync("vercel", ["curl", url, ...forwardedArgs], {
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function readJsonl(path) {
  return readFileSync(path, "utf8")
    .split(/\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

function trialKey(row) {
  return [row.provider, row.modelLabel, row.taskId, row.trial].join("\t");
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function prettyJson(text) {
  const parsed = safeJsonParse(text);
  return parsed ? JSON.stringify(parsed, null, 2) : text;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numberEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a number.`);
  return parsed;
}

function boolEnv(name, fallback) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function csvEnv(name, fallback = "") {
  return String(process.env[name] ?? fallback)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function boolFromUnknown(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (["true", "yes", "pass", "passed"].includes(value.toLowerCase())) return true;
    if (["false", "no", "fail", "failed"].includes(value.toLowerCase())) return false;
  }
  return null;
}

function isTerminalStatus(status) {
  return ["completed", "complete", "finished", "stopped", "failed", "cancelled", "canceled", "errored", "timed_out"].includes(
    String(status ?? "").toLowerCase(),
  );
}

function normalizeBrowserbaseRunStatus(status) {
  const normalized = String(status ?? "").toUpperCase();
  if (normalized === "TIMED_OUT") return "timed_out";
  return status;
}

function extractResultText(text) {
  if (!text) return null;
  return (
    /\b\d+(?:\.\d+)?\s*(?:ms|wpm|\/\d+|points?|score|level)\b/i.exec(text)?.[0] ??
    /\b(?:completed|submitted|accepted|done)\b/i.exec(text)?.[0] ??
    null
  );
}

function extractFallbackOutput(decoded) {
  const escapedOutputMatches = [...decoded.matchAll(/\\"output\\":\\"([\s\S]*?)\\",\\"actions\\"/g)];
  const escapedMessageMatches = [...decoded.matchAll(/\\"message\\":\\"([\s\S]*?)\\",\\"success\\"/g)];
  const plainOutputMatches = [...decoded.matchAll(/"output":"([\s\S]*?)","actions"/g)];
  const plainMessageMatches = [...decoded.matchAll(/"message":"([\s\S]*?)","success"/g)];
  const candidate =
    escapedOutputMatches.at(-1)?.[1] ??
    escapedMessageMatches.at(-1)?.[1] ??
    plainOutputMatches.at(-1)?.[1] ??
    plainMessageMatches.at(-1)?.[1] ??
    "";
  return decodeJsonStringFragment(candidate);
}

function decodeJsonStringFragment(value) {
  if (!value) return "";
  try {
    return JSON.parse(`"${value}"`);
  } catch {
    return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
  }
}

function decodeHtmlAndFlightEscapes(html) {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\n/g, "\n")
    .replace(/\\u003c/g, "<")
    .replace(/\\u003e/g, ">")
    .replace(/\\\\/g, "\\");
}

function slug(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
