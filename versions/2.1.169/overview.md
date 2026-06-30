# Claude Code v2.1.169 Overview

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64
> **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Runtime**: Bun v1.3.14 (standalone compiled)

## Context

This analysis lands roughly four months and **137 patch releases** after [2.1.32](../2.1.32/overview.md) (2026-02-05 → 2026-06-08). In that window Claude Code stopped being "a CLI with a few server-gated features" and became a **cloud-connected, multi-agent, schedulable platform**.

The headline shifts:

- The runtime changed from **Node SEA** to a **Bun v1.3.14 standalone compiled binary**.
- **Segment** — the primary product-analytics pipe in 2.1.32 — is **gone**. First-party event logging is now the spine.
- The `device_id` story is no longer ambiguous: it is a **random per-install token**, not a hardware fingerprint (see the marquee section below).
- A whole **cloud backend** appears: `/v1/sessions`, `/v1/agents`, `/v1/environments`, `/v1/files`, plus `claude.ai/code/routines` for cron-style scheduling.
- A **background-agent daemon**, **loops/scheduling (kairos)**, **workflows**, **agent teams (now default-on)**, and **remote control / teleport** all ship in the binary.

Where 2.1.32 was "the binary ships the code, the server flips the flag," 2.1.169 is "the binary is a thick client for an Anthropic-hosted agent fabric."

## Methodology — this analysis goes beyond `strings`

The 2.1.32 analysis was driven largely by `strings` over the binary and inference from isolated tokens. **This analysis is grounded in the actual source.**

The v2.1.169 binary is a **Bun v1.3.14 standalone compiled executable** (`linux-x86_64` ELF). Bun embeds two copies of the application inside the ELF:

1. A **JavaScriptCore bytecode/snapshot** copy (~105 MB offset, UTF-16) — the fast-load path Bun actually executes.
2. The **full plaintext minified JS source** (~228 MB offset, **16.5 MB**) — bundle header `// @bun @bytecode @bun-cjs`.

We carved the plaintext JS bundle out of the ELF and **beautified it to ~662k lines** (`cli.beauty.js`). Every claim in these reports is therefore traceable to a **real function body**, not a string in isolation:

- We can read what a flag *does* when it's on/off, not just that it exists (e.g. the flag accessor `j$(name, default)` and its resolution order: local override → managed override → not-ready default → GrowthBook exposure → cached value).
- We can read the system-prompt composer `iT(...)` and enumerate every section builder.
- We can read the device-identity code (`cU()` at `cli.beauty.js:141641`) and confirm `device_id` is `crypto.randomBytes(32).toString("hex")` — definitively *not* hardware-derived.

Provenance for each finding is preserved under `data/raw/` (flag/event/env/model extracts) and citations point at `cli.beauty.js:LINE` where the exact text is load-bearing.

> Note: minified identifiers are mangled and **change every build**, so symbol names here (`j$`, `iT`, `d`, `cU`, `Mq`) are this-build-specific. They are inferred from surrounding string context and call sites; tentative inferences are flagged as such in the per-topic reports.

## Headline findings

| Dimension | 2.1.32 | 2.1.169 | Change |
|---|---|---|---|
| Feature flags | ~48 | **218** | 4.5× more server-gated surface |
| Telemetry events | ~239 | **1086** | 4.5× more instrumentation |
| Built-in tools | 17 | **~46** | cloud, daemon, team, remote tools added |
| Environment variables | 54 | **490** | huge config surface (providers, daemon, remote, teams) |
| Runtime | Node SEA | **Bun v1.3.14 standalone** | new packaging + JSC bytecode copy |
| Product analytics | Segment (primary) | **Segment removed** | first-party event logging is the spine |
| Device ID | (ambiguous) | **random 256-bit token** | per-install, not hardware-derived |
| Backend | mostly stateless CLI | **cloud: sessions / agents / environments / files** | thick client for hosted agents |
| Scheduling | none | **loops + kairos + `claude.ai/code/routines`** | cron-style agent scheduling |
| Background execution | none | **background-agent daemon** | long-lived `tengu_bg_*` / `tengu_daemon_*` lifecycle |
| Workflows | none | **workflows** | multi-step orchestration |
| Agent Teams | server-gated, off | **default-on** | the 2.1.32 dual-gate is relaxed |
| Remote control | none | **teleport / remote-control bridge** | `teleportedSessionInfo`, `remote_*` client types |
| Cowork | none | **cowork** | `remote_cowork`, cowork plugins/settings |

These numbers are sourced from the carved bundle: flags via the `j$`/`cS` accessor extraction, events via the `d(...)` fire-fn extraction (and the curated allow-list at `cli.beauty.js:141889`), env vars via the `CLAUDE_*`/`ANTHROPIC_*` scan, and tools via the tool-registry definitions.

## Analysis scope

This version's analysis is split across sibling reports:

- [Feature Flags](feature-flags.md) (218 flags, accessor-decoded)
- [Plan and Tier Gating](plan-tier-gating.md)
- [API Endpoints](api-endpoints.md) (incl. new cloud surfaces)
- [Telemetry](telemetry.md) (1086 events; Segment removed)
- [System Prompt](system-prompt.md) (`iT` composer + section builders)
- [Tool Definitions](tool-definitions.md) (~46 tools)
- [Security Model](security-model.md) (LLM command classifier; credential storage)
- [Architecture](architecture.md) (Bun runtime; daemon; cloud fabric)
- [Model References](model-references.md)
- [Environment Variables](environment-variables.md) (490 vars)
- [Hidden Commands](hidden-commands.md)
- [Codenames](codenames.md) (kairos, teleport, cowork, baku, and the `tengu_*` zoo)
- [**Device Fingerprinting**](device-fingerprinting.md) — **NEW deep-dive** (the marquee section)

## Marquee: device fingerprinting

The user specifically asked how Claude Code identifies the device it runs on. The short version, fully sourced:

- **`device_id` / `userID` is a random per-install token.** It is generated by `cU()` (`cli.beauty.js:141641`) as `crypto.randomBytes(32).toString("hex")` — a 256-bit hex string — created on first run, persisted to `~/.claude.json` under the key `userID`, and it **survives logout**. It is *not* derived from hardware. This single token is reused as the GrowthBook `id`, the OpenTelemetry `user.id`, the API `metadata.user_id` / `device_id`, and the Datadog bucket seed.
- **The real hardware machine-id is read but stripped.** Cross-platform machine-id code (`node-machine-id` style) lives at `cli.beauty.js:136682+` and `:323174+`, dispatching per-OS (`ioreg`/`IOPlatformUUID` on darwin, `/etc/machine-id` then `/var/lib/dbus/machine-id` on linux, `kenv smbios.system.uuid` on freebsd, `MachineGuid` registry on win32). But the OTel host detector that reads it **discards everything except `host.arch`** — the hardware UUID never leaves the machine.
- **Credentials are stored in plaintext.** `~/.claude/.credentials.json`, `chmod 600`, **not machine-bound and not encrypted**.
- **Trusted-device tokens enable remote control.** `CLAUDE_TRUSTED_DEVICE_TOKEN` + the `/api/auth/trusted_devices` endpoint (header `X-Trusted-Device-Token`) authorize the remote/teleport bridge, alongside an identity surface of `sessionId`, `oauthAccount`, `organizationUuid`, `accountUuid`, `deviceId`, and the `ANTHROPIC_*_ID` env family.

The takeaway: Claude Code's identity model is **account-and-install-scoped, not hardware-scoped**. It reads the hardware fingerprint and deliberately throws it away.
