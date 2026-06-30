# Tool Definitions

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/tools.yaml](data/tools.yaml) for the structured dataset.

## How Tool Schemas Are Built

Each tool is serialised via the function `SC$()`:

```
{
  name: tool.name,
  description: await tool.prompt(...),  // Dynamic description
  input_schema: tool.inputSchema,       // JSON Schema
  strict: true,                         // Only when tengu_tool_pear enabled
  input_examples: [...],                // Only when scarf_coffee beta active
  defer_loading: true,                  // For deferred/lazy-loaded tools
  cache_control: {...}                  // Prompt caching hints
}
```

When `tengu_tool_pear` is enabled AND the model supports it, `strict: true` is added and an additional API beta flag (`zc`) is pushed.

## Tool Categories

| Category | Tools | Permission |
|----------|-------|------------|
| **Read-only** (`lp0`) | Bash (read commands), Glob, Grep, Read, WebSearch, TodoWrite | Allowed in plan mode |
| **Write** (`ip0`) | Edit, Write, NotebookEdit | Blocked in plan mode |

## Tool List

| Tool | Internal Name | Description |
|------|---------------|-------------|
| **Bash** | `WD` | Execute bash commands with optional timeout |
| **Read** | `_B` | Read files from the local filesystem |
| **Write** | `R1` | Write/create files on the local filesystem |
| **Edit** | `rB` | Perform exact string replacements in files |
| **Glob** | `nf` | Fast file pattern matching (glob patterns) |
| **Grep** | `t8` | Content search built on ripgrep |
| **WebFetch** | -- | Fetch and process web content |
| **WebSearch** | `yC` | Web search with AI processing |
| **NotebookEdit** | `aW` | Edit Jupyter notebook cells |
| **Task** | `f0` | Launch subagents for complex tasks |
| **AskUserQuestion** | `WG` | Ask the user clarifying questions |
| **EnterPlanMode** | -- | Transition to plan mode |
| **ExitPlanMode** | -- | Exit plan mode (request approval) |
| **TodoWrite** | `O5` | Create/manage task lists |
| **Teammate** | -- | Manage teams and coordinate agents |
| **SendMessage** | -- | Send messages to teammates |
| **Skill** | `CJ` | Execute registered skills |

## Permission Modes

| Mode | Description |
|------|-------------|
| `default` | Ask for permission on each tool use |
| `plan` | Read-only tools only, require approval for plan |
| `acceptEdits` | Auto-accept file edits, ask for bash |
| `dontAsk` | Auto-accept most operations |
| `bypassPermissions` | Skip all permission checks (teams/subagents) |
| `delegate` | Delegate mode for team coordination |

## Tool Search System

When the number of available tools exceeds a threshold, Claude Code switches to a **tool search** system:

- Default mode: `"tst-auto"` (when `tengu_mcp_tool_search` is true)
- Fallback mode: `"standard"` (all tools loaded)
- `tengu_tst_kx7` enables tool search even below threshold when deferred MCP tools exist
- `tengu_kv7_prompt_sort` alphabetically sorts deferred tool names

Tools can be lazily loaded (`defer_loading: true`) to reduce initial prompt size.
