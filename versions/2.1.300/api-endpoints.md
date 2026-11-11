# Internal API Endpoints

> [Back to version index](../README.md)
>
> **Version**: 2.1.300 | **Build**: `2026-10-14T12:54:55Z` | **GIT_SHA**: `c6733ae1276880507ca0c5b053ae18fb0df090d6` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.4.3
>
> See [data/api-endpoints.yaml](data/api-endpoints.yaml) for the structured dataset.
> Line numbers are `cli.beauty.js:LINE` in the 2.1.300 beautified source unless marked `197:LINE`
> (the 2.1.197 beautified source). Code is code-split ESM now; module ids/names are given where they
> disambiguate a chunk-local symbol.

**Headline count (from `bundle/_facts.md` §1.5):** distinct `/v1/*` + `/api/*` path templates went
**177 → 347** (`/v1/*` 111 → 221, `/api/*` 66 → 126); **180 NEW / 10 REMOVED** against the 2.1.197
recount (the published 2.1.197 figure was 164; its script is not in the repo). JS-only: 338. A separate
scan of `cli.beauty.js` only, run for this doc, gives 175 → 336 with 172 new keys; its "removed" list is
re-classified in §13, because most entries on it are refactors and not real removals.

Deltas vs 2.1.197, ranked by what matters:

1. **New provider plane `anthropicGoogleCloud` ("Claude Platform on Google Cloud").** It uses a new
   SDK client class `AnthropicGoogleCloud` (module 979 `chunk-t9fmvy6h.js`). The default host is
   **`https://claude.googleapis.com`**, with path base
   `/v1alpha/projects/{project}/locations/{location}/workspaces/{workspace}/invoke`
   (`:920806`). Auth is a Google bearer token (ADC, scope `cloud-platform`), never an API key (§9).
2. **The bundled `@anthropic-ai/sdk` went 0.94.0 → 0.128.0** (`bA="0.128.0"` `:163860`;
   `197:4673` `uY="0.94.0"`). The SDK now ships request builders for surfaces that were
   **documentation-only in 2.1.197**: Deployments, Deployment Runs and Session Threads. It also adds
   resource families that are new in this build: **Dreams**, **Tunnels** (MCP tunnels + certificates) and
   **Organizations** (an Admin API with 58 builders, `:173713-174319`). It also gains GA (non-`?beta=true`) copies of
   Files and Skills (§2).
3. **Beta-header churn.** Memory Stores move off `managed-agents-2026-04-01` onto
   **`agent-memory-2026-07-22`**, and User Profiles go `user-profiles-2026-03-24` → **`-2026-08-18`**.
   New per-resource betas: `dreaming-2026-04-21` and `mcp-tunnels-2026-06-22`. Files/Skills no longer
   inject a default beta. The Messages beta registry (`TR`, `:92322`) adds **14 dated betas** and drops
   `summarize-connector-text-2026-03-13` (§1.2).
4. **Self-hosted runners (NEW).** A whole `/v1/code/runners/self-hosted/*` control plane: register,
   poll, spawn-hints, session tokens, release, report-failure, deregister, pools, secrets and requeue.
   Calls carry the header `x-self-hosted-runner-version` (§4).
5. **CCR worker API moved to absolute v2 paths.** The new paths are
   `/v1/code/sessions/{id}/worker/{register,events,heartbeat,diagnostics,otlp/*,channels/*/files:write}`
   plus `PUT …/worker`. The 2.1.197 hard-coded `…/worker/web-fetch` and `…/worker/web-search` URLs became
   one generic proxy, `${sessionUrl}/worker/${route}` (§3).
6. **Artifact "frame" platform grew from 5 to ~40 endpoints.** It covers comments, blobs, contracts,
   types, versions, subscribe, watch-token, favorites and permissions, plus a new prepare/upload/direct
   deploy flow. `deploy/init` and `deploy/complete` are **REMOVED** (§6).
7. **New first-party MCP endpoints.** `/v1/pages/mcp` (Claude_Pages), `/v1/code/mcp/ccr-artifacts`,
   `/api/artifacts/mcp`, `/v1/code/mcp/hearthbot`, `/v2/ccr-sessions/{id}/hearthbot/mcp`,
   `/v2/ccr-sessions/-/meta/mcp` and `/v1/claudeai-agents/mcp` (§8).
8. **Identity / attestation (NEW).** `api.anthropic.com/api/oauth/cri` (a `cri+jwt` issuer + JWKS),
   `/api/oauth/local_pairing` (issuer + `/attest` + `/jwks.json`), `/v1/code/sessions/{id}/device`
   (bind attestation), and `/v1/code/sessions/{id}/sign-commit` (§5).
9. **New `user:plugins` OAuth scope.** It is appended to the default scope set when
   `PLUGINS_SCOPE_REGISTERED` (`:9489-9493`).

Plane gates (`:21766-21781`):
- **`au()`** = firstParty | anthropicAws | **anthropicGoogleCloud** | gateway. It was `ud()` =
  firstParty | anthropicAws | gateway in 2.1.197.
- **`wD()`** = anthropicAws | anthropicGoogleCloud (NEW helper: "Anthropic-operated cloud planes").
- **`VG()`** = firstParty | wD | foundry | mantle (was `S1()`).
- The beta-eligibility gate **`hq()`** = firstParty | wD | foundry (`:92353`).
- The first-party request helper `Sr()` (module 152) refuses with `"data-residency"` whenever
  `Ie() !== "firstParty"`, and with `"essential-traffic-only"` under the essential-traffic switch
  (`YA` `:138688-138692`; `VA` `:138596`).

---

## 1. Inference (Messages API)

| Endpoint | Method | Purpose / evidence |
|----------|--------|--------------------|
| `/v1/messages` (`?beta=true`) | POST | Primary inference. Beta builder `:173636`; GA builder `:175917` |
| `/v1/messages/count_tokens` | POST | Beta `token-counting-2024-11-01` (`:173679`); GA builder `:175948` |
| `/v1/messages/batches[/{id}[/cancel]]` | POST/GET/DELETE | Beta `message-batches-2024-09-24` (`:172369-172455`); GA `:175810-175868` |
| `/v1/messages/cache_touch` | POST | **NEW.** Cache keep-alive ping, body `{request_id}`, betas `oauth-2025-04-20,cache-keepalive-2026-09-03` (`A$([fEe,bI])`, `:394659-394667`); armed when the response header `anthropic-cache-keepalive: active` is seen (`:394191`, `:394360`) |
| `/v1/complete` | POST | Legacy completions (`:175264`) |
| `/v1/models`, `/v1/models/{id}` | GET | Beta `:170620/:170638`; GA `:175972/:175990`; gateway model list `…/v1/models?limit=1000` (`:122702`) |
| `/v1/me` | GET | **NEW.** Identity probe with `anthropic-beta: oauth-2025-04-20` (`:764358`) |

Auth: `x-api-key` **or** `Authorization: Bearer` (OAuth). Header `anthropic-version: 2023-06-01`
(`:76672`, `:137777`). `structured-outputs-2025-12-15` is auto-appended by the SDK `parse()` helper
(`:173658`).

### 1.2 Messages beta registry (`TR`, `:92276-92323`)

Each entry is a frozen `{name, header}` built by the chunk-local `k(name, header)` (not the flag reader). Entries made
with `ER(name)` have `header:null`; they stay in `TR` but are filtered out of the header map `Wa` (`:92323`). In 2.1.197 the same registry was `zhd` (`197:100577`).

| Status | name → header |
|--------|---------------|
| unchanged | `claude_code`→`claude-code-20250219`, `oauth_auth`→`oauth-2025-04-20`, `interleaved_thinking`→`interleaved-thinking-2025-05-14`, `long_context`→`context-1m-2025-08-07`, `context_management`→`context-management-2025-06-27`, `structured_outputs`→`structured-outputs-2025-12-15`, `web_search`→`web-search-2025-03-05`, `tool_search`→`advanced-tool-use-2025-11-20` / `tool-search-tool-2025-10-19`, `effort`→`effort-2025-11-24`, `task_budgets`→`task-budgets-2026-03-13`, `prompt_caching_scope`→`prompt-caching-scope-2026-01-05`, `extended_cache_ttl`→`extended-cache-ttl-2025-04-11`, `speed`→`fast-mode-2026-02-01`, `redact_thinking`→`redact-thinking-2026-02-12`, `thinking_token_count`→`thinking-token-count-2026-05-13`, `afk_mode`→`afk-mode-2026-01-31`, `advisor_tool`→`advisor-tool-2026-03-01`, `cache_diagnosis`→`cache-diagnosis-2026-04-07`, `context_hint`→`context-hint-2026-04-09`, `mcp_servers`→`mcp-servers-2025-12-04`, `files_api`→`files-api-2025-04-14`, `environments`→`environments-2025-11-01`, `ccr_byoc`→`ccr-byoc-2025-07-29`, `server_side_fallback`→`server-side-fallback-2026-06-01`, `fallback_credit`→`fallback-credit-2026-06-01` |
| **NEW** | `prompt_caching_evict`→`prompt-caching-evict-2026-05-12`, `cache_keepalive`→`cache-keepalive-2026-09-03`, `thinking_resumption`→`thinking-resumption-2026-07-17`, `per_message_effort`→`per-turn-control-2026-07-01`, `per_turn_timing`→`timing-2026-09-09`, `mid_conv_tool_change`→`mid-conversation-tool-changes-2026-07-01`, `inline_tools`→`inline-tools-2026-09-15`, `server_side_fallback_category`→`server-side-fallback-2026-07-01`, `auto_mode_classifier`→`auto-mode-classifier-2026-07-16`, `dangerous_tool_use`→`dangerous-tool-use-2026-09-03`, `thinking_display_updates`→`thinking-display-updates-2026-08-18`, `thinking_binding_controls`→`thinking-binding-controls-2026-08-01`, `message_threads`→`message-threads-2026-08-12`, `mid_conversation_system_clear_at`→`mid-conversation-system-clear-at-2026-08-21` (14 in `TR`) |
| **NEW, not in `TR`** | internal latches `mid_conv_cache_promotion_latch`→`x-cc-internal-mid-conv-cache-promotion` (`hqn`) and `…_ok_latch`→`x-cc-internal-mid-conv-cache-promotion-ok` (`SPo`) are built with `k()` in the same block (`:92312-92313`) but are **not** listed in the `TR` array (`:92322`); they are used as per-conversation latches (`:528240-528832`) |
| **CHANGED** | `mid_conversation_system` is now `ER(...)` (header `null`, so filtered from the map); the date string `mid-conversation-system-2026-04-07` is kept as a separate constant `eje` (`:92303-92304`) |
| **REMOVED** | `narration_summaries`→`summarize-connector-text-2026-03-13` (0 occurrences in 2.1.300) |

Not exhaustively decoded: the per-request conditions that turn each NEW beta on.

---

## 2. Cloud backend: Managed Agents SDK (`client.beta.*`)

All builders are in module 187 `chunk-v7aj317d.js` (324,965 bytes, starting at `:168049`). Paths carry
`?beta=true`. NEW in this SDK: an optional **`anthropic-workspace-id`** header per call
(`workspace_id` param). It occurs 151 times in 2.1.300 and 2 times in 2.1.197.

### 2.1 Agents (`:170755-170846`), beta `managed-agents-2026-04-01`
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/agents` | POST / GET | Create / list |
| `/v1/agents/{id}` | GET / POST | Retrieve / update |
| `/v1/agents/{id}/archive` | POST | Archive |
| `/v1/agents/{id}/versions` | GET | List versions |

### 2.2 Sessions (`:174332-174662`), beta `managed-agents-2026-04-01`
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/sessions` | POST / GET | Create / list (`:174582`, `:174631`) |
| `/v1/sessions/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/sessions/{id}/archive` | POST | Archive (`:174662`) |
| `/v1/sessions/{id}/events` | GET / POST | List / send (`:174332`, `:174349`) |
| `/v1/sessions/{id}/events/stream` | GET (SSE) | Stream (`:174366`) |
| `/v1/sessions/{id}/resources[/{rid}]` | GET/POST/DELETE | Resources (`:174394-174461`) |
| `/v1/sessions/{id}/threads` | GET | **CHANGED: doc-only in 2.1.197 → implemented.** List threads (`:174540`) |
| `/v1/sessions/{id}/threads/{tid}` | GET | Retrieve thread (`:174524`) |
| `/v1/sessions/{id}/threads/{tid}/archive` | POST | Archive (`:174557`) |
| `/v1/sessions/{id}/threads/{tid}/events` | GET | List thread events (`:174481`) |
| `/v1/sessions/{id}/threads/{tid}/stream` | GET (SSE) | Stream thread (`:174499`) |

### 2.3 Environments (`:171840-172068`), beta `managed-agents-2026-04-01`
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/environments` | POST / GET | Create / list |
| `/v1/environments/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/environments/{id}/archive` | POST | Archive |
| `/v1/environments/{id}/work` | GET | **NEW builder.** List work items (`:171873`) |
| `/v1/environments/{id}/work/poll` | GET | **NEW builder.** Poll (`:171917`) |
| `/v1/environments/{id}/work/stats` | GET | Queue stats (`:171933`). A doc string only in 2.1.197 (`197:671030`); now a real builder |
| `/v1/environments/{id}/work/{wid}` | GET / POST | **NEW builder.** Retrieve / update (`:171840`, `:171857`) |
| `/v1/environments/{id}/work/{wid}/ack` | POST | **NEW builder** (`:171886`) |
| `/v1/environments/{id}/work/{wid}/heartbeat` | POST | **NEW builder** (`:171900`) |
| `/v1/environments/{id}/work/{wid}/stop` | POST | Stop (`:171950`) |

The SDK also embeds an `EnvironmentWorker` helper that drives `work.poll/ack/stop/heartbeat`
(`:170946-171782`).

### 2.4 Files: beta (`:170528-170600`) + GA (`:175286-175342`, NEW)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/files` (`?beta=true` or GA) | POST / GET | Upload / list |
| `/v1/files/{id}` | GET / DELETE | Metadata / delete |
| `/v1/files/{id}/content` | GET | Download. The CLI also builds `${base}/v1/files/{id}/content` directly (`:334437`) |

**CHANGED:** the beta builders no longer inject `files-api-2025-04-14`. The header is sent only when the
caller passes `betas` (`:170533`; compare `197:6324`, which hard-coded it). The constant survives in
the registry as `_Po` (`:92300`).

### 2.5 Skills: beta (`:174682-174837`) + GA (`:176010-176117`, NEW)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/skills` | POST / GET | Create / list |
| `/v1/skills/{id}` | GET / DELETE | Retrieve / delete |
| `/v1/skills/{id}/versions` | POST / GET | Create / list versions |
| `/v1/skills/{id}/versions/{v}` | GET / DELETE | Retrieve / delete version |
| `/v1/skills/{id}/versions/{v}/content` | GET | **NEW.** Download version content (`:174756`) |

**CHANGED:** `skills-2025-10-02` is no longer injected; that string now has **0** occurrences in
2.1.300 JS (`197:8163` hard-coded it). It survives only in bundled `.md` assets.

### 2.6 User Profiles (`:170659-170724`): beta date bumped
`/v1/user_profiles[/{id}[/enrollment_url]]`, POST/GET/POST(update). Beta
**`user-profiles-2026-08-18`** (was `user-profiles-2026-03-24`, `197:6429`).

### 2.7 Vaults & Credentials (`:175032-175235`), beta `managed-agents-2026-04-01`
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/vaults[/{id}[/archive]]` | POST/GET/POST/DELETE | Vault CRUD (`:175155-175235`) |
| `/v1/vaults/{vid}/credentials[/{cid}[/archive]]` | POST/GET/POST/DELETE | Credential CRUD (`:175032-175116`) |
| `/v1/vaults/{vid}/credentials/{cid}/mcp_oauth_validate` | POST | Validate MCP OAuth credential (`:175132`). **Correction:** in 2.1.197 this path existed only in the embedded endpoint reference (`197:669975`), not as a builder |

### 2.8 Memory Stores (`:172089-172326`): **beta CHANGED → `agent-memory-2026-07-22`**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/memory_stores[/{id}[/archive]]` | POST/GET/POST/DELETE | Store CRUD (`:172246-172326`) |
| `/v1/memory_stores/{id}/memories[/{mid}]` | GET/POST/POST(update)/DELETE | Memories (`:172089-172167`) |
| `/v1/memory_stores/{id}/memory_versions[/{vid}[/redact]]` | GET/POST | Versions + redact (`:172189-172223`) |

2.1.197 sent `managed-agents-2026-04-01` on these (`197:6600-6606`). A memory-store sync helper in
module 983 `chunk-5ctsbshj.js` calls `beta.memoryStores.memories.{retrieve,list,update,create,delete}`
(`:923137-923246`).

### 2.9 Deployments & Deployment Runs (`:170236-170381`): **CHANGED: doc-only → implemented**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/deployments` | POST / GET | Create / list (`:170271`, `:170320`) |
| `/v1/deployments/{id}` | GET / POST | Retrieve / update (`:170287`, `:170303`) |
| `/v1/deployments/{id}/{archive,pause,unpause,run}` | POST | Lifecycle (`:170336-170381`) |
| `/v1/deployment_runs[/{id}]` | GET | Run records (`:170236`, `:170252`) |

Beta `managed-agents-2026-04-01` (`:170239`).

### 2.10 Dreams (NEW, `:170399-170462`), beta **`dreaming-2026-04-21`**
`POST/GET /v1/dreams`, `GET /v1/dreams/{id}`, `POST /v1/dreams/{id}/archive`,
`POST /v1/dreams/{id}/cancel`. The string `dreaming-2026-04-21` and the `/v1/dreams` path are absent
from 2.1.197. What a "dream" does server-side is **not determined** from this code.

### 2.11 Tunnels (NEW, `:174859-175011`), beta **`mcp-tunnels-2026-06-22`**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/tunnels[/{id}]` | POST / GET | Create / list / retrieve |
| `/v1/tunnels/{id}/archive` | POST | Archive |
| `/v1/tunnels/{id}/reveal_token`, `/rotate_token` | POST | Tunnel token reveal / rotate |
| `/v1/tunnels/{id}/certificates[/{cid}[/archive]]` | POST/GET | Tunnel certificates |

Related CLI surface: `/v1/code/scm-connectors/{provider}/{id}/tunnel` (`:617985`, module 462
`chunk-2thr65tw.js`).

### 2.12 Organizations / Admin API (NEW, `:173713-174319`)
These builders take only caller-supplied betas (`"anthropic-beta": n?.toString()`):
- `/v1/organizations/{api_keys, compliance_settings, external_keys[/{id}[/validate]], invites, rate_limits, users, me}`
- `/v1/organizations/federation_issuers[/{id}[/archive]]`
- `/v1/organizations/federation_rules[/{id}[/archive|/workspaces[/{ws}]]]`
- `/v1/organizations/service_accounts[/{id}[/archive|/workspaces[/{ws}]]]`
- `/v1/organizations/workspaces[/{id}[/archive|/members[/{uid}]|/rate_limits|/service_accounts[/{sa}]]]`

**No CLI call site was found** (`.organizations.` = 0 hits). The CLI's own `/v1/organizations/spend_limits` (`:1183101`) is separate and pre-existing (`197:724550`). Treat them as bundled-SDK
capability, not traffic the CLI generates.

### 2.13 Webhooks
`ANTHROPIC_WEBHOOK_SIGNING_KEY` is still read by the SDK client constructor (`:176140`). The
2.1.197 doc's `webhooks.unwrap` string is **not present** in 2.1.300 JS (0 hits), so the verify path
was not re-confirmed.

---

## 3. Claude Code on the web / Remote Control (CCR)

The CLI drives these itself. The CRUD client is module 922 `chunk-mqrcpqbs.js`, re-exported with
readable names in module 923 (`:881567`): `createCodeSession` (`v0t`), `getCodeSession` (`aQs`),
`updateCodeSession` (`lQs`), `archiveCodeSession` (`Frn`), `unarchiveCodeSession` (`hRr`) and
`attachBridgeWorker` (`gRr`).

**Two shapes** (`k()` `:881362-881389`):
- **v2:** `${base}/v1/code/sessions/{cse_id}{suffix}` with OAuth headers. Update uses **PUT**.
- **v1 compat:** `${base}/v1/sessions/{id}{suffix}` with `anthropic-beta: ccr-byoc-2025-07-29` and
  `x-organization-uuid`. Update uses **PATCH**.

Both add `X-Trusted-Device-Token` when one is present. Session ids must start with `cse_`
(`:881171`).

| Endpoint | Method | Purpose / evidence |
|----------|--------|--------------------|
| `/v1/code/sessions` | GET / POST | List / create (`v0t` `:881101`; body `{title, bridge:{}, tags?, session_grouping_id?, config:{cwd, model?, sources?, outcomes?}}`). Also `?trigger_id=` for routine runs (`:1441539`) |
| `/v1/code/sessions/{id}` | GET / PUT | Retrieve / update (v2) |
| `/v1/code/sessions/{id}/archive` | POST | Archive. A 403 `untrusted_device` → enrol (`:881452`) |
| `/v1/code/sessions/{id}/unarchive` | POST | Unarchive with `elevated_auth` semantics (`:881455`). Built by suffix concat, so a naive path grep misses it. It is **not** removed |
| `/v1/code/sessions/{id}/bridge` | POST | Worker attach → `{worker_jwt, expires_in, api_base_url, worker_epoch, mcp_config?}`. Optional body `{expected_epoch}`; a 409 carries `expected_epoch`/`actual_epoch` (`:881269-881351`). `mcp_config` is NEW |
| `/v1/code/sessions/{id}/events` | GET / POST | Events (`:137907`, `:138066`, `:138219`) |
| `/v1/code/sessions/{id}/events/stream` | GET (SSE) | Stream (`:1240736`) |
| `/v1/code/sessions/{id}/teleport-events` | POST | Terminal→web handoff (`:393808`) |
| `/v1/code/sessions/{id}/mark_read` | POST | (`:138174`) |
| `/v1/code/sessions/{id}/client/presence` | POST | (`:1252831`) |
| `/v1/code/sessions/watch?include_trigger_sessions=true&exclude_tags=-` | GET (SSE) | **NEW.** Session watch stream for bridge (`:1075952`, module 1379 `chunk-xtarwp8w.js`) |
| `/v1/code/sessions/{id}/tool_hosts/refuse` | POST | **NEW.** Bridge refuses a tool-host assignment (`:1075888`) |
| `/v1/code/sessions/{id}/inbox/{n}` | GET | **NEW.** Bridge inbox fetch (`:1036073`) |
| `/v1/code/sessions/{id}/device` | POST | **NEW.** Device bind: `{target_device_id, bind_attestation:{kid,signature}, bind_attestation_issued_at, …}` (`:1518262`) |
| `/v1/code/sessions/{id}/move-to-cloud` | POST | **NEW.** `{environment_id, outcome_branch?, …}` + `X-Trusted-Device-Token` (`:1840009`) |
| `/v1/code/sessions/{id}/sign-commit` | POST | **NEW.** Server-side git commit signing, `x-environment-runner-version: shr-…` (`:605102`) |
| `/v1/code/sessions/{id}/remote` | GET | **NEW.** Runner fetches session remote config (`:600609`) |
| `/v1/code/sessions/{id}/file?…`, `/synced_file` | GET / PUT | **NEW.** File sync to a session (`:1007338`, `:1007306`) |
| `/v1/code/sessions/{id}/agent-proxy`, `/v1/code/agent-proxy` | (proxy) | Agent proxy path (`WPr` `:120445`, `:120453`). `/v1/code/agent-proxy` is pre-existing (`197:617568`); the session-scoped form is **NEW** |
| `/v1/session_ingress/session/{id}` | — | Session ingress (`:393799`, pre-existing) |
| `/v1/session_ingress/session/{id}/git_proxy/{owner}/{repo}.git` | git | **NEW.** Anthropic git proxy, used with `--use-anthropic-git-proxy` (`:612986`) |
| `/v1/code/github/{subscribe,unsubscribe}-pull-request` | POST | **CHANGED.** Was `…/{subscribe,unsubscribe}-pr` (`197:297690` → `:368219`) |
| `/v1/code/github/post-review-comment` | POST | **NEW** (`rGo` `:460091`) |
| `/v1/code/github/import-token` | POST | Pre-existing (`:935205`) |
| `/v1/code/triggers[/{id}[/run]]`, `/v1/code/webhook-triggers` | GET/POST | Routines tool; beta `ccr-triggers-2026-01-30` (`:1440983`, ops at `:1441511-1441556`). `webhook-triggers` is **NEW** |
| `/v1/environment_providers`, `/v1/environment_providers/cloud/create` | GET / POST | Remote environments, first-party only (`:198707`, `:198766`) |
| `/v1/ultrareview/preflight` | GET | Unchanged (`:951710`) |
| `/v1/ultrareview/quota` | GET | **NEW.** `auth:"teleport-org"`, 3 s timeout, fixture override (`:785130`) |

### 3.1 CCR worker (session-scoped, absolute paths): **NEW shape**
The runner (module 432 `chunk-1hbnxc7y.js`) calls these against the worker `api_base_url` with
`Authorization: Bearer <session token>`, `anthropic-version: 2023-06-01`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/code/sessions/{id}/worker/register` | POST | `{session_id}` → `worker_epoch` (`:600644`) |
| `/v1/code/sessions/{id}/worker/events` | POST | `{worker_epoch, events:[{payload}]}` (`:600659`) |
| `/v1/code/sessions/{id}/worker` | PUT | Worker status / connection status (`:600674`) |
| `/v1/code/sessions/{id}/worker/heartbeat` | POST | Runner client sends `{worker_epoch}` only (`:600692`). The Remote Control transport sends a richer body: see [§3.1.1](#311-worker-heartbeat-two-senders-one-endpoint) |
| `/v1/code/sessions/{id}/worker/diagnostics` | POST | Diagnostic log lines (`:600705`) |
| `/v1/code/sessions/{id}/worker/otlp/{metrics,customer/metrics,customer/logs}` | POST | OTLP relay through CCR (`:194053`) |
| `/v1/code/sessions/{id}/worker/channels/{ch}/files:write` | POST | Project-files write (`:368330`) |
| `${sessionUrl}/worker/{route}` (route ∈ `web-fetch`, `web-search`) | POST | **CHANGED:** generic proxy `voo()` (`:488975`, `:489094`, `:739354`); base is `ccrSessionUrl()` or `${ANTHROPIC_BASE_URL}/v1/code/sessions/{id}` (`:488991-488993`) |

Relative worker paths are used by the `CCRClient` transport (module 1319 `chunk-tvq5gpwg.js`), which the
Remote Control bridge (module 1320 `chunk-ce99px70.js`) configures: `/worker/register` (`:1044396`),
`/worker/events`, `/worker/events/delivery`, `/worker/heartbeat` and `/worker/internal-events`
(`:1045259-1045262`). New relative paths: `/worker/skill-manifest` (`:285603`),
`/worker/record-created-pr` (`:368274`) and `/worker/synced_file` (`:1002140`).

#### 3.1.1 Worker heartbeat: two senders, one endpoint

`POST /v1/code/sessions/{id}/worker/heartbeat` has two senders in 2.1.300 with different bodies.

| Sender | Body | Evidence |
|---|---|---|
| Runner client (`[runner:api]`, module 432) | `{worker_epoch}` | `:600692` |
| `CCRClient.sendHeartbeat()` (module 1319), used by Remote Control | `{session_id, worker_epoch}` plus, when probe support is on, `supports_heartbeat_probe: true`, `current_interval_seconds`, and `idle_seconds` if the idle tracker has a sample | `:1046420-1046450` |

A live capture from a Remote Control session on CLI 2.1.289, contributed by
[@Mearman](https://github.com/Mearman) in [#3](https://github.com/wtfwhs/tengu-decoded/issues/3), matches the
`CCRClient` body field for field:

```json
{"session_id":"cse_<id>","worker_epoch":1,"supports_heartbeat_probe":true,"current_interval_seconds":20,"idle_seconds":7}
```

What the 2.1.300 source says about each part:

- **Probe fields are gated.** `advertiseHeartbeatProbeSupport` comes from `k("tengu_ccr_idle_heartbeat", false)`
  (`:1051142`, passed in at `:1051166`) and is forced off for outbound-only transports (`F = !e.outboundOnly`,
  `:1049036`, applied at `:1049068`). The capture therefore implies that flag was on for that session.
- **Interval and jitter are remotely tunable.** The bridge reads the GrowthBook dynamic config
  `tengu_bridge_repl_v2_config` (`Do()`, `:1050641`). Its defaults are `heartbeat_interval_ms: 20000` and
  `heartbeat_jitter_fraction: 0.1` (`:1050610-1050611`), passed to the client at `:1051161`. If no interval is
  supplied, `CCRClient` itself falls back to `lt = 20000` ms (`:1045125`). The 20 s cadence in the capture is the
  default; `current_interval_seconds` reports the interval currently in force, rounded to seconds (`:1046446`).
- **`idle_seconds`** comes from `idleTracker.sampleIdleSeconds()` (`:1047978`). The capture saw it count up
  between beats (7, then 26). This is consistent with an idle counter, but how the tracker resets is not traced here.
- **Request timeout** is `max(5 s, min(15 s, interval × (1 − jitter) − 5 s))` (`:1046452`). With the defaults that
  is 13 s.
- **Beat reasons.** Besides the regular cadence, `sendHeartbeat(reason)` handles `probe`, `resync`,
  `resync_stale`, `reactivate`, `socket` and `socket_ended`, gated by `tengu_ccr_reconnect_beat`,
  `tengu_ccr_reactivation_beat` and `tengu_ccr_skip_redundant_heartbeat` (all default `false`).
- **Headers.** The capture reports a worker JWT bearer, `anthropic-version: 2023-06-01` and
  `anthropic-client-platform: claude_code_cli`. The `anthropic-version: 2023-06-01` header, the
  `anthropic-client-platform` header and the string `claude_code_cli` all occur in the 2.1.300 source; how the
  headers (including the bearer token) are assembled for this request was not traced.

`supports_heartbeat_probe`, `current_interval_seconds` and `idle_seconds` occur 0 times in 2.1.197, so the richer
body is new since then (somewhere between 2.1.197 and 2.1.289).

### 3.2 Bridge environments (module 1379 `chunk-xtarwp8w.js`)
Headers: `Bearer`, `anthropic-beta: environments-2025-11-01` (`bPo.header`),
`x-environment-runner-version` and optional `X-Trusted-Device-Token` (`:1075676-1075688`).
- `POST /v1/environments/bridge` (register → `environment_id`)
- `DELETE /v1/environments/bridge/{id}`
- `/v1/environments/bridge/{id}/offline` (NEW)
- `GET /v1/environments/{id}/work/poll`
- `POST …/work/{wid}/{ack,stop,heartbeat}`
- `POST /v1/environments/{id}/bridge/reconnect`

Lines: `:1075712-1075867`.

---

## 4. Self-hosted runners (NEW)

Client `cfn()` in module 432 (`:600413-600720`). Headers (`ee()`/`B()`, `:600255-600273`; worker calls use `K()` `:600275`, no runner-version header):
`Authorization: Bearer <pool secret | session token>`, `anthropic-version: 2023-06-01`,
`x-self-hosted-runner-version` (0 occurrences in 2.1.197).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/code/runners/self-hosted/runners/register` | POST | `{runner_version, use_anthropic_git_proxy, server_auto_mode_lists, client_label?, lock_to_account_id?}` → `runner_id` (`:600435`) |
| `/v1/code/runners/self-hosted/runners/{rid}/poll` | POST | Lease + `session_assignments` (`:600492`) |
| `/v1/code/runners/self-hosted/runners/{rid}/work-hints/stream` | GET (stream) | Work hints (`:614508`) |
| `/v1/code/runners/self-hosted/spawn-hints/poll`, `/nack` | POST | Spawn hints (`:600443`, `:600477`) |
| `/v1/code/runners/self-hosted/sessions/{sid}/token` | POST | → `{session_token, tools_host}` (`:600527`) |
| `/v1/code/runners/self-hosted/sessions/{sid}/{release,report-failure}` | POST | (`:600570`, `:600553`) |
| `/v1/code/runners/self-hosted/deregister` | POST | With `drain_hold` stats (`:600583`) |
| `/v1/code/auth/refresh` | POST | Runner token refresh (`:600599`) |
| `/v1/code/runners/self-hosted/pools[/{id}[/secrets\|/sessions]]`, `…/runners?pool_id=`, `…/sessions/{sid}/requeue` | GET/POST | Admin side, used by the nine `self_hosted_runner_*` tools (module 1707 `chunk-9rf10hh1.js`, `:1440118-1440530`; pools list `:198806`) |

Operator setup goes through the claude.ai admin page `{origin}/admin-settings/cloud-environments`
(`:620887`).

---

## 5. OAuth / Auth / Identity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `platform.claude.com/oauth/authorize` | GET | Console authorize (`:9513`) |
| `claude.com/cai/oauth/authorize` | GET | Claude.ai authorize (`:9514`) |
| `platform.claude.com/v1/oauth/token` | POST | Token exchange / refresh (`:9516`) |
| `{TOKEN_URL}/revoke` | POST | Revoke (`:118524`) |
| `{BASE_API_URL}/v1/oauth/token` + `anthropic-beta: oauth-2025-04-20,oidc-federation-2026-04-01` | POST | Workload-identity / OIDC federation exchange, grant `urn:ietf:params:oauth:grant-type:jwt-bearer` (`:99014-99018`, `:164179-164186`). Pre-existing (`oidc-federation` 1 hit in 2.1.197) |
| `platform.claude.com/v1/oauth/hello` + `{BASE_API_URL}/api/hello` | GET | Connectivity pair (`:1625858`) |
| `platform.claude.com/oauth/code/callback` | GET | Manual redirect (`:9521`) |
| `claude.ai/oauth/claude-code-client-metadata` | GET | Client metadata (`:9530`) |
| `/api/oauth/claude_cli/create_api_key`, `/roles` | POST/GET | (`:9517-9518`) |
| `/api/oauth/profile` | GET | (`:118237`) |
| `/api/oauth/validate` | POST | (`:118301`). Claude-in-Chrome now requires a token scope accepted here (`user:profile`, `user:office` or `user:ccr_inference`) (`:335315`) |
| `/api/claude_cli_profile` | GET | x-api-key profile (`:118214`) |
| `/api/oauth/usage` (+ `?at_wall=1&skip_spend=1`, `?cedar_ember=1&skip_spend=1`) | GET | Usage. The two query variants are **NEW** (`cS` `:182905-182909`) |
| `/api/oauth/account/settings` | GET/PATCH | Pre-existing (`:958237`, `:958276`) |
| `/api/auth/trusted_devices` | POST | `{display_name}` → `{device_token, device_id}` (`:292628`) |
| `api.anthropic.com/api/oauth/cri` (+ `/jwks.json`) | — | **NEW.** `cri+jwt` token issuer + JWKS (`Ry`/`Wve`, `:1179340-1179342`) |
| `{origin}/api/oauth/local_pairing` (+ `/attest`, `/jwks.json`) | POST/GET | **NEW.** Local pairing issuer, protocol `claude-local-pairing/v1` (`:871229-871235`) |
| `claude.ai/restricted` | browser | **NEW.** Account-on-hold appeal link, error `account_on_hold` (`:98927`) |

### OAuth config (`:9471-9601`, module 30)

- **Client IDs (unchanged):** prod `9d1c250a-e61b-44d9-88ed-5944d1962f5e` (`:9522`); local
  `22422756-60c9-4084-8eb7-27705fd5cf9a` (`:9548`). **`DESIGN_CLIENT_ID`**
  `59637612-477b-4836-a601-b0589eda7704` (`:9523`); local `00000000-0000-4000-8000-000000000000`.
  The 2.1.197 doc omitted the design client id, but it was already present (`197` grep: 1 hit).
- **NEW config fields:** `PLUGINS_SCOPE_REGISTERED` and `PROJECTS_SCOPES_REGISTERED` (both `!0` in
  prod/local). The custom-OAuth and `CLAUDE_CODE_OAUTH_CLIENT_ID` overrides force them to `!1`
  (`:9589-9598`).
- `MCP_PROXY_URL` `https://mcp-proxy.anthropic.com`, `MCP_PROXY_PATH` `/v1/mcp/{server_id}`; local
  `http://localhost:8205` + `/v1/toolbox/shttp/mcp/{server_id}`. Unchanged.
- Custom-OAuth allow-list `KWe` (`:9557`): `beacon.claude-ai.staging.ant.dev`, `claude.fedstart.com`,
  `claude-staging.fedstart.com`. **Unchanged.** A non-listed `CLAUDE_CODE_CUSTOM_OAUTH_URL` throws.
- Refresh-token lifetime constant `Fte = 31536000` s (365 days, `:9471-9472`).

**Scopes:**

| Set | Symbol | Scopes |
|-----|--------|--------|
| Default | `r` + `Iyt()` | `user:profile`, `user:inference`, `user:sessions:claude_code`, `user:mcp_servers`, `user:file_upload`, **+ `user:plugins` (NEW, when `PLUGINS_SCOPE_REGISTERED`)** (`:9487-9493`) |
| API-key minting | `n` | `org:create_api_key`, `user:profile` |
| Design | `tHe` | `user:design:read`, `user:design:write` (`:9499`) |
| Projects (filter) | `u` / `gNr` | `user:projects:read`, `user:projects:write`. Only kept if requested (`:9500-9506`) |
| Inference-only | `cR` | `user:inference` |

`user:office` and `user:ccr_inference` are named as accepted by `/api/oauth/validate` (`:335315`). They
are not in the request sets above.

### Trusted devices
Enrolment: `POST /api/auth/trusted_devices` (`:292628`), gated by `require_trusted_devices`
(`:292297`). `X-Trusted-Device-Token` occurs **27×** in 2.1.300 (5× in 2.1.197). It now rides on the
CCR CRUD, bridge, bridge-environment, inbox, move-to-cloud and github-PR calls. A 403 with
`resource:"untrusted_device"` and `sub_reason ∈ {bound_unattested, served_call_unsigned}` drives
enrol-or-sign decisions (`_fe` `:881202-881234`).

---

## 6. Artifact "frame" platform (`/api/frame/*`)

Most calls go through the frame client **`Pc`** (`:687647-687680`). Its methods (`get`, `post`, and
`post/get/patch/delete` with `RelayOnly`/`RelayStrict`/`RelayBound` variants) route over a **relay**,
**MCP**, or **HTTP** fallback (`tt`/`Vre`/`ice` `:687628-687646`). The host map gives `frame` →
`Cmt() ?? BASE_API_URL` (`:138658`). Deployed artifacts are served from
`https://{slug}.frame[.staging].claudeusercontent.com` (`bXe` `:75881`). The claude.ai viewer is
`{origin}/code/artifact/{slug}` or `{origin}/artifact/{shortId}` (`_an` `:75841-75844`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/frame/deploy/prepare` | POST | **NEW.** Start a deploy (`:692587`) |
| `/api/frame/upload` | POST | **NEW.** Upload files (`:693888`) |
| `/api/frame/deploy/direct[?attempt_id=…&resend=1]` | POST | Direct deploy (`:692753`). Pre-existing (`197:406336`); the `attempt_id`/`resend` query is the change |
| `/api/frame/track` | POST | Analytics (`:692630`) |
| `/api/frame/{id}?…`, `DELETE /api/frame/{id}` | GET/DELETE | Read / delete (`:697479`, `:1400968`) |
| `/api/frame/read/{id}` | GET | **NEW** (`:691424`) |
| `/api/frame/content/{id}{suffix}` | GET | **NEW** (`:697940`) |
| `/api/frame/frames?limit=`, `/api/frame/frames/external` | GET | **NEW.** List artifacts (`:694647`, `:690340`) |
| `/api/frame/versions/{id}` | GET | **NEW** (`:783461`) |
| `/api/frame/retitle/{id}` | POST | **NEW** (`:1750943`) |
| `/api/frame/favorite/{id}` | — | **NEW** (`:783570`) |
| `/api/frame/perm/{id}{suffix}` | — | **NEW.** Permissions (`:783185`) |
| `/api/frame/comments/{id}[/{cid}[/resolve\|/summon-status\|/{op}]]` | GET/POST | **NEW.** Comments (`:699783-700480`) |
| `/api/frame/subscribe/{id}`, `/unsubscribe/{id}` | POST | **NEW.** Watches (`:1400649`, `:1400774`) |
| `/api/frame/watch-token/{id}?vn=` | POST | **NEW** (`:697788`) |
| `/api/frame/sync` | — | **NEW** (`:712063`) |
| `/api/frame/contract/{latest\|{ver}[/prompt\|/{name}.d.ts]}` | GET | **NEW.** Runtime contract + typings (`:690394-690563`) |
| `/api/frame/types[/{t}[/create\|/instances\|/files/{path}]]` | GET/POST | **NEW.** Artifact types (`:777800-778144`) |
| `/api/frame/blob/{id}/{agent-upload,agent-list,agent-copy}`, `/blob/{id}/{b}/agent-delete` | POST | **NEW.** Asset store (`:779987-779999`) |
| `/api/frame/db/agent` | POST | **NEW.** Shared artifact DB (`:775910`) |
| `/api/frame/diag/{slug}/{ver}` | GET | **NEW** (`:777443`) |
| `/api/frame/user/profiles/{id}` | POST | **NEW** (`:1393230`) |

**REMOVED:** `/api/frame/deploy/init` (`197:406109`) and `/api/frame/deploy/complete`
(`197:406274`). There are 0 hits for `deploy/init` or `deploy/complete` in 2.1.300.

---

## 7. Telemetry & Feature Flags

| Endpoint | Host | Purpose |
|----------|------|---------|
| `/api/event_logging/v2/batch` | `api.anthropic.com` (`api-staging.` when `ANTHROPIC_BASE_URL` is staging) | 1P batched events. `maxBatchSize 200`, `batchDelayMs 100`, backoff 500 ms→30 s, `maxAttempts 8`, timeout 10 s; new `tenantGrant.sendMode` (`:141443-141444`). Path constant also at `:485845` |
| `/api/v2/logs` | `http-intake.logs.us5.datadoghq.com` | Datadog mirror, allow-listed events only (`O` `:349582`). ddsource token `pubea5604… (redacted)`, **unchanged** (`:349576-349577`) |
| `/api/eval/{clientKey}` | `api.anthropic.com/` | GrowthBook remote eval. apiHost `BB="https://api.anthropic.com/"` (`:133727`), clientKey `sdk-zAZezfDKGoZuXXKe` (`:133730`), **unchanged** |
| `/api/eval-authed/{clientKey}` | `api.anthropic.com` | **NEW.** Authenticated remote eval (POST with OAuth headers) behind flag `tengu_gb_eval_authed_enable` (default `!1`); falls back to `/api/eval` on error (`:134018-134054`) |
| `/api/claude_code/metrics` | `BASE_API_URL` | "BigQuery metrics" exporter (`:1470494`, module 1771). The template is mangled by the beautifier inside a string, which is why scanners miss it. **Not removed** |
| `/api/claude_code/organizations/metrics_enabled` | `BASE_API_URL` | (`:958017`) |
| `/v1/code/sessions/{id}/worker/otlp/*` | CCR | **NEW.** OTLP relay (§3.1) |
| `${BETA_TRACING_ENDPOINT}/v1/{traces,logs}` | env OTLP | Still wired (env registry `:10780`) |

**Correction to 2.1.197 doc:** GrowthBook traffic goes to `https://api.anthropic.com/` in both builds
(`197:145291`). `cdn.growthbook.io` is only the GrowthBook SDK's default fallback (`:111391`).

---

## 8. MCP / first-party connectors

| Endpoint | Purpose |
|----------|---------|
| `mcp-proxy.anthropic.com` + `/v1/mcp/{server_id}` | Hosted MCP proxy (`:9527-9528`) |
| `api.anthropic.com/v1/design/mcp` | Claude Design MCP. Now a direct `Gt.post` with `X-Anthropic-Client: claude-cli-design-tool`, refused unless `BASE_API_URL` is first-party (`:1437451-1437458`). First-party MCP path list `m$ = ["/v1/design/", "/v1/claude/test/", "/v1/pages/mcp"]` (`:139277-139278`) |
| `/v1/design/consent` | GET/POST/DELETE. **NEW.** Design agent consent (`:964024`, `:964117`, `:964131`) |
| `/v1/design/grants` | GET/POST `{project_id}`. **NEW.** Per-project write grants (`:964145`, `:964180`) |
| `/v1/pages/mcp` | **NEW.** `Claude_Pages` connector (`E4n` `:77109`; `U$t = {Claude_Pages, Claude_Docs}` `:77107`) |
| `/v1/code/mcp/ccr-artifacts`, `/api/artifacts/mcp` | **NEW.** `claude-artifacts` MCP (`:77111-77113`) |
| `/v1/code/mcp/hearthbot`, `/v2/ccr-sessions/{id}/hearthbot/mcp` | **NEW.** "hearthbot" MCP (`mcp__hearthbot__{reply,fetch_messages,fetch_thread,fetch_project_timeline}`) (`:77681-77682`) |
| `/v2/ccr-sessions/-/meta/mcp`, `/v2/ccr-sessions/{id}/mcp?…` | **NEW.** CCR-session MCP (`:76657`, `:77605`) |
| `/v2/ccr-sessions/{id}/teleport/conversations/{uuid}/completion` | **NEW.** Teleport relay completion (`:1460466`) |
| `/v1/claudeai-agents/mcp` | **NEW** (`:1823796`) |
| `bridge.claudeusercontent.com` + `/devices/mcp` | Device bridge MCP (`:77694-77695`, pre-existing path) |
| `/v1/mcp_servers?limit=1000` | claude.ai connector list (`:495703`) |
| `/api/organizations/{org}/mcp/start-auth/{id}?product_surface=` | Connector auth (`:495928`) |
| `/api/oauth/organizations/:orgUUID/mcp/connectors/{list,search,suggest}` | **NEW.** Connector discovery (`:1441694-1441696`) |
| `/api/directory/servers?…`, `/api/directory/plugins` | Directory. `plugins` is **NEW** (`:139144`, `:136795`) |
| `microsoft365.mcp.claude.com/mcp` (+ `gmail.mcp.claude.com`, `gcal.mcp.claude.com`) | Managed MCP presets (`:1167833`, `:1280203`) |

`slack.mcp.claude.com` is no longer in the JS. It now appears only in a bundled doc asset
(`modules/mcp-servers-chmkz450.md`).

---

## 9. Provider base URLs

Selected by `Ie()` (`:21728-21729`): gateway (`Fr()||b7e()||w7e()`) → bedrock → foundry →
anthropicAws → **anthropicGoogleCloud** → mantle → vertex → firstParty. Base URLs come from `Fw()`
(`:181956-181975`).

| Plane | Base URL | Env / override |
|-------|----------|----------------|
| firstParty | `https://api.anthropic.com` | `ANTHROPIC_BASE_URL` |
| bedrock | `https://bedrock-runtime.{region}.amazonaws.com` | `CLAUDE_CODE_USE_BEDROCK`, `ANTHROPIC_BEDROCK_BASE_URL` |
| mantle | `https://bedrock-mantle.{region}.api.aws` | `CLAUDE_CODE_USE_MANTLE`, `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` |
| anthropicAws | `https://aws-external-anthropic.{region}.api.aws` | `CLAUDE_CODE_USE_ANTHROPIC_AWS`, `ANTHROPIC_AWS_BASE_URL` |
| **anthropicGoogleCloud (NEW)** | `https://claude.googleapis.com` (CLI default `:181966`); SDK base `https://claude.googleapis.com/v1alpha/projects/{project}/locations/{location}/workspaces/{workspace}/invoke` (`:920806`) | `CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`, `ANTHROPIC_GOOGLE_CLOUD_{BASE_URL,PROJECT,LOCATION,WORKSPACE_ID}`, `GOOGLE_CLOUD_PROJECT`, `CLAUDE_CODE_SKIP_ANTHROPIC_GOOGLE_CLOUD_AUTH` |
| vertex | `https://{region}-aiplatform.googleapis.com/v1` | `CLAUDE_CODE_USE_VERTEX`, `ANTHROPIC_VERTEX_BASE_URL` |
| foundry | `https://{resource}.services.ai.azure.com/anthropic` | `CLAUDE_CODE_USE_FOUNDRY` |
| gateway | customer gateway URL (`Fr()?.url`), OIDC device flow (`{base}/oauth/device_authorization` `:1109412`) | `CLAUDE_CODE_USE_GATEWAY` |

**`AnthropicGoogleCloud` details** (module 979, `:920795-920921`):
- `location` defaults to `"global"`; `workspaceId` is **required**.
- `project` comes from env or is resolved from Google ADC (`getProjectId()`).
- The options `apiKey`, `authToken`, `credentials`, `config` and `profile` are rejected.
- Auth is `Authorization: Bearer <Google access token>`, scope
  `https://www.googleapis.com/auth/cloud-platform`. `skipAuth` disables it.
- `completions` throws: "The deprecated text Completions API is not available on Claude Platform on
  Google Cloud".
- User-Agent is `AnthropicGoogleCloud/JS 0.128.0`.

The CLI validates `ANTHROPIC_GOOGLE_CLOUD_{PROJECT,LOCATION,WORKSPACE_ID}` and `GCLOUD_PROJECT` against
`/^[A-Za-z0-9_-]+$/`, because they are "interpolated into the claude.googleapis.com request path"
(`Zt` `:180483-180486`; call `:181759`). The managed-provider config can also build this client from
`project_id` + an `access_token` (`:1180768-1180811`). The string `anthropicGoogleCloud` occurs 0 times in
2.1.197.

---

## 10. First-party config / connectivity / org / billing

All of these go through `Gt` (first-party client over `Sr()`, module 152). Auth modes are
`teleport-org` (47 call sites), `none` (12), `session-jwt` (11), `async` (6), `claude-ai-oauth` (5)
and `required` (1). `:orgUUID` is substituted from the OAuth org (`:138744`, `:138769`). Host map `ap()`
(`:138645-138663`): `api`, `claude-ai`, `mcp-proxy`, `frame`, `memory`, and **NEW**
`ccr-session` / `ccr-gateway` (both require `--sdk-url`).

| Endpoint | Status | Evidence |
|----------|--------|----------|
| `/api/hello` | unchanged | `:1550762` |
| `/api/web/domain_info?domain=` | unchanged (now hard-coded to `https://api.anthropic.com`) | `:489667` |
| `/api/claude_cli_feedback` | unchanged | `:763576` |
| `/api/claude_cli/bootstrap` | pre-existing. Returns `client_data` (per-account remote config) plus `oauth_account`, `model_access`, `org_model_default`, extra model options/costs and `auto_compact_windows`. Skipped when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set or the provider is not `firstParty`. See [feature-flags](feature-flags.md#server-sent-client-data-client_data-a-second-remote-config-channel) | `:760225`, `:760218-760219` |
| `/api/claude_code/{policy_limits,settings,skills,notification/preferences}` | pre-existing | `:75334`, `:770676`, `:1687673`, `:965324` |
| `/api/claude_code_grove`, `/api/oauth/account/grove_notice_viewed` | pre-existing | `:958327`, `:958259` |
| `/api/claude_code_penguin_mode` | pre-existing | `:121386` |
| `/api/claude_code_shared_session_transcripts` | pre-existing | `:1332449` |
| `/api/organization/claude_code_first_token_date` | unchanged | `:1108776` |
| `/api/organizations/:orgUUID/claude_code/onboarding[/{id}]` | unchanged | `:458845-458876` |
| `/api/oauth/organizations/:orgUUID/{setup_overage_billing,overage_spend_limit,contracts/*,prepaid/*,payment_method,billing/tax_rate}` | pre-existing | `:451014-451291` |
| `/api/oauth/organizations/:orgUUID/{referral/*,overage_credit_grant,claude_code/pro_trial,admin_requests*}` | pre-existing | `:334958`, `:1224591`, `:1067554`, `:946685` |
| `/api/organizations/{org}/reset_rate_limits` | **NEW** ("cedar-ember" grant claim, `auth:"async"`) | `:1204362` |
| `/api/organizations/:orgUUID/model_selector/{x}`, `/api/model_selector/{x}`, `/api/organizations/:orgUUID/model_selector_state/{x}` | **NEW.** Model picker; auth per credential kind (account/token/api_key/profile/federation) | `:792912-792940`, `:938390` |
| `/api/organizations/:orgUUID/cowork/remote_devices` | **NEW** | `:1000152` |
| `/api/oauth/organizations/:orgUUID/{plugins/list-plugins,plugins/{id}/download,skills/list-skills,skills/{id}/download}` | pre-existing | `:285266`, `:285370`, `:773562`, `:773611` |
| `/api/oauth/organizations/:orgUUID/{plugins/search,skills/search,plugins/}` | **NEW** | `:1030767-1030769` |
| `/api/oauth/organizations/:orgUUID/marketplaces[/{m}/plugins]` | **NEW** | `:414350`, `:414738` |
| `/api/oauth/organizations/:orgUUID/plugin_ratings[/appearances[/outcome]]` | **NEW** | `:1333880-1333924` |
| `/api/oauth/organizations/{org}/code/repos/{owner}/{repo}`, `/code/repos/resync` | resync **NEW** | `:459336`, `:459451` |
| `/api/oauth/organizations/:orgUUID/sync/github/auth` | pre-existing | `:935289` |
| `/api/organizations/:orgUUID/marketplace/plugin-assets/{id}` | pre-existing | `:565328` |
| `/api/organizations/:orgUUID/projects/{id}{suffix}` | pre-existing | `:790703` |
| `/api/oauth/file_upload`, `/api/oauth/files/{id}/content` | pre-existing | `:1455043`, `:1474311` |
| `/v1/filestore/fs/{readFile,listDirectory}` | `listDirectory` **NEW** | `:1805742`, `:1805927` |
| `/v1/code/memory/…`, `/v1/code/local/memory/{credential,mounts}` | **NEW.** Memory host paths | `:221098`, `:222449`, `:222704` |
| `/api/ws/speech_to_text/voice_stream` | pre-existing | `:1550744` |
| `downloads.claude.ai/model-catalog/v1/catalog.json` (+ `.raw-sig.json`) | **NEW.** Signed model catalog | `:758872-758873` |

---

## 11. Embedded egress catalog (NEW, tentative attribution)

Module 1481 `chunk-ds2x9wed.js` (1,546,086 bytes) carries a host/egress registry (`xT.*`,
`:1157316-1157380`) and a per-feature endpoint catalog (`:1176240-1176350`). Its labels mention
"Chats and Cowork tasks", "releases.claude.com when updateViaUpdatesHost is set" and Desktop update
feeds. This looks like a shared Claude apps / Desktop managed-settings schema compiled into the CLI;
that attribution is an **inference**. Notable entries:
- `MINIMAL_EGRESS_DOMAINS = ["*.anthropic.com","anthropic.com","claude.com","*.claude.com"]`
- `UPDATE_FEED_HOST releases.claude.com` (`/api/desktop/{…}/update`), `VM_BUNDLE_HOST downloads.claude.ai`
- `ARTIFACT_IFRAME_HOST www.claudeusercontent.com`, `FRAME_ARTIFACT_CONTENT_HOSTS *.frame[.staging].claudeusercontent.com`
- `MCP_APP_SANDBOX_* *.claudemcpcontent.com` / `sandbox.claudemcpcontent.com`, `ANTHROPIC_ASSETS_HOST assets.claude.ai`
- `SENTRY_INGEST_HOST o1158394.ingest.us.sentry.io`
- Datadog RUM via `{anthropicHost}/api/v2/rum` and `browser-intake-*` hosts

None of these hosts appear in 2.1.197 (`releases.claude.com`, `claudemcpcontent.com`,
`assets.claude.ai` and `o1158394` all have 0 hits). Whether the CLI process itself contacts them is
**not established**: they are catalog data.

---

## 12. claude.ai / console routes, distribution, status

| URL | Purpose |
|-----|---------|
| `{CLAUDE_AI_ORIGIN}/code`, `/code?environment={id}`, `/code/{id}` | Web sessions (`:935323`, `:1075481`, `:310037`) |
| `{origin}/code/routines/{id}` | Routines (`:1441314`) |
| `{origin}/code/artifact/{slug}`, `{origin}/artifact/{shortId}` | **NEW.** Artifact viewer (`:75844`) |
| `{origin}/admin-settings/cloud-environments` | **NEW.** Self-hosted env admin (`:620887`) |
| `{origin}/connect-github`, `/customize/connectors`, `/customize/plugins/…`, `/chrome/{…}`, `/new?title=` | Misc deep links (`:368534`, `:495911`, `:1247790`, `:874745`, `:1734001`) |
| `claude.ai/mobile?entrypoint=claude_code_cli`, `claude.ai/settings/usage?from=cc_cli_limit_message` | **NEW** literals (2.1.300 URL scan) |
| `downloads.claude.ai/claude-code-releases[/plugins/claude-plugins-official]` | Distribution (`:595589`, `:558004`) |
| `status.claude.com` | Status (`JGe` `:449702`). On the Google plane the error text adds "Google Cloud's status page" (`:449719`) |

---

## 13. What's new / changed / removed vs 2.1.197

**Added:**
- Provider plane `anthropicGoogleCloud` → `claude.googleapis.com` (`/v1alpha/…/invoke`).
- SDK resource families: Dreams, Tunnels (+certificates), Organizations Admin API; Deployments /
  Deployment Runs / Session Threads (previously doc-only); environment work-queue builders; GA
  Files & Skills; skill version `/content`.
- Self-hosted runners control plane (`/v1/code/runners/self-hosted/*`, `/v1/code/auth/refresh`).
- CCR: worker v2 absolute paths, `sessions/watch`, `tool_hosts/refuse`, `inbox`, `device`,
  `move-to-cloud`, `sign-commit`, `remote`, `file`/`synced_file`, `agent-proxy`, git proxy,
  `webhook-triggers`, `post-review-comment`, `ultrareview/quota`, bridge `/offline`. (`/v1/code/agent-proxy` itself is pre-existing; only the session-scoped form is new.)
- ~35 `/api/frame/*` artifact endpoints; first-party MCP endpoints (pages, ccr-artifacts, artifacts,
  hearthbot, ccr-sessions meta, claudeai-agents); design consent/grants.
- `/v1/messages/cache_touch`, `/v1/me`, `/api/eval-authed/{key}`, `/api/oauth/cri`,
  `/api/oauth/local_pairing`, model_selector family, reset_rate_limits, cowork/remote_devices,
  plugin search/ratings/marketplaces, MCP connectors list/search/suggest, signed model catalog.
- OAuth scope `user:plugins`; headers `anthropic-workspace-id`, `x-self-hosted-runner-version`,
  `anthropic-cache-keepalive` (response), `x-cc-internal-*` latches.

**Changed:**
- Bundled SDK 0.94.0 → 0.128.0.
- Memory Stores beta → `agent-memory-2026-07-22`; User Profiles → `user-profiles-2026-08-18`;
  Files/Skills drop their injected default beta.
- `/v1/code/github/{x}-pr` → `/v1/code/github/{x}-pull-request`.
- Worker web proxies → generic `${sessionUrl}/worker/${route}`.
- Plane gate `au()` adds anthropicGoogleCloud; `VG()` likewise through `wD()`.
- `/bridge` handshake accepts `expected_epoch` and may return `mcp_config`.

**Removed (verified 0 hits in 2.1.300 JS):**
- `/api/frame/deploy/init`, `/api/frame/deploy/complete` (replaced by `deploy/prepare` + `upload` + `deploy/direct`).
- `/api/claude_code/team_memory` and `/api/claude_code/memory` (`197:447546-447547`). The memory host
  `/v1/code/memory/` appears instead; that it is a replacement is a **tentative** inference.
- `/api/claude_code/discovery/team_usage` (`197:350707`).
- Messages beta `summarize-connector-text-2026-03-13`; SDK-injected `skills-2025-10-02`.

**False "removals" in a naive path scan (verified still present):**
- `/api/claude_code/metrics` (`:1470494`, mangled template)
- `/v1/sessions/{id}/unarchive` and `/v1/code/sessions/{id}/unarchive` (suffix concat, `:881456`)
- `/api/oauth/organizations/{}/plugins/{}/download` (now `download${query}`, `:285370`)
- `…/worker/web-fetch|web-search` (generic route)

**Unchanged:** OAuth client IDs, authorize/token/revoke URLs, custom-OAuth allow-list, Datadog ddsource
token, GrowthBook clientKey and host, `/api/event_logging/v2/batch` shape (`maxBatchSize 200`,
`maxAttempts 8`), `oauth-2025-04-20`, `token-counting-2024-11-01`, `message-batches-2024-09-24`,
`managed-agents-2026-04-01`, `files-api-2025-04-14` and `environments-2025-11-01` dates.

## Uncertainties / caveats

- The 180/10 headline numbers come from `_facts.md`'s scanner over `cli.min.js` + text assets. This
  doc's own `cli.beauty.js`-only scan (175 → 336, 172 new keys) is close but not identical. The
  "removed" set above is classified by hand.
- Organizations Admin API, Dreams, Tunnels and Deployments are **SDK builders**; no CLI call site was
  found for Organizations/Dreams/Tunnels/Deployments (`.beta.{deployments,dreams,tunnels}` and
  `.organizations.` all 0). Memory Stores, Sessions, Environments and Skills do have call sites
  (`:170946`, `:922258-923246`).
- Several 2.1.197-documented items were imprecise: `mcp_oauth_validate` and `work/stats` were doc-only
  in 2.1.197; GrowthBook was never served from `cdn.growthbook.io` in practice; the
  `bridge.claudeusercontent.com` websocket is selected by the Chrome-extension bridge (module 896,
  `:876403-876407`) and the remote-tools bridge (module 1446, `CLAUDE_REMOTE_TOOLS_BRIDGE_URL`,
  `:1113297-1113307`), not the CCR worker.
- `/v1/token`, `/v1/oauthtoken`, `/v1/projects`, `/v1/{}:signBlob` etc. are vendored Google auth
  (`:901158`, `:902147`, `:900936`). `/api/v3`, `/api/graphql` (GitHub), `/api/v4` (GitLab) and
  `/api/v2/rum` (Datadog) are third-party. None of them are Claude Code surfaces.
- Exact request bodies were read for the runner, bridge, session-create, device-bind, cache_touch and
  move-to-cloud calls. For the frame endpoints only the URL builders were read.
