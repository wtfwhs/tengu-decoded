# Analysed Versions

| Version | Build Date | Platform | Analyst | Analysis Date |
|---------|-----------|----------|---------|---------------|
| [2.1.169](2.1.169/) | 2026-06-08 | Linux x86-64 | whs | 2026-06-09 |
| [2.1.32](2.1.32/) | 2026-02-05 | Linux x86-64 | whs | 2026-02-06 |

## Directory Structure

Each version directory contains:

- `metadata.yaml` — Version metadata
- `*.md` — Human-readable analysis reports per topic
- `data/*.yaml` — Structured machine-readable data
- `data/raw/` — Raw extraction output (provenance)

## Cross-version comparisons

- [2.1.32 → 2.1.169](../comparisons/2.1.32-to-2.1.169.md)

## Note on methodology depth

The 2.1.169 analysis goes **beyond `strings`**: the binary is a Bun-compiled standalone
executable, so the full plaintext JS bundle was carved out and beautified, and findings are
grounded in real function bodies. It also adds a new
[device-fingerprinting](2.1.169/device-fingerprinting.md) deep-dive not present in the 2.1.32 analysis.
