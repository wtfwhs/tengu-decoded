# Telemetry

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/telemetry-events.yaml](data/telemetry-events.yaml) for the full structured dataset of all events.

## Telemetry Stack

| Service | Endpoint | Purpose |
|---------|----------|---------|
| **Segment** | `api.segment.io/v1/batch` | Primary analytics |
| **Datadog** | `http-intake.logs.us5.datadoghq.com` | Logging (US5 region) |
| **OpenTelemetry** | Configurable | Tracing (`com.anthropic.claude_code.tracing`) |
| **GrowthBook** | `cdn.growthbook.io` | Feature flags and A/B experiments |
| **Perfetto** | Local file | Optional trace output |

### Telemetry Controls

| Variable | Effect |
|----------|--------|
| `DISABLE_TELEMETRY` | Master kill switch for Segment/Datadog |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | Disables non-essential network calls |
| `DISABLE_ERROR_REPORTING` | Disables error reporting |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Explicit telemetry enable |

### Datadog Details

- **Region**: US5
- **Public client token**: `pubbbf48e6d78dae54bceaa4acf463299bf`
- **Default flush interval**: 15,000ms
- **Max batch size**: 100 events

## Telemetry Events

The binary contains **595 unique `tengu_*` strings**. After subtracting the ~40 feature flags, this leaves **~555 telemetry event names** tracking user actions, system events, and errors across **18 categories**.

### Event Categories Summary

| Category | Count | Description |
|----------|-------|-------------|
| Session Lifecycle | 21 | Init, exit, continue, onboarding, session management |
| User Input | 12 | Prompts, commands, paste events, editor usage |
| Tool Usage | 18 | Tool execution, permissions, diffs |
| Tool Search | 3 | Mode decisions, outcomes |
| API and Model | 16 | Queries, errors, retries, fallbacks, model switching |
| Bash Tool | 7 | Command execution, security checks, backgrounding |
| Compaction | 9 | Auto-compact, microcompact, partial compact, cache sharing |
| OAuth and Authentication | 20+ | Login flows, token exchange, refresh, lock contention |
| Agent Teams | 12 | Agent creation, tool selection, stop hooks |
| MCP | 19 | Server lifecycle, connections, auth, tool loading |
| File Operations | 13 | File changes, snapshots, rewind, backups |
| Session Memory | 10 | Memory access, loading, extraction, compaction |
| Auto-Update | 16 | Updater success/failure, binary downloads, version checks |
| UI and Interaction | 25+ | Permissions, suggestions, mode cycling, cost thresholds |
| Streaming and Performance | 10 | Errors, stalls, fallbacks, context size |
| Error and Recovery | 15+ | Exceptions, config errors, shell errors, refusals |
| Privacy and Policy | 10 | Policy views, submissions, toggles |
| Teleport / Remote | 14 | Teleport lifecycle, resume, remote sessions |

### Event Payload Note

Events are fired via a function `c(eventName, payload)`. Payloads are metadata objects containing contextual information. The `tengu_event_sampling_config` flag controls per-event sampling rates to manage telemetry volume.

For the full list of all individual events, see [data/telemetry-events.yaml](data/telemetry-events.yaml).
