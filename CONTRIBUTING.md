# Contributing to Tengu Decoded

Thank you for your interest in contributing to Tengu Decoded. This project documents Claude Code's internals through static analysis of publicly distributed binaries — string extraction (`strings`/`grep`) and, for Bun-compiled builds, extraction and beautification of the cleartext JavaScript bundle the binary embeds. Each version directory ships the carved bundle and raw extracts so findings are reproducible.

## How You Can Contribute

### Path 1: Analyze a New Version

The most impactful contribution is documenting a new Claude Code release.

1. Obtain the binary for the target version (typically at `~/.local/share/claude/versions/<version>` on Linux)
2. Fork the repo and create a branch: `feature/v<VERSION>-analysis`
3. Create the version directory: `versions/<VERSION>/`
4. Extract raw data (see [Methodology](docs/methodology.md)): run `strings`/`grep`, and for
   Bun-compiled builds carve out and beautify the embedded cleartext JS bundle (kept local)
5. Create structured YAML data files in `versions/<VERSION>/data/`
6. Write markdown analysis reports in `versions/<VERSION>/`
7. Fill in `metadata.yaml` with version info, platform, and your details
8. If a previous version exists, document notable changes
9. Submit a PR using the pull request template

See [How to Analyze](docs/how-to-analyze.md) for a detailed walkthrough.

### Path 2: Analyze a Different Architecture

The same Claude Code version may differ across platforms. If an analysis exists for Linux x86-64 but not macOS ARM64:

1. Follow the same steps as Path 1
2. Use a platform-suffixed directory: `versions/<VERSION>-macos-arm64/`
3. Note any platform-specific differences in your analysis
4. Record the platform in `metadata.yaml`

### Path 3: Correct or Improve Existing Analysis

If you spot an error or can add detail to an existing analysis:

1. Fork the repo and create a branch: `fix/v<VERSION>-<description>`
2. Update the YAML data files with corrections
3. Update corresponding markdown reports if narrative needs changes
4. Submit a PR describing what was wrong and how you verified the correction

### Path 4: Improve Documentation

General documentation improvements (methodology clarification, better explanations, typo fixes) are always welcome.

## Data Format

### YAML Data Files

All structured data lives in `versions/<VERSION>/data/` as YAML files. Each file follows a consistent schema:

- `feature-flags.yaml` — Feature flags with name, default, category, accessor, description
- `telemetry-events.yaml` — Telemetry event names with category and description
- `api-endpoints.yaml` — API endpoints with URL, host, purpose, category
- `environment-vars.yaml` — Environment variables with name, category, purpose
- `commands.yaml` — Slash commands with name, aliases, status, notes
- `models.yaml` — Model references with family and model IDs
- `security-checks.yaml` — Security check categories with ID, name, description
- `tools.yaml` — Tool definitions with name, internal name, description

### Markdown Reports

Human-readable analysis lives alongside the YAML as markdown files. These contain narrative, interpretation, and context that goes beyond raw data.

## Analysis Checklist

When submitting a new version analysis, ensure:

- [ ] Binary version and build timestamp recorded in `metadata.yaml`
- [ ] Platform and architecture recorded
- [ ] Feature flags identified and documented
- [ ] Telemetry events categorized
- [ ] API endpoints listed
- [ ] Environment variables documented
- [ ] System prompt sections extracted (where visible)
- [ ] Tool definitions documented
- [ ] Security model reviewed
- [ ] Hidden/disabled commands checked
- [ ] Model references updated
- [ ] Internal codenames noted

## Commit Messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(v2.2.0): add initial analysis for Claude Code v2.2.0
fix(v2.1.32): correct default value for tengu_mcp_tool_search flag
docs: update methodology with macOS binary locations
```

## Branch Naming

- `feature/v<VERSION>-analysis` — New version analyses
- `feature/v<VERSION>-<platform>` — New architecture analyses
- `fix/v<VERSION>-<description>` — Corrections to existing analyses
- `docs/<description>` — Documentation improvements

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## Questions?

Open an issue with the "question" label or start a discussion.
