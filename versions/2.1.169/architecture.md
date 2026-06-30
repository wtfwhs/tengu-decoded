# Architecture Deep Dive

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.3.14 (standalone compiled binary)

This document covers Claude Code's internal architecture as reverse-engineered from the **actual beautified JavaScript source** (`cli.beauty.js`, 662k lines), not just `strings`. Every claim is grounded in a function name or line citation. Throughout, sections are framed as **what's new/changed vs 2.1.32**.

## Subsystem map (the 30-second view)

2.1.32 had three architectural pillars worth a section each: compaction, MCP, provider routing. 2.1.169 has grown an entire **distributed runtime** on top of the REPL. The headline new subsystems:

| Subsystem | What it is | Gate / entry |
|-----------|-----------|--------------|
| **Compaction (v2)** | auto + micro + **precomputed (speculative)** + **reactive**, with circuit breakers | `xx4()`, `Oy8()` |
| **Provider planes** | 6-way plane select incl. **mantle / foundry / anthropicAws / gateway** (was 4) | `Mq()` @ `93073` |
| **MCP** | stdio/SSE/HTTP/WebSocket + OAuth + skills + resources + elicitation + tool-search | `~264000`, `~254000` |
| **Agent Teams** | teammates + coordinator + team-memory, **default-on** | `tengu_amber_flint` @ `273741` |
| **Background daemon** | systemd/launchd service, supervisor + workers, **binary takeover**, rendezvous socket | `541810+`, `470440+` |
| **Remote control / bridge** | phone/claude.ai drives a local session via cloud `/v1/sessions` | `CLAUDE_BRIDGE_*`, `427100+` |
| **Loops & scheduling (kairos)** | `/loop`, `/schedule` routines, cron, `ScheduleWakeup`, `Monitor`, `PushNotification` | `~209480`, `tengu_kairos_*` |
| **Workflows** | VM-sandboxed deterministic multi-agent orchestration (`ultracode`) | `WorkflowTool`, `tengu_workflows_enabled` |
| **Cowork** | Slack-integrated coworker mode with its own memory | `CLAUDE_COWORK_*` |
| **Plan v2 / ultraplan / advisor** | parallel planning agents, cloud ultraplan, server-side reviewer tool | `CLAUDE_CODE_PLAN_V2_*`, `tengu_sage_compass2` |

---

## 1. Context Management

### 1.1 Autocompact (v2 — substantially rewritten)

In 2.1.32 autocompact was a single threshold check (`xbH()`) plus a summary call. In 2.1.169 it is a **multi-path state machine** with speculative precompute, reactive routing, and two independent breakers. The orchestrator is `xx4()` (`cli.beauty.js:432346+`).

**Threshold computation.** The effective context window is `z4H(model, window)`; the compaction threshold is `Oy8(model, window) = kI$(z4H(model,window), uqq())`. The config object `uqq()` (`433185`) carries:

```js
function uqq() {
  return {
    enabled: sT(),                              // autoCompactEnabled && !DISABLE_AUTO_COMPACT && !DISABLE_COMPACT
    precomputeBufferFraction: jJf(),            // flag tengu_amber_rokovoko (default hqq)
    testPctOverride: CLAUDE_AUTOCOMPACT_PCT_OVERRIDE ? parseFloat(...) : undefined,
    testBlockingOverride: CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE ? parseInt(...) : undefined
  };
}
```

`vuH(tokens, model, window)` returns a **level**: `"ok"` / `"compact"` / `"blocked"`. `"blocked"` means the prefix alone overflows and compaction can't help (`tengu_auto_compact_prefix_overflow`, `MJf()`).

**The compact window source** (`gi()` @ `458040`) is resolved in priority order:
1. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` env (validated, clamped to `[Iqq, modelMax]`, `source:"env"`)
2. settings `autoCompactWindow` (Zod: `int().min(1e5).max(1e6)`, `56481`)
3. an experiment-driven "auto" window (`source:"experiment"`), surfaced with the hint `Compacting at auto window (… tokens) · /autocompact to configure` (`JJf()`)

The `/autocompact` command UI (`458045+`) renders one of: `auto`, `auto (N tokens)` [experiment], `N tokens (from CLAUDE_CODE_AUTO_COMPACT_WINDOW)`, `N tokens (from settings)`. If the env var is set it "takes precedence — unset it to change this setting."

**Two breakers** (both new vs 2.1.32):
- **Circuit breaker** — after `Rqq` consecutive failed compactions the session stops trying (`tengu_auto_compact_circuit_breaker`).
- **Rapid-refill breaker** — if the context refills `≥ VR8` times within `< bqq` turns each, compaction is suppressed as a runaway-guard (`tengu_auto_compact_rapid_refill_breaker`, `Mqq()`).

**Reactive routing.** When the threshold source is non-auto and the session is interactive (`be()`), compaction is "routed through reactive" (`tengu_auto_compact_routed_reactive`) — it runs inside the turn via `LI$()` rather than as a blocking pre-turn step. Events: `tengu_reactive_compact_attempt/_triggered/_succeeded/_failed`.

**The full-conversation summary prompt** (`cli.beauty.js:218704`) is unchanged in spirit from 2.1.32:

> Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.

The **incremental ("recent portion")** variant (`218841`) and a **forward-looking continuation** variant (`218615`, new) also exist:

> [up_to] Your task is to create a detailed summary of this conversation. This summary will be placed at the start of a continuing session; newer messages that build on this context will follow after your summary…

> [recent] Your task is to create a detailed summary of the RECENT portion of the conversation — the messages that follow earlier retained context. The earlier messages are being kept intact and do NOT need to be summarized…

All still carry: *"IMPORTANT: Do NOT use any tools."*

`CLAUDE_AFTER_LAST_COMPACT` (`369664`) and `CLAUDE_CODE_COLD_COMPACT` (`xqq()` @ `433176`) tune post-compact behaviour; cold-compact skips warm-cache reuse.

### 1.2 Precomputed compaction (NEW — the big change)

The marquee 2.1.169 feature: compaction is computed **speculatively in the background** while the user is still working, then "consumed" instantly when the threshold is crossed. Orchestrated around `424280+`:

- `tengu_precomputed_compact_started` — armed with `armTrigger`, `precomputeAttemptNumber`, `preCompactTokens`.
- It runs the PreCompact hook, then `Bw8()` builds the summary off the main thread.
- `tengu_precomputed_compact_ready` (with `groupsPreserved`, `totalGroups`), `_failed`, `_rearm_capped` (re-arm capped after `sC4` consecutive same-cause failures), `_consumed`, `_discarded`.
- On the next turn the precomputed result is **consumed** in place of a blocking compaction — eliminating the multi-second stall that 2.1.32 users felt at the compaction boundary.

There is also a **compact cache-sharing** path (`tengu_compact_cache_sharing_success/_fallback`, `432717`) and a partial-compaction path (`tengu_partial_compact`, `432553`).

### 1.3 Microcompact ("KEEP-RECENT MC")

The 2.1.32 kill switch **`tengu_cache_plum_violet` is GONE** — it does not appear anywhere in this build. Microcompact survives but is now keyed to **tool-result clearing** rather than a generic compaction:

`JW7()` (`217843`) walks the message list, finds old tool results via `wI6(H, keepRecent)`, and if `tokensSaved ≥ OI6` (**20,000**) replaces each old `tool_result` body with the literal `"[Old tool result content cleared]"` (`YI6`), persisting the original to disk (`<persisted-output>`) so it can be re-read on demand. Event: `tengu_time_based_microcompact` with `{toolsCleared, toolsKept, keepRecent, tokensSaved, trigger:"context_hint"}`. The transcript boundary subtype is `"microcompact_boundary"` (`392425`).

### 1.4 Context collapse

`CLAUDE_CONTEXT_COLLAPSE` (bool, `eT1`) and `CLAUDE_CONTEXT_COLLAPSE_MODEL` (`tT1`) are read at `46075`. Context-collapse is wired to the **checkpoint/fork/rewind** system: sessions carry `contextCollapseCommits` and `contextCollapseSnapshot` (`370379`, `549195+`, `550248+`). It is the mechanism behind the "rewind to checkpoint and re-summarize" rewind option.

The "**context will be summarized**" UI lives in `L8A()` (`576318`):

| Restore option | Message |
|----------------|---------|
| `summarize` | "Messages after this point will be summarized." |
| `summarize_up_to` | "Preceding messages will be summarized. This and subsequent messages will remain unchanged — you will stay at the end of the conversation." |
| `both` / `conversation` | "The conversation will be forked." |
| `code` / `nevermind` | "The conversation will be unchanged." |

### 1.5 Prompt-cache break tracking (carried from 2.1.32)

Still present: cache-break detection logs the cause (`system prompt changed` / `tools changed` / `model changed` / microcompact) and fires `tengu_prompt_cache_break`. New 2.1.169 wrinkle: `tengu_compact_cache_prefix` tracks the compaction-specific prefix so a compact-caused break is distinguishable.

---

## 2. Provider Routing

### 2.1 Plane selection — `Mq()`

The provider plane function `Mq()` (`cli.beauty.js:93073`) is the single source of truth (was `nI()` in 2.1.32). It grew from 4 planes to **6**:

```js
function Mq() {
  return $$(env.CLAUDE_CODE_USE_BEDROCK)      ? "bedrock"
       : $$(env.CLAUDE_CODE_USE_FOUNDRY)       ? "foundry"
       : $$(env.CLAUDE_CODE_USE_ANTHROPIC_AWS) ? "anthropicAws"
       : $$(env.CLAUDE_CODE_USE_MANTLE)        ? "mantle"
       : $$(env.CLAUDE_CODE_USE_VERTEX)        ? "vertex"
       : "firstParty";
}
```

| Plane | Trigger | Label (`eo`) | Notes |
|-------|---------|--------------|-------|
| `firstParty` | (default) | — | Direct `api.anthropic.com`; only plane with full telemetry + OAuth |
| `bedrock` | `CLAUDE_CODE_USE_BEDROCK` | Amazon Bedrock | Secondary plane `mantle` if `CLAUDE_CODE_USE_MANTLE` also set (`eM$()`) |
| `mantle` | `CLAUDE_CODE_USE_MANTLE` | Amazon Bedrock (Mantle) | Bedrock variant with bearer-token auth |
| `vertex` | `CLAUDE_CODE_USE_VERTEX` | Google Vertex AI | GoogleAuth / ADC |
| `foundry` | `CLAUDE_CODE_USE_FOUNDRY` | Microsoft Foundry | Azure AD token provider |
| `anthropicAws` | `CLAUDE_CODE_USE_ANTHROPIC_AWS` | Claude Platform on AWS | New "Claude on AWS" first-party-ish plane |
| `gateway` | (set internally — `forceLoginMethod:"gateway"` / `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST`; note `CLAUDE_CODE_USE_GATEWAY` is a forwarded env var but is **not** a branch inside `Mq()`) | Cloud gateway | Enterprise OIDC; **no telemetry, no OAuth** ("Not available when using a Cloud gateway") |

Helpers: `o_()` = is firstParty, `wz()` = uses first-party model IDs (`firstParty`/`anthropicAws`/`gateway`), `ES()` = has first-party capabilities (`firstParty`/`anthropicAws`/`foundry`/`mantle`), `VM(model)` resolves per-model plane preference, `getSecondaryProvider()`=`eM$()` handles bedrock→mantle.

### 2.2 Base URLs — `gT_(provider, region)` (`129539`)

| Plane | Base URL (default if no override env) |
|-------|---------------------------------------|
| `bedrock` | `ANTHROPIC_BEDROCK_BASE_URL` ?? `https://bedrock-runtime.{region}.amazonaws.com` |
| `mantle` | `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` ?? `https://bedrock-mantle.{region}.api.aws` |
| `anthropicAws` | `ANTHROPIC_AWS_BASE_URL` ?? `https://aws-external-anthropic.{region}.api.aws` |
| `vertex` | `ANTHROPIC_VERTEX_BASE_URL` ?? `https://{region}-aiplatform.googleapis.com/v1` (global→`aiplatform.googleapis.com/v1`, us/eu→`aiplatform.{us,eu}.rep.googleapis.com/v1`) |
| `foundry` | `ANTHROPIC_FOUNDRY_BASE_URL` ?? `https://{ANTHROPIC_FOUNDRY_RESOURCE}.services.ai.azure.com/anthropic/` |
| `gateway` | `ZO()?.url` (the stored `gatewayAuth.url`) |
| `firstParty` | `ANTHROPIC_BASE_URL` ?? `nK().BASE_API_URL` |

The Foundry SDK client (`FM6` @ `106165`) hard-codes the `…/anthropic/` suffix when only a resource name is given. Vertex uses `services.ai`-style region routing via `AnthropicVertex` (`129131+`). Mantle auth supports `AWS_BEARER_TOKEN_BEDROCK`, `CLAUDE_CODE_SKIP_MANTLE_AUTH`, or falls back to AWS creds (`vc()`).

### 2.3 Gateway model discovery (NEW)

When `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` is set (`641635`), bootstrap calls `Zd4()` (`459917`): it GETs `{ANTHROPIC_BASE_URL}/v1/models?limit=1000` (Bearer `ANTHROPIC_AUTH_TOKEN` or `x-api-key`, plus `ANTHROPIC_CUSTOM_HEADERS`), filters to `^(claude|anthropic)` IDs, and caches to `gateway-models.json` (mode 0600). The model picker then offers these with `description:"From gateway"` (`Wd4()`). The cache is invalidated when `baseUrl` changes.

### 2.4 Fallback & retry (carried, lightly evolved)

- `fallbackModel` is now a **settings array** tried in order (`56398`); `"default"` expands to the default model; `--fallback-model` takes precedence. `FALLBACK_FOR_ALL_PRIMARY_MODELS` (`HV1`) still forces it.
- `tengu_model_fallback_triggered` (general), plus a **new refusal-fallback subsystem**: `tengu_refusal_fallback_triggered/_prompt_shown/_prompt_choice/_setting_changed/_suppressed/_supersedes` and `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK` — when a model refuses, CC can fall back to another model with user consent.
- `tengu_api_fallback_last_resort` is the final API-error escape hatch.

---

## 3. MCP (Model Context Protocol)

### 3.1 Transports

The config union is `{type: "stdio" | "sse" | "http" | "claudeai-proxy" | ...}` with `streamable-http` normalised to `http` (`567335`). Connection dispatch is at `264232+`:

| Transport | Config shape | Use |
|-----------|-------------|-----|
| **stdio** | `{command, args, env}` (default when `type` omitted) | Local servers, plugins |
| **sse** | `{url, headers, oauth}` | Remote SSE |
| **http** (streamable) | `{url, headers, oauth}` | Remote HTTP |
| **claudeai-proxy** | proxied via Claude.ai connector infra (`tengu_mcp_claudeai_proxy_*`) | Claude.ai-managed remote MCP |
| **WebSocket** | `WebSocketClientTransport` | IDE bridge |

`claude mcp get` (`567289+`) prints scope, status, type, URL/command, headers, OAuth (client_id/secret/callback_port), and timeout (with a `<1000ms ignored` note).

### 3.2 Reconnect / backoff

Two backoff curves coexist:
- **Bridge/native-host socket** (`11994+`): `reconnectDelay=1000`, `maxReconnectAttempts=10`, delay `min(1000 · 1.5^(n-1), 30000)`; after the cap it keeps "polling for native host" every 10th attempt.
- **MCP server** (`12903`): `min(2000 · 1.5^(n-1), 30000)` — i.e. 2s base, 1.5×, 30s cap (the 2.1.32 doc's "100 attempts" cap is no longer the headline; the bridge path uses 10 with indefinite polling after).

### 3.3 OAuth for MCP

A full OAuth flow (`254000+`): `tengu_mcp_oauth_flow_start/_success/_failure/_error`, `tengu_mcp_oauth_refresh_success/_failure`, `tengu_mcp_oauth_token_persist_failed`. Client secrets are stored in **secure storage** when available (`VT$()`, `567323`) else a stderr warning. Local-host OAuth can be blocked via `tengu_mcp_local_oauth_blocked_hosts`. `tengu_mcp_server_needs_auth` short-circuits connection and surfaces an auth tool (`cD8`/`lD8`).

### 3.4 Resources, skills, elicitation, tool-search

- **Resources**: `tengu_mcp_resource_templates_fetched`; tools `ListMcpResourcesTool` / `ReadMcpResourceTool` (deferred). Cloud sessions also expose `/v1/sessions/{id}/resources` (`7676+`).
- **Skills**: `tengu_mcp_skills` (`259432`) — MCP servers can ship skills.
- **Elicitation**: `tengu_mcp_elicitation_shown/_response` (`259277`) — servers can request structured user input mid-call.
- **Large results**: `tengu_mcp_large_result_handled`, `tengu_mcp_singleton_unwrap` (`264516+`).
- **Tool search (NEW)**: see §3.6.

### 3.5 Plugin marketplace

`tengu_plugin_installed/_disabled_cli/_enabled_cli/_updated_cli/_uninstalled_cli` survive; `tengu_official_marketplace_auto_install` (gated by `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL`). Marketplace plumbing at `184641+`. The MCP **directory/registry** is new: `tengu_mcp_directory_visibility`, `tengu_mcp_directory_bff`, `tengu_mcp_registry_fetch` (`138897+`).

### 3.6 Tool search / deferred tools (NEW)

To keep the system prompt small when many MCP/tools are present, tools can be **deferred** — only their name appears in a `<system-reminder>`; schemas are fetched on demand via the **`ToolSearch`** tool (`$w8()` @ `210982`, desc at `210984`):

> Deferred tools appear by name in `<system-reminder>` messages. Until fetched, only the name is known — there is no parameter schema… This tool takes a query, matches it against the deferred tool list, and returns the matched tools' complete JSONSchema definitions inside a `<functions>` block.

Query forms: `select:Read,Edit`, keyword search, `+slack send`. Gated by `tengu_tool_search_unsupported_models` (model allow-list) and `tengu_tool_search_mcp_wait`.

---

## 4. Agent Teams (`tengu_amber_flint`, default-on)

Enablement (`_4()` @ `273738`):

```js
function _4() {
  if (!$$(env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) && !process.argv.includes("--agent-teams")) return false;
  if (!j$("tengu_amber_flint", !0)) return false;   // default TRUE
  return true;
}
```

So agent-teams ("agent swarms" internally — `isAgentSwarmsEnabled`) require the `--agent-teams` flag or `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env to *opt in*, but once opted in the **`tengu_amber_flint` flag defaults ON** (vs being an explicit gate in 2.1.32).

**Roles & context** (`r36` module @ `100066`): `isTeammate()`, `isTeamLead()`, `getTeamName()`=`qA`, `getAgentName/Id`, `getParentSessionId`, `runWithTeammateContext`, `waitForTeammatesToBecomeIdle`, `getDynamicTeamContext`. In-process teammates (`isInProcessTeammate`, `hasActiveInProcessTeammates`) run inside the host process; the team name can be injected via **`CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME`** (`gG1` @ `45914`, written into child env at `525835`).

**Teammate mode** (`xp6` @ `273694`): `teammateMode` setting (`"auto"` default) with a snapshot captured at startup (`nd7()`), a CLI override (`--?`), and `tengu_teammate_mode_changed`. The snapshot is captured only if teams are enabled (`up6()`).

**Coordinator mode** (`Vm` @ `210509`, gate `CLAUDE_CODE_COORDINATOR_MODE`): `isCoordinatorMode()`=`CF()`, a dedicated `getCoordinatorSystemPrompt()`, and worker-tool restrictions. Workers are spawned via the team tool (`PK`) and told *"Workers spawned via the {PK} tool have access to these tools: …"*. Resuming a session can auto-switch coordinator mode (`matchSessionMode`, `tengu_coordinator_mode_switched`).

**Tools**: `Teammate`, `SendMessage`, `TeamCreate` (`Kn`), `TeamDelete` (`rs`), `TaskList`. **Team memory**: a `team/` sub-directory shared across teammates (`143272`) — memories there are conservatively pruned ("a teammate may rely on it"). Sync events: `tengu_team_mem_sync_pull/_push/_started`, `tengu_team_mem_entries_capped`. Server status tracked via `getTeamMemoryServerStatus`.

---

## 5. Background Agents & Daemon (NEW SUBSYSTEM)

This is the single largest new subsystem. It is a **long-lived OS service** (`Uw()` = "daemon" noun) that owns a pool of worker processes so background tasks survive after the foreground REPL exits.

### 5.1 The service

Installed as a systemd **user** service on Linux (`470440+`):

```ini
[Unit]
Description=Claude Daemon
After=network-online.target
StartLimitIntervalSec=60
StartLimitBurst=10
[Service]
Type=simple
Environment="PATH=…"
ExecStart={claude} daemon --json-path {…} --log-file {…} --origin service
Restart=always
RestartSec=1
StandardOutput=append:{log}
StandardError=append:{log}
[Install]
WantedBy=default.target
```

Origins: `service` (installed unit) vs `transient` (ad-hoc spawn). Events: `tengu_daemon_start/_startup_crash/_idle_exit/_config_reload/_lease/_self_restart_on_upgrade/_worker_crash/_worker_permanent_exit/_yield/_yield_takeover/_peer_uid_reject`. A **cold-start prompt** asks the user to install the daemon (`tengu_bg_daemon_cold_start_ask`, `CLAUDE_CODE_DAEMON_COLD_START`, "Install a daemonized assistant").

### 5.2 Supervisor + workers + rendezvous

A **supervisor** process (`supervisorPid`, `role:"supervisor"` @ `563324`) maintains a `roster.json` of workers and a control socket. Each worker has a **rendezvous socket** (`CLAUDE_BG_RENDEZVOUS_SOCK`, `rvSockPath`, auth `CLAUDE_BG_RV_AUTH`) and a **PTY socket** (`CLAUDE_BG_PTY_AUTH`). The supervisor can **adopt** workers left by a previous supervisor ("adopted from previous supervisor", `563903`). `startRendezvousServer`/`stopRendezvousServer` (`427442`). `claude daemon` status (`471129+`) reports supervisor liveness, roster age, and warns if the supervisor died but workers remain ("run `claude daemon stop` to reap them").

**Spare workers**: the pool pre-warms spares (`tengu_bg_spare_spawn/_spare_claim/_spare_claim_fail`) so dispatch is instant. Dispatch path: `tengu_bg_dispatch` (+ `_fallback/_low_mem/_rescued/_sigkill_escalate/_stale_drop`). Lifecycle: `tengu_bg_worker_spawn/_worker_exit/_respawn(/_exhausted/_stale/_unconfirmed_bail)/_retired/_orphan_reap`.

### 5.3 Binary takeover (NEW)

`Qif()` (`541815`, gate `tengu_bg_binary_takeover` default `!0`): when a newer client binary starts and finds a *stale* daemon running an older version (compared by semver or mtime, `Fif()`), it **kills the old daemon** (SIGKILL if needed) so new sessions use the current binary. Event `tengu_bg_daemon_binary_takeover` with `daemon_age_ms`. There's also a **zombie detector** (`iw9()`): if the supervisor PID is alive but the control socket is unreachable, it signals a restart (`tengu_bg_daemon_zombie_restart`) — with a false-positive guard via a ping (`tengu_bg_daemon_zombie_false_positive`).

### 5.4 Env & commands

Env family: `CLAUDE_BG_BACKEND`, `CLAUDE_BG_ISOLATION`, `CLAUDE_BG_RENDEZVOUS_SOCK`, `CLAUDE_BG_RV_AUTH`, `CLAUDE_BG_PTY_AUTH`, `CLAUDE_BG_CLAIM_AUTH`, `CLAUDE_BG_AUTH_SNAPSHOT_PATH`, `CLAUDE_BG_SOCKET_TOKENS_PATH`, `CLAUDE_BG_SESSION_PERMISSION_RULES`, `CLAUDE_BG_STARTUP_WEDGE_MS`, `CLAUDE_BG_SOURCE`, `CLAUDE_BG_MEMORY_TOGGLED_OFF`, `CLAUDE_BG_TCC_DISCLAIMED`. Slash commands: **`/background`** (`544822`), **`/tasks`** (`511052`), **`/fork`** (`517528`). Classifier model `CLAUDE_CODE_BG_CLASSIFIER_MODEL` decides what's backgroundable (`tengu_bg_classify`). Disable with `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` / `CLAUDE_AUTO_BACKGROUND_TASKS`.

---

## 6. Remote Control / Bridge (NEW SUBSYSTEM)

Lets a phone or `claude.ai/code` drive a **local** session. Disabled via managed setting `disableRemoteControl` (covers `claude remote-control`, `--remote-control`/`--rc`, auto-start, in-session toggle).

### 6.1 The bridge

`BridgeClient` (`Hg$` @ `37554`, factory `createBridgeClient`). It connects a local CLI session to a cloud-hosted **session** so events flow both ways. Env: `CLAUDE_BRIDGE_BASE_URL` (`SZ1`), `CLAUDE_BRIDGE_OAUTH_TOKEN`, `CLAUDE_BRIDGE_SESSION_INGRESS_URL`, `CLAUDE_BRIDGE_REATTACH_SESSION/_SEQ`, `CLAUDE_BRIDGE_REATTACH_OUTBOUND_ONLY`, `CLAUDE_BRIDGE_USE_CCR_V2`. Reattach params are passed into child envs at `182701+`.

A bridge session is created via `createBridgeSession()` (`rjf` @ `427110`) — **first-party only** (`bridge_session_create_3p_provider` bail). It POSTs to `{BASE_API_URL}/v1/sessions` with `session_context` (sources, outcomes, model, cwd, `reuse_outcome_branches:true`) and an org UUID. Events stream over `/v1/sessions/{id}/events` and `/events/stream` (`368917`, `7630+`). Session ingress is authenticated by a `sessionIngressToken` (`3202`).

### 6.2 CCR (Claude Code Relay)

CCR is the relay layer that injects auth into bridged/cloud sessions: `CCR_OAUTH_TOKEN_FILE` ("injected by the CCR host"), plus `CCR_UPSTREAM_PROXY_ENABLED`, `CCR_EGRESS_GATEWAY_ENABLED`, `CCR_AGENT_PROXY_ENABLED`, `CCR_ENABLE_BUNDLE`/`CCR_FORCE_BUNDLE`, `CCR_BYOC_BETA`, `CLAUDE_CODE_USE_CCR_V2`, `CLAUDE_CODE_WEBFETCH_USE_CCR_PROXY`. `CLAUDE_BRIDGE_USE_CCR_V2` selects the v2 relay protocol.

### 6.3 Teleport & cloud sessions

**Teleport** moves a session between local and cloud. Module `tDH` (`138415`): `fetchCodeSessionsFromSessionsAPI` (GETs `{BASE_API_URL}/v1/code/sessions`), `sendEventToRemoteSession`, `sendBashCommandToRemoteSession`, `updateSessionTitle`, `reportClientPresence`, `markSessionRead`. Retry via `f_8()` (exponential, `bZ6` attempts). Session state is `setTeleportedSessionInfo`/`getTeleportedSessionInfo` (`isTeleported`). Errors: `TeleportOperationError`. Commands: **`/teleport`** (`511542`), **`/session`** (`505621`), **`/remote-control`** (`404730`, `658146`). Settings `remoteControlAtStartup`, `autoUploadSessions`, `autoAddRemoteControlDaemonWorker`, `remoteDialogSeen`. All cloud-session features require **first-party OAuth** (`dC()` throws on API-key auth or 3P providers).

---

## 7. Loops & Scheduling — "kairos" (NEW SUBSYSTEM)

`kairos` is the umbrella for `/loop`, `/schedule`, cron, wakeups, monitors, and push. Telemetry carries a `kairosActive` dimension on most events.

### 7.1 `/loop` — autonomous timed iteration

`/loop` re-invokes the agent on a timer "while the user is away or occupied." Two preambles (`vS6` standard, `WX7` persistent @ `209540+`) — both lengthy "steward, not initiator" instructions emphasising: continue established work, finish PRs, fix CI, but never take irreversible actions without authorization. Persistent mode (`CLAUDE_CODE_LOOP_PERSISTENT` / `tengu_kairos_loop_persistent`, `r38()`) keeps the loop alive longer; `CLAUDE_CODE_LOOP_KEEPALIVE` is the keepalive knob. Sentinels: `<<autonomous-loop>>` (cron-based) and `<<autonomous-loop-dynamic>>` (ScheduleWakeup-based). `tengu_kairos_loop_persistent_activated`.

### 7.2 `ScheduleWakeup` — self-pacing

The `ScheduleWakeup` tool (`F3` @ `209632`) lets the model pick its own next wake time in `/loop` dynamic mode. Its prompt (`vX7` @ `209641`) is a remarkable piece of self-aware engineering: it instructs the model to align `delaySeconds` to the **5-minute Anthropic prompt-cache TTL** — "Don't pick 300s. It's the worst-of-both" — defaulting idle ticks to 1200-1800s. Runtime clamps to `[60, 3600]`.

### 7.3 Cron / routines

Tools `CronCreate` (`q2`), `CronDelete` (`Nb`), `CronList` (`aZ$`). Enable gate `XR()` (`210516`): `!CLAUDE_CODE_DISABLE_CRON && tengu_kairos_cron(default true)`; durable cron via `tengu_kairos_cron_durable`. Standard 5-field cron in local TZ. **Durable** jobs persist to `.claude/scheduled_tasks.json` (survive restarts, missed one-shots surfaced for catch-up); session-only jobs die with the process. The prompt (`dS6` @ `210400`) explicitly tells the model to **avoid `:00`/`:30` minute marks** to spread fleet-wide API load, and warns recurring jobs **auto-expire after `is` (DEFAULT_MAX_AGE_DAYS) days**. Jitter config `tengu_kairos_cron_config` (`hF`): recurring fire up to 10% late (max 15 min), one-shots on round marks fire up to 90s early. Jobs fire **only while the REPL is idle**. `RemoteTrigger` registers agents with cloud routines (`claude.ai/code/routines`). Commands: **`/schedule`** (`615029`, `524697`), `tengu_schedule_offer_shown`.

### 7.4 `Monitor` & `PushNotification`

- **`Monitor`** (`DX` @ `kS6`): starts a background monitor that streams stdout lines from a long-running script as chat events (e.g. `tail -f | grep`). Gated by `tengu_amber_sentinel`. Companion `TaskStop` (`wv`).
- **`PushNotification`** (`SF`): desktop notification + (if Remote Control connected) phone push. Gated by `tengu_kairos_push_notifications` + `agentPushNotifEnabled`; routine runs wrap the banner in `<routine_summary>` tags.

---

## 8. Workflows — deterministic multi-agent orchestration (NEW)

The **`WorkflowTool`** (`ZKf` @ `375415`) runs a **VM-sandboxed script** that orchestrates multiple sub-agents across **phases** with a token budget and a journal. Availability (`Ni_()` @ `184018`):

```js
// CLAUDE_CODE_WORKFLOWS truthy → use flag; falsy/unset → flag tengu_workflows_enabled (default true)
// default-on EXCEPT for "pro" subscription (defaultOn: O4() !== "pro")
```

Disable via `CLAUDE_CODE_DISABLE_WORKFLOWS`. Invocation modes: `scriptPath`, `named`, `inline`. Sources: `built-in`, etc. Execution (`375685+`): launches via `CW4(vmScript, …)` with `onProgress`, `onAgentController`, `tokenBudget`, `seedPhaseTitles`, and a `journal` (`us6`). Events: `tengu_workflow_launched` (phase_count, source, name), `tengu_workflow_phase_completed` (per-phase tokens/tool_calls/agent_count/error_count/skip_count), `tengu_workflow_completed` (agent_count, total_tokens, duration), `tengu_workflow_agent_cap_exceeded`, `tengu_workflow_budget_cap_exceeded`, `tengu_workflow_saved`.

**`ultracode` keyword** (`436939`, `448387`): when a user types "ultracode," the turn is opted into Workflow orchestration (`workflow_keyword_request`). The **ultra_effort** mode (`ultra_effort_enter/_exit`) makes the Workflow tool the default on every substantive task: *"Ultracode is on: optimize for the most exhaustive, correct answer — not the fastest or cheapest… token cost is not a constraint."* Keyword can be dismissed/restored (`tengu_workflow_keyword_dismissed/_restored`). Commands: **`/workflows`** (`540763`). Workflows can be packaged in plugins (the `workflows` manifest key, `442xxx`, `451431`).

---

## 9. Cowork (`CLAUDE_COWORK_*`)

Cowork is a **Slack-integrated "coworker" mode** (the telemetry carries `coworker_type`, `slack_team_id`, `is_enterprise_install`, `is_conductor` @ `137743+`). It has its **own memory layer** keyed to a mount, with guidelines injected from env: `CLAUDE_COWORK_MEMORY_GUIDELINES` (overrides auto-memory entirely, `yP$()` @ `143532`), `CLAUDE_COWORK_MEMORY_EXTRA_GUIDELINES`, `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE`, `CLAUDE_COWORK_MEMORY_INDEX_CONTENT`. Extra-guidelines mode is gated by `tengu_moth_copse`. The **`/team-onboarding`** command (`498799`) bootstraps a coworker/team setup.

---

## 10. Plan v2, ultraplan, and the advisor tool

### 10.1 Plan v2 (parallel planning agents)

`CLAUDE_CODE_PLAN_V2_AGENT_COUNT` (`Wp4()` @ `444837`) sets how many parallel planning agents run; clamped `[1,10]`. Default tiers: **3** for Max-20x / enterprise / team, **1** otherwise (same policy as 2.1.32's teammate cap). `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` (`Zp4()`) controls exploration agents, default **3**.

### 10.2 Ultraplan (cloud)

Ultraplan is a **`remote_agent`** task (`is_ultraplan` flag on the task record, `374184+`) — planning is offloaded to a cloud session (the same `/v1/sessions` infra as the bridge), polled locally, and restored across restarts (`restoreRemoteAgentTasks`, `aqf()`). It pairs with `--advisor` and `isRemoteReview` (the cloud `ultrareview`/`/code-review ultra` path).

### 10.3 Advisor tool (NEW — server-side reviewer)

A **server-side tool** (`server_tool_use`, `name:"advisor"` @ `287315`) backed by a *stronger reviewer model*. Enable (`HB()` @ `287317`): not disabled by `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, **first-party only**, and either `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` or flag `tengu_sage_compass2.enabled`. It only runs when the base model is in `{opus-4-8, opus-4-7, opus-4-6, sonnet-4-6, haiku-4-5}` and the advisor model is opus-4-6+/sonnet-4-6 (`LWH`/`ov$`). The tool **takes no parameters** — calling `advisor()` forwards the entire conversation to the reviewer. Its prompt (`Sr7` @ `287358`) instructs the agent to call it *before* substantive work, when stuck, before declaring done (after making the deliverable durable), and to reconcile conflicts rather than silently switch.

---

## 11. Context window & model sizing (carried)

Context windows are still queried per model+plane (`MT(model, …)`, `iK(model)`). Effective window for compaction is `z4H(model, window)`. `tengu_context_size`, `tengu_context_window_exceeded`, and max-tokens overflow adjustment survive. 1M context is gated by `CLAUDE_CODE_DISABLE_1M_CONTEXT`. Adaptive thinking can be disabled via `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`.

---

## What's new vs 2.1.32 — at a glance

| Area | 2.1.32 | 2.1.169 |
|------|--------|---------|
| Compaction | auto + micro; `xbH()`; `tengu_cache_plum_violet` kill switch | auto **+ precomputed + reactive + partial**; circuit + rapid-refill breakers; **plum_violet removed** |
| Provider planes | 4 (anthropic/bedrock/vertex/foundry) via `nI()` | **6 + gateway** via `Mq()`; mantle, anthropicAws; gateway model discovery |
| MCP | stdio/SSE/HTTP/WS, OAuth | + claudeai-proxy, **tool-search/deferred tools**, skills, elicitation, registry/directory |
| Agent teams | gated, max-3 | **default-on** (`amber_flint`), coordinator mode, in-process teammates, team-memory sync |
| Background | (none) | **full daemon**: systemd/launchd service, supervisor+workers, spares, rendezvous, **binary takeover** |
| Remote | (none) | **bridge + CCR + teleport**; cloud `/v1/sessions`; `/remote-control` `/session` `/teleport` `/fork` |
| Scheduling | (none) | **kairos**: `/loop`, `/schedule`, cron, `ScheduleWakeup`, `Monitor`, `PushNotification` |
| Orchestration | Task subagents | **Workflow tool** (VM-sandboxed, phased, journaled) + `ultracode` |
| Planning | plan mode | **plan-v2** parallel agents + **ultraplan** (cloud) + **advisor** (server-side reviewer) |
| Coworking | (none) | **cowork** (Slack) with own memory |

---

## Uncertainties / tentative inferences

- **`tengu_cache_plum_violet`** is genuinely absent from both `cli.beauty.js` and `cli.min.js` in this build. I'm confident it was removed; I cannot tell whether its function was folded into the precomputed/reactive paths or simply retired.
- Exact numeric constants behind minified identifiers (`Iqq` autocompact floor, `Rqq` circuit-breaker count, `VR8`/`bqq` rapid-refill thresholds, `hqq` precompute fraction, `is` cron max-age days, `sC4` rearm cap) are referenced but their literal values weren't dereferenced here — they are tunable and some are flag-backed (`tengu_amber_rokovoko`, `tengu_kairos_cron_config`).
- The split between **bridge** (`BridgeClient`, local↔cloud event stream) and **teleport** (session migration) overlaps; both ride `/v1/sessions`. I've described them as distinct surfaces because the code keeps separate modules (`WuH`/`tDH`), but they may share more transport than is visible from call sites.
- `anthropicAws` ("Claude Platform on AWS") vs `mantle` ("Bedrock Mantle") are clearly distinct planes, but the product positioning of `anthropicAws` is inferred only from its label and base URL (`aws-external-anthropic.*.api.aws`).
- macOS daemon install (launchd) exists in parallel to the systemd path shown here but wasn't extracted (this is the Linux build); the binary-takeover/zombie logic is platform-agnostic.
