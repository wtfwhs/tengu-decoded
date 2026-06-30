# Claude Code v2.1.197 Overview

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64
> **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Runtime**: Bun **v1.4.0** (standalone compiled)

## Context

This analysis lands **21 days and 28 patch releases** after [2.1.169](../2.1.169/overview.md) (2026-06-08 → 2026-06-29). Where 2.1.169 was a tectonic shift — Node SEA → Bun, Segment removed, a whole cloud agent-fabric appearing — **2.1.197 is a consolidation release**: the distributed-runtime skeleton (agent teams, coordinator mode, background daemon, remote bridge, kairos scheduling, workflows VM) is the **same one** that shipped in 2.1.169. This pass tracks how it was renamed, re-gated, and extended rather than rebuilt.

The headline shifts that *are* real:

- The runtime bumped from **Bun v1.3.14 → v1.4.0** — the one structural change to the packaging.
- The **model layer was rewritten** from a hand-coded routing object into a **declarative, Zod-validated catalog** (`pQs` + `hfd()`/`iMt()`), and a brand-new **`fable` model family** plus **`claude-sonnet-5`** appeared.
- The **cloud backend grew three new managed-agents resource families** — **Vaults** (credential storage), **Memory Stores**, and **Skill versioning** — alongside new first-party surfaces: cloud code review (`/v1/ultrareview/preflight`), a built-in **Claude Design** MCP server (`/v1/design/mcp`), and web-artifact **frame deploy** (`/api/frame/deploy/*`).
- Counts kept climbing: **+25 feature flags**, **+77 telemetry events**, **+3 built-in tools**, **+20 API path templates**, **+5 model ids**.

Where 2.1.169 was "the binary became a thick client for a hosted agent fabric," 2.1.197 is "that thick client gets a typed model catalog, credential vaults, and a design/deploy surface — same fabric, more managed resources."

## Methodology — this analysis goes beyond `strings`

As with 2.1.169, **every claim is grounded in the actual source**, not isolated tokens.

The v2.1.197 binary is a **Bun v1.4.0 standalone compiled executable** (`linux-x86_64` ELF, 245,517,112 bytes). Bun embeds two copies of the application inside the ELF: a **JavaScriptCore bytecode/snapshot** copy (the fast-load path Bun executes) and the **full plaintext minified JS source**. We carved the plaintext bundle out of the ELF at byte offset 225,406,600 (18,097,818 bytes of minified JS) and **beautified it to 733,394 lines** (`cli.beauty.js`). Bundle header: `// @bun @bytecode @bun-cjs`.

Because we have real function bodies, we can read what a flag *does*, not just that it exists:

- The primary flag accessor `it(name, default)` (`cli.beauty.js:145150`) and its resolution order: local override (`CBt()`) → managed override (`IBt()`) → not-ready default (`!LW()`) → GrowthBook exposure tracking → cached value (`Pt().cachedGrowthBookFeatures[name]`).
- The model catalog parser `iMt()` (`:94507`) validating the frozen `pQs` catalog (`:94000`) against a Zod schema `hfd()` (`:94492`).
- The device-identity code `vW()` (`:606434`) confirming `device_id`/`userID` is still `crypto.randomBytes(32).toString("hex")` — a random 256-bit token, **not** hardware-derived.

Provenance is preserved under `data/raw/` (flag/event/env/model extracts) and citations point at `cli.beauty.js:LINE` where the exact text is load-bearing. The canonical numbers and the full per-build symbol map live in [`bundle/_facts.md`](bundle/_facts.md).

> Note: minified identifiers are mangled and **change every build**, so symbol names here (`it`, `q`, `vW`, `Ys`, `yr`, `pQs`) are this-build-specific. They are inferred from surrounding string context and call sites; tentative inferences are flagged as such in the per-topic reports. The most load-bearing remaps from 2.1.169: flag get `j$`→`it`, telemetry fire `d`→`q`, tool factory `rK`→`Ys`, provider selector `Mq`→`yr`, device_id `cU`→`vW`.

## Headline findings

| Dimension | 2.1.169 | 2.1.197 | Δ | Method |
|---|---|---|---|---|
| Feature flags | 218 | **243** | **+25** | distinct `tengu_*` first-arg to `it`/`J7`/`QYr`/`$U` |
| Telemetry events | 1086 | **1163** | **+77** | distinct event-name first-arg to fire fn `q(name,payload)` |
| Built-in tools | 46 | **49** | **+3** | `Ys({...})` factory call sites − 3 non-tools |
| API path templates | 144 | **164** | **+20** | distinct `/v1/*` + `/api/*` templates (docs stripped) |
| Model ids | 56 | **61** | **+5** | distinct `claude-*` model-id strings |
| Env vars (`CLAUDE_*`/`ANTHROPIC_*`) | 490† | **526** | **+36** | distinct `CLAUDE_*` (470) + `ANTHROPIC_*` (56) |
| Slash commands | 93 | **93** | **0** (churn ±2) | distinct `name:` on a `local`/`local-jsx`/`prompt` command |
| Runtime | Bun v1.3.14 | **Bun v1.4.0** | bump | bundle header + `bun_version:1.4.0` @ `299451` |
| Model layer | hand-coded `tz` routing object | **Zod-validated catalog `pQs`** | rewrite | `iMt()`/`hfd()` @ `94492`–`94514` |

† 2.1.169's *published* headline was 490. Re-running the identical `CLAUDE_*`+`ANTHROPIC_*` grep over the 2.1.169 bundle yields 474, so the same-method delta is **+52** (474→526). Use **526** as the 2.1.197 number. Full counting caveats in [`bundle/_facts.md`](bundle/_facts.md) §1.

These numbers are sourced from the carved bundle: flags via the `it`/`J7`/`QYr`/`$U` accessor extraction, events via the `q(...)` fire-fn extraction, tools via the `Ys({...})` factory call sites, env vars via the `CLAUDE_*`/`ANTHROPIC_*` scan, and models via the `claude-*` id extraction.

### What's behind the deltas

- **+20 API path templates** — major new cloud surfaces: **`/v1/vaults/*`** (credential vaults, incl. `…/credentials/{id}/mcp_oauth_validate`), **`/v1/memory_stores/*`** (managed memory + versions), **`/v1/skills/{id}/versions/*`** (skill versioning), **`/v1/ultrareview/preflight`** (cloud code review), **`/v1/design` + `/v1/design/mcp`** (built-in Claude Design MCP server), and **`/api/frame/deploy/*`** + `/api/frame/track` (web-artifact "frame" deploy, served at `{slug}.frame.claudeusercontent.com`). New OAuth scopes `user:design:read|write` and `user:projects:read|write`. See [API Endpoints](api-endpoints.md).
- **+5 model ids** — NEW: **`claude-fable-5`**, **`claude-fable-5-mythos-5`**, **`claude-sonnet-5`**, **`claude-opus-4-7-fast`** (plus a `claude-fable-5.md` doc reference). The `fable` family and a `sonnet-5` id are the marquee additions. See [Model References](model-references.md).
- **+3 built-in tools** — net of **+5 new** (`ReadMcpResourceDirTool`, `ShowOnboardingRolePicker`, `Projects`, `Artifact`, `ReportFindings`) **−2 removed** (`TeamCreate`, `TeamDelete`). The team subsystem was not deleted — `SendMessage` survives and the team-shaped schema fields moved to a runtime strip-list. See [Tool Definitions](tool-definitions.md).
- **Slash-command churn (net 0)** — NEW `/design-login`, `/pause-memory`; REMOVED `/bridge-kick`, `/toggle-memory`. The design + pause-memory commands align with the new `/v1/design*` endpoints and memory tooling. See [Hidden Commands](hidden-commands.md).
- **Provider selector now checks a `gateway` plane first** — `yr()` (`:94637`) returns `"gateway"` via `Lm()` before the Bedrock/Foundry/AnthropicAws/Mantle/Vertex/firstParty ternary, and the OAuth-capable plane gate `ud()` (`:94671`) now admits **firstParty | anthropicAws | gateway** (was first-party only). See [Architecture](architecture.md).

## Analysis scope

This version's analysis is split across sibling reports:

- [Feature Flags](feature-flags.md) (243 flags, accessor-decoded)
- [Plan and Tier Gating](plan-tier-gating.md)
- [API Endpoints](api-endpoints.md) (vaults, memory stores, skill versioning, design, frame deploy)
- [Telemetry](telemetry.md) (1163 events, 44 categories; first-party spine + re-entrancy guard)
- [System Prompt](system-prompt.md) (`zam` composer + provider-aware intro `$Rn`)
- [Tool Definitions](tool-definitions.md) (49 tools; `Ys` factory)
- [Security Model](security-model.md) (Haiku-class command classifier; per-model read-before-write keying)
- [Architecture](architecture.md) (Bun v1.4.0; daemon; gateway-first provider planes)
- [Model References](model-references.md) (Zod-validated catalog; `fable` family)
- [Environment Variables](environment-variables.md) (526 `CLAUDE_*`/`ANTHROPIC_*` vars)
- [Hidden Commands](hidden-commands.md)
- [Codenames](codenames.md) (kairos, teleport, cowork, amber/flint, and the `tengu_*` zoo)
- [Device Fingerprinting](device-fingerprinting.md) — the marquee section from 2.1.169, re-verified here

## Marquee: the model layer became a validated catalog

The standout *new* code in 2.1.197 is the rewrite of how Claude Code knows about models — and the new families it now knows about. Fully sourced:

- **Routing moved from code to data.** In 2.1.169 the routing table was a hand-coded object literal (`tz`) and every capability was its own bespoke predicate. 2.1.197 replaces that with a **frozen, declarative catalog `pQs`** (`cli.beauty.js:94000-94405`): a `models` array where each entry carries `id`, `family`, `display_name`, `knowledge_cutoff`, `provider_ids`, `context`, `capabilities[]`, `default_effort`, and `image_limits`, plus an `aliases` map and `latest_per_family`. A Zod schema `hfd()` (`:94492`) validates it; `iMt()` (`:94507`) returns the parsed catalog or an empty fallback `yfd` on failure.
- **Capabilities are now data, not code.** A model "supports effort" because its catalog `capabilities` array contains `"effort"`, queried via `dU(id,"effort")` (`:94416`). The old predicate functions (`Jw`/`c0e`/`Rne`) still exist but now mostly delegate to `dU(...)`. A bridge function `Afd()` (`:94543`) converts the catalog into the legacy per-plane routing object `va` (the `tz` successor) so older code keeps working.
- **New model families shipped.** The id extraction surfaces **`claude-fable-5`**, **`claude-fable-5-mythos-5`**, **`claude-sonnet-5`**, and **`claude-opus-4-7-fast`** — a `fable` family and a `sonnet-5` id that did not exist in 2.1.169 (family-only count 31→36). `Sfd` (`CATALOG_ID_TO_KEY`, `:94570`) maps each catalog id to a short key (`opus48`, `fable5`, …).
- **The identity model is unchanged in shape.** `device_id`/`userID` is still a random 256-bit token from `crypto.randomBytes(32).toString("hex")` (`vW()`, `:606434`), persisted to `~/.claude.json`, surviving logout — re-verified, not regressed. See [Device Fingerprinting](device-fingerprinting.md).

The takeaway: 2.1.197 is not a new platform, it's a **hardening pass on the 2.1.169 platform** — a typed model catalog, credential vaults, skill versioning, a design/deploy surface, and the steady upward creep of flags, events, and tools, all bolted onto the same Bun-based agent fabric, now running on Bun v1.4.0.
</content>
</invoke>
