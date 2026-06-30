# Architecture Deep Dive

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Platform**: Linux x86-64 | **Runtime**: Bun **v1.4.0** (standalone compiled binary)

This document covers Claude Code's internal architecture as reverse-engineered from the **actual beautified JavaScript source** (`cli.beauty.js`, 733k lines), not just `strings`. Every claim is grounded in a function name or line citation. Throughout, sections are framed as **what's new/changed vs 2.1.169** — that is the meaningful delta; the distributed-runtime subsystems were already present in 2.1.169, so this pass tracks how they were renamed, re-gated, and extended.

Minified identifiers are rebuilt every release, so the symbol names here differ from the 2.1.169 doc even where behaviour is unchanged. A per-build symbol map is in [`bundle/_facts.md`](bundle/_facts.md); the most load-bearing remaps are called out inline (e.g. provider selector `Mq()`→`yr()`, telemetry fire `d`→`q`, flag get `j$`→`it`).

## Subsystem map (the 30-second view)

| Subsystem | What it is | 2.1.197 gate / entry | Was in 2.1.169 |
|-----------|-----------|----------------------|----------------|
| **Bun packaging** | Bun v1.4.0 standalone binary, bytecode-cached CJS | header `// @bun @bytecode @bun-cjs`; `bun_version:1.4.0` @ `299451`/`299474` | v1.3.14 (RUNTIME BUMP) |
| **Provider planes** | gateway-first 6-way plane select | `yr()` @ `94636` | `Mq()` @ `93073` (same shape) |
| **Agent teams** | teammates + coordinator + cross-session peers | `ll()` @ `292358`, `tengu_amber_flint` | `_4()` @ `273738` |
| **Coordinator mode** | orchestrator-of-workers persona | `Jv()` @ `225052`, prompt `Cup()` @ `225128` | `Vm` @ `210509` |
| **Background daemon** | systemd/launchd service, supervisor + worker pool, **binary takeover** | `498288+`, `575462+`, `732045+` | `541810+`, `470440+` |
| **Remote control / bridge** | phone/claude.ai drives a local session via cloud `/v1/sessions` | `createBridgeSession` @ `456662`, `CLAUDE_BRIDGE_*` | `427100+` |
| **kairos loops/scheduling** | `/loop`, `ScheduleWakeup`, cron, Monitor, push | `Ah="ScheduleWakeup"` @ `223995`, `R$()` @ `224837` | `~209480` |
| **Workflows VM** | VM-sandboxed deterministic multi-agent orchestration | `o2d()` @ `146634`, `WorkflowTool` (`T_f`) @ `416294` | `ZKf` @ `375415` |

The architectural skeleton is the **same distributed runtime** introduced in 2.1.169. The headline structural change this release is the **Bun v1.3.14 → v1.4.0 runtime bump**; everything else is incremental hardening, renamed symbols, and a few new tools (`DesignSync`, `Projects`, `Artifact`, `ShareOnboardingGuide`, `SendUserFile`) wired into the same registry.

---

## 1. Bun 1.4.0 standalone packaging

### 1.1 The binary

The shipped artifact is a single 245,517,112-byte ELF produced by `bun build --compile`. The JavaScript payload is appended to the Bun runtime and carved from byte offset 225,406,600 (18,097,818 bytes of minified JS → 733,394 beautified lines). The bundle header is:

```js
// @bun @bytecode @bun-cjs
(function(exports, require, module, __filename, __dirname) { …
```

- `@bun` — Bun standalone module marker.
- `@bytecode` — the module is shipped with **precompiled JSC bytecode** alongside the source, so cold start skips parse/compile of the 18 MB payload. (New emphasis vs the older `bun build` output.)
- `@bun-cjs` — the payload is wrapped as CommonJS (the classic `(exports, require, module, __filename, __dirname)` IIFE), not ESM.

### 1.2 Evidence the runtime is 1.4.0, baked in

The Bun version is **hard-coded** into the telemetry/Datadog tags at build time, which is the cleanest proof of the bump:

- `cli.beauty.js:299451` — ddtags string literal contains `"bun_version:1.4.0"`.
- `cli.beauty.js:299474` — `bun_version: "1.4.0"` field on the metrics payload.
- `cli.beauty.js:174400` — a keybinding capability gate compares against `1.4.0`: `PG() ? m7r("1.4.0", ">=1.2.23") : m7r(process.versions.node, ">=22.17.0 <23.0.0 || >=24.2.0")`. `PG()` is the "running on the native Bun runtime" check; when true the code asserts the embedded runtime is ≥1.2.23, and the literal it passes is `1.4.0` — i.e. the build knows it is on Bun 1.4.0. Under Node it instead version-gates `process.versions.node`.

This dual-runtime detection (`PG()` native-Bun vs `$ot`/Node at `110106`) means the same bundle can run either as the compiled Bun binary or under Node, and several capability checks branch on which.

### 1.3 Why the bump matters architecturally

The whole distributed runtime below (daemon, worker pool, rendezvous sockets, PTY sockets, VM sandbox) leans on Bun-native primitives — Unix-domain sockets, `Bun.spawn`, the embedded JSC VM for `hardenVMIntrinsics`, and `process.kill` semantics. Pinning to a single embedded runtime (rather than the host's Node) is what lets binary-takeover compare daemon-vs-client versions deterministically (§4.3): every worker, supervisor, and client is literally the same self-contained binary.

---

## 2. Provider routing (carried; gateway-first)

The single source of truth for the active plane is `yr()` (`cli.beauty.js:94636`, was `Mq()` @ `93073` in 2.1.169). Shape is unchanged — gateway is still checked first, then the five env-gated planes, then `firstParty`:

```js
function yr() {
  if (Lm()) return "gateway";
  return ct(env.CLAUDE_CODE_USE_BEDROCK)       ? "bedrock"
       : ct(env.CLAUDE_CODE_USE_FOUNDRY)        ? "foundry"
       : ct(env.CLAUDE_CODE_USE_ANTHROPIC_AWS)  ? "anthropicAws"
       : ct(env.CLAUDE_CODE_USE_MANTLE)         ? "mantle"
       : ct(env.CLAUDE_CODE_USE_VERTEX)         ? "vertex"
       : "firstParty";
}
```

`xc()` (`94645`) is the firstParty predicate; `aMt()` (`94649`) handles the bedrock→mantle secondary-provider case (was `eM$()`). The six-plane + gateway model from 2.1.169 (base URLs, model discovery, fallback/refusal-fallback) carries over unchanged in structure — see the 2.1.169 architecture §2 for the per-plane base-URL table, which still holds. The notable cross-cutting constraint, relevant below, is that **bridge / cloud-session / advisor features are first-party-only**: `createBridgeSession` bails on non-firstParty with `bridge_session_create_3p_provider` (`456691`).

---

## 3. Multi-agent teams & coordinator

### 3.1 Enablement — `ll()` (`292358`)

Agent teams ("agent swarms" internally — the export is `isAgentSwarmsEnabled`) require an explicit opt-in, then a default-on flag:

```js
function ll() {
  if (!ct(env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) && !eOp()) return !1; // eOp() = argv has --agent-teams
  if (!it("tengu_amber_flint", !0)) return !1;   // default TRUE
  return !0;
}
```

Identical policy to 2.1.169's `_4()`: opt in via `--agent-teams` (`eOp()` @ `292354`) or `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`, after which `tengu_amber_flint` defaults ON. The teammate-mode snapshot is still captured at startup only if teams are enabled (`xyo()` @ `292363`, was `up6`).

### 3.2 Coordinator mode — `Jv()` (`225052`)

Coordinator mode is the orchestrator persona. The gate gained a condition vs 2.1.169:

```js
function Jv() {
  if (!ct(env.CLAUDE_CODE_COORDINATOR_MODE)) return !1;
  if ($x() && !_a() && !ct(env.CLAUDE_CODE_REMOTE)) return !1;   // NEW guard
  return !0;
}
```

The new middle clause suppresses coordinator mode in some non-remote context (`$x() && !_a()` unless `CLAUDE_CODE_REMOTE` is set) — i.e. coordinator mode is biased toward remote-control / cloud sessions. `f6()` is the public `isCoordinatorMode()`; `vup()` (`225092`) auto-switches coordinator mode when resuming a session of the other kind and fires `tengu_coordinator_mode_switched` (`matchSessionMode`, was the same idea in 2.1.169).

### 3.3 Coordinator system prompt — `Cup()` (`225128`)

The dedicated coordinator prompt is a substantial new-this-build artifact. Headline: *"You are Claude Code, an AI assistant that orchestrates software engineering tasks across multiple workers."* It defines the worker toolset and three notable mechanisms:

- **Workers** are spawned with the Teammate tool (`is`), continued with SendMessage (`Dy`, by `to` agent ID), stopped with `_P`. The prompt warns that a worker's auto-mode check only sees the worker's own transcript, so coordinator approvals must be quoted verbatim into the worker prompt.
- **GitHub PR subscriptions** — `subscribe_pr_activity` / `unsubscribe_pr_activity` deliver PR review comments / CI failures / close-reopen as user messages; the prompt explicitly documents that CI *successes* and merge-conflict transitions do **not** webhook through and must be polled with `gh pr checks` / `gh pr view --json mergeable`.
- **Cross-session peers (notable)** — other Claude sessions appear as peers: `uds:…` for same-machine (Unix-domain-socket) sessions and `bridge:…` for cross-machine Remote Control sessions. They are discovered via the SendMessage-family tool (`But`) and reached via `Dy`. Incoming peer messages arrive wrapped in `<cross-session-message from="…">` and are treated as **input, not authority** — the prompt tells the coordinator to confirm with the user before acting on a peer's request. This stitches the bridge (§5) and the local daemon (§4) into one peer mesh from the coordinator's point of view.

---

## 4. Background agents & daemon

This remains the single largest subsystem: a long-lived OS service owning a pool of worker processes so background tasks survive after the foreground REPL exits.

### 4.1 The service (systemd user unit)

Installed as a systemd **user** service on Linux (unit written at `cli.beauty.js:498288`):

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

Install runs `systemctl --user daemon-reload` (`498313`) then `systemctl --user enable --now {id}.service` (`498320`). `--origin` distinguishes `service` (installed unit) from `transient` (ad-hoc spawn) — the supervisor loop (§4.4) branches on this. The cold-start prompt asking the user to install the daemon survives (`tengu_bg_daemon_cold_start_ask`).

### 4.2 Supervisor, worker pool & rendezvous

A **supervisor** process owns a `roster.json` (path `pme()/roster.json` @ `498615`) listing every worker. The roster schema (`$Ff` allow-list @ `498996`) is rich: `supervisorPid`, `workers[]`, and per-worker `pid`, `procStart`, `sessionId`, `rendezvousSock`, `ptySock`, `messagingSock`, `rvAuth`, `ptyAuth`, `cliVersion`, `worktreePath`, `dispatch`, `isolation`, `agent`, `routine`, etc. On each write the supervisor stamps `r.supervisorPid = process.pid` and `r.updatedAt = Date.now()` (`498981`).

Each worker is reached over three Unix-domain sockets injected via env into the child (`608352`):

| Socket | Env (auth) | Purpose |
|--------|-----------|---------|
| Rendezvous | `CLAUDE_BG_RENDEZVOUS_SOCK` + `CLAUDE_BG_RV_AUTH` | control / dispatch channel (`startRendezvousServer` @ `457020`, consumed-and-deleted from env at `457035`) |
| PTY | `CLAUDE_BG_PTY_AUTH` | terminal stream for attach (`607426`) |
| Messaging | `messagingSock` | inter-worker / peer messages |

These auth tokens are deliberately **stripped from any child env that isn't a bg worker** (`147624`) — the snapshot at `147613` treats presence of `CLAUDE_BG_RV_AUTH`/`CLAUDE_BG_PTY_AUTH`/`CLAUDE_BG_AUTH_SNAPSHOT_PATH` as the signal that this process *is* a managed worker, and a plain subagent spawn scrubs them.

**Roster resilience:** a non-regular or oversized `roster.json` is quarantined/removed and `tengu_bg_roster_parse_failed` fires (`498895+`); orphaned workers from a failed parse are adopted (`tengu_bg_roster_orphan_adopted` @ `189802`). `claude daemon status` (`499072+`) reports supervisor liveness, live-vs-roster worker counts, version-skewed workers ("most stay attachable and upgrade automatically once idle — exec runs never respawn"), roster age, and warns when the supervisor is dead but workers remain ("run `claude daemon stop --any` to reap them").

**Spare-worker pool & dispatch** (telemetry-confirmed, same lifecycle as 2.1.169): `tengu_bg_spare_spawn` / `_spare_claim` / `_spare_claim_fail` pre-warm spares so dispatch is instant; `tengu_bg_dispatch` (fired at `577493`) plus `_fallback` / `_low_mem` / `_rescued` / `_sigkill_escalate` / `_stale_drop`; worker lifecycle `tengu_bg_worker_spawn` / `_worker_exit` / `_respawn(_exhausted/_stale/_unconfirmed_bail)` / `_retired` / `_orphan_reap`. The full event roster is enumerated in the `Gdm` set at `606734`.

### 4.3 Binary takeover (`575462`)

When a newer client binary starts and finds a *stale* daemon running an older version, it kills the old daemon so new sessions use the current binary. The function:

1. Reads its own embedded `VERSION` (`"2.1.197"`, the inlined build-info object at `575456`) and the daemon's reported version (`r.version` via `yR()`).
2. Gated by `it("tengu_bg_binary_takeover", !0)` (default ON, `575462`) and skipped if a cold-start install prompt is pending.
3. Compares client vs daemon by version **and** binary mtime via `Yrm({daemonVersion, clientVersion, daemonMtimeMs, clientMtimeMs, …})` (`575480`).
4. If takeover is warranted, calls `CAt(r.pid)`; on `"timed-out"` escalates to `process.kill(r.pid, "SIGKILL")` (`575491`) and re-checks for `"exited"` (`575493`).
5. Logs *"this binary (2.1.197) is a newer build — retired the stale {daemon} so new sessions use the current binary"* and fires `q("tengu_bg_daemon_binary_takeover", { daemon_age_ms: Date.now() - r.startedAt })` (`575498`).

A companion path (`Zac` @ `575507`) detects a daemon whose **control socket failed to start** ("running without background sessions") and surfaces `tengu_bg_daemon_bg_disabled_skip` with remediation text. The zombie-restart guard (`tengu_bg_daemon_zombie_restart` / `_zombie_false_positive`) is still in the event set (`606734`).

### 4.4 Supervisor main loop & yielding (`732045`)

`daemon` start (`732045+`) builds the worker pool, writes `supervisor` log lines, fires `q("tengu_daemon_start", { worker_kinds, worker_count, origin })`, and enters a `setInterval` watch:

- **Service recall** — if `origin === "service"` and the recall flag `i7r()` is set, it drains workers and uninstalls the service.
- **Transient displacement** — if `origin === "transient"` and the lockfile is taken over by another PID (`Jse()`), it yields: `q("tengu_daemon_yield", { displaced: true, displaced_by_pid })` and resolves the run promise.
- **Self-restart on upgrade** — on exit with the upgrade flag set, `q("tengu_daemon_self_restart_on_upgrade", {})` (`732074`).

Startup crashes are double-reported (`tengu_daemon_startup_crash` via both `MU` and `gft` at `732613`) before `exit(1)`. The full daemon event family (`tengu_daemon_start/_startup_crash/_idle_exit/_config_reload/_lease/_self_restart_on_upgrade/_worker_crash/_worker_permanent_exit/_yield/_yield_takeover/_peer_uid_reject`) is in `Gdm` (`606734`).

---

## 5. Remote control / bridge

Lets a phone or `claude.ai/code` drive a **local** session via a cloud-hosted session object. Env family `CLAUDE_BRIDGE_BASE_URL` (`46506`) and friends carries over from 2.1.169.

### 5.1 Bridge client & session creation (`456690`)

`createBridgeClient` / `BridgeClient` are exported at `37855`/`37865` (was `createBridgeClient`/`Hg$` in 2.1.169). A bridge session is created by `createBridgeSession` (`u0f` @ `456662`), and the flow is first-party-gated and fully decoded:

1. `isFirstPartyProvider()` — else bail `bridge_session_create_3p_provider` (`456691`).
2. Resolve an access token (`accessToken`), else `bridge_session_create_no_token`.
3. Resolve an org UUID, else `bridge_session_create_no_org`.
4. Build `session_context` `{ sources, outcomes, model, cwd, reuse_outcome_branches: true }`, with `source: "remote-control"`, optional `permission_mode`, and optional `tags`.
5. POST to `${BASE_API_URL}/v1/sessions` (URL built @ `456723`) with headers including `"anthropic-beta": "ccr-byoc-2025-07-29"` and `"x-organization-uuid"` (`456721`-`456722`), `validateStatus: P < 500` (`456728`), accepting 200/201.

So the bridge rides the same `/v1/sessions` cloud surface as ultraplan/teleport, and the `ccr-byoc-2025-07-29` beta header ties it to the CCR (Claude Code Relay) auth-injection layer (`CCR_*` env family carried from 2.1.169). The cross-session peer mesh exposed to the coordinator (`bridge:…` peers, §3.3) is the user-facing face of this subsystem.

---

## 6. kairos — loops & scheduling

`kairos` is the umbrella for `/loop`, `ScheduleWakeup`, cron routines, monitors, and push. The pieces from 2.1.169 are intact with refreshed symbols.

### 6.1 `/loop` & autonomous sentinels

The "steward, not initiator" loop preamble is verbatim-preserved (`223885`): *"You're being invoked on a timer while the user is away or occupied… You're a steward, not an initiator…"*. Persistent mode:

```js
// 224054
if (ct(env.CLAUDE_CODE_LOOP_PERSISTENT)) return !0;
return it("tengu_kairos_loop_persistent", !1);   // default FALSE
```

(`CLAUDE_CODE_LOOP_KEEPALIVE` is the keepalive knob @ `224242`; `tengu_kairos_loop_persistent_activated` fires at `224063`.) Two autonomous sentinels coexist and are explicitly disambiguated in-prompt (`224004`): `<<autonomous-loop>>` for **CronCreate**-based loops vs `<<autonomous-loop-dynamic>>` for **ScheduleWakeup**-based loops.

### 6.2 `ScheduleWakeup` — cache-aware self-pacing (`223995`)

The `ScheduleWakeup` tool (`Ah = "ScheduleWakeup"` @ `223995`) lets the model pick its own next wake time, clamped to `[60, 3600]` (schema `delaySeconds` @ `425646`, with a `wasClamped` echo field @ `425652`). Its prompt is the same remarkable cache-TTL-aware guidance, now sharpened (`224013`): *"**Don't pick 300s.** It's the worst-of-both: you pay the cache miss without amortizing it… either drop to 270s (stay in cache) or commit to 1200s+ … Don't think in round-number minutes — think in cache windows."* When a wake signal (`vT`) is armed, `delaySeconds` becomes a 1200–1800s fallback heartbeat (`224227`, `664587`).

### 6.3 Cron / durable routines

Enable gate `R$()` (`224837`): `!CLAUDE_CODE_DISABLE_CRON && J7("tengu_kairos_cron", true, …)`; durability via `WSe()` → `tengu_kairos_cron_durable` (default true, `224841`). Durable jobs persist to `.claude/scheduled_tasks.json` (`Bcp` @ `223844`); session-only jobs die with the process; missed one-shot durable tasks are surfaced for catch-up (`224855`). The fleet-load guidance is intact and explicit:

- *"## Avoid the :00 and :30 minute marks when the task allows it"* (`224872`) — "the user will not notice, and the fleet will."
- Scheduler jitter (`224889`): recurring tasks fire up to 10% of period late (max 15 min); one-shots on :00/:30 fire up to 90s early. Jobs fire **only while the REPL is idle**.
- Recurring jobs **auto-expire after `jre` (DEFAULT_MAX_AGE_DAYS) days** (`224891`) — fire once more, then delete.

Tools `CronCreate` / `CronDelete` / `CronList` are registered in the kairos tool block (`435754`), alongside `RemoteTrigger` (registers agents with cloud routines), `Monitor`, `SendUserFile`, `PushNotification`, and the new `DesignSync` (`DesignSyncTool`), `Projects` (`ProjectsTool`), `Artifact` (`ArtifactTool`), and `ShareOnboardingGuide` tools — the latter four are not in the 2.1.169 roster and align with the new `/v1/design*` and projects/artifact cloud surfaces noted in `_facts.md`.

---

## 7. Workflows — deterministic VM-sandboxed orchestration

The `WorkflowTool` (`T_f`, exported at `416294`) runs a VM-sandboxed script that orchestrates multiple sub-agents across phases with a token budget and a journal.

### 7.1 Availability — `o2d()` (`146634`)

```js
function o2d() {
  if (ct(env.CLAUDE_CODE_WORKFLOWS)) {            // explicitly truthy → flag decides both
    let t = it("tengu_workflows_enabled", !0);
    return { available: t, defaultOn: t };
  }
  if (yl(env.CLAUDE_CODE_WORKFLOWS)) return { available: !1, defaultOn: !1 };  // explicitly falsy → off
  if (!it("tengu_workflows_enabled", !0)) return { available: !1, defaultOn: !1 };
  return { available: !0, defaultOn: Di() !== "pro" };   // default-on EXCEPT "pro" subscription
}
```

Same policy as 2.1.169 (`Ni_`): default-available, default-on for everyone **except the "pro" subscription tier** (`Di() !== "pro"`). Memoised behind `A7r()` (`146628`). `CLAUDE_CODE_DISABLE_WORKFLOWS` short-circuits.

### 7.2 The VM sandbox (`hardenVMIntrinsics`, `408720+`)

This is the security core and the most detailed code in the subsystem — it runs as a hardening preamble injected into the VM realm. It is the same intrinsic-hardening shared between REPLTool and WorkflowTool, with the critical distinction preserved in-comment (`408744`):

> `eval` is NOT deleted here — hardenVMIntrinsics is shared with REPLTool (`codeGeneration:{strings:true}`). **WorkflowTool blocks eval via `codeGeneration:false`.**

The preamble:

- Overrides `Error.prepareStackTrace` to a non-writable, non-configurable stringifier (`408730`).
- Deletes attack-surface globals: `ShadowRealm`, `WebAssembly`, `FinalizationRegistry`, `WeakRef`, `Atomics`, `SharedArrayBuffer`, `queueMicrotask`, and the JSC debug/shell escapes `$vm`, `gc`, `edenGC`, `fullGC`, `print`, `readFile`, `Loader` (`408740`). The comments justify each: `FinalizationRegistry` runs callbacks on the host loop outside any try/catch (DoS), `Atomics`/`SharedArrayBuffer` are shared-memory primitives with no cross-realm use, `$vm` is "a full escape (createGlobalObject, addressOf, runScript)".
- Applies **SES-style enable-property-override** (`enableOverride`, `408755`) to dodge the TC39 "override mistake" before freezing — converting shadowed data props to accessors so subclass constructors (`this.name='X'`) don't throw under freeze.

So the WorkflowTool is a genuinely sandboxed deterministic interpreter: no `eval`, no Wasm, no shared memory, no JSC introspection, frozen intrinsics.

### 7.3 Launch & telemetry (`416567`)

A workflow launch fires `q("tengu_workflow_launched", {...})` (`416567`) with `invocation_mode` (scriptPath/named/inline), `workflow_source`, `workflow_name`, `workflow_description`, `phase_count`, `launched_from_subagent`, `has_args`, `is_resume`, `script_size_chars`, then dispatches `ILo({ taskId, workflowRunId, script, vmScript, args, meta, transcriptDir, telemetry, isResume })` (`416567+`) returning `{ status: "async_launched", taskId, taskType: "local_workflow", workflowName }`. Per-phase results fire `tengu_workflow_phase_completed` (`414953`). Bundled workflows are seeded at registry build via `initBundledWorkflows()` (`435622`), invoked inside the tool-array IIFE at `435754`.

### 7.4 `ultracode` keyword & `ultra_effort`

The keyword path survives: `workflow_keyword_request` (`467189`, `604300`) opts a turn into Workflow orchestration when a regular user prompt mentions the keyword (`466960`), and `ultra_effort_enter` / `ultra_effort_exit` (in the system-reminder kind set `SVf` @ `528582`) flip the exhaustive-effort mode that makes the Workflow tool the default on every substantive task.

---

## What's new / changed vs 2.1.169 — at a glance

| Area | 2.1.169 | 2.1.197 |
|------|---------|---------|
| **Runtime** | Bun v1.3.14 standalone | **Bun v1.4.0** standalone; `bun_version:1.4.0` baked at `299451`/`299474`; native-runtime gate asserts `1.4.0` @ `174400` |
| Provider select | `Mq()` @ `93073` | `yr()` @ `94636` — same gateway-first 6-plane shape |
| Telemetry fire | `d(...)` | `q(name, payload)` @ `4135`; ~1684 call sites |
| Flag get | `j$` | `it`/`J7`/`QYr`/`$U` |
| Agent teams | `_4()` @ `273738` | `ll()` @ `292358`, `tengu_amber_flint` default-on (unchanged policy) |
| Coordinator gate | `Vm` @ `210509` | `Jv()` @ `225052` — **new `CLAUDE_CODE_REMOTE` / non-remote guard clause** |
| Coordinator prompt | (present) | `Cup()` @ `225128` — now documents **cross-session `uds:`/`bridge:` peers** and `subscribe_pr_activity` PR webhooks |
| Daemon | systemd/launchd + supervisor + workers + binary takeover | same; takeover `575462`, supervisor loop `732045`, richer `roster.json` schema `498996` |
| Bridge | `createBridgeSession` @ `427110` | `createBridgeSession` @ `456662`; POST `/v1/sessions` with `anthropic-beta: ccr-byoc-2025-07-29` |
| kairos | `/loop`, ScheduleWakeup, cron, Monitor, push | same; `tengu_kairos_loop_persistent` confirmed **default FALSE** @ `224055` |
| Workflows | `ZKf` @ `375415`, `Ni_` availability | `WorkflowTool`/`T_f` @ `416294`, `o2d()` @ `146634`; VM sandbox hardening at `408720+` (eval blocked via `codeGeneration:false`) |
| New tools | — | `DesignSync`, `Projects`, `Artifact`, `ShareOnboardingGuide`, `SendUserFile` wired into the kairos/agent tool block @ `435754` |

---

## Uncertainties / tentative inferences

- **Coordinator-gate new clause** (`Jv()` @ `225052`): `$x() && !_a() && !ct(env.CLAUDE_CODE_REMOTE)` clearly biases coordinator mode toward remote/cloud sessions, but the exact meaning of `$x()` and `_a()` (some "is interactive TUI" vs "is sub-session" predicates) is inferred from context, not dereferenced.
- **New tools** `DesignSync`/`Projects`/`Artifact`/`ShareOnboardingGuide`/`SendUserFile` are confirmed present in the registry block at `435754`, but I have not pinned each one's factory body or confirmed which three of them constitute the "+3 built-in tools" delta in `_facts.md` (tool `name` fields are mangled top-level consts).
- **Bytecode caching** (`@bytecode` header): the marker is present and consistent with `bun build --compile --bytecode`, but I did not independently verify the bytecode blob is actually loaded vs the JS source at runtime — this is inferred from the header convention.
- **Worker socket triad** (rendezvous / PTY / messaging): roster fields `rendezvousSock`/`ptySock`/`messagingSock` are confirmed in the `$Ff` allow-list (`498996`), but only the rendezvous and PTY auth-token wiring was read end-to-end; the messaging socket's transport is inferred to be the cross-session peer channel.
- Minified-symbol remaps (`Mq`→`yr`, `_4`→`ll`, `Vm`→coordinator module, `ZKf`→`T_f`) are matched by behaviour/strings; a symbol that was *split* across functions between builds could be mis-attributed, though the cited line bodies make each mapping high-confidence.
