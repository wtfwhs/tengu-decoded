# Repository Architecture

This document explains how Tengu Decoded is organised and how to navigate it.

## Structure

```
tengu-decoded/
├── README.md              # Project overview and navigation index
├── CONTRIBUTING.md        # How to contribute
├── CHANGELOG.md           # Cross-version change history
├── docs/                  # Project-wide documentation (not version-specific)
├── versions/              # Per-version analysis directories
│   └── <version>/
│       ├── metadata.yaml  # Version metadata
│       ├── *.md           # Human-readable analysis reports
│       └── data/
│           ├── *.yaml     # Structured machine-readable data
│           └── raw/       # Raw extraction output (LOCAL provenance, git-ignored)
└── comparisons/           # Version-to-version changelogs
```

## Key Concepts

### Version Directories

Each Claude Code version gets its own directory under `versions/`. The directory contains:

- **`metadata.yaml`** — Version number, build timestamp, platform, analyst, and analysis method
- **Markdown reports** — One file per topic (feature flags, telemetry, security, etc.) with narrative analysis
- **`data/` directory** — Structured YAML files containing the raw findings in machine-readable format
- **`data/raw/` directory** — Local-only provenance (`strings`/`grep` output, and for Bun builds the carved/beautified JS bundle). **Git-ignored** — not published, to avoid republishing proprietary content. Reports cite it via `file:line` so claims can be re-derived from a local copy.

### Multi-Architecture

The same Claude Code version may be analysed on different platforms. Platform-specific analyses use a suffixed directory name:

- `versions/2.1.32/` — Primary analysis (Linux x86-64)
- `versions/2.1.32-macos-arm64/` — macOS ARM64 variant
- `versions/2.1.32-windows-x86_64/` — Windows variant

### Data Layers

The project separates data into two layers:

1. **YAML data** (`data/*.yaml`) — Machine-readable, diffable, structured. Used for version comparisons and programmatic access.
2. **Markdown reports** (`*.md`) — Human-readable narrative with tables, interpretation, and context. What people read on GitHub.

This separation allows tooling to consume YAML without parsing markdown, and allows humans to read reports without wading through raw data.

### Cross-Version Documentation

Files in `docs/` are not tied to any specific version:

- **[Methodology](methodology.md)** — How analysis is performed
- **[Glossary](glossary.md)** — Internal codenames and naming patterns
- **[How to Analyse](how-to-analyze.md)** — Step-by-step contributor guide
