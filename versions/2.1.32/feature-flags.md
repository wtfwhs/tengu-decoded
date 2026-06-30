# Feature Flags

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

## Feature Flag System

Anthropic uses **[GrowthBook](https://www.growthbook.io/)** as their feature flag and A/B experimentation platform.

- **CDN**: `https://cdn.growthbook.io`
- **Feature fetch**: `{host}/api/features/{clientKey}`
- **Streaming**: `{host}/sub/{clientKey}` (SSE)
- **Sticky bucketing**: Enabled (consistent experiment assignment)

### Flag Accessor Functions

The minified binary uses three functions to check flags:

| Function | Signature | Purpose |
|----------|-----------|---------|
| `kL()` | `kL(flagName, defaultValue)` | Primary boolean flag check |
| `df()` | `df(flagName)` | Alternate accessor (no default) |
| `Cu()` | `Cu(flagName, defaultObj)` | Configuration object flags |

When GrowthBook hasn't loaded yet, `kL()` returns the default value (second argument). Most flags default to `!1` (false), meaning features are off until GrowthBook confirms they're enabled for the user.

### How Gating Works

```
// Simplified from minified binary
function mL() {
    // Client-side opt-in (env var)
    if (!$$(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS)) return false;
    // Server-side rollout gate (GrowthBook)
    if (!kL("tengu_amber_flint", false)) return false;
    // ... feature is enabled
}
```

Both checks must pass. The env var is the user's opt-in; the GrowthBook flag is Anthropic's rollout control.

## All Feature Flags

~400+ `tengu_*` strings exist in the binary (most are telemetry event names). These ~40 are **actual gating flags** with `kL()` or `df()` checks.

See [data/feature-flags.yaml](data/feature-flags.yaml) for the full structured dataset.

### Agent Teams

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_amber_flint` | `false` | Agent Teams feature (alongside `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env var) |

### System Prompt

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_vinteuil_phrase` | `false` | Alternative "simple proactive" system prompt variant |
| `tengu_system_prompt_global_cache` | `false` | Global caching for system prompt blocks |
| `tengu_cork_m4q` | `false` | `<policy_spec>` injection into BashTool pre-flight check |

### Context Management

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_cache_plum_violet` | `false` | Kill switch for microcompact |
| `tengu_compact_cache_prefix` | `false` | Prompt caching during compaction |
| `tengu_compact_streaming_retry` | `false` | Retry logic for compaction streaming failures |
| `tengu_marble_anvil` | `false` | `clear_thinking` API beta and context management |

### Session Memory

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_session_memory` | `false` | Session memory (MEMORY.md) for cross-session persistence |
| `tengu_sm_compact` | `false` | Session memory compaction (requires `tengu_session_memory` AND this flag) |
| `tengu_oboe` | `false` | Auto-memory via MEMORY.md |

### Tool Search

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_mcp_tool_search` | **`true`** | MCP tool search mode |
| `tengu_tst_kx7` | `false` | Tool search when below threshold but deferred MCP tools present |
| `tengu_tst_names_in_messages` | `false` | Include tool names in messages |
| `tengu_kv7_prompt_sort` | `false` | Alphabetically sort deferred tool names |
| `tengu_tool_search_unsupported_models` | `null` | Array of unsupported model names |

### File Operations

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_marble_kite` | `false` | Removes "must read before write/edit" requirement |
| `tengu_file_write_optimization` | `false` | Short success messages instead of full file echo |
| `tengu_quartz_lantern` | `false` | Diff computation for file operations in remote mode |

### UI / UX

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_code_diff_cli` | `false` | Code diff view in CLI |
| `tengu_pr_status_cli` | `false` | PR status in CLI footer |
| `tengu_chomp_inflection` | **`true`** | Prompt suggestions (default ON) |
| `tengu_plank_river_frost` | config | Prompt suggestion mode config |
| `tengu_permission_explainer` | `false` | AI-powered permission explanations |
| `tengu_keybinding_customization_release` | `false` | Custom keybinding support |
| `tengu_chrome_auto_enable` | `false` | Auto-enable Chrome integration |
| `tengu_silver_lantern` | `false` | Promotional/launch banners |

### API / Networking

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_attribution_header` | **`true`** | Attribution header on API requests (default ON) |
| `tengu_remote_backend` | `false` | Remote backend mode |
| `tengu_scarf_coffee` | `false` | Unlisted API beta for first-party users |
| `tengu_tool_pear` | N/A | Enables `strict: true` on tool schemas |

### Model Access

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_marble_lantern_disabled` | `false` | Kill switch for 1M context access |
| `tengu_marble_lantern_3p_disabled` | `false` | Kill switch for third-party 1M context |
| `tengu_workout2` | `false` | Opus 4.6-specific feature |

### Subscription / Upsells

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_copper_lantern` | `false` | Extra usage upsell promo |
| `tengu_copper_lantern_config` | config | Upsell config with `meridian` cutoff date |

### Plan Mode

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_plan_mode_interview_phase` | `false` | Interview phase in plan mode |
| `tengu_coral_fern` | `false` | "Accessing Past Sessions" section in system prompt |

### Streaming / Performance

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_plum_vx3` | `false` | Disables thinking tokens for WebSearch |
| `tengu_streaming_tool_execution2` | N/A | Parallel/streaming tool execution |

### Version Management

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_pid_based_version_locking` | `false` | PID-based locking to prevent update conflicts |

### VS Code / IDE

| Flag | Default | What It Gates |
|------|---------|---------------|
| `tengu_quiet_fern` | `false` | VS Code experiment gate |
| `tengu_vscode_review_upsell` | N/A | VS Code review upsell experiment |
| `tengu_vscode_onboarding` | N/A | VS Code onboarding experiment |

### Configuration Object Flags

| Flag | What It Provides |
|------|-----------------|
| `tengu_sm_config` | Session memory configuration |
| `tengu_event_sampling_config` | Telemetry event sampling rates |
| `tengu_feedback_survey_config` | Feedback survey configuration |
| `tengu_copper_lantern_config` | Upsell promo config with `meridian` date |
| `tengu_1p_event_batch_config` | First-party event batching config |

### Summary

- **Default TRUE** (on by default): `tengu_attribution_header`, `tengu_chomp_inflection`, `tengu_mcp_tool_search`
- **Default FALSE** (off, rolled out via GrowthBook): Everything else
- **Env var overridable**: `tengu_oboe`, `tengu_plan_mode_interview_phase`, `tengu_tst_names_in_messages`, `tengu_attribution_header`, `tengu_permission_explainer`
