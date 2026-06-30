# Tengu Decoded

> Reverse-engineering Claude Code's internals -- feature flags, gated features, telemetry, device fingerprinting, and the infrastructure behind Anthropic's AI coding tool.

**"Tengu"** is Anthropic's internal codename for Claude Code. This repository documents what the
publicly distributed Claude Code binary actually does, version by version.

Earlier versions (v2.1.32) were examined with standard Unix tools (`strings`, `grep`). From
**v2.1.169** the binary is a **Bun-compiled** standalone executable that embeds the application's
JavaScript as **cleartext**, so the analysis carves that bundle out of the binary and beautifies it
(~662k readable lines) — findings come from real function bodies, not isolated strings. Each version
directory ships the extracted bundle and the raw extraction output alongside the write-ups, so every
claim is reproducible.

This is a personal research archive — a deep, private teardown for understanding the tool, not a
published product.

## Analyzed Versions

| Version | Build Date | Platform | Status |
|---------|-----------|----------|--------|
| [**2.1.197**](versions/2.1.197/) | 2026-06-29 | Linux x86-64 | Complete (deep) |
| [**2.1.169**](versions/2.1.169/) | 2026-06-08 | Linux x86-64 | Complete (deep) |
| [**2.1.32**](versions/2.1.32/) | 2026-02-05 | Linux x86-64 | Complete |

See [versions/README.md](versions/README.md) for the full version index, and the
[comparisons/](comparisons/) directory for cross-version diffs
([2.1.32 → 2.1.169](comparisons/2.1.32-to-2.1.169.md),
[2.1.169 → 2.1.197](comparisons/2.1.169-to-2.1.197.md)).

> **Latest (v2.1.197):** a deep, bundle-extracted analysis (**Bun v1.4.0**, ~733k beautified lines).
> Where 2.1.169 was a tectonic shift, **2.1.197 is a consolidation release** — the same cloud
> agent-fabric, renamed and re-gated, with new managed-resource families bolted on. Headline deltas vs
> 2.1.169: **243 feature flags** (+25), **1086 → 1163 telemetry events**, **49 built-in tools**,
> **526 env vars**, **164 API path templates**; a new declarative model catalog with the **`fable`
> family** (`claude-fable-5`, Mythos-class) and **`claude-sonnet-5`**; new cloud surfaces — credential
> **Vaults**, **memory stores**, **skill versioning**, **Claude Design** MCP, and web-artifact frame
> deploy. Notably, the Datadog telemetry token was **not** rotated this cycle. See the
> [overview](versions/2.1.197/overview.md) and the [2.1.169 → 2.1.197 comparison](comparisons/2.1.169-to-2.1.197.md).

> **Note on depth (v2.1.169):** this analysis goes **beyond `strings`**. v2.1.169 ships as a
> **Bun v1.3.14** standalone executable, so the full 16.5 MB plaintext JS bundle was carved out of
> the binary and beautified to ~662k readable lines — findings come from real function bodies. It also
> adds a new [device-fingerprinting](versions/2.1.169/device-fingerprinting.md) deep-dive.

## Key Findings (v2.1.169)

| Area | Finding |
|------|---------|
| **Runtime** | Now a **Bun v1.3.14** compiled standalone binary (v2.1.32 was Node.js SEA) — JS source recoverable as plaintext |
| **Scale** | 218 feature flags, 1086 telemetry events, ~46 built-in tools, 490 env vars (vs 48 / 239 / 17 / 54 in 2.1.32) |
| **Device ID** | Transmitted `device_id` is a **random 256-bit per-install token** (`crypto.randomBytes(32)` → `~/.claude.json`), **not** hardware-derived; the OS machine UUID is read but stripped to `host.arch` |
| **Telemetry** | **Segment removed.** First-party event logging (`/api/event_logging/v2/batch`) is the spine; Datadog US5 is an allow-listed mirror (off by default); GrowthBook + optional OpenTelemetry + Perfetto |
| **Cloud backend** | New managed-agents API: `/v1/sessions`, `/v1/agents`, `/v1/environments`, `/v1/files`; plus Remote-Control bridge over `wss://bridge.claudeusercontent.com` |
| **Autonomy** | Background-agent daemon (`/background`, `/tasks`, `/fork`), "kairos" loops & scheduling (`/loop`, `/schedule`, cron), and a VM-sandboxed **Workflows** engine |
| **Agent Teams** | Server-side gate now defaults open (`tengu_amber_flint` `false`→`true`); still requires `--agent-teams`/env opt-in. Adds coordinator mode + shared team memory |
| **Security** | The 14-category regex injection pipeline is **gone** — replaced by an LLM prefix-classifier + destructive-command regex + a two-stage auto-mode classifier; plus bubblewrap/seatbelt/WFP sandboxing |
| **System Prompt** | Composed by `iT()` with per-section caching (`rT`); modern models get a compact "# Harness" intro instead of the legacy 6-section layout |
| **Providers** | Anthropic, Bedrock, Vertex, Foundry, **Mantle**, **Gateway** (planes selected by `Mq()`) |
| **Models** | Default is **`claude-opus-4-8`**; "fast mode" is a `speed:"fast"` request flag; 1M context via `[1m]` suffix; Pro can now meter Opus against usage credits |
| **Commands** | ~64 active + new hidden/easter-egg (`/radio` = Claude FM lo-fi, `/heapdump`, `/bridge-kick`) |

Earlier findings for **v2.1.32** live in [versions/2.1.32/](versions/2.1.32/).

## What's in each version directory

```
versions/<version>/
├── metadata.yaml        # version, build, runtime, accessors, headline deltas
├── *.md                 # per-topic analysis reports
├── data/
│   ├── *.yaml           # structured, machine-readable findings
│   └── raw/             # raw extraction output (strings dumps, grep extracts) — provenance
└── bundle/              # (Bun builds) the carved + beautified JS source + extraction script
    ├── cli.beauty.js    # beautified bundle (~662k lines) — the primary analysis source
    ├── cli.min.js       # carved minified bundle (byte-for-byte from the binary)
    ├── carve.py         # extraction script (byte offsets used)
    └── ANALYSIS_CONTEXT.md  # ground-truth notes shared across the analysis
```

## Documentation

### General

| Document | Description |
|----------|-------------|
| [Methodology](docs/methodology.md) | How analysis is performed (string extraction + bundle extraction/beautification) |
| [Glossary](docs/glossary.md) | Internal codenames (tengu, marble, copper, coral, grove, kairos, harbor, …) |
| [Architecture Overview](docs/architecture-overview.md) | How this repository is organized |
| [How to Analyze](docs/how-to-analyze.md) | Step-by-step guide for analyzing a new version |

### Version 2.1.197 Reports

| Report | Description |
|--------|-------------|
| [Overview](versions/2.1.197/overview.md) | Build metadata, headline counts, and the "consolidation release" story |
| [**Device Fingerprinting**](versions/2.1.197/device-fingerprinting.md) | **Deep-dive** — machine-id, identity fields, device trust, what leaves the machine |
| [Feature Flags](versions/2.1.197/feature-flags.md) | All 243 GrowthBook feature flags, accessor-decoded |
| [Plan and Tier Gating](versions/2.1.197/plan-tier-gating.md) | Subscription types, model access, limits, usage credits |
| [API Endpoints](versions/2.1.197/api-endpoints.md) | Inference + the cloud backend (incl. Vaults, memory stores, skill versioning) + OAuth |
| [Telemetry](versions/2.1.197/telemetry.md) | Telemetry stack, controls, and 1163 events (Datadog token un-rotated) |
| [System Prompt](versions/2.1.197/system-prompt.md) | Composer, section builders, reconstructed text |
| [Tool Definitions](versions/2.1.197/tool-definitions.md) | 49 tools, schemas, permission modes |
| [Security Model](versions/2.1.197/security-model.md) | LLM injection classifier, sandboxing, file access |
| [Architecture](versions/2.1.197/architecture.md) | Bun 1.4.0 packaging, daemon, teams, bridge, loops, workflows |
| [Model References](versions/2.1.197/model-references.md) | Zod-validated catalog, the new `fable`/`sonnet-5` ids, fallback, fast mode |
| [Environment Variables](versions/2.1.197/environment-variables.md) | All 526 env vars + privacy opt-outs |
| [Hidden Commands](versions/2.1.197/hidden-commands.md) | Disabled, hidden, and easter-egg slash commands |
| [Codenames](versions/2.1.197/codenames.md) | Internal codename mappings (incl. new families) |

Structured datasets: [`versions/2.1.197/data/`](versions/2.1.197/data/). Raw extraction + the
carved/beautified bundle live under [`data/raw/`](versions/2.1.197/data/raw/) and
[`bundle/`](versions/2.1.197/bundle/).

### Version 2.1.169 Reports

| Report | Description |
|--------|-------------|
| [Overview](versions/2.1.169/overview.md) | Background, scope, and the deeper extraction methodology |
| [**Device Fingerprinting**](versions/2.1.169/device-fingerprinting.md) | **Deep-dive** — machine-id, identity, device trust, environment/network fingerprinting |
| [Feature Flags](versions/2.1.169/feature-flags.md) | All 218 GrowthBook feature flags |
| [Plan and Tier Gating](versions/2.1.169/plan-tier-gating.md) | Subscription types, model access, teammate limits, usage credits |
| [API Endpoints](versions/2.1.169/api-endpoints.md) | Inference + the new cloud backend + OAuth |
| [Telemetry](versions/2.1.169/telemetry.md) | Telemetry stack, controls, and 1086 events (Segment removed) |
| [System Prompt](versions/2.1.169/system-prompt.md) | `iT()` composition, section builders, reconstructed text |
| [Tool Definitions](versions/2.1.169/tool-definitions.md) | ~46 tools, schemas, permission modes, deferred-tool loading |
| [Security Model](versions/2.1.169/security-model.md) | LLM injection classifier, sandboxing, file access |
| [Architecture](versions/2.1.169/architecture.md) | Compaction, MCP, providers, teams, daemon, bridge, loops, workflows |
| [Model References](versions/2.1.169/model-references.md) | Model IDs, aliases, fallback, fast mode, 1M context |
| [Environment Variables](versions/2.1.169/environment-variables.md) | All 490 env vars + privacy opt-outs |
| [Hidden Commands](versions/2.1.169/hidden-commands.md) | Disabled, hidden, and easter-egg slash commands |
| [Codenames](versions/2.1.169/codenames.md) | Internal codename mappings (kairos, harbor, bridge, …) |

Structured datasets: [`versions/2.1.169/data/`](versions/2.1.169/data/) — `feature-flags.yaml`,
`telemetry-events.yaml`, `api-endpoints.yaml`, `environment-vars.yaml`, `commands.yaml`, `models.yaml`,
`security-checks.yaml`, `tools.yaml`, `fingerprinting.yaml`. Raw extraction + the carved/beautified
bundle live under [`data/raw/`](versions/2.1.169/data/raw/) and [`bundle/`](versions/2.1.169/bundle/).

### Version 2.1.32 Reports

| Report | Description |
|--------|-------------|
| [Overview](versions/2.1.32/overview.md) | Background and analysis scope |
| [Feature Flags](versions/2.1.32/feature-flags.md) | All ~48 GrowthBook feature flags |
| [Plan and Tier Gating](versions/2.1.32/plan-tier-gating.md) | Subscription types, model access, teammate limits |
| [API Endpoints](versions/2.1.32/api-endpoints.md) | Internal API endpoints and OAuth details |
| [Telemetry](versions/2.1.32/telemetry.md) | Telemetry stack, controls, and event categories |
| [System Prompt](versions/2.1.32/system-prompt.md) | Dynamic prompt composition and variants |
| [Tool Definitions](versions/2.1.32/tool-definitions.md) | Tool schemas, categories, and permission modes |
| [Security Model](versions/2.1.32/security-model.md) | Command injection checks and file access rules |
| [Architecture](versions/2.1.32/architecture.md) | Context compaction, MCP, provider routing, agent teams |
| [Model References](versions/2.1.32/model-references.md) | Model IDs, families, and fallback system |
| [Environment Variables](versions/2.1.32/environment-variables.md) | All CLAUDE_CODE and ANTHROPIC env vars |
| [Hidden Commands](versions/2.1.32/hidden-commands.md) | Disabled and gated slash commands |
| [Codenames](versions/2.1.32/codenames.md) | Internal codename mappings |

## Internal Codenames

| Codename | Domain |
|----------|--------|
| **tengu** | Claude Code (the product) |
| **marble** | Model access and capabilities |
| **copper** | Subscription and upsell system |
| **coral** | Session and prompt features |
| **grove** | Policy and privacy system |
| **kairos** | Loops, scheduling, brief mode, push notifications *(new in 2.1.169)* |
| **harbor** | Channels / cowork / teams *(new in 2.1.169)* |
| **bridge** / **ccr** | Remote control & cloud-bundle execution *(new in 2.1.169)* |
| **amber** | Agent Teams & autonomy *(new in 2.1.169)* |
| **sage_compass** | Advisor tool *(new in 2.1.169)* |

> Note (2.1.169): most flag names are now auto-generated `adjective_noun` pairs from an embedded word
> pool — the **noun** carries the meaning, the adjective is random. See
> [codenames](versions/2.1.169/codenames.md).

## Methodology

Two complementary methods, depending on packaging:

1. **String extraction** (`strings`/`grep`) — works on any build; used for v2.1.32.
2. **Cleartext bundle extraction + beautification** — used from v2.1.169. Bun-compiled builds embed the
   application JavaScript as plaintext; the byte range is carved out (`dd`) and beautified so whole
   function bodies can be read. The carved bundle and raw extracts are committed under each version's
   `bundle/` and `data/raw/`. Variable names are minified/mangled, so inferences about purpose come from
   call sites and surrounding context. (No machine code or JSC bytecode is decompiled/disassembled — the
   JavaScript is already human-readable inside the binary.)

See [docs/methodology.md](docs/methodology.md) for the full extraction guide and known limitations.

## Version Comparisons

Cross-version diffs live in [`comparisons/`](comparisons/) — see
[2.1.32 → 2.1.169](comparisons/2.1.32-to-2.1.169.md) and
[2.1.169 → 2.1.197](comparisons/2.1.169-to-2.1.197.md).
