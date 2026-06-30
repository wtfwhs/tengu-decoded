# Internal API Endpoints

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.4.0
>
> See [data/api-endpoints.yaml](data/api-endpoints.yaml) for the structured dataset.

The cloud backend that arrived in 2.1.169 is still here and has **grown three new managed-agents
resource families** plus a cluster of new first-party CLI surfaces. The headline deltas vs 2.1.169:

1. **Managed-Agents SDK** gains **Vaults** (`/v1/vaults` + credentials, incl. `mcp_oauth_validate`)
   and **Memory Stores** (`/v1/memory_stores` + memories + memory_versions). Skills now expose
   explicit version sub-endpoints. (`Deployments` / `Deployment Runs` / `Session Threads` are
   **documented** in the bundled managed-agents skill reference but are **not** implemented in the
   bundled `@anthropic-ai/sdk` client — see §2.7.)
2. **New first-party CLI surfaces:** `/v1/ultrareview/preflight` (cloud code review),
   `/v1/design/mcp` (built-in first-party "Claude Design" MCP server), `/api/frame/deploy/*` +
   `/api/frame/track` (web-artifact "frame" deploy, served at `{slug}.frame.claudeusercontent.com`),
   and `/api/oauth/validate` (token validation).
3. **CCR worker proxy gains `…/worker/web-search`** alongside the existing `…/worker/web-fetch`.
4. **New OAuth scopes** `user:design:read|write` and `user:projects:read|write`.
5. **Beta-header dates are UNCHANGED** vs 2.1.169 — no managed-agents / files / skills / user-profiles
   / token-counting / oauth date bumps this build.

Gating: the OAuth-capable plane gate `ud()` (`cli.beauty.js:94671`) now returns true for
**firstParty | anthropicAws | gateway** (was first-party only in 2.1.169 via `o_()`). The
teleport / Remote-Control (CCR) surface gate is **firstParty | gateway** (`:101685, :146710, :231698`).
Telemetry and these cloud endpoints are still dropped on Bedrock/Vertex/Foundry/Mantle.

---

## 1. Inference (Messages API)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/messages` (`?beta=true`) | POST | Primary inference |
| `/v1/messages/count_tokens` | POST | Token counting (beta `token-counting-2024-11-01`, `cli.beauty.js:7927`) |
| `/v1/messages/batches` | POST/GET | Message Batches |
| `/v1/complete` | POST | Legacy completions |
| `/v1/models`, `/v1/models/{id}` | GET | Model listing / metadata |

Auth: `x-api-key` **or** `Authorization: Bearer` (OAuth). Header `anthropic-version: 2023-06-01`.

---

## 2. Cloud backend — Managed Agents SDK

Bundled `@anthropic-ai/sdk` `client.beta.*` namespace. All paths carry `?beta=true` and an
`anthropic-beta` header. **All beta dates are identical to 2.1.169** — default
`managed-agents-2026-04-01` (`cli.beauty.js:6202`); files `files-api-2025-04-14` (`:6324`); skills
`skills-2025-10-02` (`:8163`); user profiles `user-profiles-2026-03-24` (`:6429`). Vaults and Memory
Stores ride the default `managed-agents-2026-04-01` header.

### 2.1 Agents (`cli.beauty.js:6494-6572`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/agents` | POST / GET | Create / list agent definitions |
| `/v1/agents/{id}` | GET / POST | Retrieve / update |
| `/v1/agents/{id}/archive` | POST | Archive (terminal; no delete, no unarchive) |
| `/v1/agents/{id}/versions` | GET | List versions |

### 2.2 Sessions (`cli.beauty.js:7950-8100`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/sessions` | POST / GET | Create / list sessions |
| `/v1/sessions/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/sessions/{id}/archive` | POST | Archive |
| `/v1/sessions/{id}/events` | GET / POST | List / send events (paginated) |
| `/v1/sessions/{id}/events/stream` | GET (SSE) | Stream events live (`:7975`) |
| `/v1/sessions/{id}/resources[/{rid}]` | GET/POST/DELETE | Session resources (`add`/list/get/update/delete) |

### 2.3 Environments (`cli.beauty.js` SDK ~5800-6000)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/environments` | POST / GET | Create / list cloud sandboxes |
| `/v1/environments/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/environments/{id}/archive` | POST | Archive |
| `/v1/environments/{id}/work/stats` | GET | Self-hosted work-queue depth (`x-api-key`) |
| `/v1/environments/{id}/work/{work_id}/stop` | POST | Self-hosted: stop a claimed work item |

### 2.4 Files (`cli.beauty.js:6324-6429`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/files` (`?scope_id=$SESSION_ID`) | POST / GET | Upload / list |
| `/v1/files/{id}` | GET / DELETE | Metadata / delete |
| `/v1/files/{id}/content` | GET | Download binary |

### 2.5 Skills (`cli.beauty.js:8159-8260`) — versions now explicit
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/skills` | POST / GET | Create / list skills |
| `/v1/skills/{id}` | GET / DELETE | Retrieve / delete |
| `/v1/skills/{id}/versions` | POST / GET | Create / list versions (`:8159, :8184`) |
| `/v1/skills/{id}/versions/{v}` | GET / DELETE | Retrieve / delete a version (`:8172, :8197`) |

### 2.6 Vaults & Credentials (NEW — `cli.beauty.js:8281-8408`)
Vaults store credentials Anthropic manages on your behalf — MCP OAuth (auto-refresh) / static bearer
tokens, and `environment_variable` credentials substituted into outbound requests at egress. Attach to
sessions via `vault_ids`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/vaults` | POST / GET | Create / list vaults (`:8371, :8408`) |
| `/v1/vaults/{id}` | GET / POST / DELETE | Retrieve / update / delete (`:8383, :8395`) |
| `/v1/vaults/{id}/archive` | POST | Archive |
| `/v1/vaults/{vid}/credentials` | POST / GET | Create / list credentials (`:8281, :8320`) |
| `/v1/vaults/{vid}/credentials/{cid}` | GET / POST / DELETE | Retrieve / update / delete (`:8294, :8307, :8333`) |
| `/v1/vaults/{vid}/credentials/{cid}/archive` | POST | Archive credential (`:8345`) |
| `/v1/vaults/{vid}/credentials/{cid}/mcp_oauth_validate` | POST | Validate an MCP OAuth credential |

### 2.7 Memory Stores (NEW — `cli.beauty.js:6594-6758`)
Workspace-scoped persistent memory surviving across sessions; attached via a
`{type:"memory_store", memory_store_id}` entry in `resources[]` at session-create time. FUSE-mounted
into the agent.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/memory_stores` | POST / GET | Create / list stores (`:6734, :6746`) |
| `/v1/memory_stores/{id}` | GET / POST / DELETE | Retrieve / update / delete (`:6746, :6758`) |
| `/v1/memory_stores/{id}/archive` | POST | Archive |
| `/v1/memory_stores/{id}/memories` | GET / POST | List / create memories (`:6594, :6642`) |
| `/v1/memory_stores/{id}/memories/{mid}` | GET / PATCH / DELETE | Read / update / delete (`:6611, :6626, :6656`) |
| `/v1/memory_stores/{id}/memory_versions` | GET | List immutable per-mutation snapshots (`:6693`) |
| `/v1/memory_stores/{id}/memory_versions/{vid}` | GET | Retrieve a version (`:6680`) |
| `/v1/memory_stores/{id}/memory_versions/{vid}/redact` | POST | Redact content, preserve actor/timestamps (`:6706`) |

### Documented-but-not-implemented (`cli.beauty.js:669975`, embedded skill reference `GRc`)
The bundled "Managed Agents — Endpoint Reference" markdown documents three further resource families —
**Deployments** (`/v1/deployments[/{id}/pause|unpause|archive|run]`, `depl_` IDs, cron-scheduled),
**Deployment Runs** (`/v1/deployment_runs`, `drun_` IDs), and **Session Threads**
(`/v1/sessions/{id}/threads…`, per-subagent streams). **None of these appear in the bundled
`@anthropic-ai/sdk` client code** (no `client.beta.deployments`/`.deployment_runs`/`threads` request
builders exist in the bundle) — they are documentation only in this build. Treat them as server-side
surfaces the SDK doc advertises, not endpoints the 2.1.197 CLI calls.

Webhooks: managed-agent events are HMAC-signed; the SDK's `client.beta.webhooks.unwrap()` verifies via
`ANTHROPIC_WEBHOOK_SIGNING_KEY` (`whsec_...`) and rejects payloads older than ~5 min.

---

## 3. Cloud backend — Claude Code on the web / Remote Control (CCR)

Driven by the **CLI itself** (not the SDK namespace). First-party client (`fo`/`ks`) over
`BASE_API_URL` (default `https://api.anthropic.com`). Gate: **firstParty | gateway**
(`cli.beauty.js:101685, :146710, :231698`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/code/sessions` | GET / POST | List / create teleport (remote) sessions (`:361158`) |
| `/v1/code/sessions/{id}` | GET | Retrieve session (`:639016`) |
| `/v1/code/sessions/{id}/events` | POST / GET | Send / list events (`:298726`) |
| `/v1/code/sessions/{id}/events/stream` | GET (SSE) | Stream events |
| `/v1/code/sessions/{id}/teleport-events` | POST | Terminal→web handoff events |
| `/v1/code/sessions/{id}/archive` | POST | Archive |
| `/v1/code/sessions/{id}/mark_read` | POST | Mark read |
| `/v1/code/sessions/{id}/client/presence` | POST | Report presence |
| `/v1/code/sessions/{id}/bridge` | POST | Worker handshake → `{worker_jwt, expires_in, api_base_url, worker_epoch}` |
| `/v1/code/sessions/{id}/worker/web-fetch` | (proxy) | WebFetch executed by the cloud worker (`:390731`) |
| `/v1/code/sessions/{id}/worker/web-search` | (proxy) | **NEW** WebSearch executed by the cloud worker (`:426238`) |

### Self-hosted worker bridge
The worker registers against the `api_base_url` returned by the bridge handshake, then runs a control
loop over relative `/worker/*` paths:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/worker/register` | POST | Register worker → `{worker_epoch, …}` (`:568269`) |
| `/worker/events`, `/worker/events/delivery` | POST | Push work / delivery events (`:621992, :622052`) |
| `/worker/internal-events` | GET / POST | Internal event poll / push (`:622028, :622372`) |
| `/worker/heartbeat` | POST | Lease heartbeat / `worker_epoch` (`:622276`) |
| `wss://bridge.claudeusercontent.com` (`bridge-staging.` w/ `USE_STAGING_OAUTH`) | WS | Worker bridge socket (`:606762`) |

Bridge requests carry `X-Trusted-Device-Token` when present (`:567412, :297738`). Allow-listed bridge
hosts: `{bridge.claudeusercontent.com, bridge-staging.claudeusercontent.com}` (`:143387`).

---

## 4. First-party CLI surfaces (NEW in 2.1.197)

Called by the CLI via the authenticated first-party client (`ks`/`fo`, `BASE_API_URL`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/ultrareview/preflight` | GET | Cloud-code-review preflight; `auth:"teleport-org"`, 5 s timeout. Reasons gate it off: `essential-traffic-only`, `data-residency`, `no-auth` (`cli.beauty.js:535178`) |
| `/v1/design/mcp` | (MCP) | Built-in first-party **"Claude Design" MCP server** (`uit="claude_design"`, `dki`, `:136830-136832`). Staging `api-staging.anthropic.com/v1/design/mcp`. On the FIRST_PARTY_MCP allow-list; OAT auto-attaches |
| `/api/frame/deploy/init` | POST | Begin a "frame" (web-artifact) deploy (`:406109`) |
| `/api/frame/deploy/complete` | POST | Finalize a signed-lane deploy (`:406274`) |
| `/api/frame/deploy/direct` | POST | Direct/inline deploy (`:406336`) |
| `/api/frame/track` | POST | Frame analytics/telemetry (`:406304`) |
| `/api/frame/{id}?via=model_read` | GET | Read frame metadata for the model (`:406473`) |
| `/api/oauth/validate` | POST (Bearer) | Validate an OAuth access token (`:95103`) |

Deployed frames are served from `{slug}.frame.claudeusercontent.com` (`:406534`); the host pattern
`^https://{slug}.frame.(staging.)?claudeusercontent.com` is allow-listed at `:143412`.

---

## 5. OAuth / Auth / Identity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `platform.claude.com/oauth/authorize` | GET | Console authorize (`CONSOLE_AUTHORIZE_URL`) |
| `claude.com/cai/oauth/authorize` | GET | Claude.ai (Pro/Max) authorize (`:40763`) |
| `platform.claude.com/v1/oauth/token` | POST | Token exchange + refresh (`TOKEN_URL`, `:40765`) |
| `platform.claude.com/v1/oauth/token/revoke` | POST | Token revoke (`TOKEN_URL + "/revoke"`, `:95275`) |
| `platform.claude.com/v1/oauth/hello` | GET | OAuth health check (`:696319`) |
| `platform.claude.com/oauth/code/callback` | GET | Manual paste-the-code redirect (`:40770`) |
| `claude.ai/oauth/claude-code-client-metadata` | GET | Dynamic-client metadata doc (`:40754`) |
| `api.anthropic.com/api/oauth/claude_cli/create_api_key` | POST (Bearer) | Mint API key from OAuth → `raw_key` (`:40766`) |
| `api.anthropic.com/api/oauth/claude_cli/roles` | GET (Bearer) | Org/workspace roles (`:40767`) |
| `api.anthropic.com/api/oauth/profile` | GET (Bearer) | Account profile (`:95085`) |
| `api.anthropic.com/api/oauth/validate` | POST (Bearer) | **NEW** Token validation (`:95103`) |
| `api.anthropic.com/api/oauth/usage` | GET | Usage / rate-limit tier (`ks.get`, `:232244`) |
| `api.anthropic.com/api/claude_cli_profile` | GET (x-api-key) | Profile via API key (`anthropic-beta: oauth-2025-04-20`, `:95064`) |
| `api.anthropic.com/api/auth/trusted_devices` | POST (Bearer) | Trusted-Device enrollment (`:298974`) |

### OAuth config (`cli.beauty.js:40694-40777`)

- **Client IDs:** prod `9d1c250a-e61b-44d9-88ed-5944d1962f5e` (`:40771`); local/staging
  `22422756-60c9-4084-8eb7-27705fd5cf9a` (`:40704`). Overridable via `CLAUDE_CODE_OAUTH_CLIENT_ID`.
  **Unchanged** vs 2.1.169.
- **PKCE S256**, beta header `oauth-2025-04-20`, grant types `authorization_code` / `refresh_token`.
- **Login methods:** `claudeai` | `console` | `gateway` (Cloud-gateway OIDC device flow).
- **Custom OAuth allow-list (`jpn`, `:40777`):** `beacon.claude-ai.staging.ant.dev`,
  `claude.fedstart.com`, `claude-staging.fedstart.com`. **Unchanged.**

**Scopes** (`cli.beauty.js:40750-40759`):

| Set | Symbol | Scopes |
|-----|--------|--------|
| Default request | `Zae` | `user:profile`, `user:inference`, `user:sessions:claude_code`, `user:mcp_servers`, `user:file_upload` |
| API-key minting | `wys` | `org:create_api_key`, `user:profile` |
| Design (NEW) | `ele` | `user:design:read`, `user:design:write` |
| Design + Projects (NEW) | `Cys` | `…ele`, `user:projects:read`, `user:projects:write` |
| Inference-only | — | `user:inference` (`:134115`) |

The design scopes are added to the claude.ai login on demand for the Design MCP connector
("Added user:design:read and user:design:write to your claude.ai login", `:281790`). The design OAuth
token is stored separately in config as `designOauth` (`:430507, :430521`), distinct from
`claudeAiOauth` / `trustedDeviceToken`.

### Trusted Devices (`cli.beauty.js:298974`, `:299015`)

`POST /api/auth/trusted_devices` returns `{device_token, device_id}`; the token is persisted to config
and sent as **`X-Trusted-Device-Token`** on bridge/session/frame/CCR calls (`:297738, :358458, :361591,
:567412, :623109`). Gated by org policy `require_trusted_devices` (`N5t`, `:299015`).

---

## 6. Telemetry & Feature Flags

| Endpoint | Host | Purpose |
|----------|------|---------|
| `/api/event_logging/v2/batch` | `api.anthropic.com` (`api-staging.` when `ANTHROPIC_BASE_URL`=staging) | Primary first-party batched telemetry. `maxBatchSize 200`, `maxAttempts 8`, backoff (`cli.beauty.js:144252-144253`) |
| `/api/v2/logs` | `http-intake.logs.us5.datadoghq.com` | Datadog us5 mirror; OFF by default (`tengu_log_datadog_events`); ddsource `pubea5604404508cdd34afb69e6f42a05bc` (`:606713-606714`) — **token unchanged** |
| (flag CDN) | `cdn.growthbook.io` | GrowthBook flags; clientKey `sdk-zAZezfDKGoZuXXKe` (`:40454`) — **unchanged**. Disable via `DISABLE_GROWTHBOOK` |
| `${BETA_TRACING_ENDPOINT}/v1/traces`, `…/v1/logs` | (env-configured OTLP) | **NEW** OpenTelemetry OTLP beta-tracing exporter, wired only when `BETA_TRACING_ENDPOINT` is set (`:337658-337669`). NOT an Anthropic host |

---

## 7. First-party config / connectivity / org

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hello` | GET | Connectivity preflight (paired w/ `/v1/oauth/hello`, `:571464, :696319`) |
| `/api/web/domain_info?domain=` | GET | Domain reputation lookup for WebFetch (`:405696`) |
| `/api/claude_cli_feedback` | POST | `/feedback` report (`ks.post`, `:478910`) |
| `/api/claude_code/metrics` | POST | Metrics reporting (`:306706`) |
| `/api/claude_code/organizations/metrics_enabled` | GET | Org metrics opt-in (`ks.get`, `:306631`) |
| `/api/organization/claude_code_first_token_date` | GET | Org first-token date (`ks.get`, `:338556`) |
| `/api/organizations/:orgUUID/claude_code/onboarding[/{id}]` | GET/POST/PUT/DELETE | Org onboarding records (`:434330-434352`) |

---

## 8. Provider base URLs

Selected by `yr()` (`cli.beauty.js:94637`) from `CLAUDE_CODE_USE_*` env vars. `yr()` checks the
**gateway** plane first (`Lm()` → `"gateway"`), then the Bedrock/Foundry/AnthropicAws/Mantle/Vertex/
firstParty ternary.

| Plane | Base URL | Env / override |
|-------|----------|----------------|
| firstParty | `https://api.anthropic.com` | (default), `ANTHROPIC_BASE_URL` |
| bedrock | `https://bedrock-runtime.{region}.amazonaws.com` | `CLAUDE_CODE_USE_BEDROCK` / `ANTHROPIC_BEDROCK_BASE_URL` |
| mantle | `https://bedrock-mantle.{region}.api.aws/anthropic` | `CLAUDE_CODE_USE_MANTLE` / `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` |
| anthropicAws | `https://aws-external-anthropic.{region}.api.aws` | `CLAUDE_CODE_USE_ANTHROPIC_AWS` / `ANTHROPIC_AWS_BASE_URL` |
| vertex | `https://{region}-aiplatform.googleapis.com/v1` | `CLAUDE_CODE_USE_VERTEX` / `ANTHROPIC_VERTEX_BASE_URL` + `…PROJECT_ID` |
| foundry | `https://{resource}.services.ai.azure.com/anthropic` | `CLAUDE_CODE_USE_FOUNDRY` / `ANTHROPIC_FOUNDRY_RESOURCE` |
| gateway | (customer Cloud-gateway URL, OIDC device flow) | `CLAUDE_CODE_USE_GATEWAY` / `forceLoginGatewayUrl` |

Plane gates: OAuth-capable `ud()` = firstParty|anthropicAws|gateway (`:94672`); a second gate `S1()` =
firstParty|anthropicAws|foundry|mantle (`:94676`); CCR/remote = firstParty|gateway. Telemetry and the
`/v1/code/sessions` cloud surface are dropped on non-first-party-style planes.

---

## 9. MCP / connectors

| Endpoint | Purpose |
|----------|---------|
| `mcp-proxy.anthropic.com` (`MCP_PROXY_URL`, `:40774`) | Anthropic-hosted MCP proxy |
| `api.anthropic.com/v1/design/mcp` (`:136831`) | First-party **Claude Design** MCP connector (NEW) |
| `slack.mcp.claude.com/mcp` (`:654560`) | First-party Slack MCP connector |
| `mcp.notion.com`, `mcp.linear.app`, `mcp.figma.com`, `api.githubcopilot.com/mcp/`, `mcp.asana.com/sse`, `api.datadoghq.com/mcp`, `mcp.sentry.dev/mcp` | Documented 3rd-party MCP servers |

---

## 10. claude.ai web routes (browser-opened)

| URL | Purpose |
|-----|---------|
| `claude.ai/code` | Claude Code on the web |
| `claude.ai/code/routines`, `/code/routines/{ROUTINE_ID}` (`:372480, :664992`) | Scheduled cloud agents (routines) |
| `claude.ai/code/onboarding?magic=env-setup` / `?magic=github-app-setup` (`:361313, :665079`) | Cloud env / GitHub-app onboarding |
| `claude.ai/design` | Claude Design web app (`/design-sync`, `/design-login` targets) |
| `claude.ai/upgrade/max`, `/settings/usage`, `/admin-settings/usage`, `/settings/data-privacy-controls`, `/customize/connectors`, `/create/team`, `/chrome`, `/download` | Settings / billing / connectors / misc |
| `platform.claude.com/buy_credits`, `/settings/keys`, `/settings/billing`, `/workspaces/default/sessions` | Console |
| `github.com/apps/claude[/installations/new]` | GitHub App install |
| `slack.com/marketplace/A08SF47R6P4-claude` | Slack app listing |

---

## 11. Distribution / docs / status / gov

| URL | Purpose |
|-----|---------|
| `downloads.claude.ai/claude-code-releases` (`:339585, :340359`) | Binary distribution |
| `downloads.claude.ai/claude-code-releases/plugins/claude-plugins-official` (`:469868`) | Official plugin distribution (now on `downloads.claude.ai`) |
| `code.claude.com/docs/en/claude_code_docs_map.md` | Docs page index/map |
| `code.claude.com/docs/en/ultrareview` (`:374648`) | Ultrareview docs |
| `github.com/anthropics/claude-code/blob/main/CHANGELOG.md` | Changelog |
| `status.claude.com` / `status.anthropic.com` | Service status |
| `claude.fedstart.com` / `claude-staging.fedstart.com` | FedRAMP gov instances |
| `api-staging.anthropic.com`, `beacon.claude-ai.staging.ant.dev` | Staging |

---

## What's new / changed vs 2.1.169

**Added:**
- Managed-Agents **Vaults** (`/v1/vaults` + credentials + `mcp_oauth_validate`) and **Memory Stores**
  (`/v1/memory_stores` + memories + memory_versions/redact) SDK client resources.
- Explicit **Skills version** sub-endpoints (`/v1/skills/{id}/versions[/{v}]`).
- CCR **`…/worker/web-search`** proxy (alongside the existing `…/worker/web-fetch`).
- New first-party CLI surfaces: **`/v1/ultrareview/preflight`**, **`/v1/design/mcp`**
  (Claude Design MCP), **`/api/frame/deploy/{init,complete,direct}`** + **`/api/frame/track`** +
  **`/api/frame/{id}`**, **`/api/oauth/validate`**.
- New OAuth scopes **`user:design:read|write`**, **`user:projects:read|write`**; separate `designOauth`
  config token.
- OpenTelemetry OTLP **beta-tracing exporter** (`/v1/traces`, `/v1/logs` on `BETA_TRACING_ENDPOINT`).
- New `frame.claudeusercontent.com` artifact-hosting domain (allow-listed).

**Changed:**
- OAuth-capable plane gate `ud()` now firstParty | anthropicAws | gateway (was first-party only).
- Plugin distribution moved fully onto `downloads.claude.ai/claude-code-releases/plugins/…`.

**Unchanged (notable — no churn this build):**
- All `anthropic-beta` header dates: `managed-agents-2026-04-01`, `files-api-2025-04-14`,
  `skills-2025-10-02`, `user-profiles-2026-03-24`, `token-counting-2024-11-01`, `oauth-2025-04-20`.
- OAuth client IDs, token/authorize/revoke URLs, custom-OAuth allow-list.
- Datadog us5 ddsource token, GrowthBook clientKey, `/api/event_logging/v2/batch` shape.

## Uncertainties / caveats

- **`/v1/deployments`, `/v1/deployment_runs`, `/v1/sessions/{id}/threads*`** are documented in the
  bundled managed-agents skill reference (`GRc`, `:669975`) but have **no request-builder code** in the
  bundled SDK — documentation-only in 2.1.197. The `_facts.md` "+20 path templates" count includes
  these doc-only paths.
- The `_facts.md` candidate templates **`/v1/token`** and **`/v1/groups`** are **false positives** from
  vendored SDK code: `/v1/token` is Google STS / AWS-SDK (`:84038, :129732`), `/v1/groups` is the
  Google Admin Directory API (`:721972`) — neither is a Claude Code surface. **`/v1/metrics`** appears
  only in doc/skill strings (`:725031`), not in a live exporter call.
- The self-hosted worker `/worker/*` paths are relative to the bridge-returned `api_base_url`; exact
  request bodies for a few are reconstructed from call sites, not full builders.
