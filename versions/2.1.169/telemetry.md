# Telemetry

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.3.14

See [data/telemetry-events.yaml](data/telemetry-events.yaml) for the full structured dataset of all **1086** events, grouped into 44 categories.

All claims here are grounded in the beautified source `cli.beauty.js`. Minified identifiers are mangled per build; function names are cited where load-bearing.

---

## 1. How an event flows (the dispatch pipeline)

Events are fired everywhere in the code by **`d(eventName, payload)`** (was `c(...)` in 2.1.32) and the async variant **`Ny(eventName, payload)`** (`logEventAsync`). These do **not** send anything directly — they push onto an in-memory queue (`createAnalyticsState`) until an analytics *sink* is attached (`attachAnalyticsSink`/`mi8`), then drain the queue into it (`cli.beauty.js:3882`).

The real sink is wired by `initializeAnalyticsSink` (`qEH`, line 141963):

```js
mi8({ logEvent: PS_, logEventAsync: WS_ })
```

`PS_`/`WS_` (line 141927/141947) are the fan-out point. For every event they:

1. **Sample** — `X_8(name)` looks up the per-event `sample_rate` from GrowthBook config `tengu_event_sampling_config`; `Math.random() < rate` decides keep/drop. If dropped (`q===0`) the event is discarded entirely. If kept and rate<1, `sample_rate` is stamped into the payload.
2. **Mirror to Datadog** — only if `EeK()` is true (gated by flag `tengu_log_datadog_events`, default **false**) → `EiH(...)`.
3. **Always send to 1P** — `XiH(name, payload)` (sync) / `dS(...)` (await) → the first-party OTLP-logs pipeline.

So in a normal install the **only** outbound destination for `tengu_*` events is Anthropic's own first-party endpoint. Datadog, user-OTel, and Perfetto are all opt-in/conditional layered on top.

---

## 2. Telemetry Stack

| Service | Purpose | Endpoint / sink | Default state | Primary control |
|---------|---------|-----------------|---------------|-----------------|
| **1P event logging** (Anthropic first-party, OTLP-logs) | Primary product analytics — every `tengu_*` event | `https://api.anthropic.com/api/event_logging/v2/batch` (staging → `api-staging.anthropic.com`; legacy path `/api/event`) | **ON** when auth is first-party (`Mq()==="firstParty"`) and not nonessential-traffic-disabled | `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DO_NOT_TRACK`; GrowthBook kill-switch `firstParty` |
| **Datadog** | Logs mirror of a curated **allow-list** of ~150 high-signal events (US5 region) | `https://http-intake.logs.us5.datadoghq.com/api/v2/logs` (header `DD-API-KEY: pubea5604404508cdd34afb69e6f42a05bc`) | **OFF** (requires flag) | flag `tengu_log_datadog_events`; GrowthBook kill-switch `datadog`; `CLAUDE_CODE_BYOC_ENABLE_DATADOG` (BYOC); `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS` |
| **OpenTelemetry** (user-configurable "3P telemetry") | Metrics / traces / logs to the operator's own OTLP/Prometheus backend | Configurable via `OTEL_EXPORTER_OTLP_*` (no Anthropic endpoint) | **OFF** | `CLAUDE_CODE_ENABLE_TELEMETRY` (master), full `OTEL_*` + `ANT_OTEL_*` family |
| **GrowthBook** | Feature flags + experiment exposure logging | `https://cdn.growthbook.io` (`clientKey`, streaming host) | ON for flags; exposures piggy-back on the 1P pipe (`growthbook_experiment` event) | `DISABLE_GROWTHBOOK` |
| **Perfetto** | Local Chrome-trace/Perfetto JSON file for perf debugging | local file (no network) | **OFF** | `CLAUDE_CODE_PERFETTO_TRACE` (path), `CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S` |
| **Beta tracing (detailed)** | Extra-detailed OTel spans to an internal collector | `BETA_TRACING_ENDPOINT` | **OFF** | `ENABLE_BETA_TRACING_DETAILED` + `BETA_TRACING_ENDPOINT` (both required) |
| ~~Segment~~ | — | — | **REMOVED** | n/a |
| ~~Sentry~~ | — | — | **NOT PRESENT** | n/a |

### Changes vs 2.1.32

- **Segment is gone.** 2.1.32 documented `api.segment.io/v1/batch` as "primary analytics". In 2.1.169 there is **no** `segment.io`/`segment.com`/`writeKey`-style Segment client; all `segment`/`identify` string hits are `Intl.Segmenter` and AWS-SDK middleware false-positives. The **first-party OTLP-logs pipeline (`api.anthropic.com/api/event_logging/v2/batch`) is now the primary analytics backend.**
- **Datadog token rotated**: `pubbbf48e6d78dae54bceaa4acf463299bf` → `pubea5604404508cdd34afb69e6f42a05bc`. Still US5, still `http-intake.logs`. Datadog is now an **allow-listed mirror gated behind a flag**, not an always-on logger; default flush 15,000 ms, max batch 100.
- **No Sentry SDK** in either build (the only `sentry`/`dsn` hits are the Sentry MCP plugin docs and a SAS syntax-highlighter dictionary).
- GrowthBook unchanged as the flag backend.

### 1P pipeline internals (`L_8`, `sZ6`)

- Built on the OpenTelemetry Logs SDK: a `LoggerProvider` with a `BatchLogRecordProcessor` and a **custom OTLP exporter class `sZ6`** (line 139516). Logger name `com.anthropic.claude_code.events`; resource attrs `service.name=claude-code`, `service.version=2.1.169`, plus `wsl.version` on WSL.
- Batch config from GrowthBook `tengu_1p_event_batch_config`, falling back to: `scheduledDelayMillis` ← `OTEL_LOGS_EXPORT_INTERVAL` or **10,000 ms**, `maxExportBatchSize` **200**, `maxQueueSize` **8192**; pre-init queue cap **1024**.
- **Durable retry**: failed batches are persisted to disk as JSON (`...json` keyed by date + a per-process UUID) and retried in the background on next launch — up to `maxAttempts` (default **8**), exponential backoff 500 ms→30 s.
- Each event record body = the event name; attributes = `{ event_name, event_id (uuid), core_metadata, user_metadata, event_metadata, user_id }`.

---

## 3. Event payload identity & device fields

Two metadata blocks are stamped onto **every** 1P event (cross-link → `device-fingerprinting.md`):

### `core_metadata` — `j_8()` (line 139220)
`model`, `sessionId`, `userType:"external"`, `betas`, `envContext` (platform / arch / node / terminal / shell / package_managers / runtimes / is_ci / is_github_action / is_claude_ai_auth / version / build_time / deployment_environment / WSL version / remote-env type / container id), `entrypoint` (`CLAUDE_CODE_ENTRYPOINT`), `sessionKind`, `hasAttacher`, `agentSdkVersion`, `isInteractive`, `clientType`, `processMetrics`, `subscriptionType`, `rendererMode`, and SWE-bench run/instance/task ids when present.

### `user_metadata` — `gnH()` (line 132437)
`deviceId`, `sessionId`, `email`, `appVersion`, `platform`, `organizationUuid`, `accountUuid`, `userType`, `subscriptionType`, `rateLimitTier`, `firstTokenTime`, and (in GitHub Actions) `githubActionsMetadata` = actor / actorId / repository / repositoryId / repositoryOwner / repositoryOwnerId.

### `deviceId` / `user_id` — `cU()` (line 141641)
Returns the stored config `userID`; if absent, **generates a fresh 32-byte random hex** (`crypto.randomBytes(32)`) and persists it to config. This is the stable per-install device identifier. Datadog sampling additionally **sha256-hashes this id** and takes `parseInt(hash[0:8],16) % 30` to assign a stable 0–29 bucket (`XS_`, line 141925) — i.e. a 1-in-30 deterministic device cohort for Datadog volume control.

GrowthBook exposure events (`growthbook_experiment`, `qG6`) carry `device_id`, `account_uuid`, `organization_uuid`, `session_id`, `experiment_id`, `variation_id`.

---

## 4. Controls & opt-out matrix

`d()` reaches the 1P sink only if `iu()` returns true, i.e. **`!QC()`**. `QC()` (line 137614) = `RE_()  ||  ZO() !== null  ||  O3$()`:

| Condition | Function | What disables 1P telemetry |
|-----------|----------|----------------------------|
| Not first-party auth | `RE_()` / `o_()` | Using Bedrock/Vertex/Foundry/Gateway/Mantle (non-`firstParty`) — telemetry off |
| Any kill-switch env var set | `ZO()` / `wi$()` | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, `DO_NOT_TRACK` |
| Nonessential traffic gate ≠ default | `O3$()` | managed-config "nonessential traffic" set to anything but `default` |

| Variable | Effect | Confirmed |
|----------|--------|-----------|
| `DISABLE_TELEMETRY` | Master kill switch — disables 1P event logging (and therefore Datadog mirror) | yes (`wi$`) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disables all non-essential network incl. telemetry, GrowthBook refresh, surveys | yes (`cQH`/`wi$`) |
| `DO_NOT_TRACK` | Honors the DNT standard — disables 1P telemetry | yes (`wi$`) |
| `DISABLE_ERROR_REPORTING` | Disables internal error reporting (`SH`, line 47210) | yes |
| `DISABLE_GROWTHBOOK` | Disables flag backend + exposure logging | yes |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | **Enables** the user-configurable OpenTelemetry exporters (off by default) | yes (`Af4`, line 325529) |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` / `ENABLE_ENHANCED_TELEMETRY_BETA` | Enables enhanced OTel traces/interaction spans (`Mm6`, line 258588) | yes |
| `ENABLE_BETA_TRACING_DETAILED` + `BETA_TRACING_ENDPOINT` | Both required to enable detailed beta tracing | yes (line 257845) |
| `CLAUDE_CODE_BYOC_ENABLE_DATADOG` | In BYOC env, re-enables Datadog (otherwise BYOC suppresses it — `OtK`, line 137610) | yes |
| `OTEL_LOG_USER_PROMPTS` | If unset, user prompts in OTel spans are `<REDACTED>` (line 258673) | yes |
| `OTEL_METRICS_INCLUDE_{SESSION_ID,ACCOUNT_UUID,ENTRYPOINT,VERSION,RESOURCE_ATTRIBUTES}` | Opt-in to attach identity dims to OTel metrics | yes |
| `CLAUDE_CODE_PERFETTO_TRACE` | Path → enables local Perfetto trace writing | yes |
| GrowthBook `tengu_log_datadog_events` (default `false`) | Gates the Datadog mirror | yes |
| GrowthBook kill-switches `firstParty` / `datadog` (`ayH(...)`) | Remote kill of 1P / Datadog without a release | yes |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` / `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` | Disable / re-enable post-task feedback surveys | yes |

Bedrock/Vertex/Foundry/Mantle/AnthropicAWS auth and `DISABLE_ERROR_REPORTING` also short-circuit the error reporter `SH()` early.

---

## 5. Datadog allow-list (notable mechanism)

When Datadog is enabled, **only events in a hardcoded `Set` (`wS_`, ~150 names)** are mirrored, and **only a fixed set of metadata keys** are forwarded (`MS_`): `arch, classifierModel, classifierStage, clientType, decision, entrypoint, errorKind, errorType, failureKind, fastPath, sessionKind, http_status_range, http_status, kairosActive, model, op, outcome, platform, provider, reason, coachMode, source, subscriptionType, toolName, userBucket, userType, version, versionBase`. The allow-list skews to API health, OAuth, refusal-fallback, background/daemon, SDK, and auto-mode events — i.e. reliability monitoring, not full product analytics. Defaults: flush 15,000 ms (`CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS` override), max batch 100, request timeout 5,000 ms.

---

## 6. Event categories (1086 total)

Event count jumped **~239 documented → 1086** vs 2.1.32 (≈4.5×). Counts below are exact (one event = one `tengu_*` name in `data/raw/events-d.txt`, all categorised).

| Category | Count | Description |
|----------|------:|-------------|
| Background & Daemon | 80 | bg worker/daemon lifecycle, adopt/respawn/dispatch, PTY host, spare claim |
| Plugins / Marketplace / Skills | 60 | plugin lifecycle & CLI, marketplace add/update, skills sync, keybindings |
| OAuth & Authentication | 57 | login flows, token exchange/refresh/locks, API keys, WIF locks |
| API & Model | 46 | queries, errors, retries, fallbacks, model switch, effort, fast mode |
| Billing / Upsell / Rate Limit | 44 | extra usage, rate-limit menu, spend limits, upsells, pro trial, cost thresholds |
| MCP | 44 | server lifecycle, connections, auth, tools, elicitation, channels, pagination |
| Auto-Update | 43 | updater success/fail/lock, native install, binary download, version checks |
| Settings & Config | 43 | config changes/locks, `*_setting_changed` toggles, notifications, fleetview |
| Session Lifecycle | 42 | init/exit/startup/resume/onboarding/session management |
| Compaction | 38 | auto/micro/partial/reactive/precomputed compaction, message filtering |
| Teleport / Remote | 33 | teleport lifecycle/errors, remote sessions, review-remote, autofix PR |
| File Operations & History | 32 | file change/op, snapshots, rewind, backups, git ops, worktrees |
| IDE / External / CLI Commands | 32 | IDE ext, GitHub/Slack app, GH actions, CCR, doctor, tui, headless |
| Streaming & Performance | 32 | stream errors/stalls, context size, watchdogs, render perf |
| Tool Usage | 30 | execution, results, permissions, input coercion, diffs |
| Agents | 26 | agent spawn/tool-select, subagents, fork, stop hooks, async stalls |
| Permission | 24 | requests/explainers, bypass, trust, auto-mode decisions, managed-settings security |
| Teams & Team Memory | 24 | team create/delete, teammate config, team-memory sync stores |
| Bridge / REPL | 23 | bridge session, heartbeat, REPL websocket, registration, tokens |
| Provider Setup | 23 | Bedrock/Vertex probe/setup/upgrade wizards, WIF, org penguin mode |
| Conversation Flow | 21 | fork, message selector, chains, context hints, attachment queries, slash links |
| Hooks | 21 | pre/post tool hooks, stop hooks, run hook, plugin/SDK hooks, persistence |
| Loops / Kairos / Scheduling | 21 | kairos loops, dynamic wakeups, dreams, scheduled tasks, goals, remote trigger |
| User Input | 21 | prompts, commands, paste, editor, attachments, brief mode |
| Bash / Shell Tool | 19 | command exec, security checks, backgrounding, snapshots |
| Refusal Fallback / Retraction | 18 | refusal fallback prompts/latches, retraction harvest/eviction |
| Session / Auto Memory | 17 | memory access/load/extract, memdir, sm_compact, personal mem sync |
| Feedback & Survey | 16 | feedback survey, feature rating, bug report, tips, prompt suggestions, powerups |
| Error & Recovery | 15 | uncaught exceptions, rejections, query errors, sysprompt boundaries, tombstones |
| Ask-User / Dialog | 14 | AskUserQuestion, request-user dialogs, dialog host, control responses |
| Privacy & Policy | 14 | grove policy views/submit/toggle, accept/reject feedback mode |
| Claude.ai MCP & Chrome | 13 | claude.ai MCP auth, in-chrome setup, builtin MCP toggle |
| Rotunda / Credits (internal) | 11 | rotunda pennant credit-strip, convolute arcades retries, copper lantern |
| Tool Search | 11 | agentic/native search, ripgrep, file suggestions, indexing |
| Workflows | 11 | workflow launch/complete/phase, budget/agent caps, keywords |
| Agent SDK | 10 | control roundtrip, handshake, ttft, stalls, schema violations, crashes |
| Images / PDF / Media | 10 | image resize/compress, PDF extraction, paste image, web fetch, terminal probes |
| Ultraplan | 10 | cloud plan offload: launch, plan-ready, approve, stop, failures |
| Transcript | 9 | transcript access/view/toggle, parent cycles, phantom parent, write failures |
| CLAUDE.md | 7 | CLAUDE.md initial load, includes dialogs, permission errors, write |
| Voice | 7 | voice recording lifecycle, circuit breaker, streaming |
| Advisor Tool | 6 | advisor command/dialog/tool calls, token usage, retries |
| At-Mention | 5 | @-mention directory/filename/MCP-resource extraction |
| Plan Mode | 3 | enter/exit plan mode, exit called outside plan |

### Notable new event families vs 2.1.32

- **Background & Daemon (80)** — entirely new persistent-daemon / background-worker subsystem (`tengu_bg_*`, `tengu_daemon_*`): adopt, respawn, spare-claim, PTY-host crash, zombie restart, low-mem retire.
- **Plugins / Marketplace / Skills (60)** — plugin CLI lifecycle, marketplace, skills sync.
- **Bridge / REPL (23)** — Chrome-bridge + REPL websocket subsystem.
- **Loops / Kairos / Scheduling (21)** — `tengu_kairos_*`, `tengu_loop_*`, `tengu_auto_dream_*`, `tengu_scheduled_task_*`, `tengu_goal_*`, `tengu_remote_trigger`.
- **Workflows (11)** and **Ultraplan (10)** — multi-phase workflow runner and cloud plan-offload.
- **Teams & Team Memory (24)** — team create/delete, teammate model/mode, multi-store team-memory sync.
- **Advisor (6)**, **Voice (7)**, **Rotunda credit-stripping (11)**, **Refusal retraction (18)**, **Provider setup wizards (23)** — all new.

---

## 7. Sample payload shapes (verified call sites)

```js
// tengu_tool_use_success  (cli.beauty.js:409372)
d("tengu_tool_use_success", {
  messageID, toolName, isMcp, durationMs,
  rssDeltaBytes, heapUsedDeltaBytes, externalDeltaBytes,
  preToolHookDurationMs, permissionDurationMs,
  toolResultSizeBytes, toolInputSizeBytes,
  fileExtension?, filePathLen?, bashCommandLen?
})

// tengu_bash_tool_command_executed  (cli.beauty.js:422325)
d("tengu_bash_tool_command_executed", {
  command_type, stdout_length, stderr_length, exit_code,
  interrupted, executor_shell, executor_shell_overridden,
  sandboxed, destructive_category, permission_mode
})

// tengu_api_error  (cli.beauty.js:430909)
d("tengu_api_error", {
  model, error, status, errorType, effort_level?,
  messageCount, messageTokens, durationMs, durationMsIncludingRetries,
  attempt, provider, requestId, invokingRequestId?, invocationKind?,
  clientRequestId, didFallBackToNonStreaming, promptCategory?, gateway?
})

// tengu_mcp_server_connection_failed  (cli.beauty.js:263898)
d("tengu_mcp_server_connection_failed", {
  transportType, errorCode, ...serverContext
})

// tengu_workflow_completed  (cli.beauty.js:375770)
d("tengu_workflow_completed", {
  workflow_run_id, workflow_source, workflow_name, workflow_description,
  status, agent_count, total_tokens, total_tool_calls, duration_ms
})

// tengu_feedback_survey_event  (cli.beauty.js:631707) — also emits OTel metric m1("feedback_survey", …)
d("tengu_feedback_survey_event", { survey_type, ... })

// tengu_brief_mode_enabled  (cli.beauty.js:658270)
d("tengu_brief_mode_enabled", { enabled, gated, source })
```

Free-form string values that could be high-cardinality are routinely passed through helpers `_$()` / `z$()` (label normalisers) before being attached, and proto-internal keys (`_PROTO_*`) are stripped by `stripProtoFields` before send.

---

## 8. Uncertainties

- Exact 1P record JSON wire shape (OTLP-logs encoding) is inferred from the emit call + exporter class; the serialized HTTP body wasn't dumped byte-for-byte.
- `Mq()` provider classification (firstParty / bedrock / vertex / gateway / mantle) is read from call sites; the full enum wasn't exhaustively traced.
- Category boundaries for a handful of cross-cutting names (e.g. `tengu_stage_file_completed`, `tengu_auto_default_*`) are judgment calls; see `data/telemetry-events.yaml` for the canonical assignment.
- The `tengu_1p_event_batch_config` / `tengu_event_sampling_config` GrowthBook payloads are remote, so live per-event sample rates can't be read from the binary — only the fallback defaults are visible.
