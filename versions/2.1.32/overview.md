# Claude Code v2.1.32 Overview

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

## Background

After enabling the `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` environment variable on launch day (2026-02-05), Agent Teams still wouldn't activate despite correct configuration and a Claude Max 20x subscription.

Investigation of the binary revealed a **dual-gating system**: the client-side env var is necessary but not sufficient. A server-side feature flag (`tengu_amber_flint`) checked via GrowthBook must also return `true`. Anthropic uses this for gradual rollouts -- the code ships in the binary but is activated server-side per account.

This discovery led to a broader investigation of what else is gated, how plans differ, and what infrastructure Claude Code runs on.

## Analysis Scope

This version was analysed on the same day Agent Teams shipped with Opus 4.6. The analysis covers:

- [Feature Flags](feature-flags.md) (~40 gating flags)
- [Plan and Tier Gating](plan-tier-gating.md)
- [API Endpoints](api-endpoints.md)
- [Telemetry](telemetry.md) (~555 events)
- [System Prompt](system-prompt.md)
- [Tool Definitions](tool-definitions.md)
- [Security Model](security-model.md)
- [Architecture](architecture.md)
- [Model References](model-references.md)
- [Environment Variables](environment-variables.md)
- [Hidden Commands](hidden-commands.md)
- [Codenames](codenames.md)
