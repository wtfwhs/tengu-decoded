# Internal API Endpoints

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.3.14
>
> See [data/api-endpoints.yaml](data/api-endpoints.yaml) for the structured dataset.

The headline change vs 2.1.32 is the arrival of an entire **cloud backend**. Two distinct
new surfaces appear, served from `api.anthropic.com`:

1. **Managed-Agents SDK** — `/v1/agents`, `/v1/sessions`, `/v1/environments`, `/v1/files`,
   `/v1/skills`, `/v1/user_profiles` (the bundled `@anthropic-ai/sdk` `client.beta.*` namespace).
2. **Claude Code on the web / Remote Control (CCR)** — `/v1/code/sessions/...`, called by the
   CLI itself for teleport/handoff, plus a self-hosted **worker bridge** (`/v1/environments/bridge`,
   `/v1/code/sessions/{id}/bridge`, `wss://bridge.claudeusercontent.com`).

Both cloud surfaces are gated to the **first-party Anthropic provider only** (`o_()`); telemetry
and these endpoints are dropped on Bedrock/Vertex/Foundry/Mantle.

---

## 1. Inference (Messages API)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/messages` (`?beta=true`) | POST | Primary inference. Body paths allow-listed in `XO_` = `{/v1/complete, /v1/messages, /v1/messages?beta=true}` (`cli.beauty.js:105854`) |
| `/v1/messages/count_tokens` | POST | Token counting (beta `token-counting-2024-11-01`) |
| `/v1/messages/batches` | POST/GET | Message Batches |
| `/v1/complete` | POST | Legacy completions (allow-listed, unused) |
| `/v1/models`, `/v1/models/{id}` | GET | Model listing/metadata (e.g. `/v1/models/claude-opus-4-8`) |

Auth: `x-api-key` (API key) **or** `Authorization: Bearer` (OAuth). Header `anthropic-version: 2023-06-01`.

---

## 2. Cloud backend — Managed Agents SDK (NEW)

All carry `?beta=true` and an `anthropic-beta` header. Default beta `managed-agents-2026-04-01`;
files use `files-api-2025-04-14`, skills `skills-2025-10-02`, user profiles `user-profiles-2026-03-24`.

### Agents (`cli.beauty.js:6166-6258`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/agents` | POST / GET | Create / list agent definitions |
| `/v1/agents/{id}` | GET / POST | Retrieve / update |
| `/v1/agents/{id}/archive` | POST | Archive |
| `/v1/agents/{id}/versions` | GET | List versions |

### Sessions (`cli.beauty.js:7665-7826`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/sessions` | POST / GET | Create / list sessions |
| `/v1/sessions/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/sessions/{id}/archive` | POST | Archive |
| `/v1/sessions/{id}/events` | GET / POST | List / send events (paginated `?page=`) |
| `/v1/sessions/{id}/events/stream` | GET (SSE) | Stream events live |
| `/v1/sessions/{id}/resources[/{rid}]` | GET/POST/DELETE | Session resources |

Event types over this stream: `agent.custom_tool_use`, `user.custom_tool_result`,
`user.tool_confirmation`, `session.status_idle/running`, `session.error`, etc.

### Environments (`cli.beauty.js:5865-5936`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/environments` | POST / GET | Create / list cloud sandboxes |
| `/v1/environments/{id}` | GET / POST / DELETE | Retrieve / update / delete |
| `/v1/environments/{id}/archive` | POST | Archive |

### Files (`cli.beauty.js:5985-6054`)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/files` (`?scope_id=$SESSION_ID`) | POST / GET | Upload / list |
| `/v1/files/{id}` | GET / DELETE | Metadata / delete |
| `/v1/files/{id}/content` | GET (`Accept: application/binary`) | Download binary |

### Skills & User Profiles
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/skills`, `/v1/skills/{id}[/versions[/{v}]]` | POST/GET/DELETE | Custom skill CRUD + versions |
| `/v1/user_profiles[/{id}[/enrollment_url]]` | POST/GET/DELETE | Managed user profiles + enrollment URL |

Webhooks: managed-agent events are HMAC-signed; the SDK's `client.beta.webhooks.unwrap()` verifies
them using `ANTHROPIC_WEBHOOK_SIGNING_KEY` (`whsec_...`) and rejects payloads older than ~5 min.

---

## 3. Cloud backend — Claude Code on the web / Remote Control (NEW)

Driven by the **CLI itself** (not the SDK namespace). Headers via `_D()` (`cli.beauty.js:138520`):
`Authorization: Bearer <oauth>`, `anthropic-version: 2023-06-01`, `anthropic-client-platform: i2()`.
First-party only.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/code/sessions` | GET / POST | List / create teleport (remote) sessions |
| `/v1/code/sessions/{id}` | GET | Retrieve session |
| `/v1/code/sessions/{id}/events` | POST / GET | Send/list events `{events:[{payload}]}` |
| `/v1/code/sessions/{id}/events/stream` | GET (SSE) | Stream events |
| `/v1/code/sessions/{id}/teleport-events` | POST | Terminal→web handoff events |
| `/v1/code/sessions/{id}/archive` | POST | Archive |
| `/v1/code/sessions/{id}/mark_read` | POST | Mark read |
| `/v1/code/sessions/{id}/client/presence` | POST | Report presence |
| `/v1/code/sessions/{id}/bridge` | POST | Worker handshake → `{worker_jwt, expires_in, api_base_url, worker_epoch}` |
| `/v1/code/sessions/{id}/worker/web-fetch` | (proxy) | WebFetch executed by the cloud worker |

### Self-hosted worker bridge
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/environments/bridge` | POST / DELETE | Register/deregister worker as an environment → `environment_id` |
| `/v1/environments/{id}/bridge/reconnect` | POST | Reconnect a session (`{session_id}`) |
| `/v1/environments/{envId}/work/poll` | GET | Long-poll for work |
| `/v1/environments/{envId}/work/{workId}/ack \| /stop \| /heartbeat` | POST | Ack / stop / lease-extend |
| `wss://bridge.claudeusercontent.com` (`bridge-staging.` w/ `USE_STAGING_OAUTH`) | WS | Worker bridge socket |

Register body: `{machine_name, directory, branch, git_repo_url, max_sessions, metadata.worker_type}`
(`cli.beauty.js:522441`). Bridge requests carry `X-Trusted-Device-Token` when present.

---

## 4. OAuth / Auth / Identity

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `platform.claude.com/oauth/authorize` | GET | Console authorize |
| `claude.com/cai/oauth/authorize` | GET | Claude.ai (Pro/Max) authorize — **CHANGED** (was `claude.ai/oauth/authorize`) |
| `platform.claude.com/v1/oauth/token` | POST | Token exchange + refresh |
| `platform.claude.com/v1/oauth/token/revoke` | POST | Token revoke |
| `platform.claude.com/v1/oauth/hello` | GET | OAuth health check |
| `platform.claude.com/oauth/code/callback` | GET | Manual paste-the-code redirect |
| `claude.ai/oauth/claude-code-client-metadata` | GET | Dynamic-client metadata doc |
| `api.anthropic.com/api/oauth/claude_cli/create_api_key` | POST (Bearer) | Mint API key from OAuth token → `raw_key` |
| `api.anthropic.com/api/oauth/claude_cli/roles` | GET (Bearer) | Org/workspace roles |
| `api.anthropic.com/api/oauth/profile` | GET (Bearer) | Account profile (billing, subscription, trial, seatTier) |
| `api.anthropic.com/api/oauth/usage` | GET | Usage / rate-limit tier |
| `api.anthropic.com/api/claude_cli_profile` | GET (x-api-key) | Profile via API key (`anthropic-beta: oauth-2025-04-20`, param `account_uuid`) |
| `api.anthropic.com/api/auth/trusted_devices` | POST (Bearer) | **NEW** Trusted-Device enrollment |

### OAuth flow details (`cli.beauty.js:93568-93736`)

- **Client IDs:** prod `9d1c250a-e61b-44d9-88ed-5944d1962f5e`; local/staging `22422756-60c9-4084-8eb7-27705fd5cf9a`.
  Overridable via `CLAUDE_CODE_OAUTH_CLIENT_ID`.
- **PKCE S256.** Authorize params: `code=true`, `client_id`, `response_type=code`, `redirect_uri`
  (`http://localhost:{port}/callback` or the manual redirect), `scope`, `code_challenge`,
  `code_challenge_method=S256`, `state`, optional `orgUUID`, `login_hint`, `login_method`.
- **`claude_cli` flow:** token exchange POSTs `{grant_type:authorization_code, code, redirect_uri,
  client_id, code_verifier, state, [expires_in]}` to `TOKEN_URL`; refresh POSTs
  `{grant_type:refresh_token, refresh_token, client_id, scope}`. On success the refresh response
  hydrates `oauthAccount` (displayName, billingType, subscription/trial fields, `seatTier`).
- **API-key minting:** `POST /api/oauth/claude_cli/create_api_key` with `Bearer` → `raw_key`.
- **Roles:** `GET /api/oauth/claude_cli/roles` → `{organization_role, workspace_role, organization_name}`.
- **Login methods:** `claudeai` | `console` | `gateway` (the **`gateway`** option is a NEW Cloud-gateway OIDC device flow).
- **Custom OAuth (`CLAUDE_CODE_CUSTOM_OAUTH_URL`)** must be one of the allow-list `Dn$`:
  `beacon.claude-ai.staging.ant.dev`, `claude.fedstart.com`, `claude-staging.fedstart.com`.

**Scopes** (`CLAUDE_AI_OAUTH_SCOPES` = `XQH`, `cli.beauty.js:40303`):

| Set | Scopes |
|-----|--------|
| Default request (`XQH`) | `user:profile`, `user:inference`, `user:sessions:claude_code` *(new)*, `user:mcp_servers` *(new)*, `user:file_upload` *(new)* |
| API-key minting (`DRq`) | `org:create_api_key`, `user:profile` |
| Inference-only login | `user:inference` |

OAuth beta header: `oauth-2025-04-20`.

### Trusted Devices (NEW — `cli.beauty.js:288409`)

`POST /api/auth/trusted_devices` with `{display_name:"Claude Code on <hostname> · linux"}` returns
`{device_token, device_id}`. The `device_token` is persisted to config (`trustedDeviceToken`) and
sent on bridge/session calls as **`X-Trusted-Device-Token`**. Enrollment is gated by the org policy
`require_trusted_devices` and tied to the Remote Control feature. (Cross-link: device-fingerprinting —
the per-machine `device_token` is a server-issued credential, distinct from the random `userID`.)

---

## 5. Telemetry & Feature Flags

| Endpoint | Host | Purpose |
|----------|------|---------|
| `/api/event_logging/v2/batch` | `api.anthropic.com` (`api-staging.` when `ANTHROPIC_BASE_URL` = staging) | Primary first-party batched telemetry. ON for first-party auth. `maxBatchSize 200`, ≤8 attempts w/ backoff (`cli.beauty.js:139534`) |
| `/api/v2/logs` | `http-intake.logs.us5.datadoghq.com` | Datadog us5 allow-listed mirror. OFF by default (flag `tengu_log_datadog_events`); ddsource token `pubea5604404508cdd34afb69e6f42a05bc` (`cli.beauty.js:141869`) |
| (flag CDN) | `cdn.growthbook.io` | GrowthBook feature flags. clientKey `sdk-zAZezfDKGoZuXXKe`. Disable via `DISABLE_GROWTHBOOK` (`cli.beauty.js:39322,39961`) |

The legacy singular **`/api/event` is GONE** (present in 2.1.32) — only `/api/event_logging/v2/batch`
remains. **Segment removed; no Sentry.**

---

## 6. First-party config / connectivity / org

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/hello` | GET | Connectivity preflight (paired with `/v1/oauth/hello`, `cli.beauty.js:642264`) |
| `/api/web/domain_info?domain=` | GET | Domain reputation lookup for WebFetch |
| `/api/claude_cli_feedback` | POST | `/feedback` (description + transcript + sanitized errors + `surface∈{cli,ccd,ccr,ide,cowork}`) |
| `/api/claude_code/metrics` | POST | Metrics reporting |
| `/api/claude_code/organizations/metrics_enabled` | GET | Org metrics opt-in check |
| `/api/organization/claude_code_first_token_date` | GET | Org first-token date |
| `/api/organizations/:orgUUID/claude_code/onboarding` | GET/POST/PUT/DELETE | Org onboarding records |

---

## 7. Provider base URLs

Selected by `Mq()` from `CLAUDE_CODE_USE_*` env vars (`cli.beauty.js:93073`):

| Plane | Base URL | Env / override |
|-------|----------|----------------|
| firstParty | `https://api.anthropic.com` | (default), `ANTHROPIC_BASE_URL` |
| bedrock | `https://bedrock-runtime.{region}.amazonaws.com` (control `https://bedrock.{region}.amazonaws.com`) | `CLAUDE_CODE_USE_BEDROCK` / `ANTHROPIC_BEDROCK_BASE_URL` |
| mantle | `https://bedrock-mantle.{region}.api.aws/anthropic` | `CLAUDE_CODE_USE_MANTLE` / `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` — Claude *in* Amazon Bedrock; model ids carry `anthropic.` prefix |
| anthropicAws | `https://aws-external-anthropic.{region}.api.aws` | `CLAUDE_CODE_USE_ANTHROPIC_AWS` / `ANTHROPIC_AWS_BASE_URL` — Claude Platform on AWS; SigV4 service `aws-external-anthropic`; bare model ids |
| vertex | `https://{region}-aiplatform.googleapis.com/v1` (global `aiplatform.googleapis.com`; rep `aiplatform.{region}.rep.googleapis.com`) | `CLAUDE_CODE_USE_VERTEX` / `ANTHROPIC_VERTEX_BASE_URL` + `ANTHROPIC_VERTEX_PROJECT_ID` |
| foundry **(new)** | `https://{resource}.services.ai.azure.com/anthropic` | `CLAUDE_CODE_USE_FOUNDRY` / `ANTHROPIC_FOUNDRY_RESOURCE` or `ANTHROPIC_FOUNDRY_BASE_URL` |
| gateway **(new)** | (customer Cloud-gateway URL, OIDC device flow) | `CLAUDE_CODE_USE_GATEWAY` / `forceLoginGatewayUrl` |

Telemetry and cloud (`/v1/agents`, `/v1/sessions`, `/v1/code/sessions`) are dropped on all non-first-party planes.

---

## 8. MCP / connectors

| Endpoint | Purpose |
|----------|---------|
| `mcp-proxy.anthropic.com/v1/mcp/{server_id}` | Anthropic-hosted MCP proxy (local dev: `localhost:8205/v1/toolbox/shttp/mcp/{server_id}`) |
| `slack.mcp.claude.com/mcp` | First-party Slack MCP connector |
| `mcp.notion.com`, `mcp.linear.app`, `mcp.figma.com`, `api.githubcopilot.com/mcp/`, `mcp.asana.com/sse`, `api.datadoghq.com/mcp`, `mcp.sentry.dev/mcp` | Documented 3rd-party MCP servers |

---

## 9. claude.ai web routes (browser-opened)

| URL | Purpose |
|-----|---------|
| `claude.ai/code` | Claude Code on the web |
| `claude.ai/code/routines`, `/code/routines/{ROUTINE_ID}` **(new)** | Scheduled cloud agents (routines); `RemoteTrigger` registration target |
| `claude.ai/code/onboarding?magic=env-setup` / `?magic=github-app-setup` **(new)** | Cloud env / GitHub-app onboarding |
| `claude.ai/upgrade/max` | Upgrade to Max |
| `claude.ai/settings/usage`, `/admin-settings/usage` | Usage / credits |
| `claude.ai/settings/data-privacy-controls` | Privacy |
| `claude.ai/customize/connectors` | Connect MCPs |
| `claude.ai/create/team`, `/design`, `/chrome`, `/download` | Team, design, chrome ext, desktop |
| `platform.claude.com/buy_credits`, `/settings/keys`, `/settings/billing`, `/workspaces/default/sessions` | Console |
| `github.com/apps/claude[/installations/new]` | GitHub App install (replaces 2.1.32 `link_vcs_account`) |
| `slack.com/marketplace/A08SF47R6P4-claude` | Slack app listing |

---

## 10. Distribution / docs / status / gov

| URL | Purpose |
|-----|---------|
| `downloads.claude.ai/claude-code-releases` | Binary + plugin distribution (**replaces** 2.1.32 GCS path; plugin-stats still on `storage.googleapis.com/claude-code-dist-86c565f3-…`) |
| `code.claude.com/docs/en/claude_code_docs_map.md` | Docs page index/map |
| `github.com/anthropics/claude-code/blob/main/CHANGELOG.md` (raw: `raw.githubusercontent.com/.../refs/heads/main/CHANGELOG.md`) | Changelog |
| `status.claude.com` / `status.anthropic.com` | Service status |
| `claude.fedstart.com` / `claude-staging.fedstart.com` **(staging new)** | FedRAMP gov instances |
| `api-staging.anthropic.com`, `beacon.claude-ai.staging.ant.dev`, `claude-ai.staging.ant.dev` | Staging |

---

## What's new vs 2.1.32

**Added — the cloud backend is the marquee change:**
- Managed-Agents SDK surface: `/v1/agents`, `/v1/sessions` (+`/events`, `/events/stream`,
  `/resources`), `/v1/environments`, `/v1/files` (+`/content`), `/v1/skills`, `/v1/user_profiles`,
  all behind `?beta=true` + `anthropic-beta: managed-agents-2026-04-01` (or files/skills/profiles betas).
- Claude-Code-on-the-web / Remote-Control surface: `/v1/code/sessions/...` (teleport, events,
  presence, mark_read), self-hosted worker bridge (`/v1/environments/bridge`, `work/poll|ack|stop|heartbeat`,
  `/v1/code/sessions/{id}/bridge`), worker WebFetch proxy, and `wss://bridge.claudeusercontent.com`.
- `/api/auth/trusted_devices` enrollment + `X-Trusted-Device-Token`.
- Webhooks via `ANTHROPIC_WEBHOOK_SIGNING_KEY`.
- New OAuth scopes (`user:sessions:claude_code`, `user:mcp_servers`, `user:file_upload`) and the
  `gateway` login method (Cloud-gateway OIDC device flow).
- Foundry (Azure) and gateway provider planes.
- `claude.ai/code/routines` + `code/onboarding` deep links.

**Changed:**
- Claude.ai OAuth authorize URL moved `claude.ai/oauth/authorize` → `claude.com/cai/oauth/authorize`.
- Binary distribution moved from `storage.googleapis.com/claude-code-dist-*` → `downloads.claude.ai/claude-code-releases`.
- Telemetry: `/api/event_logging/v2/batch` is now sole first-party sink; Datadog us5 token rotated; **Segment removed**.

**Removed:**
- Legacy singular `/api/event` telemetry endpoint.
- `/api/claude_code/link_vcs_account` (GitHub linking now via the `github.com/apps/claude` install flow).

## Uncertainties

- The `22422756-…` client id appears only in the **local-dev** OAuth config (`PM1()`); a dedicated
  *staging* config object (`LM1`) exists but is `void 0` in this build and falls back to prod (`MRq`),
  so I labelled it `local_dev` rather than `staging`. 2.1.32 called the same id "staging".
- Self-hosted worker bridge sub-paths (`work/poll`, `ack`, `stop`, `heartbeat`, `reconnect`) are
  reconstructed from log-format strings (`[bridge:api] …`) and call sites, not from full request
  builders, so exact query/body shapes for a few are partial.
- No standalone Console/Desktop OAuth client ids were found beyond prod + local-dev + the
  `CLAUDE_CODE_OAUTH_CLIENT_ID` override.
