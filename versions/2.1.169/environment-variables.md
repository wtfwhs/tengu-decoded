# Environment Variables

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.3.14

See [data/environment-vars.yaml](data/environment-vars.yaml) for the full structured dataset (every variable, typed, flagged `new` / `opt_out` / `danger`).

## What's new vs 2.1.32

| | 2.1.32 | 2.1.169 |
|---|---|---|
| `CLAUDE_*` / `ANTHROPIC_*` vars (raw list) | 54 | **490** |
| Non-prefixed vars referenced in code | ~10 | ~110 |

A ~9x explosion. The dataset is now machine-generated from a **typed env registry** rather than ad-hoc `process.env` reads.

### How the registry works (cli.beauty.js ~40057–46241)

Every Claude/Anthropic var is declared in one of 8 typed sub-maps, then merged into a single proxy object `Y$` (`cli.beauty.js:46241`). Each entry is a lazy getter: `() => parser.parse(process.env[NAME])`. The parsers (`mH`, `cli.beauty.js:40057`):

| Parser | Behavior |
|--------|----------|
| `str` | trimmed string or `undefined` |
| `bool` | `$$()` truthy parse — **`1` / `true` / `yes` / `on`** ⇒ `true`, else `false` (`cli.beauty.js:1854`) |
| `triBool` | `true` if truthy, `false` if `0` / `false` / `no` / `off`, else `undefined` (leaves default behavior) |
| `int` | parsed integer, optional `{min,max}` |
| `enum` | value if in an allow-list, else `undefined` |

The 8 maps: `s$6` auth/identity, `t$6` telemetry/otel/debug, `G66` boolean toggles, `T66` terminal/CI/host detection, `V66` Claude session/bg/bridge/remote strings, `v66` model overrides, `N66` proxy/network/api, `k66` providers.

Notable **new families** (all absent in 2.1.32):

- **`CLAUDE_BG_*`** — background-agent / daemon plumbing (rendezvous sockets, claim/PTY/RV auth tokens, isolation).
- **`CLAUDE_BRIDGE_*` + `CLAUDE_CODE_REMOTE_*` + `*SESSION_INGRESS*`** — the bridge/remote (claude.ai cloud + mobile) transport.
- **`CLAUDE_CODE_LOOP_*` / `*_WORKFLOWS` / `*_DISABLE_CRON` / `*_PLAN_V2_*` / `*_COORDINATOR_MODE`** — loops, cron/routines, multi-agent teams.
- **`CLAUDE_COWORK_*` / `CLAUDE_CODE_IS_COWORK`** — cowork mode.
- **`CLAUDE_CODE_USE_MANTLE` / `USE_ANTHROPIC_AWS` / `USE_GATEWAY` + `ANTHROPIC_FOUNDRY_*` / `ANTHROPIC_AWS_*` / `ANTHROPIC_BEDROCK_MANTLE_*`** — new provider planes (mantle, gateway, foundry) beyond bedrock/vertex.
- **`CLAUDE_CODE_BUBBLEWRAP` / `FORCE_SANDBOX` / `SANDBOXED` / `SUBPROCESS_ENV_SCRUB`** — the new sandbox/isolation layer.
- **`CCR_*`** — Claude Code Router / egress proxy.
- **`OTEL_*` (full suite) + `ANT_OTEL_*` + Datadog `CLAUDE_CODE_*DATADOG*`** — OpenTelemetry export is now first-class; Segment is gone.

## Auth / identity / OAuth (`s$6`)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Primary first-party API key |
| `ANTHROPIC_AUTH_TOKEN` | Bearer auth token |
| `CLAUDE_API_KEY` / `API_TOKEN` | Alternate API key / generic token |
| `ANTHROPIC_AWS_API_KEY` / `AWS_BEARER_TOKEN_BEDROCK` | Anthropic-on-AWS / Bedrock auth |
| `ANTHROPIC_FOUNDRY_API_KEY` | Foundry plane key |
| `AGENT_PROXY_AUTH_TOKEN` | Agent egress-proxy token |
| `ANTHROPIC_PROFILE` | Named credential profile |
| `ANTHROPIC_ORGANIZATION_ID` | Org id override |
| `ANTHROPIC_FEDERATION_RULE_ID` | Enterprise identity-federation rule |
| `ANTHROPIC_IDENTITY_TOKEN` / `_FILE` | Workload (OIDC) identity token / file |
| `ANTHROPIC_SERVICE_ACCOUNT_ID` / `_SCOPE` / `_WORKSPACE_ID` / `_WORK_ID` / `_SESSION_ID` / `_ENVIRONMENT_ID` / `_ENVIRONMENT_KEY` | Self-hosted `EnvironmentWorker` identity fields |
| `ANTHROPIC_WEBHOOK_SIGNING_KEY` | `webhooks.unwrap()` signature key |
| `ENVIRONMENT_SERVICE_KEY` | Environment-runner service key |
| `CLAUDE_CODE_USER_EMAIL` / `_ACCOUNT_UUID` / `_ACCOUNT_TAGGED_ID` / `_ORGANIZATION_UUID` | Identity / attribution overrides |
| `CLAUDE_CODE_SUBSCRIPTION_TYPE` / `_RATE_LIMIT_TIER` | Tier overrides |
| `CLAUDE_TRUSTED_DEVICE_TOKEN` | `X-Trusted-Device-Token` header value |
| `CLAUDE_CODE_OAUTH_TOKEN` / `_TOKEN_FILE_DESCRIPTOR` / `_REFRESH_TOKEN` / `_CLIENT_ID` / `_SCOPES` / `_401_WAIT_MS` | OAuth token plumbing |
| `CLAUDE_CODE_CUSTOM_OAUTH_URL` | Custom OAuth base (validated against allow-list) |
| `CLAUDE_CODE_SESSION_ACCESS_TOKEN` | Per-session token |
| `CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR` / `_API_KEY_HELPER_TTL_MS` | FD-delivered key + helper TTL |
| `CLAUDE_CODE_HFI_BEARER_TOKEN` | Hosted first-party inference token |
| `CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR` / `CLAUDE_SESSION_INGRESS_TOKEN_FILE` | WS / ingress token files |
| `CLAUDE_CODE_SDK_HAS_OAUTH_REFRESH` / `_SDK_HAS_HOST_AUTH_REFRESH` / `_HOST_AUTH_ENV_VAR` / `_HOST_AUTH_REFRESH_TIMEOUT_MS` | Host/SDK-managed auth refresh |
| `CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER` / `_PROXY_AUTH_HELPER_TTL_MS` / `_AUTH_FAIL_EXIT_MS` | Proxy-auth helper |
| `CLAUDE_CODE_SKIP_{BEDROCK,VERTEX,FOUNDRY,MANTLE,ANTHROPIC_AWS}_AUTH` | **Skip provider auth (danger)** |
| `ANTHROPIC_CONFIG_DIR` / `CLAUDE_CONFIG_DIR` / `CLAUDE_SECURESTORAGE_CONFIG_DIR` | Config / secure-storage dirs |
| `USE_LOCAL_OAUTH` / `USE_STAGING_OAUTH` / `CLAUDE_LOCAL_OAUTH_{API,APPS,CONSOLE}_BASE` | **Dev OAuth endpoints (danger)** |
| `CLAUDE_AI_AUTHORIZE_URL` / `_ORIGIN` / `_OAUTH_SCOPES` / `_INFERENCE_SCOPE` / `_PROFILE_SCOPE` | claude.ai OAuth config constants |
| `SYSTEM_OIDCREQUESTURI` | Azure DevOps OIDC request URI |

## Providers — bedrock / vertex / foundry / mantle / gateway / aws / ccr (`k66`)

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_USE_BEDROCK` | plane=bedrock |
| `CLAUDE_CODE_USE_VERTEX` | plane=vertex |
| `CLAUDE_CODE_USE_FOUNDRY` | plane=foundry |
| `CLAUDE_CODE_USE_MANTLE` | **plane=mantle (new)** |
| `CLAUDE_CODE_USE_ANTHROPIC_AWS` | **plane=gateway via Anthropic-on-AWS (new)** |
| `CLAUDE_CODE_USE_GATEWAY` | **generic gateway plane (new)** |
| `CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY` | Discover models from gateway |
| `CLAUDE_GATEWAY_LOG_LEVEL` / `CLAUDE_GATEWAY_ALLOW_LOOPBACK` | Gateway logging / loopback |
| `ANTHROPIC_BASE_URL` / `CLAUDE_CODE_API_BASE_URL` | First-party base URL |
| `ANTHROPIC_BEDROCK_BASE_URL` / `_SERVICE_TIER` | Bedrock |
| `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` / `_API_KEY` | Bedrock-Mantle |
| `ANTHROPIC_VERTEX_BASE_URL` / `_PROJECT_ID` | Vertex |
| `ANTHROPIC_FOUNDRY_BASE_URL` / `_RESOURCE` / `_AUTH_TOKEN` | Foundry |
| `ANTHROPIC_AWS_BASE_URL` / `_WORKSPACE_ID` | Anthropic-on-AWS |
| `ANTHROPIC_UNIX_SOCKET` | Connect over unix socket |
| `ANTHROPIC_SMALL_FAST_MODEL_AWS_REGION` | Region for Haiku |
| `AWS_REGION` / `AWS_DEFAULT_REGION` / `AWS_PROFILE` / `CLOUD_ML_REGION` | Cloud SDK region/profile |
| `VERTEX_REGION_CLAUDE_*` | **Per-model Vertex region** (suffix = model id, e.g. `VERTEX_REGION_CLAUDE_4_8_OPUS`, `_CLAUDE_HAIKU_4_5`) |
| `CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST` | Host picks provider |
| `CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` | Treat URL as first-party (enables telemetry/betas) |
| `CLAUDE_CODE_USE_CCR_V2` / `CCR_ENABLE_BUNDLE` / `CCR_FORCE_BUNDLE` / `CCR_EGRESS_GATEWAY_ENABLED` / `CCR_AGENT_PROXY_ENABLED` / `CCR_UPSTREAM_PROXY_ENABLED` / `CCR_SPAWN_TIMESTAMP_MS` | Claude Code Router / egress proxy |
| `AGENT_PROXY_URL` | Agent egress proxy |
| `CLAUDE_CODE_SKIP_HFI_VERSION_CHECK` | **Skip hosted-inference version check (danger)** |

> Telemetry note (Batch-A): when a 3P provider plane is active (`bedrock`/`vertex`/`foundry`/`mantle`/`gateway`) first-party telemetry is dropped. Provider planes are resolved by `Mq()` (`cli.beauty.js:93073`).

## Model / inference (`v66`, `N66`)

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_MODEL` / `ANTHROPIC_SMALL_FAST_MODEL` | Primary / small-fast model |
| `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU}_MODEL` (+ `_NAME` / `_DESCRIPTION` / `_SUPPORTED_CAPABILITIES`) | Alias model overrides + display metadata |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` (+ `_NAME` / `_DESCRIPTION` / `_SUPPORTED_CAPABILITIES`) | Register an extra selectable model |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Subagent model |
| `CLAUDE_CODE_AUTO_MODE_MODEL` / `_BG_CLASSIFIER_MODEL` | Auto-mode model / bash safety classifier (Haiku) |
| `CLAUDE_CONTEXT_COLLAPSE` / `_MODEL` | Context-collapse summarizer |
| `CLAUDE_CODE_EFFORT_LEVEL` / `CLAUDE_EFFORT` / `_ALWAYS_ENABLE_EFFORT` | Reasoning effort |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` / `_OPUS_4_6_FAST_MODE_OVERRIDE` / `_DISABLE_FAST_MODE` | Fast-mode toggles |
| `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` (danger) / `_SKIP_FAST_MODE_NETWORK_ERRORS` | Fast-mode gating bypass |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` / `_DISABLE_LEGACY_MODEL_REMAP` | Context / model-remap toggles |
| `FALLBACK_FOR_ALL_PRIMARY_MODELS` | Force fallback model |
| `CLAUDE_CODE_PEWTER_OWL` / `_PEWTER_OWL_TOOL` / `CLAUDE_CODE_VELVET_FALCON` | **Internal codenamed model/feature toggles (danger)** |
| `MAX_THINKING_TOKENS` / `MAX_STRUCTURED_OUTPUT_RETRIES` | Thinking budget / structured retries |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` / `_MAX_CONTEXT_TOKENS` / `_MAX_TURNS` / `_MAX_RETRIES` / `_MAX_TOOL_USE_CONCURRENCY` | Limits |
| `API_MAX_INPUT_TOKENS` / `API_TARGET_INPUT_TOKENS` / `API_TIMEOUT_MS` / `API_FORCE_IDLE_TIMEOUT` | API budgets / timeouts |
| `ANTHROPIC_BETAS` / `ANTHROPIC_CUSTOM_HEADERS` / `CLAUDE_CODE_EXTRA_BODY` / `_EXTRA_METADATA` / `_ATTRIBUTION_HEADER` | Request shaping |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` / `MAX_MCP_OUTPUT_TOKENS` | Tool output caps |
| `USE_API_CONTEXT_MANAGEMENT` / `USE_API_CLEAR_TOOL_USES` / `USE_API_CLEAR_TOOL_RESULTS` | API-side context mgmt |
| `CLAUDE_CODE_INCLUDE_PARTIAL_MESSAGES` / `_ENABLE_FINE_GRAINED_TOOL_STREAMING` / `_FORCE_SYNC_OUTPUT` / `_EAGER_FLUSH` | Streaming behavior |
| `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` / `_DISABLE_REFUSAL_FALLBACK` / `_DISABLE_THINKING` / `_DISABLE_ADAPTIVE_THINKING` / `DISABLE_INTERLEAVED_THINKING` | Inference disables |
| `ENABLE_PROMPT_CACHING_1H` / `_1H_BEDROCK` / `FORCE_PROMPT_CACHING_5M` / `DISABLE_PROMPT_CACHING` (+`_OPUS`/`_SONNET`/`_HAIKU`) / `CLAUDE_CODE_FORCE_GLOBAL_CACHE` | Prompt-cache TTL/scope |
| `ANTHROPIC_LOG` | SDK log level |

## Telemetry / OpenTelemetry / debug (`t$6`)

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Master OTel-export enable |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` / `ENABLE_ENHANCED_TELEMETRY_BETA` | Enhanced telemetry beta |
| `CLAUDE_CODE_BYOC_ENABLE_DATADOG` / `_DATADOG_FLUSH_INTERVAL_MS` / `_DD_ERROR_TRACKING_FLUSH_INTERVAL_MS` | Datadog export (us5; off by default) |
| `CLAUDE_CODE_METRICS_ENDPOINT` (`ANT_CLAUDE_CODE_METRICS_ENDPOINT`) | Custom metrics endpoint |
| `OTEL_EXPORTER_OTLP_ENDPOINT` / `_HEADERS` / `_PROTOCOL` / `_INSECURE` (+ `_TRACES_*` / `_METRICS_*` / `_LOGS_*` / `_PROMETHEUS_*`) | OTLP exporter config |
| `OTEL_{METRICS,LOGS,TRACES}_EXPORTER` / `OTEL_{METRIC,LOGS,TRACES}_EXPORT_INTERVAL` / `OTEL_RESOURCE_ATTRIBUTES` | OTel pipeline |
| `OTEL_LOG_USER_PROMPTS` / `OTEL_LOG_TOOL_CONTENT` / `OTEL_LOG_RAW_API_BODIES` | **Verbose content logging — off by default (danger; privacy)** |
| `OTEL_LOG_TOOL_DETAILS` | Tool details in logs |
| `ANT_OTEL_*` (8 vars) | Anthropic-internal OTel overrides |
| `BETA_TRACING_ENDPOINT` / `ENABLE_BETA_TRACING_DETAILED` | Beta tracing |
| `CLAUDE_CODE_OTEL_FLUSH_TIMEOUT_MS` / `_OTEL_SHUTDOWN_TIMEOUT_MS` / `_OTEL_HEADERS_HELPER_DEBOUNCE_MS` / `_PROPAGATE_TRACEPARENT` | OTel lifecycle |
| `CLAUDE_CODE_PERFETTO_TRACE` / `_PERFETTO_WRITE_INTERVAL_S` | Local Perfetto trace |
| `CLAUDE_CODE_PROFILE_STARTUP` / `_PROFILE_QUERY` | Profiling |
| `CLAUDE_CODE_ENABLE_FEEDBACK_SURVEY_FOR_OTEL` / `CLAUDE_FORCE_DISPLAY_SURVEY` | Survey controls |
| `CLAUDE_DEBUG` / `CLAUDE_CODE_DEBUG_LOG_LEVEL` / `_DEBUG_LOGS_DIR` / `_DEBUG_REPAINTS` / `_DIAGNOSTICS_FILE` | Debug logging |
| `CLAUDE_CODE_SESSION_LOG` / `_COMMIT_LOG` / `_JSONL_TRANSCRIPT` / `_TERMINAL_RECORDING` / `CLAUDE_PTY_RECORD` / `_TEE_SDK_STDOUT` / `_FRAME_TIMING_LOG` / `_BENCH_LIVE_COUNTS` | Logs / recordings |
| `DEBUG_SDK` / `DEBUG_CLAUDE_AGENT_SDK` / `DEBUG` / `DEBUG_AUTH` / `SRT_DEBUG` / `NODE_DEBUG` / `AUTOMODE_DECISION_LOG` | Misc debug |

## Privacy / opt-out

Every variable that disables telemetry, network, or data collection. Defaults are **off** (i.e. collection on) unless noted.

| Variable | Effect | Notes |
|----------|--------|-------|
| `DISABLE_TELEMETRY` | Master kill switch for telemetry/analytics | Inherited from 2.1.32 |
| `DO_NOT_TRACK` | Honors the DNT standard; disables telemetry | **New** |
| `DISABLE_ERROR_REPORTING` | Disables error reporting (Datadog error tracking) | Checked alongside provider planes |
| `DISABLE_GROWTHBOOK` | Disables GrowthBook flag fetch **and exposure tracking** | **New**; `!Y$.DISABLE_GROWTHBOOK && iu()` |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Restricts network to "essential-traffic" only (no telemetry/surveys/update pings) | Returns sentinel `"essential-traffic"` |
| `CLAUDE_CODE_SUPPRESS_SESSION_ATTRIBUTION` | Suppresses session-attribution metadata | **New** |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | Does not persist prompt history | **New** |
| `CLAUDE_CODE_SKIP_REPO_UPLOAD` | Does not upload repo contents (remote/cloud) | **New** |
| `CLAUDE_CODE_SKIP_PROJECT_BACKFILL` | Skips project-metadata backfill | **New** |
| `DISABLE_AUTOUPDATER` / `DISABLE_UPDATES` / `DISABLE_INSTALLATION_CHECKS` | No update/version network calls | **New** |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | Disables feedback surveys | |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Does not write terminal title | |

Privacy-relevant *enables* (default off — turning ON increases data exposure): `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_RAW_API_BODIES`, `CLAUDE_CODE_ENABLE_TELEMETRY`, `CLAUDE_CODE_BYOC_ENABLE_DATADOG`.

Also command-hiding (UX, not data): `DISABLE_{UPGRADE,COST_WARNINGS,BUG,FEEDBACK,DOCTOR,EXTRA_USAGE,LOGIN,LOGOUT,INSTALL_GITHUB_APP}_COMMAND`.

## Context / compaction / memory

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE` / `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` / `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | Auto-compact threshold/window |
| `DISABLE_AUTO_COMPACT` / `DISABLE_COMPACT` / `CLAUDE_CODE_COLD_COMPACT` / `_DISABLE_PRECOMPACT_SKIP` / `CLAUDE_AFTER_LAST_COMPACT` / `_CLASSIFIER_SUMMARY` | Compaction control |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` / `CLAUDE_BG_MEMORY_TOGGLED_OFF` / `_FORCE_EVALUATE_MEMORY` / `_FORCE_MEMORY_SURVEY` / `_DISABLE_MEMORY_BULK_INFLATE` / `CLAUDE_MEMORY_STORES` / `TEAM_MEMORY_SYNC_URL` | Memory |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` / `_ADDITIONAL_DIRECTORIES_CLAUDE_MD` / `CLAUDE_MD_TOKEN_CONTEXT_RATIO` | CLAUDE.md loading |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` / `CLAUDE_IMPORT_CONVERSATIONS` | Attachments / imports |
| `CLAUDE_CODE_RESUME_FROM_SESSION` / `_RESUME_PROMPT` / `_RESUME_INTERRUPTED_TURN` / `_RESUME_THRESHOLD_MINUTES` / `_RESUME_TOKEN_THRESHOLD` / `_IDLE_THRESHOLD_MINUTES` / `_IDLE_TOKEN_THRESHOLD` | Resume / idle |

## Background agents / daemon (`CLAUDE_BG_*`)

| Variable | Purpose |
|----------|---------|
| `CLAUDE_BG_BACKEND` | Backend selector (`"daemon"`) |
| `CLAUDE_BG_ISOLATION` / `CLAUDE_BG_SOURCE` | Isolation mode / origin (presence ⇒ this is a bg child; scrubbed from grandchildren) |
| `CLAUDE_BG_CLAIM_AUTH` / `_PTY_AUTH` / `_RV_AUTH` / `_SOCKET_TOKENS_PATH` / `_AUTH_SNAPSHOT_PATH` | **Background-session auth tokens / snapshots (danger)** |
| `CLAUDE_BG_RENDEZVOUS_SOCK` | Rendezvous unix socket path |
| `CLAUDE_BG_SESSION_PERMISSION_RULES` | Per-session permission rules |
| `CLAUDE_BG_STARTUP_WEDGE_MS` | Startup delay |
| `CLAUDE_BG_TCC_DISCLAIMED` | macOS TCC prompt disclaimed |
| `CLAUDE_CODE_DAEMON_COLD_START` / `CLAUDE_AUTO_BACKGROUND_TASKS` / `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` / `_ENABLE_BACKGROUND_PLUGIN_REFRESH` | Daemon / bg-task toggles |
| `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` / `CLAUDE_SUBAGENT_BG_SHELL_MAX_MS` / `CLAUDE_CODE_WORKER_EPOCH` / `CLAUDE_CODE_SPAWN_TIMESTAMP_MS` / `CLAUDE_AGENTS_AUTO_RELAUNCHED_AT` | Timing |
| `CLAUDE_PTY_HEARTBEAT_MS` / `_PTY_ORPHAN_CHECK_MS` / `CLAUDE_PTY_HOST_EXEC` / `CLAUDE_JOB_DIR` / `CLAUDE_SERVE_DRAIN_TIMEOUT_MS` | PTY / serve plumbing |

## Bridge / remote / session ingress

| Variable | Purpose |
|----------|---------|
| `CLAUDE_BRIDGE_BASE_URL` / `_OAUTH_TOKEN` (danger) / `_SESSION_INGRESS_URL` / `_REATTACH_SESSION` / `_REATTACH_SEQ` / `_REATTACH_OUTBOUND_ONLY` / `_USE_CCR_V2` | Bridge transport |
| `CLAUDE_CODE_FORCE_BRIDGE` / `LOCAL_BRIDGE` | Force / local bridge |
| `SESSION_INGRESS_URL` / `CLAUDE_CODE_POST_FOR_SESSION_INGRESS_V2` | Session ingress |
| `CLAUDE_CODE_REMOTE` / `_REMOTE_SESSION_ID` / `_REMOTE_ENVIRONMENT_TYPE` / `_REMOTE_HERMETIC_MODE` / `_REMOTE_MEMORY_DIR` / `_REMOTE_RAW_EVENTS_FILE` / `_REMOTE_SEND_KEEPALIVES` / `_REMOTE_SETTINGS_PATH` / `_REMOTE_SETTINGS_POLL_MS` | Remote (cloud/mobile) session |
| `CLAUDE_REMOTE_CONTROL_SESSION_NAME_PREFIX` / `CLAUDE_CODE_MOCK_REMOTE_SETTINGS` (danger) | Remote control / testing |
| `CLAUDE_CODE_SSE_PORT` / `_SESSION_NAME` / `_SESSION_KIND` / `_SESSION_ID` / `CLAUDE_SESSION_ID` / `SPACE_CREATOR_USER_ID` | Session identity / transport |
| `VOICE_STREAM_BASE_URL` / `CLAUDE_CODE_VOICE_FORWARD_INTERIMS_TYPED` | Voice streaming |

## Loops / cron / workflows / teams

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_LOOP_PERSISTENT` / `_LOOP_KEEPALIVE` | Persistent loop mode |
| `CLAUDE_CODE_DISABLE_CRON` | Disable cron / scheduled (routines) agents |
| `CLAUDE_CODE_WORKFLOWS` / `_DISABLE_WORKFLOWS` | Workflows |
| `CLAUDE_CODE_ENABLE_TASKS` / `_TASK_LIST_ID` / `TASK_MAX_OUTPUT_LENGTH` | Tasks |
| `CLAUDE_CODE_PLAN_MODE_REQUIRED` / `_PLAN_MODE_INTERVIEW_PHASE` / `_PLAN_V2_AGENT_COUNT` / `_PLAN_V2_EXPLORE_AGENT_COUNT` | Plan mode / teammate counts |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` / `_TEAM_ONBOARDING` / `_TEAMMATE_COMMAND` / `CLAUDE_INTERNAL_ASSISTANT_TEAM_NAME` / `_COORDINATOR_MODE` | Agent teams / coordination |
| `CLAUDE_CODE_FORK_SUBAGENT` / `_INVESTIGATE_FIRST` | Subagent behavior |
| `ULTRAPLAN_PROMPT_FILE` / `CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE` (danger) | Ultraplan / ultrareview |

## Cowork

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_IS_COWORK` / `_USE_COWORK_PLUGINS` | Cowork mode / plugins |
| `CLAUDE_COWORK_MEMORY_PATH_OVERRIDE` / `_INDEX_CONTENT` / `_GUIDELINES` / `_EXTRA_GUIDELINES` | Cowork memory config |

## MCP

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_MCP_SERVER_NAME` / `_MCP_SERVER_URL` / `_MCP_ALLOWLIST_ENV` | MCP server identity / env allow-list |
| `MCP_TIMEOUT` / `MCP_CONNECT_TIMEOUT_MS` / `MCP_TOOL_TIMEOUT` / `MCP_CONNECTION_NONBLOCKING` | MCP timeouts |
| `MCP_SERVER_CONNECTION_BATCH_SIZE` / `MCP_REMOTE_SERVER_CONNECTION_BATCH_SIZE` | Connection batching |
| `MCP_OAUTH_CALLBACK_PORT` / `MCP_OAUTH_CLIENT_METADATA_URL` / `MCP_CLIENT_SECRET` (danger) / `MCP_XAA_IDP_CLIENT_SECRET` (danger) | MCP OAuth |
| `MCP_TRUNCATION_PROMPT_OVERRIDE` / `ENABLE_MCP_LARGE_OUTPUT_FILES` | MCP output handling |
| `ENABLE_CLAUDEAI_MCP_SERVERS` / `ALLOW_ANT_COMPUTER_USE_MCP` (danger) | Built-in MCP servers |
| `ENABLE_TOOL_SEARCH` / `EMBEDDED_SEARCH_TOOLS` | Deferred tool-search mechanism |

## Plugins / skills

| Variable | Purpose |
|----------|---------|
| `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` | Plugin path placeholders |
| `CLAUDE_CODE_PLUGIN_CACHE_DIR` / `_PLUGIN_SEED_DIR` / `_PLUGIN_GIT_TIMEOUT_MS` / `_PLUGIN_PREFER_HTTPS` / `_PLUGIN_USE_ZIP_CACHE` / `_PLUGIN_KEEP_MARKETPLACE_ON_FAILURE` | Plugin fetch/cache |
| `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` / `FORCE_AUTOUPDATE_PLUGINS` | Marketplace |
| `CLAUDE_CODE_SYNC_PLUGINS` (+ `_SYNC_PLUGIN_INSTALL`, `_SYNC_PLUGIN_INSTALL_TIMEOUT_MS`, `_SYNC_PLUGINS_INSTALL_TIMEOUT_MS`, `_SYNC_PLUGINS_MCP_TIMEOUT_MS`) | Plugin sync |
| `CLAUDE_CODE_SYNC_SKILLS` (+ `_SYNC_SKILLS_INSTALL_TIMEOUT_MS`, `_SYNC_SKILLS_WAIT_TIMEOUT_MS`) | Skill sync |
| `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` / `_DISABLE_POLICY_SKILLS` / `_DISABLE_CLAUDE_API_SKILL` / `_DISABLE_CLAUDE_CODE_SKILL` / `CLAUDE_API_SKILL_DESCRIPTION` | Built-in skills |
| `CLAUDE_CODE_SKILL_NAME` / `_SKILL_DESCRIPTION` / `_INVOKED_SKILLS` / `CLAUDE_SKILL_DIR` | Running as a skill |
| `SLASH_COMMAND_TOOL_CHAR_BUDGET` | Slash-command description budget |

## Permissions / sandbox / security

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_BUBBLEWRAP` | Use bubblewrap (`bwrap`) for the Linux sandbox |
| `CLAUDE_CODE_SANDBOXED` / `_FORCE_SANDBOX` / `_BASH_SANDBOX_SHOW_INDICATOR` / `IS_SANDBOX` | Sandbox markers / force |
| `CLAUDE_CODE_SAFE_MODE` / `_ADDITIONAL_PROTECTION` / `_SUPERVISED` | Restricted / supervised modes |
| `CLAUDE_CODE_ENABLE_AUTO_MODE` / `_AUTO_MODE_EXTERNAL_PERMISSIONS` / `_TWO_STAGE_CLASSIFIER` | Auto-mode + two-stage safety classifier |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | Scrub subprocess env; **forces permission mode to default** (hardening) |
| `CLAUDE_CODE_DONT_INHERIT_ENV` | Don't inherit parent env into subprocesses |
| `CLAUDE_CODE_TEST_FORCE_DENY` | **Force-deny all permission checks (danger/testing)** |
| `CLAUDE_CHROME_PERMISSION_MODE` | Chrome/computer-use permission mode |
| `CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK` | **Legacy** — old regex pipeline removed in 2.1.169 (now LLM prefix-classifier) |
| `CLAUDE_CODE_SCRIPT_CAPS` / `_STOP_HOOK_BLOCK_CAP` / `_SESSIONEND_HOOKS_TIMEOUT_MS` | Caps / hook timeouts |
| `CLAUDE_CODE_CERT_STORE` / `_CLIENT_CERT` / `_CLIENT_KEY` (danger) / `_CLIENT_KEY_PASSPHRASE` (danger) / `NODE_EXTRA_CA_CERTS` / `SSL_CERT_FILE` | TLS / mTLS |
| `CLAUDE_CODE_MANAGED_SETTINGS_PATH` / `_AGENT_RULE_DISABLED` | Managed (enterprise) settings / rules |
| `CLAUDE_CODE_GLOB_HIDDEN` / `_GLOB_NO_IGNORE` / `_GLOB_TIMEOUT_SECONDS` | Glob scope/timeout |

## IDE / terminal / UI

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_AUTO_CONNECT_IDE` / `_IDE_HOST_OVERRIDE` / `_IDE_SKIP_AUTO_INSTALL` / `_IDE_SKIP_VALID_CHECK` | IDE integration |
| `CLAUDE_CODE_ACCESSIBILITY` / `_DISABLE_ALTERNATE_SCREEN` / `_ALT_SCREEN_FULL_REPAINT` / `_DISABLE_VIRTUAL_SCROLL` / `_DISABLE_MOUSE` / `_NATIVE_CURSOR` / `_NO_FLICKER` / `_SYNTAX_HIGHLIGHT` / `_SCROLL_SPEED` / `_DECSTBM` | TUI rendering |
| `CLAUDE_CODE_DISABLE_AGENT_VIEW` / `_AGENT_VIEW_RELAUNCH` / `_FRAME` / `_FRAME_AUTO_OPEN` / `_FRAME_MCP` | Agent-view / frame UI |
| `CLAUDE_CODE_FORCE_FULL_LOGO` / `_FORCE_FULLSCREEN_UPSELL` / `_FORCE_TIP_ID` / `_HIDE_CWD` / `_ENABLE_MENU_KIND_LANES` / `_ENABLE_PROMPT_SUGGESTION` / `_QUESTION_PREVIEW_FORMAT` / `_ENABLE_AWAY_SUMMARY` / `_ENABLE_DESIGN_SYNC` | UI features |
| `CLAUDE_CODE_TMUX_PREFIX` / `_TMUX_PREFIX_CONFLICTS` / `_TMUX_SESSION` / `_TMUX_TRUECOLOR` / `_BS_AS_CTRL_BACKSPACE` / `_TUI_JUST_SWITCHED` | tmux / input |
| `CLAUDE_CODE_NEW_INIT` / `_EXIT_AFTER_FIRST_RENDER` (danger) / `_EXIT_AFTER_STOP_DELAY` | Init / exit |

Plus the large `T66` set of **read-only terminal/CI/host-detection** vars (not Claude-owned): `TERM`, `TERM_PROGRAM`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`, `WT_SESSION`, `KITTY_WINDOW_ID`, `TMUX`, `SSH_*`, `CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `CIRCLECI`, `BUILDKITE`, `CODESPACES`, `GITPOD_WORKSPACE_ID`, `KUBERNETES_SERVICE_HOST`, `WSL_DISTRO_NAME`, `VERCEL`, `NETLIFY`, `RENDER`, `FLY_*`, `RAILWAY_*`, `AWS_LAMBDA_*`, `GOOGLE_CLOUD_*`, `AZURE_*`, etc. — used for environment fingerprinting / color support (see `device-fingerprinting.md`).

## Proxy / network (`N66` + globals)

| Variable | Purpose |
|----------|---------|
| `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` | Standard proxy env |
| `CLAUDE_CODE_HTTP_PROXY` / `_HTTPS_PROXY` / `_PROXY_URL` / `_PROXY_HOST` / `_PROXY_AUTHENTICATE` / `_PROXY_RESOLVES_HOSTS` / `_HOST_HTTP_PROXY_PORT` / `_HOST_SOCKS_PROXY_PORT` | Claude proxy config |
| `CLAUDE_CODE_SIMULATE_PROXY_USAGE` (danger) / `_WEBFETCH_USE_CCR_PROXY` | Proxy testing / WebFetch routing |
| `CLAUDE_CODE_GB_BASE_URL` / `_GB_REFRESH_INTERVAL_MS` | GrowthBook endpoint |
| `CLAUDE_STREAM_IDLE_TIMEOUT_MS` / `CLAUDE_BYTE_STREAM_IDLE_TIMEOUT_MS` / `CLAUDE_SLOW_FIRST_BYTE_MS` / `CLAUDE_ENABLE_STREAM_WATCHDOG` / `CLAUDE_ENABLE_BYTE_WATCHDOG` / `_BEDROCK` / `CLAUDE_CODE_RETRY_WATCHDOG` / `_SLOW_OPERATION_THRESHOLD_MS` | Stream/byte watchdogs & timeouts |
| `CLAUDE_MOCK_HEADERLESS_429` (danger) / `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` | Rate-limit testing / override |
| `CLAUDE_CODE_HOST_PLATFORM` | Host platform id |

## SDK / entrypoint / environment

| Variable | Purpose |
|----------|---------|
| `CLAUDE_AGENT_SDK` / `_VERSION` / `_CLIENT_APP` / `_DISABLE_BUILTIN_AGENTS` / `_MCP_NO_PREFIX` | Agent SDK markers |
| `CLAUDE_AGENT` / `CLAUDE_AGENTS_SELECT` / `CLAUDE_CODE_AGENT` / `_AGENT_NAME` / `_AGENT_LIST_IN_MESSAGES` / `_ENABLE_APPEND_SUBAGENT_PROMPT` / `_TEAM_NAME` | Agent identity |
| `CLAUDE_CODE_ENTRYPOINT` | Entrypoint (`cli`/`mcp`/`sdk-cli`/`sdk-ts`/`sdk-py`/`remote*`/`claude-desktop`/`action`/…) |
| `CLAUDE_CODE_ACTION` / `_ARTIFACT` / `_REPL` / `CLAUDE_REPL_VARIANT` / `_CONTAINER_ID` / `_ENVIRONMENT_KIND` / `_ENVIRONMENT_RUNNER_VERSION` / `_EXECPATH` / `_VERSION` | Runtime context |
| `CLAUDE_CODE_EMIT_SESSION_STATE_EVENTS` / `_EMIT_TOOL_USE_SUMMARIES` | SDK event emission |
| `SDK_NATIVE_BIN` / `COMPUTER_USE_SWIFT_NODE_PATH` | Native helpers |
| `AI_AGENT` / `CLAUDECODE` / `CLAUBBIT` (danger) | Environment markers (set for subprocesses) |

## Runtime / paths / shell / files

| Variable | Purpose |
|----------|---------|
| `CLAUDE_TMPDIR` / `CLAUDE_CODE_TMPDIR` / `CLAUDE_PROJECT_DIR` / `CLAUDE_CODE_REPO_CHECKOUTS` / `_WORKSPACE_HOST_PATHS` / `CLAUDE_BASE` / `CLAUDE_ENV_FILE` | Paths |
| `CLAUDE_CODE_SHELL` / `_SHELL_PREFIX` / `_GIT_BASH_PATH` / `CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR` / `BASH_MAX_OUTPUT_LENGTH` | Shell / Bash tool |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` / `_POWERSHELL_RESPECT_EXECUTION_POLICY` / `_PWSH_PARSE_TIMEOUT_MS` | PowerShell tool |
| `CLAUDE_CODE_USE_NATIVE_FILE_SEARCH` / `USE_BUILTIN_RIPGREP` | File search / bundled ripgrep |
| `CLAUDE_CODE_PERFORCE_MODE` / `_BASE_REF` / `_BASE_REFS` / `_DISABLE_GIT_INSTRUCTIONS` | VCS |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` / `_ENABLE_SDK_FILE_CHECKPOINTING` | File checkpointing |
| `CLAUDE_CODE_OVERRIDE_DATE` (danger) / `CLAUDE_CODE_SPAWN_TIMESTAMP_MS` | Clock |
| `CLAUDE_CODE_SIMPLE` / `_SIMPLE_SYSTEM_PROMPT` / `_MID_CONVERSATION_SYSTEM` / `_FORCE_MID_CONVERSATION_SYSTEM` / `_SYSTEM_PROMPT_GB_FEATURE` / `_VERIFY_PROMPT` | System-prompt control |
| `CLAUDE_CODE_TAGS` / `_TAG_ISMETA_MESSAGES` / `_ENABLE_TOKEN_USAGE_ATTACHMENT` / `_ENABLE_CFC` / `_ENABLE_XAA` / `_KB_COHESION_FIXES` / `_ACT_DONT_REDERIVE` / `_OWNERSHIP_FRAME` / `_PACKAGE_MANAGER_AUTO_UPDATE` / `_DEV_RAW_CHANGELOG_URL` | Misc features |
| `CLAUDE_CODE_BRIEF` / `_BRIEF_UPLOAD` / `DISABLE_BRIEF_MODE_STOP_HOOK` / `CLAUDE_CODE_PROACTIVE` / `_USER_DIALOG_TIMEOUT_MS` | Brief / proactive |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` / `_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` / `_DISABLE_ADVISOR_TOOL` / `ENABLE_LSP_TOOL` / `ENABLE_EXPERIMENTAL_SHELL_BUILTINS` / `ENABLE_BTW` / `ENABLE_TENTATIVE_ERA` / `ENABLE_SUBAGENT_ZOOM` | Experimental |
| `ENABLE_SESSION_PERSISTENCE` / `TEST_ENABLE_SESSION_PERSISTENCE` (danger) / `ENABLE_SESSION_BACKGROUNDING` / `CLAUDE_CODE_FORCE_SESSION_PERSISTENCE` / `ENABLE_PID_BASED_VERSION_LOCKING` / `ENABLE_LOCKLESS_UPDATES` | Session / update mechanics |
| `CLAUDE_SNIP` / `CLAUDE_SSH_VERSION` / `CLAUDE_SSH_LOCAL_BINARY` / `SCREENSHOT_DIR` | Misc |

## Dangerous / internal / testing

These bypass safety, mock state, or are undocumented internal toggles. **Do not set in production.**

| Variable | Why |
|----------|-----|
| `CLAUDE_CODE_TEST_FORCE_DENY` | Force-deny every permission check |
| `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB` | (hardening, but forces default permission mode — affects allowedTools) |
| `CLAUDE_CODE_SKIP_{BEDROCK,VERTEX,FOUNDRY,MANTLE,ANTHROPIC_AWS}_AUTH`, `_SKIP_HFI_VERSION_CHECK`, `_SKIP_FAST_MODE_ORG_CHECK` | Skip auth / eligibility checks |
| `CLAUDE_CODE_PEWTER_OWL`, `_PEWTER_OWL_TOOL`, `CLAUDE_CODE_VELVET_FALCON` | Undocumented codenamed model/feature gates |
| `CLAUDE_INTERNAL_FC_OVERRIDES`, `CLAUDE_INTERNAL_WARM_RESUME_QA`, `MORERIGHT_TEST`, `CLAUBBIT` | Internal overrides / QA toggles |
| `FORCE_VCR`, `VCR_RECORD`, `CLAUDE_MOCK_HEADERLESS_429`, `CLAUDE_CODE_MOCK_TRIAL`, `CLAUDE_CODE_MOCK_REMOTE_SETTINGS`, `CLAUDE_CODE_OVERRIDE_DATE`, `CLAUDE_CODE_STALL_TIMEOUT_MS_FOR_TESTING`, `CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER`, `TEST_ENABLE_SESSION_PERSISTENCE`, `CLAUDE_CODE_TEST_{FIXTURES_ROOT,NO_GIT_BASH,NO_PWSH}`, `CLAUDE_CODE_SIMULATE_PROXY_USAGE`, `CLAUDE_CODE_ULTRAREVIEW_PREFLIGHT_FIXTURE` | Test / mock harness |
| `USE_LOCAL_OAUTH`, `USE_STAGING_OAUTH` | Point auth at dev endpoints |
| `BUGHUNTER_DEV_BUNDLE_B64` | Injects a base64 dev bundle |
| `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_TOOL_CONTENT`, `OTEL_LOG_RAW_API_BODIES` | Log sensitive content/bodies |
| `CLAUDE_BG_{CLAIM,PTY,RV}_AUTH`, `_SOCKET_TOKENS_PATH`, `_AUTH_SNAPSHOT_PATH`, `CLAUDE_BRIDGE_OAUTH_TOKEN`, `MCP_CLIENT_SECRET`, `MCP_XAA_IDP_CLIENT_SECRET`, `CLAUDE_CODE_CLIENT_KEY`, `_CLIENT_KEY_PASSPHRASE` | Carry secrets in env |
| `ALLOW_ANT_COMPUTER_USE_MCP` | Enables the computer-use MCP server |

## Uncertainties

- `CLAUBBIT`, `MORERIGHT_TEST`, `ENABLE_TENTATIVE_ERA`, `CLAUDE_CODE_ENABLE_CFC`, `_ENABLE_XAA`, `CLAUDE_CODE_OWNERSHIP_FRAME` — present and typed, but their feature meaning is not legible from call sites; inferred-only.
- `CLAUDE_3_5_HAIKU` … `CLAUDE_4_8_OPUS` / `CLAUDE_OPUS_4_6` / `CLAUDE_HAIKU_4_5` / `CLAUDE_SONNET_4_6` in the raw extract are **model-id key constants** that map to `VERTEX_REGION_CLAUDE_*` env vars, not standalone env vars themselves — documented here under the `VERTEX_REGION_CLAUDE_*` family.
- A handful of raw-list names with `_alias` suffixes in the YAML are de-duplication placeholders where the same logical var appears in two maps; treat the canonical (non-alias) entry as authoritative.
- The exact runtime default for each `triBool` (e.g. `CLAUDE_CODE_NO_FLICKER`, `CLAUDE_ENABLE_STREAM_WATCHDOG`) depends on downstream code that treats `undefined` specially; documented as tri-state.
