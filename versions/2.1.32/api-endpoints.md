# Internal API Endpoints

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/api-endpoints.yaml](data/api-endpoints.yaml) for the structured dataset.

## Production API (`api.anthropic.com`)

| Endpoint | Purpose |
|----------|---------|
| `/api/hello` | Health check / connectivity test |
| `/api/claude_cli_feedback` | Feedback submission |
| `/api/claude_code/link_vcs_account` | GitHub account linking |
| `/api/claude_code/metrics` | Metrics reporting |
| `/api/claude_code/organizations/metrics_enabled` | Org metrics opt-in check |
| `/api/oauth/claude_cli/create_api_key` | Create API key via OAuth |
| `/api/oauth/claude_cli/roles` | Fetch OAuth user roles |
| `/api/organization/` | Organization info |
| `/api/web/domain_info` | Domain info |
| `/api/claude_cli_profile` | User profile |
| `/api/oauth/profile` | OAuth profile |
| `/api/oauth/usage` | Usage data |

## OAuth

| Endpoint | Purpose |
|----------|---------|
| `platform.claude.com/oauth/authorize` | Console OAuth |
| `claude.ai/oauth/authorize` | Claude.ai OAuth |
| `platform.claude.com/v1/oauth/token` | Token exchange |
| `platform.claude.com/v1/oauth/hello` | OAuth health check |

**OAuth Client IDs:**
- Production: `9d1c250a-e61b-44d9-88ed-5944d1962f5e`
- Staging: `22422756-60c9-4084-8eb7-27705fd5cf9a`

## Other

| Endpoint | Purpose |
|----------|---------|
| `api-staging.anthropic.com` | Staging API |
| `mcp-proxy.anthropic.com/v1/mcp/{server_id}` | MCP server proxy |
| `storage.googleapis.com/claude-code-dist-*/claude-code-releases` | Binary distribution (Google Cloud Storage) |
| `claude.fedstart.com` | FedRAMP government instance |
| `beacon.claude-ai.staging.ant.dev` | Staging telemetry beacon |
