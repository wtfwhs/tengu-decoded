# Shared Analysis Context — Claude Code (tengu) v2.1.169

You are one of several agents collaboratively producing a deep reverse-engineering analysis of
Claude Code v2.1.169, contributing to the `tengu-decoded` repo. This time the analysis goes
**beyond `strings`** — we extracted and beautified the actual JavaScript source.

## Established ground truth (verified from the binary)

- **Version:** 2.1.169
- **Build timestamp:** 2026-06-08T03:22:12Z
- **GIT_SHA:** eb44edf196b8a320135d5a27a3cfba37773ce0cd
- **Platform analyzed:** linux-x86_64, ELF 64-bit
- **Runtime:** **Bun v1.3.14** standalone compiled binary (NOT Node SEA — this is new vs 2.1.32).
  The binary embeds (a) a JavaScriptCore bytecode/snapshot copy (~105MB offset, UTF-16) and
  (b) the full plaintext minified JS source (~228MB offset, 16.5MB). Bundle header is
  `// @bun @bytecode @bun-cjs`.
- **Feature-flag backend:** still GrowthBook (`cachedGrowthBookFeatures`).
- **Flag accessors in THIS build (minified names change every build):**
  - `j$(name, default)` = primary flag get (was `kL` in 2.1.32). Resolution order:
    1. `HP$()` override map (local/env overrides), 2. `$P$()` override map (managed/remote settings),
    3. if not ready `ru()` return default, 4. track GrowthBook exposure, 5. `cachedGrowthBookFeatures[name]` else default.
  - `cS(name, default, _)` = thin wrapper around `j$`.
  - `OG6(name)` / `lS(name)` = async boolean flag checks (was `df`).
  - Config-object flags pass an object/array/string default to `j$` (was `Cu`).
- **Telemetry event fire fn:** `d(eventName, payload)` (was `c`). Also `Ny(...)`.
- **System prompt composer:** `iT(tools, msgState, ...)` (was `G3`). It returns an array of
  sections. Dynamic sections are wrapped in `rT(cacheKey, builderFn)` for per-section prompt
  caching / per-turn refresh. Static section builders: `Xsf` (intro), `Lsf` (# System),
  `Psf` (# Doing tasks), `Wsf` (# Executing actions with care), `Zsf` (# Using your tools),
  `Vsf` (# Tone and style). Three sub-agent/SDK intro variants: `uG6` (default),
  `CeK` (Agent SDK), `beK` (Claude agent). Simple mode gated by env `CLAUDE_CODE_SIMPLE`.

## Files available to you

- **Beautified source (PRIMARY):** `/tmp/cc-deep/cli.beauty.js` — 662k lines, readable. USE THIS.
  Search with `command rg -n 'pattern' /tmp/cc-deep/cli.beauty.js` and Read with offset/limit.
  (Use `command rg`, not bare `rg`, to bypass a shell wrapper.)
- **Minified source:** `/tmp/cc-deep/cli.min.js` — 30k lines (one-liner-ish), for byte-accurate strings.
- **Full strings dump:** `/tmp/cc-strings-2.1.169.txt`
- **Raw extracts:** `/tmp/tengu-decoded/versions/2.1.169/data/raw/` (flags-j.txt, events-d.txt,
  env-claude.txt, models.txt, commands-full.txt, strings-urls.txt, strings-long-prompts.txt, etc.)
- **Reference format (2.1.32):** `/tmp/tengu-decoded/versions/2.1.32/` — MATCH this repo's
  markdown style and YAML schema exactly. Read the corresponding 2.1.32 file before writing yours.

## Output location

Write your assigned files into `/tmp/tengu-decoded/versions/2.1.169/` (markdown at top level,
YAML under `data/`). Directory already exists.

## Quality bar (the user explicitly asked to "go super deep, beyond string analysis")

- Ground every claim in the actual source. Where useful, cite the function name (e.g. `j$`, `iT`)
  or `cli.beauty.js:LINE`. Prefer reading real function bodies over guessing from isolated strings.
- Decode behavior: don't just list a flag — explain what the code DOES when it's on/off.
- Note what's NEW or CHANGED vs 2.1.32 where you can tell.
- Be precise about defaults (`!0`=true, `!1`=false, `null`, `{}`, `""`, numbers).
- Mark genuine uncertainty explicitly; never fabricate. Minified identifiers are mangled — infer
  from surrounding string context and call sites, and say when an inference is tentative.
- Write for both humans and future LLM sessions: clear headings, tables for lookup data,
  fenced code blocks for extracted snippets.

## YAML schema reminders (from 2.1.32)

- `feature-flags.yaml`: top key `flags:`, each item `name, default, category, accessor, description`,
  optional `related_env_var`, `notes`.
- `tools.yaml`: top key `tools:` (name, internal_name, description, category, notes), plus
  `schema_serialisation`, `permission_modes`.
- Other YAMLs: follow the 2.1.32 file's structure for that topic.

## Device-fingerprinting ground truth (verified — this is a MARQUEE section)

The user specifically wants a deep section on how Claude Code fingerprints the device it runs on.
Confirmed so far:

- **Cross-platform machine ID** (OTel host-id / `node-machine-id` style), bundled at
  `cli.beauty.js:136682+` AND `cli.beauty.js:323174+`. Platform dispatch (`OE_`/equiv):
  - darwin: `ioreg -rd1 -c "IOPlatformExpertDevice"` → parse `IOPlatformUUID`
  - linux: read `/etc/machine-id` then `/var/lib/dbus/machine-id`
  - freebsd: `/etc/hostid` then `kenv -q smbios.system.uuid`
  - win32: `REG QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid`
  - default: unsupported → undefined
- Identity fields present: `sessionId` (654 refs), `oauthAccount` (59), `organizationUuid` (40),
  `accountUuid` (25), `account_uuid` (19), `userID`/`userId`, `deviceId` (45), `device_id` (30).
- Hashing primitives: `createHash("sha256")` ×33, `sha1` ×6, `md5` ×2 — trace whether machine-id
  is hashed before use as `device_id`.
- Env: `CLAUDE_TRUSTED_DEVICE_TOKEN`, `CLAUDE_CODE_ACCOUNT_UUID`, `CLAUDE_CODE_ACCOUNT_TAGGED_ID`,
  `CLAUDE_CODE_ORGANIZATION_UUID`, `CLAUDE_CODE_USER_EMAIL`, `ANTHROPIC_*_ID` family.

The fingerprinting section is split into PARTIAL files (the orchestrator merges them). Write your
assigned partial to `/tmp/tengu-decoded/versions/2.1.169/_fpNN-<topic>.md` (underscore-prefixed,
these get merged into `device-fingerprinting.md` later). Also write `data/fingerprinting.yaml`
ONLY if you are the machine agent (FP1); other FP agents append to their own yaml partial
`data/_fpNN.yaml`.

## Batch-A cross-cutting facts (VERIFIED — use these; don't contradict)

- **device_id / "userID"**: a random 256-bit hex token from `cU()` (`cli.beauty.js:141641`,
  `crypto.randomBytes(32).toString("hex")`), persisted to `~/.claude.json` key `userID`, created on
  first run, survives logout. It is NOT derived from hardware. It is the `id` for GrowthBook,
  OTel `user.id`, API `metadata.user_id`/`device_id`, Datadog bucket seed. The hardware machine-id
  (ioreg/etc) is read by the OTel host detector but STRIPPED (only `host.arch` kept).
- **Telemetry backends present**: (1) first-party event logging — `api.anthropic.com/api/event_logging/v2/batch`
  (legacy `/api/event`), ON for first-party auth; (2) Datadog us5 `http-intake.logs.us5.datadoghq.com/api/v2/logs`
  (allow-listed mirror, OFF by default, flag `tengu_log_datadog_events`); (3) OpenTelemetry (user-configured, OFF);
  (4) GrowthBook `cdn.growthbook.io` (flags); (5) Perfetto (local). **Segment is REMOVED** (was primary in
  2.1.32). **No Sentry.** Datadog token rotated vs 2.1.32.
- **Provider planes** via `Mq()` (`cli.beauty.js:93073`) mapping `CLAUDE_CODE_USE_BEDROCK/VERTEX/FOUNDRY/MANTLE/ANTHROPIC_AWS`
  → firstParty | bedrock | vertex | foundry | mantle | gateway. Telemetry dropped on 3P providers.
- **Runtime**: Bun v1.3.14 compiled standalone (was Node SEA in 2.1.32).
- **OAuth**: prod CLIENT_ID `9d1c250a-e61b-44d9-88ed-5944d1962f5e`, PKCE S256; profile at `/api/oauth/profile`;
  trusted devices at `/api/auth/trusted_devices` (header `X-Trusted-Device-Token`).
- **Counts**: 218 feature flags (was ~48), 1086 telemetry events (was ~239), ~46 built-in tools (was 17),
  490 env vars (was 54).
- **Credentials**: plaintext `~/.claude/.credentials.json` (chmod 600), NOT machine-bound/encrypted.
- **Command-injection**: now an LLM prefix-classifier (Haiku) + destructive-command regex table +
  two-stage auto-mode classifier. The old 14-category regex pipeline + `DISABLE_COMMAND_INJECTION_CHECK`
  are GONE.
- New API surfaces: `/v1/sessions`, `/v1/agents`, `/v1/environments`, `/v1/files`, `claude.ai/code/routines`.
