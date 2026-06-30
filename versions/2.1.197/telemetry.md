# Telemetry

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.4.0

See [data/telemetry-events.yaml](data/telemetry-events.yaml) for the full structured dataset of all **1163** events, grouped into 44 categories.

All claims here are grounded in the beautified source `cli.beauty.js`. Minified identifiers are mangled per build; function names are cited where load-bearing. This file documents the **delta vs 2.1.169** wherever the behaviour changed.

---

## 1. How an event flows (the dispatch pipeline)

Events are fired everywhere by **`q(eventName, payload)`** (was `d(...)` in 2.1.169) — **1684 call sites, 1163 distinct `tengu_`-prefixed names**. The async variant is **`gy(eventName, payload)`** (was `Ny`). Neither sends anything directly: they push onto an in-memory queue (`fis()` → `{eventQueue:[], sink:null}`) until a sink is attached by **`yAr(sink)`** (was `mi8`), which then drains the queue (`cli.beauty.js:4122`, `q` at `:4135`).

The real sink is wired by `initializeAnalyticsSink` (`bVe`, `cli.beauty.js:281359`):

```js
yAr({ logEvent: CDp, logEventAsync: IDp })
```

`CDp` (sync) / `IDp` (async) are the fan-out point (`cli.beauty.js:281326` / `:281347`, were `PS_`/`WS_`). For every event they:

1. **Sample** — `tRn(name)` (`:144656`, was `X_8`) reads the per-event `sample_rate` from GrowthBook config `tengu_event_sampling_config`. Logic: no entry → `null` (keep, no stamp); `rate>=1` → `null` (keep); `rate<=0` → `0` (drop); else `Math.random() < rate ? rate : 0`. If it returns `0` the event is discarded entirely; if a fractional rate is kept it is stamped into the payload as `sample_rate`.
2. **Mirror to Datadog** — only if `jgo()` is true (`:281317`, `shouldTrackDatadog`, was `EeK`) → `gft(name, AQe(payload))`. `AQe` (`:4100`) strips `_PROTO_*` proto-internal keys before send (was `stripProtoFields`).
3. **Always send to 1P** — `Nit(name, payload)` (sync, `:144712`) / `MU(...)` (await) → the first-party OTLP-logs pipeline (were `XiH`/`dS`).

`CDp` is wrapped in a **re-entrancy guard** (`Fgo`, `:281333`): if the metadata collector (`getEventMetadata`, which reads model/betas/auth) synchronously calls `logEvent`, the nested event is **dropped** with an error log rather than recursing. This guard is new relative to the 2.1.169 write-up.

So in a normal install the **only** outbound destination for `tengu_*` events is Anthropic's own first-party endpoint. Datadog, user-OTel, and Perfetto are all opt-in/conditional layered on top.

---

## 2. Telemetry Stack

| Service | Purpose | Endpoint / sink | Default state | Primary control |
|---------|---------|-----------------|---------------|-----------------|
| **1P event logging** (Anthropic first-party, OTLP-logs) | Primary product analytics — every `tengu_*` event | `https://api.anthropic.com/api/event_logging/v2/batch` (staging → `api-staging.anthropic.com` when `ANTHROPIC_BASE_URL` is staging; `cli.beauty.js:144252`) | **ON** when `RW()` is true (firstParty auth, no gateway, no kill-switch) | `DISABLE_TELEMETRY`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DO_NOT_TRACK`; GrowthBook kill-switch `firstParty` (`dGe`) |
| **Datadog** | Logs mirror of a hardcoded **allow-list** of **159** high-signal events (US5 region) | `https://http-intake.logs.us5.datadoghq.com/api/v2/logs` (`:606713`; header `DD-API-KEY: pubea5604404508cdd34afb69e6f42a05bc`, `:606714`) | **OFF** (requires flag) | flag `tengu_log_datadog_events`; GrowthBook kill-switch `datadog`; `CLAUDE_CODE_BYOC_ENABLE_DATADOG`; `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS` |
| **OpenTelemetry** (user-configurable "3P telemetry") | Metrics / traces / logs to the operator's own OTLP/Prometheus backend | Configurable via `OTEL_EXPORTER_OTLP_*` (no Anthropic endpoint) | **OFF** | `CLAUDE_CODE_ENABLE_TELEMETRY` (master, `:337808`), full `OTEL_*` family |
| **GrowthBook** | Feature flags + experiment exposure logging | `https://cdn.growthbook.io` (`:39708`) | ON for flags; exposures piggy-back on the 1P pipe (`growthbook_experiment` event, `WYr` `:144741`) | `DISABLE_GROWTHBOOK` |
| **Perfetto** | Local Chrome-trace/Perfetto JSON file for perf debugging | local file (no network, `:275202`) | **OFF** | `CLAUDE_CODE_PERFETTO_TRACE` (path), `CLAUDE_CODE_PERFETTO_WRITE_INTERVAL_S` |
| **Beta tracing (detailed)** | Extra-detailed OTel spans to an internal collector | `BETA_TRACING_ENDPOINT` | **OFF** | `ENABLE_BETA_TRACING_DETAILED` + `BETA_TRACING_ENDPOINT` (both required, `:274853`) |
| ~~Segment~~ | — | — | **REMOVED** (no `segment.io`/`writeKey` client) | n/a |
| ~~Sentry~~ | — | — | **NOT PRESENT** (no `sentry.io`/`@sentry`/`dsn` SDK) | n/a |

### Changes vs 2.1.169

- **Datadog client token UNCHANGED — NOT rotated.** Still `pubea5604404508cdd34afb69e6f42a05bc` (`z3n`, `:606714`), identical to 2.1.169. Still US5, still `http-intake.logs.us5.datadoghq.com/api/v2/logs`. Defaults also unchanged: flush **15,000 ms** (`Udm`, override `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS`), max batch **100** (`Fdm`), request timeout **5,000 ms** (`jdm`).
- **Datadog allow-list grew 156 → 159 events (+3)** (`Gdm`, `:606734`) — verified counts (2.1.169 had 156: 149 `tengu_*` + 7 `chrome_bridge_*`; 2.1.197 has 159: 152 `tengu_*` + the same 7 `chrome_bridge_*`; both include 3 `tengu_feature_ok/bad/sad` sentinels). The forwarded-metadata key list (`Wdm`) **dropped `kairosActive`** and **added `server_reason` + `server_type`** vs 2.1.169 (verified: `kairosActive` 0 hits in 2.1.197, `server_reason`/`server_type` 0 hits in 2.1.169).
- **A second Datadog endpoint exists** — `https://browser-intake-us5-datadoghq.com/api/v2/logs` (`BUa`, `:299157`) — used by the Chrome-bridge / browser RUM logger (`chrome_bridge_*` events), separate from the main CLI logs intake.
- **Segment still gone, Sentry still absent.** A direct grep for `segment.io` / `api.segment` / `sentry.io` / `@sentry` returns **zero** SDK hits; the only `datadog`/`sentry` string occurrences are MCP-directory docs (analytics-bi connector keywords) and the Datadog MCP connector example — not a client.
- **Master gate refactored** — `Wj()` (`:141945`) now explicitly checks the **gateway plane** (`Lm() !== null`) as a distinct disable condition, separate from the not-firstParty check. See §4.
- GrowthBook unchanged as the flag backend (`cachedGrowthBookFeatures`, `:144967`).

### 1P pipeline internals (`nRn`, `BYr`)

- Built on the OpenTelemetry Logs SDK: a `LoggerProvider` with a `BatchLogRecordProcessor` and a **custom OTLP exporter class `BYr`** (`:144812`, was `sZ6`). Endpoint default path `/api/event_logging/v2/batch`; resource attrs `service.name=claude-code`, `service.version=2.1.197` (`:144800`), plus `wsl.version` on WSL (`:144807`).
- Exporter defaults (`:144253`): `timeout` 10,000 ms, `maxBatchSize` 200, `batchDelayMs` 100, `baseBackoffDelayMs` 500, `maxBackoffDelayMs` 30,000, **`maxAttempts` 8** (durable retry).
- Batch config from GrowthBook `tengu_1p_event_batch_config` (`sUi`, `:144666`), falling back to: `scheduledDelayMillis` ← `OTEL_LOGS_EXPORT_INTERVAL` or **10,000 ms** (`SFd`), `maxExportBatchSize` **200** (`EFd`), `maxQueueSize` **8192** (`AFd`); pre-init queue cap **1024** (`iUi`, `:144870`).
- Each event record (`GYr`, `:144687`): `body` = event name; `attributes` = `{ event_name, event_id (uuid), core_metadata, user_metadata, event_metadata, user_id }`, `user_id` = `vW()`.

---

## 3. Event payload identity & device fields

Metadata blocks stamped onto **every** 1P event (cross-link → `device-fingerprinting.md`):

### `core_metadata` — `Q0n()` (`cli.beauty.js:143922`)
`model`, `sessionId`, `userType:"external"`, `betas`, `envContext`, `entrypoint` (`CLAUDE_CODE_ENTRYPOINT`), `sessionKind`, `hasAttacher`, `agentSdkVersion` (`CLAUDE_AGENT_SDK_VERSION`), `isInteractive`, `clientType`, `processMetrics`, `sweBenchRunId/InstanceId/TaskId` (always present, empty string when unset), and `subscriptionType` when present.

### `user_metadata` — `nit(true)` (`:144697`, `:144744`)
`deviceId`, `sessionId`, `email`, `appVersion`, `platform`, `organizationUuid`, `accountUuid`, `userType`, `subscriptionType`, plus GitHub-Actions metadata when in CI.

### `deviceId` / `user_id` — `vW()` (`:606434`, was `cU`)
Returns the stored `~/.claude.json` `userID`; if absent, **generates a fresh 32-byte random hex** (`crypto.randomBytes(32).toString("hex")`) and persists it. Stable per-install device identifier, survives logout, **not** hardware-derived. Datadog volume control hashes it: `zdm()` (`:606744`) = `sha256(vW())`, `parseInt(hash[0:8],16) % 30` → a stable 0–29 `userBucket` cohort (1-in-30 device sampling, `Vdm=30`).

GrowthBook exposure events (`growthbook_experiment`, `WYr` `:144741`) carry `experiment_id`, `variation_id`, `device_id`, `account_uuid`, `organization_uuid`, `session_id`, `environment:"production"`.

---

## 4. Controls & opt-out matrix

`q()` reaches the 1P sink only if `RW()` returns true (`:144684`), i.e. **`!Wj()`**. `Wj()` (`:141945`) = `mUd() || Lm() !== null || Khe()`:

| Condition | Function | What disables 1P telemetry |
|-----------|----------|----------------------------|
| Not first-party auth | `mUd()` → `!xc()` (`:141936`, `:94645`) | Using Bedrock/Foundry/AnthropicAws/Mantle/Vertex (provider plane `yr() !== "firstParty"`) — telemetry off. `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` also forces off. |
| Gateway plane active | `Lm() !== null` | The new `gateway` plane (selector `yr()` returns `"gateway"` first, `:94637`) — telemetry off |
| Any kill-switch env var set | `Khe()` → `qHs() !== "default"` (`:48913`) | `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, `DO_NOT_TRACK` |

There is **also** a remote GrowthBook kill: `Nit`/`MU` bail if `dGe("firstParty")` (`:144721`), where `dGe(e)` (`:144629`) reads the flag map **`tengu_frond_boric`** and checks `[e] === true`. The Datadog mirror is killed by `dGe("datadog")` (`:281318`).

| Variable | Effect | Confirmed |
|----------|--------|-----------|
| `DISABLE_TELEMETRY` | Master kill switch — disables 1P event logging (and therefore Datadog mirror) | yes (`qHs`/`Kfn`, `:48904`) |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disables all non-essential network incl. telemetry | yes (`:48903`) |
| `DO_NOT_TRACK` | Honors DNT — disables 1P telemetry | yes (`:48905`) |
| `DISABLE_ERROR_REPORTING` | Disables internal error reporting | yes (env registry) |
| `DISABLE_GROWTHBOOK` | Disables flag backend + exposure logging | yes (`:145058`) |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | **Enables** the user-configurable OpenTelemetry exporters (off by default) | yes (`:337808`, `:337834`) |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` / `ENABLE_ENHANCED_TELEMETRY_BETA` | Enables enhanced OTel traces/interaction spans | yes (`:275598`) |
| `ENABLE_BETA_TRACING_DETAILED` + `BETA_TRACING_ENDPOINT` | Both required to enable detailed beta tracing | yes (`:274853`) |
| `CLAUDE_CODE_BYOC_ENABLE_DATADOG` | In BYOC env (`CLAUDE_CODE_ENVIRONMENT_KIND==="byoc"`), re-enables Datadog (otherwise BYOC suppresses it — `iBi`, `:141941`) | yes |
| `OTEL_LOG_USER_PROMPTS` | If unset, user prompts in OTel spans are `<REDACTED>` (`:275682`) | yes |
| `OTEL_LOG_ASSISTANT_RESPONSES` / `OTEL_LOG_TOOL_CONTENT` / `OTEL_LOG_TOOL_DETAILS` | Opt-in to log richer content into OTel | yes (env registry) |
| `OTEL_METRICS_INCLUDE_{SESSION_ID,ACCOUNT_UUID,ENTRYPOINT,VERSION,RESOURCE_ATTRIBUTES}` | Opt-in to attach identity dims to OTel metrics | yes (env registry) |
| `CLAUDE_CODE_PERFETTO_TRACE` | Path → enables local Perfetto trace writing | yes (`:275202`) |
| GrowthBook `tengu_log_datadog_events` (default `false`) | Gates the Datadog mirror (`it(wDp,!1)`, `:281320`) | yes |
| GrowthBook kill-switches `firstParty` / `datadog` via `tengu_frond_boric` (`dGe`) | Remote kill of 1P / Datadog without a release | yes (`:144629`) |
| `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` | Re-enable post-task feedback surveys under OTel | yes (`:141950`) |

**Telemetry is fully dropped on 3P provider planes.** With Bedrock / Foundry / AnthropicAws / Mantle / Vertex / gateway, `Wj()` is true → `RW()` false → `Nit`/`MU` short-circuit, so **no 1P events** are emitted. The Datadog mirror is additionally guarded inside `gft` by `if (yr() !== "firstParty") return` (`:606656`), so even a forced flag cannot mirror non-firstParty traffic. The provider selector also redacts auth/region env vars from `envContext` via the typed registry (`vQd`, `:189146`).

---

## 5. Datadog allow-list (notable mechanism)

When Datadog is enabled, **only events in a hardcoded `Set` (`Gdm`, 159 names, `:606734`)** are mirrored, and **only a fixed set of metadata keys** are forwarded (`Wdm`, `:606734`): `arch, classifierModel, classifierStage, clientType, decision, entrypoint, errorKind, errorType, failureKind, fastPath, sessionKind, http_status_range, http_status, model, op, outcome, platform, provider, reason, coachMode, server_reason, server_type, source, subscriptionType, toolName, userBucket, userType, version, versionBase`. (`server_reason`/`server_type` are **new** vs 2.1.169; `kairosActive` was **dropped**.) `gft` (`:606655`) also: requires `yr()==="firstParty"`; collapses `mcp__*` tool names to `"mcp"`; normalizes `model` to a known id or `"other"` and requires it to contain `"claude"`; explodes `status` into `http_status` + `http_status_range` (`Nxx`); strips dev build suffixes from `version`. The allow-list skews to API health, OAuth, refusal-fallback/retraction, background/daemon, SDK, auto-mode, and rotunda events — reliability monitoring, not full product analytics. Defaults: flush 15,000 ms, max batch 100, timeout 5,000 ms (`Udm`/`Fdm`/`jdm`, `:606715`).

---

## 6. Event categories (1163 total)

Event count grew **1086 → 1163** vs 2.1.169 (**+77 net**: +97 new names, −20 removed). Counts below are exact (one event = one distinct `tengu_*` name first-arg to `q(...)`, all categorised in `data/telemetry-events.yaml`).

| Category | Count | Δ vs 169 | Description |
|----------|------:|:--------:|-------------|
| Background & Daemon | 91 | +11 | bg worker/daemon lifecycle, adopt/respawn/dispatch, PTY host, handoff/settle |
| Plugins / Marketplace / Skills | 63 | +3 | plugin lifecycle & CLI, marketplace, skills sync, disuse review, rename |
| OAuth & Authentication | 64 | +7 | login flows, token exchange/refresh/locks, design-oauth, `*_missing_trust` |
| Settings & Config | 50 | +7 | config changes/locks/auto-repair, `*_setting_changed`, fleetview |
| API & Model | 48 | +2 | queries, errors, retries, fallbacks, malformed-tool retry, thinking sanitize |
| MCP | 45 | +1 | server lifecycle, connections, auth, first-party auto-auth, oauth browser |
| Billing / Upsell / Rate Limit | 44 | 0 | extra usage, rate-limit menu, spend limits, upsells, 1m credits clamp |
| Auto-Update | 43 | 0 | updater success/fail/lock, native install, binary download, version checks |
| Session Lifecycle | 42 | 0 | init/exit/startup/resume/onboarding/session management |
| Compaction | 42 | +4 | auto/micro/partial/reactive/precomputed compaction, arm-table gating |
| Teleport / Remote | 37 | +4 | teleport lifecycle, remote sessions, reply-channel frames, headless send |
| Streaming & Performance | 35 | +3 | stream errors/stalls/529-retry/partial-finalize, watchdogs, render perf |
| File Operations & History | 33 | +1 | file change/op/activity, snapshots, rewind, backups, git ops, worktrees |
| IDE / External / CLI Commands | 33 | +1 | IDE ext, GitHub/Slack app, GH actions, CCR, code-review routing, doctor |
| Tool Usage | 31 | +1 | execution, results, permissions, input coercion, stale-read |
| Bridge / REPL | 30 | +7 | bridge session, REPL inner exec/watchdog, chrome auto-enable |
| Agents | 28 | +2 | agent spawn/tool-select, remote launch, subagents, stranded-tool cleanup |
| Conversation Flow | 26 | +5 | fork, message selector, context tips, fabricated-turn, human-origin |
| Provider Setup | 26 | +3 | Bedrock/Vertex/Mantle probe/default-check/setup wizards, WIF |
| Refusal Fallback / Retraction | 26 | +8 | refusal fallback prompts/latches, fallback credits, structured-output retraction |
| Teams & Team Memory | 25 | +1 | teammate config, multi-store team-memory sync, partition suppression |
| Permission | 25 | +1 | requests/explainers, bypass, trust, auto-mode decisions |
| User Input | 24 | +3 | prompts, commands, paste, editor, attachments, left-arrow nav |
| Hooks | 21 | 0 | pre/post tool hooks, stop hooks, run hook, plugin/SDK hooks |
| Loops / Kairos / Scheduling | 21 | 0 | kairos loops, dynamic wakeups, dreams, scheduled tasks, goals |
| Bash / Shell Tool | 19 | 0 | command exec, security checks, backgrounding, snapshots |
| Session / Auto Memory | 18 | +1 | memory access/load/extract, memdir near-cap, personal mem sync |
| Feedback & Survey | 17 | +1 | feedback survey, feature rating, long-context survey, powerup discovery |
| Error & Recovery | 15 | 0 | uncaught exceptions, rejections, query errors, tombstones |
| Privacy & Policy | 15 | +1 | grove policy views/submit/toggle, policy-limits cache |
| Ask-User / Dialog | 14 | 0 | AskUserQuestion, request-user dialogs, dialog host, control responses |
| Claude.ai MCP & Chrome | 13 | 0 | claude.ai MCP auth, in-chrome setup, builtin MCP toggle |
| Tool Search | 12 | +1 | agentic/native search, ripgrep, indexing, juniper-shoal reminders |
| Images / PDF / Media | 12 | +2 | image resize/compress, PDF extraction, web-fetch provenance, media byte-cap |
| Workflows | 11 | 0 | workflow launch/complete/phase, budget/agent caps, keywords |
| Rotunda / Credits (internal) | 10 | −1 | rotunda pennant credit-strip, sync-dropped (convolute arcades removed) |
| Ultraplan | 10 | 0 | cloud plan offload: launch, plan-ready, approve, stop, failures |
| Transcript | 9 | 0 | transcript access/view/toggle, parent cycles, write failures |
| Agent SDK | 9 | −1 | control roundtrip, handshake, ttft, stalls, crashes (`sdk_url_host_rejected` removed) |
| Voice | 7 | 0 | voice recording lifecycle, circuit breaker, streaming |
| Advisor Tool | 6 | 0 | advisor command/dialog/tool calls, token usage, retries |
| At-Mention | 5 | 0 | @-mention directory/filename/MCP-resource extraction |
| CLAUDE.md | 5 | −2 | CLAUDE.md load, includes dialogs, write (external-includes dialogs removed) |
| Plan Mode | 3 | 0 | enter/exit plan mode, exit called outside plan |

> Category Δ values are this analysis's mapping of the +97/−20 churn onto the 2.1.169 taxonomy; a handful of cross-cutting names (e.g. `tengu_fallback_credit_*`, `tengu_heron_brook_applied`) are judgment calls — see `data/telemetry-events.yaml` for the canonical assignment.

### Notable NEW event families vs 2.1.169 (97 new names)

- **Refusal fallback *credits* (`tengu_fallback_credit_minted/forfeited/skipped/outcome`, `:595843`)** — a new credit-accounting layer around model/refusal fallback, plus `tengu_fallback_sweep_tools`.
- **Structured-output *retraction* (`tengu_structured_output_retracted` / `_late_retraction_drop` / `_retraction_exhausted`)** — retracting already-emitted structured output.
- **Design OAuth (`tengu_design_oauth_login_success/error/manual_entry`)** — aligns with the new `/v1/design*` endpoints and `/design-login` slash command.
- **REPL/bridge inner loop (`tengu_repl_inner_executing`, `tengu_repl_inner_watchdog_fired`, `tengu_bridge_repl_evaluated`, `tengu_repl_verbose_render`)** — the in-bridge REPL evaluator.
- **Mantle plane probing (`tengu_mantle_default_check/_fallback`, `tengu_mantle_probe_result`)** and **adopt/handoff daemon ops (`tengu_adopt_claim/_link/_exit_handoff/_exit_reap`, `tengu_bg_handoff_settle`)**.
- **`*_missing_trust` family (`tengu_apiKeyHelper_missing_trust11`, `awsAuthRefresh`, `awsCredentialExport`, `gcpAuthRefresh`, `mcp_headersHelper`)** — credential-helper trust-dialog gating.
- **Precomputed-compaction arming (`tengu_precompute_arm_table_malformed`, `tengu_precomputed_compact_arm_gated`, `tengu_precompute_compaction_setting_changed`)**.
- **Codename one-offs**: `tengu_heron_brook_applied` (`:593561`, a sysprompt-injection string sourced from clientData/flag `tengu_heron_brook`) and `tengu_juniper_shoal_shown` (`:468257`, periodic tool-search reminder).

### Removed vs 2.1.169 (20 names)

`tengu_mcp_add/delete/get/list/start`, `tengu_mcp_reset_mcpjson_choices`, `tengu_team_created/deleted`, `tengu_team_onboarding_discovery_shown`, `tengu_convolute_arcades_retry/_outcome`, `tengu_claude_md_external_includes_dialog_accepted/declined`, `tengu_bg_dispatch_rescued`, `tengu_assistant_install`, `tengu_desktop_upsell_shown`, `tengu_oauth_gateway_selected`, `tengu_opus48_launch_shown`, `tengu_sdk_url_host_rejected`, `tengu_unknown_command_suggestion`.

---

## 7. Sample payload shapes (verified call sites)

```js
// tengu_heron_brook_applied  (cli.beauty.js:593561) — sysprompt injection accounting
q("tengu_heron_brook_applied", { len, fromClientData })

// tengu_fallback_credit_minted  (cli.beauty.js:595843)
q("tengu_fallback_credit_minted", { ... })

// tengu_code_review_routed  (cli.beauty.js:653663)
q("tengu_code_review_routed", { ... })   // skipped when options.isSkillPreload

// tengu_juniper_shoal_shown  (cli.beauty.js:468257) — periodic tool-search nudge
q("tengu_juniper_shoal_shown", { delivered, skipReason, everyNTurns, turnsSinceLastReminder })

// growthbook_experiment  (cli.beauty.js:144775) — exposure log on the 1P pipe
wne.emit({ body: "growthbook_experiment", attributes: {
  event_type:"GrowthbookExperimentEvent", experiment_id, variation_id,
  device_id?, account_uuid?, organization_uuid?, session_id?, environment:"production" }})
```

Free-form high-cardinality values are routinely passed through label normalisers (e.g. `$e(...)`) before attachment, and `_PROTO_*` keys are stripped by `AQe` (`:4100`) before the Datadog send.

---

## 8. Uncertainties

- Exact 1P record JSON wire shape (OTLP-logs encoding) is inferred from the emit call (`GYr`) + exporter class `BYr`; the serialized HTTP body wasn't dumped byte-for-byte.
- `yr()` provider classification (firstParty / bedrock / foundry / anthropicAws / mantle / vertex / gateway) is read from the selector at `:94637`; downstream callers weren't exhaustively traced.
- Category boundaries for cross-cutting new names (`tengu_fallback_credit_*`, `tengu_heron_brook_applied`, `tengu_human_origin_presumed`) are judgment calls; `data/telemetry-events.yaml` holds the canonical assignment.
- The `tengu_1p_event_batch_config` / `tengu_event_sampling_config` / `tengu_frond_boric` GrowthBook payloads are remote, so live per-event sample rates and kill-switch states can't be read from the binary — only fallback defaults and the lookup keys are visible.
