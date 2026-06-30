# System Prompt

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

The system prompt is **composed dynamically** from multiple sections, assembled by the function `G3()` (full prompt) or `brD()` (simple variant). When `CLAUDE_CODE_SIMPLE` is set, the entire prompt collapses to a single line.

## Prompt Variants

| Variant | Trigger | Identity Line |
|---------|---------|---------------|
| **Standard** | Default | "You are Claude Code, Anthropic's official CLI for Claude." |
| **Agent SDK** | Running within SDK | "...running within the Claude Agent SDK." |
| **Non-interactive SDK** | SDK without append prompt | "You are a Claude agent, built on Anthropic's Claude Agent SDK." |
| **Simple mode** | `CLAUDE_CODE_SIMPLE=1` | Single line, no further sections |
| **Simple proactive** | `tengu_vinteuil_phrase` flag | Uses `brD()` -- fewer sections |
| **Vertex** | Vertex AI provider | Always uses the standard identity line |

## Prompt Composition Order

The standard `G3()` prompt assembles sections in this order:

| Order | Function | Section | Conditional |
|-------|----------|---------|-------------|
| 1 | `E21()` | Identity + version + security policy | Always |
| 2 | `M21()` | Tone and style | Only when output style is null |
| 3 | `G21()` | Task management instructions | Only if TodoWrite tool available |
| 4 | `U21()` | "Asking questions as you work" | Only if AskUserQuestion tool available |
| 5 | `urD()` | Hooks instructions | Always |
| 6 | `X21()` | "Doing tasks" -- coding guidelines | Only if output style is null |
| 7 | `J21()` | System reminders + context note | Always |
| 8 | `F21()` | "Using your tools" -- tool usage rules | Always |
| 9 | `zz$` | Security policy | Always |
| 10 | `K21()` | Task tracking reminder | Only if TodoWrite tool available |
| 11 | `Q21()` | Code references instructions | Always |
| -- | Dynamic | Session memory, auto memory, MCP instructions, env info | Per turn |

## Key Prompt Sections

### Professional Objectivity (M21)
Instructs the model to prioritise technical accuracy over validating user beliefs, avoid excessive praise, and disagree when warranted.

### No Time Estimates (M21)
Instructs never to give time estimates for tasks.

### Doing Tasks (X21)
Key instructions include: read before modifying code, avoid over-engineering, do not add unrequested features, avoid unnecessary abstractions.

### Git Safety (FX1)
Never update git config, never run destructive git commands unless explicitly requested, always create new commits rather than amending.

### Tool Usage (Y21)
Use dedicated tools instead of Bash equivalents (Read instead of cat, Edit instead of sed, Glob instead of find). Call multiple tools in parallel when independent.

## Dynamic Prompt Blocks

| Block ID | Content | Refresh Strategy |
|----------|---------|------------------|
| `session_memory` | Session memory contents | Static (set once) |
| `auto_memory` | MEMORY.md file contents | Dynamic (re-read each turn) |
| `ant_model_override` | Model override from GrowthBook | Dynamic |
| `env_info` | Working directory, git status, platform, date | Static |
| `language` | User language preference | Static |
| `output_style` | Custom output style | Dynamic |
| `mcp_instructions` | MCP server instructions | Dynamic |
| `scratchpad` | Internal scratchpad | Static |

## Global Cache

When `tengu_system_prompt_global_cache` is enabled (or `CLAUDE_CODE_FORCE_GLOBAL_CACHE` env var is set), an additional cache control block `y3H` is appended to improve prompt caching efficiency.
