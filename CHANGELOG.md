# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- Repository restructured into versioned, per-topic documentation
- Structured YAML data files for machine-readable analysis
- Community files (CONTRIBUTING.md, issue templates, PR template)

## 2026-06-09

### Added
- Analysis of Claude Code v2.1.169 (Linux x86-64), built 2026-06-08
- Deeper methodology: the Bun-compiled bundle was carved from the binary and beautified, so
  findings come from real function bodies rather than `strings` alone
- New **device-fingerprinting** deep-dive (machine-id, identity, trust, environment/network)
- Updated per-topic reports + YAML for flags (218), telemetry (1086 events), tools (~46),
  env vars (490), models, API endpoints, security, architecture, system prompt, commands, codenames
- Cross-version comparison [2.1.32 → 2.1.169](comparisons/2.1.32-to-2.1.169.md)

- Committed the carved + beautified JS bundle and full raw extraction output per version
  (`versions/2.1.169/bundle/` and `data/raw/`) so findings are reproducible

### Changed
- Runtime packaging observed to have moved from Node.js SEA to Bun (v1.3.14)
- Rewrote the README and dropped the legal disclaimer — this is a personal research archive

### Removed
- `docs/legal-disclaimer.md` and the associated legal framing across the repo

## 2026-02-06

### Added
- Initial analysis of Claude Code v2.1.32 (Linux x86-64)
- Feature flags, telemetry events, API endpoints, system prompt, tool definitions
- Security model, architecture deep dive, environment variables
- Methodology documentation
