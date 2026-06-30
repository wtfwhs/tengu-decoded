# Environment Variables

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/environment-vars.yaml](data/environment-vars.yaml) for the structured dataset.

## Core Configuration

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Primary API key |
| `ANTHROPIC_BASE_URL` | Custom API base URL |
| `ANTHROPIC_MODEL` | Override model selection |
| `ANTHROPIC_BETAS` | Comma-separated API beta flags |
| `CLAUDE_CODE_API_BASE_URL` | Custom API base URL (alternate) |

## Cloud Providers

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_USE_BEDROCK` | Enable AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | Enable Google Vertex |
| `CLAUDE_CODE_USE_FOUNDRY` | Enable Microsoft Foundry |
| `ANTHROPIC_BEDROCK_BASE_URL` | Bedrock base URL |
| `ANTHROPIC_VERTEX_BASE_URL` | Vertex base URL |
| `ANTHROPIC_FOUNDRY_BASE_URL` | Foundry base URL |

## Model Overrides

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override Opus model |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override Sonnet model |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override Haiku model |
| `ANTHROPIC_SMALL_FAST_MODEL` | Override small/fast model |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Override subagent model |

## Agent Teams

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | Enable agent teams (client-side) |
| `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` | Override teammate limit (1-10) |
| `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` | Override explore agent count (1-10) |
| `CLAUDE_CODE_TEAM_NAME` | Team name |
| `CLAUDE_CODE_AGENT_NAME` | Agent name |

## Behaviour Controls

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_EFFORT_LEVEL` | Reasoning effort level |
| `CLAUDE_CODE_MAX_OUTPUT_TOKENS` | Max output tokens |
| `CLAUDE_CODE_MAX_RETRIES` | Max API retries |
| `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` | Tool execution concurrency |
| `CLAUDE_CODE_AUTOCOMPACT_PCT_OVERRIDE` | Auto-compact threshold |
| `CLAUDE_CODE_SIMPLE` | Minimal system prompt mode |
| `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` | Override rate limit blocking |

## Experimental / Hidden

| Variable | Purpose |
|----------|---------|
| `ENABLE_BTW` | Enable `/btw` side-question feature |
| `ENABLE_LSP_TOOL` | LSP integration tool |
| `ENABLE_EXPERIMENTAL_SHELL_BUILTINS` | Experimental shell builtins |
| `ENABLE_SESSION_BACKGROUNDING` | Session backgrounding |
| `ENABLE_SESSION_PERSISTENCE` | Session persistence |
| `ENABLE_SUBAGENT_ZOOM` | Subagent zoom |
| `ENABLE_TENTATIVE_ERA` | Unknown experimental feature |
| `USE_API_CONTEXT_MANAGEMENT` | API-side context management (hardcoded `false`) |
| `CLAUDE_CODE_ADDITIONAL_PROTECTION` | Additional security protection |
| `CLAUDE_CODE_GLOB_HIDDEN` | Glob search hidden files |
| `CLAUDE_CODE_GLOB_NO_IGNORE` | Glob search gitignored files |
| `CLAUDE_CODE_FORCE_GLOBAL_CACHE` | Force global prompt caching |
| `CLAUDE_CODE_ATTRIBUTION_HEADER` | Override attribution header |
| `CLAUDE_CODE_ENTRYPOINT` | Entrypoint identifier |
| `FALLBACK_FOR_ALL_PRIMARY_MODELS` | Force model fallback |

## Disable Switches

| Variable | Purpose |
|----------|---------|
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY` | Disable auto memory |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | Disable file attachments |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | Disable background tasks |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | Disable CLAUDE.md loading |
| `CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK` | Disable command injection checks |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Disable experimental betas |
| `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY` | Disable feedback surveys |
| `CLAUDE_CODE_DISABLE_FILE_CHECKPOINTING` | Disable file checkpointing |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disable non-essential network |
| `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Disable terminal title changes |
