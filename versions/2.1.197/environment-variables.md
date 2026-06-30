# Environment Variables

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Platform**: Linux x86-64 | **Runtime**: Bun **1.4.0** (was 1.3.14 in 2.1.169)

See [data/environment-vars.yaml](data/environment-vars.yaml) for the full structured dataset (every variable, typed, flagged `new` / `opt_out` / `danger`). In this build `new=true` means **absent from 2.1.169** (the previous baseline used 2.1.32).

## What's new vs 2.1.169

| | 2.1.169 | 2.1.197 |
|---|---|---|
| `CLAUDE_*` / `ANTHROPIC_*` distinct (canonical, `_facts.md`) | 490 | **526** (CLAUDE_ 470 + ANTHROPIC_ 56) |
| Genuinely new this build | — | **62** catalogued |
| Removed this build | — | **8** |

Same-method re-count of the 2.1.169 bundle yields **474**, so the apples-to-apples delta is 474 → 526; the **526** figure is canonical for 2.1.197 (`bundle/_facts.md`).

The registry machinery is unchanged in shape but every minified symbol was re-mangled:

### How the registry works (cli.beauty.js ~40499–46725)

Every Claude/Anthropic var is declared in a typed sub-map as a lazy getter `() => parser.parse(process.env[NAME])`, then merged into two proxies built by `JEs(map, fallback)` at **`cli.beauty.js:46725`**:

```
Oe = JEs(CMu, $et), IMu = {}, QO = JEs(IMu, null)
```

| Proxy | Use |
|-------|-----|
| `Oe.NAME` | **parsed** value (typed, with the map's default applied) — the common path |
| `QO.NAME` | **raw** string value, null-prototype (e.g. `Number(QO.CLAUDE_CODE_AUTO_MODE_TEMPERATURE)` `:373453`; `QO.CLAUDE_CODE_REPORT_FINDINGS` `:653603`) |

Parsers come from the factory **`Be`** (`cli.beauty.js:40499`, was `mH`):

| Parser | Behavior |
|--------|----------|
| `Be.str()` | trimmed string or `undefined` |
| `Be.bool()` | `ct()` truthy parse — **`1` / `true` / `yes` / `on`** ⇒ `true`, else `false` (`cli.beauty.js:1999`: `["1","true","yes","on"].includes(t)`) |
| `Be.triBool()` | `true` if truthy, `false` if `0`/`false`/`no`/`off`, else `undefined` (leaves default behavior) |
| `Be.int({min,max})` | parsed integer, optional bounds |
| `Be.enum([...])` | value if in the allow-list, else `undefined` (e.g. `Be.enum(["baseline","off"])` for `CLAUDE_CODE_TODO_REMINDER_MODE` `:46211`) |

Provider plane is still resolved by a ternary at **`cli.beauty.js:94638`**:
`CLAUDE_CODE_USE_BEDROCK → bedrock`, `_USE_FOUNDRY → foundry`, `_USE_ANTHROPIC_AWS → anthropicAws`, `_USE_MANTLE → mantle`, `_USE_VERTEX → vertex`, else `firstParty` (the `gateway` plane is checked earlier in `yr()`).

### Notable NEW families (all absent in 2.1.169)

- **Fable model line** — `ANTHROPIC_DEFAULT_FABLE_MODEL` (+`_NAME`/`_DESCRIPTION`/`_SUPPORTED_CAPABILITIES`); presence enables the family (`cli.beauty.js:101683`). Mirrors the new `claude-fable-5` model ids and the `CLAUDE_FABLE_5` Vertex-region key.
- **Design surface** — `CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID` (`:430710`), `CLAUDE_CODE_ENABLE_DESIGN_MCP` (`:136813`). Aligns with the new `/v1/design*` endpoints and the `/design-login` slash command.
- **Artifacts** — `CLAUDE_CODE_ARTIFACTS_API_BASE_URL`, `CLAUDE_CODE_DISABLE_ARTIFACT` (`:224968`/`:58847`), `_ARTIFACT_AUTO_OPEN`, `_ARTIFACT_DIRECT_UPLOAD`. The Artifact tool **replaces the removed `CLAUDE_CODE_FRAME*` family**.
- **Launch Composer** — `CLAUDE_CODE_ENABLE_LAUNCH_COMPOSER` / `_DISABLE_LAUNCH_COMPOSER`.
- **Coordinator knobs** — `CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS` (comma list, `:549814`), `_COORDINATOR_PROPAGATE_NESTED_MEMORY` (`:389607`).
- **Chrome / Slack surfaces** — `CLAUDE_CHROME_CLASSIFIER_FLOOR` (`:599631`), `CLAUDE_PREVIEW_CLASSIFIER_FLOOR`, `CLAUDE_IN_CHROME_MCP_SERVER_NAME` / `_DOMAIN_RULE_TOOL` (`:190051`), `CLAUDE_IN_SLACK_V2` (`:702622`).
- **Runner / child-session plumbing** — `CLAUDE_RUNNER_ACTIVITY_FD` (`:704791`), `CLAUDE_RUNNER_FETCH_DEPTH`, `CLAUDE_CODE_CHILD_SESSION` (`:102944`) — the last two appear in the env-scrub list `L6c` (`:730918`).
- **Token-budget UX** — `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` (enum `off|infinite|fixed|countdown|padded-countdown`, `:58949`) + `_TOTAL_TOKENS_REMINDER_BUDGET`, plus `CLAUDE_CODE_TODO_REMINDER_MODE` and `CLAUDE_CODE_POWERUP_ONBOARDING`.
- **Shoji render engine** — `CLAUDE_CODE_SHOJI_ENGINE` (`:619857`), also gated by flag `tengu_shoji_engine`.

## Removed in 2.1.197 (present in 2.1.169)

Verified absent (`grep -c == 0`) in this build:

| Variable | Note |
|----------|------|
| `ANTHROPIC_FOUNDRY_AUTH_TOKEN` | Foundry now keyed by `ANTHROPIC_FOUNDRY_API_KEY` only |
| `CLAUDE_CODE_FRAME` / `_FRAME_AUTO_OPEN` / `_FRAME_MCP` | Frame UI superseded by Artifact (bare `CLAUDE_CODE_FRAME` gone; the 4 residual `grep` hits are the unrelated **new** `CLAUDE_CODE_FRAME_TIMING_*` vars) |
| `CLAUDE_CODE_AGENT_LIST_IN_MESSAGES` | — |
| `CLAUDE_CODE_TEAM_ONBOARDING` | — |
| `CLAUDE_CODE_VELVET_FALCON` | Codenamed gate retired (`CLAUDE_CODE_PEWTER_OWL` remains, 4 hits) |
| `CLAUDE_OPUS_4_6` | Vertex region key superseded by `CLAUDE_OPUS_4_8` |

## Auth / identity / OAuth

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` / `CLAUDE_API_KEY` / `API_TOKEN` | First-party key / bearer / alternates |
| `ANTHROPIC_AWS_API_KEY` / `AWS_BEARER_TOKEN_BEDROCK` / `ANTHROPIC_FOUNDRY_API_KEY` / `ANTHROPIC_BEDROCK_MANTLE_API_KEY` | Provider-plane keys |
| `ANTHROPIC_PROFILE` / `ANTHROPIC_ORGANIZATION_ID` / `ANTHROPIC_FEDERATION_RULE_ID` | Profile / org / federation |
| `ANTHROPIC_IDENTITY_TOKEN` / `_FILE` | Workload (OIDC) identity token |
| `ANTHROPIC_SERVICE_ACCOUNT_ID` / `_SCOPE` / `_WORKSPACE_ID` / `_WORK_ID` / `_SESSION_ID` / `_ENVIRONMENT_ID` / `_ENVIRONMENT_KEY` | Self-hosted `EnvironmentWorker` identity |
| `ANTHROPIC_WEBHOOK_SIGNING_KEY` / `ENVIRONMENT_SERVICE_KEY` | Webhook / runner service keys |
| `CLAUDE_CODE_USER_EMAIL` / `_ACCOUNT_UUID` / `_ACCOUNT_TAGGED_ID` / `_ORGANIZATION_UUID` / `_SUBSCRIPTION_TYPE` / `_RATE_LIMIT_TIER` | Identity / tier overrides |
| `CLAUDE_TRUSTED_DEVICE_TOKEN` | `X-Trusted-Device-Token` header |
| `CLAUDE_CODE_OAUTH_TOKEN` / `_TOKEN_FILE_DESCRIPTOR` / `_REFRESH_TOKEN` / `_CLIENT_ID` / `_SCOPES` / `_401_WAIT_MS` / `_CUSTOM_OAUTH_URL` | OAuth plumbing |
| **`CLAUDE_CODE_DESIGN_OAUTH_CLIENT_ID`** *(new)* | OAuth client id for the **Design** surface; falls back to a built-in `DESIGN_CLIENT_ID`, errors if neither set (`:430710`,`:430754`) |
| `CLAUDE_CODE_SESSION_ACCESS_TOKEN` / `_API_KEY_FILE_DESCRIPTOR` / `_API_KEY_HELPER_TTL_MS` / `_HFI_BEARER_TOKEN` / `_WEBSOCKET_AUTH_FILE_DESCRIPTOR` / `CLAUDE_SESSION_INGRESS_TOKEN_FILE` | Per-session / FD-delivered tokens |
| `CLAUDE_CODE_SKIP_{BEDROCK,VERTEX,FOUNDRY,MANTLE,ANTHROPIC_AWS}_AUTH` | **Skip provider auth (danger)** |
| `ANTHROPIC_CONFIG_DIR` / `CLAUDE_CONFIG_DIR` / `CLAUDE_SECURESTORAGE_CONFIG_DIR` | Config / secure-storage dirs |
| `USE_LOCAL_OAUTH` / `USE_STAGING_OAUTH` / `CLAUDE_LOCAL_OAUTH_{API,APPS,CONSOLE}_BASE` | **Dev OAuth endpoints (danger)** |
| `CLAUDE_AI_AUTHORIZE_URL` / `_ORIGIN` / `_OAUTH_SCOPES` / `_INFERENCE_SCOPE` / `_PROFILE_SCOPE` / `SYSTEM_OIDCREQUESTURI` | claude.ai / Azure DevOps OIDC config |

## Providers — bedrock / vertex / foundry / mantle / gateway / aws / ccr

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_USE_BEDROCK` / `_USE_VERTEX` / `_USE_FOUNDRY` / `_USE_MANTLE` / `_USE_ANTHROPIC_AWS` / `_USE_GATEWAY` | Plane selectors (ternary `:94638`) |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` / `CLAUDE_GATEWAY_LOG_LEVEL` / `CLAUDE_GATEWAY_ALLOW_LOOPBACK` | Gateway behavior |
| `ANTHROPIC_BASE_URL` / `CLAUDE_CODE_API_BASE_URL` | First-party base URL |
| `ANTHROPIC_BEDROCK_BASE_URL` / `_SERVICE_TIER` / `_BEDROCK_MANTLE_BASE_URL` | Bedrock / Mantle |
| `ANTHROPIC_VERTEX_BASE_URL` / `_PROJECT_ID` / `CLOUD_ML_REGION` / `VERTEX_REGION_CLAUDE_*` | Vertex (per-model region suffix) |
| `ANTHROPIC_FOUNDRY_BASE_URL` / `_RESOURCE` | Foundry (auth-token var removed) |
| `ANTHROPIC_AWS_BASE_URL` / `_WORKSPACE_ID` / `ANTHROPIC_UNIX_SOCKET` | Anthropic-on-AWS / unix socket |
| **`CLAUDE_CODE_ARTIFACTS_API_BASE_URL`** *(new)* | Artifacts API base; counted as a first-party base URL (`:189146`) |
| `CLAUDE_CODE_USE_CCR_V2` / `CCR_*` / `AGENT_PROXY_URL` | Claude Code Router / egress proxy |
| **`CLAUDE_CODE_WEBSEARCH_USE_CCR_PROXY`** *(new)* | Route WebSearch through the CCR proxy (`:426233`) |
| **`CLAUDE_OPUS_4_8` / `CLAUDE_FABLE_5` / `CLAUDE_5_SONNET`** *(new)* | Model-id keys → `VERTEX_REGION_CLAUDE_*` overrides |
| `CLAUDE_CODE_SKIP_HFI_VERSION_CHECK` | **Skip hosted-inference version check (danger)** |

## Model / inference

Carried from 2.1.169 (`ANTHROPIC_MODEL`, `ANTHROPIC_SMALL_FAST_MODEL`, `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` +metadata, `ANTHROPIC_CUSTOM_MODEL_OPTION*`, `CLAUDE_CODE_SUBAGENT_MODEL`, effort / fast-mode / thinking / prompt-cache toggles, token caps), **plus new**:

| Variable | Purpose |
|----------|---------|
| **`ANTHROPIC_DEFAULT_FABLE_MODEL`** (+`_NAME` / `_DESCRIPTION` / `_SUPPORTED_CAPABILITIES`) | Register/override the **Fable** alias model; presence enables the family (`:101683`,`:101696`) |
| **`CLAUDE_CODE_AUTO_MODE_TEMPERATURE`** | Sampling temperature for the auto-mode classifier (`Number(QO…)` `:373453`) |
| **`CLAUDE_CODE_AUTO_MODE_SIBLING_CONTEXT`** | Include sibling-agent context in the auto-mode decision |
| `CLAUDE_CODE_PEWTER_OWL` / `_PEWTER_OWL_TOOL` | **Internal codenamed model/feature gates (danger)** — `VELVET_FALCON` removed |

## Telemetry / OpenTelemetry / debug

Carried OTel/Datadog/Perfetto/debug-log suite from 2.1.169, **plus new**:

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_CODE_OTEL_DIAG_STDERR`** | Write OpenTelemetry diagnostics to stderr (`:40605`) |
| **`CLAUDE_CODE_FRAME_TIMING_SAMPLE_EVERY`** | Sample render-frame timings every N frames |

Privacy/opt-out switches unchanged in 2.1.197 (`DISABLE_TELEMETRY`, `DO_NOT_TRACK`, `DISABLE_ERROR_REPORTING`, `DISABLE_GROWTHBOOK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `_SUPPRESS_SESSION_ATTRIBUTION`, `_SKIP_PROMPT_HISTORY`, `_SKIP_REPO_UPLOAD`, `_SKIP_PROJECT_BACKFILL`, `DISABLE_AUTOUPDATER`/`DISABLE_UPDATES`, …). The `OTEL_LOG_USER_PROMPTS` / `_TOOL_CONTENT` / `_RAW_API_BODIES` content-logging trio remains **off by default (danger; privacy)**.

## Context / compaction / memory

Carried compaction/resume/CLAUDE.md set, **plus new**:

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC`** | Disable periodic memory re-sync (returns 0 interval, `:449394`) — aligns with the new `/pause-memory` command |
| **`MAX_CLAUDE_MD_BYTES`** | Cap bytes loaded from a CLAUDE.md file (`:228998`) |
| **`CLAUDE_CODE_COORDINATOR_PROPAGATE_NESTED_MEMORY`** | Propagate nested memory from coordinator to sub-sessions (`:389607`) |

## Background agents / daemon

Carried `CLAUDE_BG_*` / PTY / daemon set, **plus new**:

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_BG_POST_CLEAR_RESPAWN`** | Respawn the bg session after `/clear` |
| **`CLAUDE_CODE_BG_TASKS_REPORT_RUNNING`** | Report bg tasks still running |
| **`CLAUDE_CODE_DISABLE_BG_EXIT_HANDOFF`** | Disable handing off bg work on exit (needs `CLAUDE_JOB_DIR`, `:302398`) |
| **`CLAUDE_CODE_DISABLE_BG_SHELL_PRESSURE_REAP`** | Don't reap bg shells under memory pressure |
| **`CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS`** | Max ms to wait on bg tasks in `--print`/headless |

## Session / remote / runner

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_CODE_CHILD_SESSION`** | Marks a child session; scrubbed from re-spawned env (`:102944`,`:730918`) |
| **`CLAUDE_CODE_ENABLE_REMOTE_RECAP`** | Enable remote-session recap (`:292196`) |
| **`CLAUDE_PROJECT_UUID`** | Project UUID override / attribution (`:229872`,`:431792`) |
| **`CLAUDE_CLIENT_PRESENCE_FILE`** / **`CLAUDE_CODE_DISABLE_NOTIFICATION_PRESENCE_CHECK`** | Client presence file / disable presence check before notifications |
| **`CLAUDE_RUNNER_ACTIVITY_FD`** / **`CLAUDE_RUNNER_FETCH_DEPTH`** | Runner activity FD / git fetch depth (`:704791`,`:46368`) |
| **`CLAUDE_STAGE_FILE_ROOT`** | Root dir for staged files (`:46363`) |

Plus carried bridge/remote/session-ingress and loops/cron/teams families from 2.1.169.

## MCP / plugins / skills

Carried MCP-timeout / OAuth / plugin-sync / skill set, **plus new**:

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_CODE_ENABLE_DESIGN_MCP`** | Enable the Design MCP server (`:136813`) |
| **`CLAUDE_IN_CHROME_MCP_SERVER_NAME`** / **`_DOMAIN_RULE_TOOL`** | Claude-in-Chrome MCP server / domain-rule tool (`:190051`,`:190052`) |
| **`CLAUDE_CODE_TERMINAL_MCP_TOOLS`** | Comma-list allow-list of terminal-exposed MCP tools (`:359281`,`:457342`) |
| **`CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS`** | Skip plugin MCP server discovery (`:268086`) |
| **`CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT`** | Idle timeout for MCP tool invocations |
| **`CLAUDE_CODE_PLUGIN_BINARY_ASSETS`** / **`_SYNC_PLUGINS_BUFFERED_DOWNLOAD`** / **`_SYNC_PLUGINS_DOWNLOAD_STALL_MS`** | Plugin binary assets / buffered download / stall timeout |
| **`CLAUDE_CODE_SKILL_DESC_REFRAME`** | Reframe skill descriptions |

## Permissions / classifiers / Chrome

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_CHROME_CLASSIFIER_FLOOR`** | Floor for the Chrome auto-mode action classifier; defaults to flag `tengu_cowork_chrome_automode_default` (`:599631`) |
| **`CLAUDE_PREVIEW_CLASSIFIER_FLOOR`** | Enable the preview action-classifier floor (`:599632`) |
| `CLAUDE_CODE_TEST_FORCE_DENY` / `_SUBPROCESS_ENV_SCRUB` / `_SAFE_MODE` / `CLAUDE_CHROME_PERMISSION_MODE` | Carried permission/sandbox controls |

## IDE / terminal / UI

Carried TUI rendering / tmux / agent-view set (minus the removed `CLAUDE_CODE_FRAME*`), **plus new**:

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_AX_SCREEN_READER`** | Screen-reader output (flat text); also `--ax-screen-reader` (`:58325`,`:135334`) |
| **`CLAUDE_CODE_ALTGR_AS_TEXT`** | Treat AltGr combos as literal text (`:156930`) |
| **`CLAUDE_CODE_DISABLE_MOUSE_CLICKS`** / **`_FORCE_STRIKETHROUGH`** / **`_HIDE_SETTINGS_HINT`** | TUI input/render toggles |
| **`CLAUDE_CODE_ARTIFACT_AUTO_OPEN`** / **`_ENABLE_LAUNCH_COMPOSER`** / **`_DISABLE_LAUNCH_COMPOSER`** | Artifact / composer UI |
| **`CLAUDE_CODE_TODO_REMINDER_MODE`** | Enum `baseline\|off` (`:46211`,`:466936`) |
| **`CLAUDE_CODE_TOTAL_TOKENS_REMINDER`** (+`_BUDGET`) | `<total_tokens>` reminder; enum `off\|infinite\|fixed\|countdown\|padded-countdown` (default budget 15000000) (`:58949`) |
| **`CLAUDE_CODE_POWERUP_ONBOARDING`** | Onboarding mode `banner\|step` (`:528621`,`:698128`) |
| **`CLAUDE_CODE_SHOJI_ENGINE`** | Shoji render engine; also flag `tengu_shoji_engine` (`:619857`) |
| **`CLAUDE_REPL_VERBOSE`** / **`CLAUDE_CODE_FABLE_BRIDGE_DIALOG_TIMEOUT_MS`** | REPL verbosity / Fable bridge dialog timeout (`:458804`) |
| **`CLAUDE_DISABLE_ADOPT`** | Disable session-adopt (`:301981`) |

## SDK / entrypoint / surfaces

| Variable | Purpose |
|----------|---------|
| **`CLAUDE_IN_SLACK_V2`** | Claude-in-Slack v2 surface marker; gates per-channel spend-cap telemetry (`:702622`,`:702625`) |
| **`CLAUDE_CODE_COORDINATOR_EXTRA_TOOLS`** | Comma-list of extra tools for the coordinator agent (`:549814`) |
| `CLAUDE_CODE_REPORT_FINDINGS` | Gate for the `ReportFindings` tool (`QO.…` `:653603`) |
| Carried `CLAUDE_AGENT_SDK_*` / `CLAUDE_CODE_ENTRYPOINT` / `CLAUDECODE` / `AI_AGENT` markers | Unchanged |

## Uncertainties

- Exact `type` for a handful of new vars (`CLAUDE_CODE_AUTO_MODE_SIBLING_CONTEXT`, `_PLUGIN_BINARY_ASSETS`, `_SKILL_DESC_REFRAME`, `CLAUDE_RUNNER_FETCH_DEPTH`, `CLAUDE_STAGE_FILE_ROOT`, `CLAUDE_REPL_VERBOSE`) is inferred from name + registry getter; the parser symbol is present but its `Be.*` kind was not individually traced — `str`/`bool`/`int` assignment is best-effort.
- `CLAUDE_CODE_POWERUP_ONBOARDING` is read as a string compared against `"banner"`/`"step"` (`:698128`); typed `str` here rather than `enum` because no `Be.enum` allow-list was confirmed at its getter.
- `CLAUDE_BG_SESSION_PERMISSION_RULES` already existed in 2.1.169 (the raw extract produced a spurious `…RULESL` token); it is **not** new.
- `MAX_CLAUDE_MD_BYTES` is the real registry name (`:228998`); the older `CLAUDE_MD_TOKEN_CONTEXT_RATIO` is still present (1 hit) and is **not** removed.
