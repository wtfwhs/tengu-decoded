# Version Comparisons

This directory contains changelogs documenting differences between Claude Code versions.

## Available Comparisons

- [2.1.169 → 2.1.197](2.1.169-to-2.1.197.md) — Fable 5 / Mythos 5 / Sonnet 5, credits & Frame artifacts, vaults + memory stores; Bun 1.4.0. (~3 weeks, 28 patches)
- [2.1.32 → 2.1.169](2.1.32-to-2.1.169.md) — cloud backend, background daemon, agent teams, kairos loops; Node SEA → Bun. (~4 months, 137 patches)

## How Comparisons Work

When a new version is analysed, its structured YAML data is compared against the previous version to identify:

- **Added** flags, events, endpoints, or variables
- **Removed** items no longer present in the binary
- **Changed** items with different defaults, categories, or behaviour

Each comparison file follows the naming convention: `<old-version>-vs-<new-version>.md`
