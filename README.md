# Browser Agent Eval Suite

Runs a list of browser tasks against Browserbase, Browser Use, and Browserless-backed agents, then saves each result by provider, task, model label, and trial.

Grading is deterministic. The harness does not use an LLM judge and does not trust the agent's own success claim. Each task in `tasks.json` has a `grader` config, and `successCriteriaMet` is computed by code from returned result/evidence text or structured selections.

## Repository

This directory is repo-ready as `browser-agent-bench`. It has no runtime dependencies beyond Node.js 18+.

Suggested files to commit for the benchmark repo:

- `README.md`
- `package.json`
- `.gitignore`
- `tasks.json`
- `models.*.json`
- `run-*.mjs`
- `scripts/compare-results.mjs`
- `reports/latest-provider-comparison.md`

Raw run artifacts under `results/` are ignored by default because they can be large, contain HTML/session dumps, and change every run. Keep local result folders for analysis, then commit regenerated reports when you want a stable snapshot.

## Run

From this workspace:

```bash
cd /Users/shriya/conductor/workspaces/Quickstart/chennai/evals/browserbase-agent-suite
npm run eval
```

By default this runs Browserbase without a model field, so Browserbase chooses its default model. Explicit model parameters are sent by default when a models file provides provider-specific values such as `browserbaseModel`, `browserUseModel`, or `browserlessModel`.

## Run Selected Tasks

```bash
TASK_IDS=reaction-time,dropdown-form \
MODELS_FILE=./models.comparable.json \
PROVIDERS=browserbase \
npm run eval
```

Run Browser Use on the same taskset:

```bash
PROVIDERS=browser-use TASK_IDS=reaction-time MODEL_LABEL=browser-use-default npm run eval
```

Compare Browserbase and Browser Use on the same selected tasks:

```bash
PROVIDERS=browserbase,browser-use \
TASK_IDS=reaction-time,dropdown-form \
MODELS_FILE=./models.comparable.json \
npm run eval
```

Compare Browserbase, Browser Use, and Browserless on the same selected tasks:

```bash
PROVIDERS=browserbase,browser-use,browserless \
TASK_IDS=reaction-time,dropdown-form \
MODELS_FILE=./models.comparable.json \
npm run eval
```

Run only Browserless through the documented Browserless MCP + OpenAI Responses path:

```bash
OPENAI_API_KEY='...' \
BROWSERLESS_API_KEY='...' \
PROVIDERS=browserless \
MODEL_LABELS=openai/gpt-5.4-mini \
npm run eval
```

Preview the selected task/model matrix without starting agents:

```bash
DRY_RUN=true TASK_GROUPS=human-benchmark MODEL_LABELS=google/gemini-3-flash-preview,openai/gpt-5.4-mini npm run eval
```

Validate deterministic grader logic without starting agents:

```bash
SELF_TEST=true npm run eval
```

Run only Human Benchmark tasks:

```bash
TASK_GROUPS=human-benchmark \
MODELS_FILE=./models.comparable.json \
PROVIDERS=browserbase \
npm run eval
```

## Compare Model Labels

Use comma-separated labels:

```bash
MODEL_LABELS=google/gemini-3-flash-preview,openai/gpt-5.4-mini,anthropic/claude-sonnet-4-6 npm run eval
```

Or copy `models.example.json`, edit it, then run:

```bash
MODELS_FILE=./models.local.json npm run eval
```

For the originally requested model set, use:

```bash
MODELS_FILE=./models.initial.json \
PROVIDERS=browserbase,browser-use \
npm run eval
```

`models.initial.json` has provider-specific model values. Browserbase values use provider-prefixed Stagehand/Model Gateway style strings. Browser Use values use Browser Use Cloud API strings where currently documented. Unsupported or unconfigured provider/model combinations are written as `skipped` rows instead of being run under the wrong model.

For a clean documented overlap between both providers:

```bash
MODELS_FILE=./models.comparable.json \
PROVIDERS=browserbase,browser-use,browserless \
npm run eval
```

`models.comparable.json` includes `browserlessModel` only for OpenAI labels that can run through the default Browserless MCP + OpenAI Responses path. Unsupported Browserless/model combinations are written as `skipped` rows instead of being run under the wrong model.

For the Browserbase + Browserless overlap where Browser Use should be N/A:

```bash
MODELS_FILE=./models.browserbase-browserless.json \
PROVIDERS=browserbase,browser-use,browserless \
npm run eval
```

That overlap currently includes `openai/gpt-5.4` and `openai/gpt-5.4-mini`. The `browserUseModel` values are explicitly `null`, so Browser Use rows are recorded as skipped and rendered as `n/a` in comparison reports.

The current Browserbase demo endpoint used by this suite exposes `agentMode`, but not the underlying LLM model in its start response. This suite always records `modelLabel` for comparison. When a models file provides `browserbaseModel`, the harness sends it as the Browserbase model field by default. Override the field name when needed:

```bash
MODEL_PARAM_NAME=model MODELS_FILE=./models.comparable.json PROVIDERS=browserbase npm run eval
```

## Browserbase Agent Runs API

By default, the Browserbase provider uses the older demo route:

```text
POST https://bb-agent-api-demo.vercel.app/api/v1/agent
```

The `product/agents-api-demo` branch implements this route with a `prompt`
field and optional `configId`; it does not implement `POST /v1/agents/runs`
with `task` and `agentId` inside `apps/agents-api-demo`.

The demo route keys config lookup off `user_id` / `x-user-id`. The
`product/agents-api-demo` branch hardcodes the shared web user id to
`f1b61fb6-a9c5-4ebb-826a-1e2d273864ac`, and this harness uses that by default.

To use the public Browserbase Agents API shape from `apps/api`:

```http
POST https://api.browserbase.com/v1/agents/runs
Content-Type: application/json
x-bb-api-key: <YOUR_API_KEY>

{
  "task": "<benchmark prompt>",
  "agentId": "1a67efdd-1854-44c1-be15-bf73278e0747"
}
```

run with:

```bash
BROWSERBASE_API_MODE=runs \
BROWSERBASE_AGENT_API_KEY='...' \
BROWSERBASE_AGENT_ID=1a67efdd-1854-44c1-be15-bf73278e0747 \
PROVIDERS=browserbase \
MODEL_LABEL=browserbase-agent \
npm run eval
```

The runner accepts response IDs named `runId`, `run_id`, `id`, or nested `data.id`. If the endpoint returns a dashboard-visible Browserbase session id, it is saved as `browserbaseSessionId` in each trial `summary.json` and row in `results.jsonl`.

The internal agent-runner service from `apps/agent-runner` exposes `POST /v1/runs/start`; callers normally should not hit it directly because it requires internal fields such as `runId` and `projectId`. The public API adapter is `/v1/agents/runs`.

For protected Vercel preview/demo hosts, the runner uses `vercel curl` by default. For a public API host, `fetch` is used by default:

```bash
BROWSERBASE_TRANSPORT=fetch npm run eval
```

## Browserless MCP Agent

The Browserless provider defaults to the documented hosted MCP server path:

```text
https://mcp.browserless.io/mcp
```

The runner sends one OpenAI Responses API request with Browserless MCP configured as an MCP tool. Required environment variables:

```bash
OPENAI_API_KEY='...'
BROWSERLESS_API_KEY='...'
```

Useful Browserless settings:

```bash
BROWSERLESS_MCP_SERVER_URL=https://mcp.browserless.io/mcp
BROWSERLESS_API_URL=https://production-sfo.browserless.io
BROWSERLESS_OPENAI_BASE=https://api.openai.com/v1
```

For a custom Browserless-compatible agent wrapper, set:

```bash
BROWSERLESS_AGENT_MODE=endpoint
BROWSERLESS_AGENT_ENDPOINT=https://example.com/browserless-agent
BROWSERLESS_AGENT_API_KEY='...'
```

Endpoint mode posts `{ task, model, output_schema }` and expects a JSON response with either `output_text`, `output`, or `result`.

## Output

Each suite run creates:

```text
results/<timestamp>__browserbase-agent-suite__pid-<pid>/
  results.jsonl
  summary.json
  runs/<provider>/<model-label>/<task-id>/trial-<n>/
    start-response.json
    run-page.html       # Browserbase
    session.json        # Browser Use
    summary.json
```

`results.jsonl` is the easiest file to load into a spreadsheet or notebook. `summary.json` aggregates pass counts by model and task.

Each row includes `deterministicGrade`, which explains exactly what the grader checked and why it passed or failed.

## Compare Latest Results

Generate the side-by-side provider report:

```bash
npm run compare
```

This reads all local `results/*/results.jsonl` files, picks the newest row for each provider/model/task/trial, and writes:

```text
reports/latest-provider-comparison.md
```

The per-model summary compares only tasks that every active provider ran for the same model. Provider-only rows are omitted from the side-by-side comparison and called out in the report header.

Useful options:

```bash
npm run compare -- --no-details
npm run compare -- --results ./results --output ./reports/latest-provider-comparison.md
```

## Useful Env Vars

- `MODEL_LABEL` - one model label for this run.
- `MODEL_LABELS` - comma-separated model labels.
- `MODELS_FILE` - JSON array of strings or objects with `label`.
- `SEND_MODEL_PARAM` - sends explicit model values by default. Set to `false` to omit provider model fields.
- `BROWSERBASE_SEND_MODEL_PARAM` - override model sending for Browserbase.
- `BROWSER_USE_SEND_MODEL_PARAM` - override model sending for Browser Use.
- `BROWSERBASE_MODEL_PARAM_NAME` - Browserbase request field name. Defaults to `model`.
- `BROWSER_USE_MODEL_PARAM_NAME` - Browser Use request field name. Defaults to `model`.
- `PROVIDERS` - comma-separated providers. Supports `browserbase`, `browser-use`, and `browserless`. Defaults to `browserbase`.
- `TASK_IDS` - comma-separated task IDs to run.
- `TASK_GROUPS` - comma-separated task groups, for example `human-benchmark`.
- `DRY_RUN` - set to `true` to validate the selected matrix without starting agents.
- `SELF_TEST` - set to `true` to run deterministic grader fixtures without starting agents.
- `TRIALS` - trials per task/model. Defaults to `1`.
- `TIMEOUT_MS` - timeout per trial. Defaults to `600000`.
- `POLL_MS` - poll interval. Defaults to `5000`.
- `BB_USER_ID` - stable user ID sent to the protected demo. Defaults to `conductor-eval-shriya`.
- `BROWSERBASE_AGENT_BASE` - defaults to `https://bb-agent-api-demo.vercel.app`.
- `BROWSERBASE_API_MODE` - `demo` for `POST /api/v1/agent`, or `runs` for `POST /v1/agents/runs`.
- `BROWSERBASE_AGENT_RUNS_PATH` - Agent Runs API path. Defaults to `/v1/agents/runs`.
- `BROWSERBASE_AGENT_API_KEY` - required when `BROWSERBASE_API_MODE=runs`; sent as `x-bb-api-key`. Falls back to `BB_AGENT_API_KEY` or `BROWSERBASE_API_KEY`.
- `BROWSERBASE_API_KEY_HEADER` - API key header name. Defaults to `x-bb-api-key`.
- `BROWSERBASE_AGENT_ID` - required Agent Runs API agent id. Defaults to `1a67efdd-1854-44c1-be15-bf73278e0747`.
- `BROWSERBASE_TRANSPORT` - `vercel-curl` for protected Vercel hosts or `fetch` for public API hosts. Defaults to `vercel-curl` when `BROWSERBASE_AGENT_BASE` contains `.vercel.app`.
- `BROWSER_USE_API_KEY` - required when `PROVIDERS` includes `browser-use`.
- `OPENAI_API_KEY` - required when `PROVIDERS` includes `browserless` and `BROWSERLESS_AGENT_MODE=openai-responses`.
- `BROWSERLESS_API_KEY` / `BROWSERLESS_TOKEN` - required when `PROVIDERS` includes `browserless`.
- `BROWSERLESS_AGENT_MODE` - `openai-responses` or `endpoint`. Defaults to `openai-responses`.
- `BROWSERLESS_MCP_SERVER_URL` - Browserless MCP server URL. Defaults to `https://mcp.browserless.io/mcp`.
- `BROWSERLESS_API_URL` - optional Browserless regional browser API URL sent as `x-browserless-api-url`.
- `BROWSERLESS_OPENAI_BASE` - OpenAI-compatible Responses API base URL. Defaults to `https://api.openai.com/v1`.
- `BROWSERLESS_AGENT_ENDPOINT` - endpoint URL for `BROWSERLESS_AGENT_MODE=endpoint`.
- `BROWSERLESS_AGENT_API_KEY` - bearer token for `BROWSERLESS_AGENT_MODE=endpoint`.
- `RUN_ID` - optional explicit result folder name. By default the runner includes a timestamp and process id to avoid collisions.
