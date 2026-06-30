# How to Analyse a New Version

This guide walks through the process of analysing a new Claude Code binary version.

## Prerequisites

- Access to the Claude Code binary for the target version
- Basic familiarity with `strings` and `grep` (or Claude Code itself for self-analysis)
- A text editor for writing YAML and Markdown

## Step 1: Locate the Binary

Claude Code binaries are typically found at:

| Platform | Path |
|----------|------|
| Linux | `~/.local/share/claude/versions/<version>` |
| macOS | `~/.local/share/claude/versions/<version>` |
| Windows | `%LOCALAPPDATA%\claude\versions\<version>` |

Record the version number and verify it matches expectations.

## Step 2: Create the Version Directory

```bash
VERSION="X.Y.Z"
mkdir -p versions/$VERSION/data/raw
```

## Step 3: Extract Raw Strings

Run the core extraction commands and save the output:

```bash
BINARY="path/to/binary"

# All tengu-prefixed strings (flags + events)
strings "$BINARY" | grep -oP 'tengu_[a-z0-9_]+' | sort -u > versions/$VERSION/data/raw/strings-tengu.txt

# URLs
strings "$BINARY" | grep -oP 'https?://[^\s"]+' | sort -u > versions/$VERSION/data/raw/strings-urls.txt

# Environment variables
strings "$BINARY" | grep -oP '(CLAUDE_|ANTHROPIC_|ENABLE_|DISABLE_)[A-Z_]+' | sort -u > versions/$VERSION/data/raw/strings-env-vars.txt

# Long strings (prompts, instructions)
strings -n 300 "$BINARY" > versions/$VERSION/data/raw/strings-long-prompts.txt
```

## Step 4: Identify Feature Flags vs Telemetry Events

Feature flags are strings that appear as arguments to accessor functions. In v2.1.32, these were `kL()`, `df()`, and `Cu()`. The function names change between versions, so look for patterns like:

```bash
# Find function calls with tengu_ string arguments
strings "$BINARY" | grep -oP '[a-zA-Z]+\("tengu_[^"]+".{0,50}' | sort -u
```

Strings that appear in accessor-style calls are feature flags. The remaining `tengu_*` strings are telemetry event names.

## Step 5: Create Structured YAML Data

Create the following files in `versions/$VERSION/data/`:

- `feature-flags.yaml` — All identified feature flags
- `telemetry-events.yaml` — All telemetry event names
- `api-endpoints.yaml` — All API endpoints found
- `environment-vars.yaml` — All environment variables
- `commands.yaml` — All slash commands
- `models.yaml` — All model references
- `security-checks.yaml` — Security check categories (if identifiable)
- `tools.yaml` — Tool definitions (if identifiable)

See existing version directories for the expected YAML schema.

## Step 6: Analyse with Claude Code (Recommended)

The most effective analysis method is using Claude Code to examine its own binary. Provide Claude Code with:

1. The raw extraction files from Step 3
2. Context about what each data type means (see [Glossary](glossary.md))
3. The previous version's analysis (if available) for comparison

Claude Code can interpret the surrounding context of strings in the binary to determine flag purposes, event meanings, and architectural details that are difficult to identify from raw strings alone.

## Step 7: Write Markdown Reports

Create markdown files in `versions/$VERSION/` covering each topic:

- `overview.md` — Background and context for this version
- `feature-flags.md` — Feature flag analysis with tables
- `telemetry.md` — Telemetry stack and events
- `api-endpoints.md` — Internal API endpoints
- `system-prompt.md` — System prompt composition
- `tool-definitions.md` — Tool schemas and categories
- `security-model.md` — Security checks and file access
- `architecture.md` — Internal architecture details
- `model-references.md` — Model IDs and fallback system
- `environment-variables.md` — All environment variables
- `hidden-commands.md` — Hidden or disabled commands
- `codenames.md` — Internal codenames (new or changed)
- `plan-tier-gating.md` — Subscription and plan gating

## Step 8: Create Metadata

Create `versions/$VERSION/metadata.yaml`:

```yaml
version: "X.Y.Z"
build_timestamp: "YYYY-MM-DDTHH:MM:SSZ"
analysis_date: "YYYY-MM-DD"
platform: "linux-x86_64"  # or macos-arm64, macos-x86_64, windows-x86_64
binary_format: "ELF"  # or Mach-O, PE
analyst: "your-github-username"
analysis_method: "claude-code-self-analysis"  # or manual, combination
notes: "Any relevant context about this version or analysis"
```

## Step 9: Compare with Previous Version

If a previous version exists, document the differences:

- New flags, events, endpoints, or variables
- Removed items
- Changed defaults or behaviour

## Step 10: Submit

1. Fork the repository
2. Create a branch: `feature/v$VERSION-analysis`
3. Commit with conventional commit messages
4. Open a pull request using the PR template
