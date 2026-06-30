# Glossary of Internal Codenames

Anthropic uses internal codenames for various subsystems within Claude Code. These are derived from string patterns observed in the binary.

## Product Codenames

| Codename | Domain | Notes |
|----------|--------|-------|
| **tengu** | Claude Code (the product) | All feature flags and telemetry events are prefixed `tengu_` |
| **marble** | Model access and capabilities | Used in flags like `tengu_marble_lantern` (1M context), `tengu_marble_kite` (file ops), `tengu_marble_anvil` (clear_thinking) |
| **copper** | Subscription and upsell system | Used in flags like `tengu_copper_lantern` (extra usage upsell) |
| **coral** | Session and prompt features | Used in flags like `tengu_coral_fern` (past sessions in prompt) |
| **grove** | Policy and privacy system | Used in telemetry events like `tengu_grove_policy_viewed`, OAuth events like `tengu_grove_oauth_401_received` |

## Infrastructure Names

| Name | What It Is |
|------|-----------|
| **GrowthBook** | Feature flag and A/B experimentation platform used by Anthropic |
| **Segment** | Primary analytics/telemetry service (`api.segment.io`) |
| **Datadog** | Logging service (US5 region) |
| **OpenTelemetry** | Distributed tracing framework |
| **Perfetto** | Local trace output format |

## Flag Naming Patterns

Feature flags follow a loose naming convention:

- `tengu_<codename>_<descriptor>` — Feature-specific flags (e.g., `tengu_marble_lantern`)
- `tengu_<feature>_<detail>` — Descriptive flags (e.g., `tengu_session_memory`)
- `tengu_<random_words>` — Obfuscated flags where the name is intentionally non-descriptive (e.g., `tengu_amber_flint`, `tengu_plum_vx3`)

The obfuscated naming pattern suggests some flags are intentionally obscured to prevent users from guessing their purpose from the name alone.
