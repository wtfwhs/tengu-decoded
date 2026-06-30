# Architecture Deep Dive

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

## Context Compaction

Claude Code uses two compaction strategies to manage conversation context.

### Autocompact

**Trigger**: When used tokens exceed a threshold calculated from the context window.

The function `xbH()` computes the threshold:
- Takes the model's context window size (e.g., 200,000 tokens)
- Subtracts a reserved buffer (`cNA`)
- Can be overridden with `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` env var (percentage of context window)

When the threshold is hit, compaction runs automatically (`tengu_auto_compact_succeeded` event).

**Compaction prompt** (full conversation):

> Your task is to create a detailed summary of the conversation so far, paying close attention to the user's explicit requests and your previous actions.

**Compaction prompt** (incremental, when earlier context is retained):

> Your task is to create a detailed summary of the RECENT portion of the conversation -- the messages that follow earlier retained context. The earlier messages are being kept intact and do NOT need to be summarized. Focus your summary on what was discussed, learned, and accomplished in the recent messages only.

Both include: "IMPORTANT: Do NOT use any tools. You MUST respond with ONLY the summary block as your text output."

### Microcompact

A lighter compaction triggered by the system (`tengu_microcompact` event). Can be disabled with the `tengu_cache_plum_violet` kill switch flag.

Microcompact is tracked separately in the prompt cache system. When a microcompact occurs, the cache tracking system records it to distinguish microcompact-caused cache breaks from other causes.

## Prompt Cache Management

The system tracks prompt cache efficiency via `BHD()`:

- Monitors cache read tokens vs cache creation tokens
- Detects **cache breaks** when cache read drops >5% or >2000 tokens
- Logs cause: system prompt changed, tools changed, model changed, microcompact
- Writes diff output to `/tmp/claude/` for debugging
- Fires `tengu_prompt_cache_break` event with detailed cause metadata

Sources of prompt cache tracking: `repl_main_thread`, `sdk`, `agent:custom`, `agent:default`, `agent:builtin`.

## Session Memory (MEMORY.md)

Session memory is controlled by multiple flags working together:

| Flag | Purpose |
|------|---------|
| `tengu_session_memory` | Master enable for session memory |
| `tengu_sm_compact` | Enable memory compaction |
| `tengu_oboe` | Auto-memory via MEMORY.md |
| `tengu_sm_config` | Memory configuration |

Memory is stored in `MEMORY.md` files and loaded as a dynamic prompt block that refreshes each turn. The system includes budget management -- the model is instructed to condense the file to fit within a token budget, aggressively shortening oversized sections by removing less important details, merging related items, and summarizing older entries.

Memory compaction events track various states: `tengu_sm_compact_error`, `tengu_sm_compact_threshold_exceeded`, `tengu_sm_compact_resumed_session`.

The `memdir` system (`tengu_memdir_*` events) provides directory-level memory with file read/write/edit operations.

## MCP Architecture

### Server Lifecycle

MCP servers go through a defined lifecycle tracked by events:

1. **Start** (`tengu_mcp_start`) -- Server process initiated
2. **Connect** (`tengu_mcp_server_connection_succeeded` / `_failed`) -- Connection established
3. **Auth** (`tengu_mcp_server_needs_auth`) -- Authentication if required
4. **Tools loaded** (`tengu_mcp_tools_commands_loaded`) -- Tools registered
5. **Reconnect** -- Automatic with exponential backoff (2s base, 1.5x multiplier, max 30s, max 100 attempts)

### Transport

MCP supports multiple transports:
- **stdio** -- Standard I/O (default for local servers)
- **SSE** -- Server-Sent Events (for remote servers)
- **Streamable HTTP** -- HTTP-based transport
- **WebSocket bridge** -- For IDE integration

The MCP proxy endpoint (`mcp-proxy.anthropic.com/v1/mcp/{server_id}`) provides remote MCP server access.

### Plugin System

Plugins (MCP servers from the marketplace) have their own lifecycle:
- `tengu_plugin_installed` / `tengu_plugin_installed_cli`
- `tengu_plugin_disabled_cli` / `tengu_plugin_enabled_cli`
- `tengu_plugin_updated_cli` / `tengu_plugin_uninstalled_cli`
- `tengu_official_marketplace_auto_install` -- Auto-install from official marketplace

### Claude.ai MCP Integration

Claude.ai has its own MCP connector system (`tengu_claudeai_mcp_*`):
- Eligibility checking
- Auth flow (start, complete, clear)
- Toggle and reconnect
- Connector management

## Model Fallback and Provider Routing

### Provider Selection

Claude Code supports four providers:

| Provider | Env Var | Notes |
|----------|---------|-------|
| **Anthropic** (default) | -- | Direct API access |
| **AWS Bedrock** | `CLAUDE_CODE_USE_BEDROCK` | Filters certain betas |
| **Google Vertex** | `CLAUDE_CODE_USE_VERTEX` | Uses standard identity line |
| **Microsoft Foundry** | `CLAUDE_CODE_USE_FOUNDRY` | Adds specific beta flags |

The provider is determined by `nI()` and affects which API betas are included, which identity line is used in the system prompt, and whether certain features are available.

### Fallback Strategy

When the primary model fails:
- `tengu_api_opus_fallback_triggered` fires for Opus failures
- `tengu_model_fallback_triggered` fires for general failures
- `FALLBACK_FOR_ALL_PRIMARY_MODELS` env var forces fallback for all models
- Models costing > 200,000 tokens switch to a different pricing tier (`$IA`)

### Retry Logic

API calls use exponential backoff with configurable retries:
- Max retries controlled by `CLAUDE_CODE_MAX_RETRIES`
- Retry fires `tengu_api_retry` event
- Streaming failures can be retried when `tengu_compact_streaming_retry` is enabled

## Agent Teams Architecture

Agent Teams use a team configuration file at `~/.claude/teams/{team-name}/config.json`:
- Members tracked with `name`, `agentId`, `agentType`
- Task lists stored at `~/.claude/tasks/{team-name}/`
- Communication via `SendMessage` tool
- Teammate mode changes tracked via `tengu_teammate_mode_changed`

Maximum teammates: 3 (Max/Enterprise/Team), 1 (Pro/API/Free), overridable via `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` (1-10).

## Context Window Sizes

Models are queried for their context window via `J6(model, provider)`. The system tracks context utilisation:
- `tengu_context_size` -- Current context size
- `tengu_context_window_exceeded` -- Window exceeded
- `tengu_max_tokens_context_overflow_adjustment` -- Output tokens adjusted due to context pressure

The 200K context window is the standard for most models, with 1M available for qualifying users.
