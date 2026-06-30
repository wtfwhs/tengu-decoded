# Model References

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.3.14

See [data/models.yaml](data/models.yaml) for the structured dataset.

The model layer lives in a few tightly-coupled blocks of `cli.beauty.js`:

- **Routing table** `tz` (lines `92909-93056`) — per-family object with a `firstParty` id plus one id per provider plane.
- **Provider planes** `Mq()` / `VM()` / `wz()` / `ES()` (`93073-93158`).
- **Alias resolution** `c7()` and the default getters `HT/KE/dcH/hG/z7` (`99476-99732`).
- **Capability predicates** (`129936-130370`, `184049-184257`) — pure functions keyed on the canonical id.
- **Fallback / retry** (`216340-216470`, `561020-561160`) and **fast mode** (`98929-99360`).

## Current Models

| Family | Canonical ID | firstParty API ID | Bedrock | Vertex | Knowledge cutoff |
|--------|--------------|-------------------|---------|--------|------------------|
| **Opus 4.8** (default) | `claude-opus-4-8` | `claude-opus-4-8` | `us.anthropic.claude-opus-4-8` | `claude-opus-4-8` | Jan 2026 |
| Opus 4.7 | `claude-opus-4-7` | `claude-opus-4-7` | `us.anthropic.claude-opus-4-7` | `claude-opus-4-7` | Jan 2026 |
| Opus 4.6 | `claude-opus-4-6` | `claude-opus-4-6` | `us.anthropic.claude-opus-4-6-v1` | `claude-opus-4-6` | May 2025 |
| Opus 4.5 | `claude-opus-4-5` | `claude-opus-4-5-20251101` | `…-4-5-20251101-v1:0` | `…@20251101` | May 2025 |
| Opus 4.1 | `claude-opus-4-1` | `claude-opus-4-1-20250805` | `…-4-1-20250805-v1:0` | `…@20250805` | — |
| Opus 4.0 | `claude-opus-4-0` | `claude-opus-4-20250514` | `…-4-20250514-v1:0` | `…@20250514` | Jan 2025 |
| **Sonnet 4.6** | `claude-sonnet-4-6` | `claude-sonnet-4-6` | `us.anthropic.claude-sonnet-4-6` | `claude-sonnet-4-6` | Aug 2025 |
| Sonnet 4.5 | `claude-sonnet-4-5` | `claude-sonnet-4-5-20250929` | `…-4-5-20250929-v1:0` | `…@20250929` | Jan 2025 |
| Sonnet 4.0 | `claude-sonnet-4-0` | `claude-sonnet-4-20250514` | `…-4-20250514-v1:0` | `…@20250514` | Jan 2025 |
| Sonnet 3.7 | `claude-3-7-sonnet` | `claude-3-7-sonnet-20250219` | `…-v1:0` | `…@20250219` | — |
| Sonnet 3.5 | `claude-3-5-sonnet` | `claude-3-5-sonnet-20241022` | `…-v2:0` | `…-v2@20241022` | — |
| **Haiku 4.5** (small/fast) | `claude-haiku-4-5` | `claude-haiku-4-5-20251001` | `…-v1:0` | `…@20251001` | Feb 2025 |
| Haiku 3.5 | `claude-3-5-haiku` | `claude-3-5-haiku-20241022` | `…-v1:0` | `…@20241022` | — |

**Dated snapshots / suffixes seen in the raw model list** (`data/raw/models.txt`): `claude-opus-4-6-20251101`, `claude-sonnet-4-6-20251114`, `claude-opus-4-6-fast`, plus `-v1`/`-v2` Bedrock suffixes and `-latest` aliases for the 3.x line. The canonicaliser `ZP()` (`99555`) strips all of these down to the short id (e.g. trailing `-\d{8}` snapshots, `-v1` etc.).

### Mantle plane
Only four families have a non-null `mantle` id: Opus 4.8, Opus 4.7, and Haiku 4.5 use `anthropic.<id>`. Everything else is `null` on mantle and falls back to the nearest available family via `v$8()`.

### Eager input streaming
`eagerInputStreaming` is set per-plane on most 4.x families (Vertex always; Bedrock added for Opus 4.7/4.8 and Sonnet 4.6).

## Legacy Models

`claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `claude-2.1`, `claude-2.0`, `claude-1.3`, `claude-instant-1.1`, `claude-instant-1.2` — recognised by the canonicalisers but absent from the `tz` routing table.

## Codenamed / preview models

- **`claude-mythos-preview`** — appears in the bundled Anthropic SDK's deprecation map (`Oa9`/`Ga9`, lines `7551`/`8750`) paired with `claude-opus-4-6`, i.e. it is the preview codename for Opus 4.6.
- **`fruitcake` / `macaroon` / `mythos`** — substrings in `fV_` (`130172`), tested by `bnH()`. When a model id contains one of these, `bnH()` forces thinking off and a low `max_tokens` (2048) — these read as internal eval/preview builds, not user-selectable models.

## Alias resolution

`c7()` (`99685`) is the single entry point that turns a user string into a concrete model id. The user-facing aliases (`W_H`, `99371`) are:

```
sonnet  opus  haiku  best  sonnet[1m]  opus[1m]  opusplan
```

| Alias | Resolves via | To |
|-------|--------------|-----|
| `opus` / `best` | `HT()` | `ANTHROPIC_DEFAULT_OPUS_MODEL` → else firstParty `opus48`, 3P `opus47`, non-firstParty id `opus46` |
| `sonnet` | `KE()` | `ANTHROPIC_DEFAULT_SONNET_MODEL` → else firstParty `sonnet46`, 3P `sonnet45` |
| `haiku` | `dcH()` | `ANTHROPIC_DEFAULT_HAIKU_MODEL` → else `haiku45` |
| `opusplan` | `oV()` | Opus (`HT`) in plan mode when ≤200k tokens, else Sonnet (`KE`) |
| `…[1m]` | `bW()` | same id + `[1m]` suffix (unless `CLAUDE_CODE_DISABLE_1M_CONTEXT`) |

### Default main-loop model — `getDefaultMainLoopModelSetting (hG)` (`99543`)

```
if subscription user (hq):
    if Max (y8H) || Team-5x (gjH) || Enterprise-usage-based (lcH):  -> Opus  (+[1m] if CW())
else if api-key/wz provider:                                        -> Opus  (+[1m] if CW())
if provider == mantle:                                              -> opus47
otherwise:                                                          -> Sonnet (KE)
```

`getMainLoopModel (z7)` honours an explicit user setting first (`Sc()` reads `--model`/settings/`ANTHROPIC_MODEL`/profile model), and only falls back to `ej() = c7(hG())` if none is set. **For the account running this analysis, that resolves to `claude-opus-4-8`** — the firstParty Opus default.

### Model-related environment variables

| Env var | Effect |
|---------|--------|
| `ANTHROPIC_MODEL` | Main-loop model override (read by `Sc`); suppresses the "(from settings)" source annotation |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Override what `opus` resolves to (`HT`). `_NAME` / `_DESCRIPTION` / `_SUPPORTED_CAPABILITIES` siblings feed the picker + capability override `Ea()` |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Override `sonnet` (`KE`) + siblings |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Override `haiku` / small-fast (`dcH`) + siblings |
| `ANTHROPIC_SMALL_FAST_MODEL` (+`_AWS_REGION`) | Highest-priority small/fast model override (`xW`) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model for Task subagents; value `inherit` means "use parent's resolved model" (`ht`, `282098`) |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | Disables legacy-Opus remap (`ccH`, `99721`) |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` (+siblings) | Adds a custom entry to the model picker |
| `modelOverrides` (managed setting) | Map anthropic id → provider id (e.g. a Bedrock inference-profile ARN) |

### Legacy model remap — `ccH` / `e88`

Enabled by default; disable with `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`. On `wz()` providers the legacy Opus ids in `SA_` — `claude-opus-4-20250514`, `claude-opus-4-1-20250805`, `claude-opus-4-0`, `claude-opus-4-1` — silently resolve to the **current default Opus** (`HT()`), preserving any `[1m]` suffix (`c7`, `99703`).

## Provider planes — `Mq()` (`93073`)

`CLAUDE_CODE_USE_{BEDROCK,FOUNDRY,ANTHROPIC_AWS,MANTLE,VERTEX,GATEWAY}` select the plane; otherwise `firstParty`.

- **`wz()`** (uses first-party model ids): `firstParty`, `anthropicAws`, `gateway`.
- **`ES()`** (has first-party capabilities — gates betas, effort, thinking): `firstParty`, `anthropicAws`, `foundry`, `mantle`.
- `VM(model)` resolves the *effective* plane for a model, allowing a `mantle` secondary when the primary plane lacks the id.
- Vertex regions are read from `VERTEX_REGION_CLAUDE_*` (e.g. `VERTEX_REGION_CLAUDE_4_8_OPUS`).

## Fallback system

### 1. Overload / retry chain (`216340-216470`)

Overload = HTTP **529** or an `overloaded_error` body (`GLH`). On overload:

1. **Fast mode** (if active) is turned off and put on cooldown (`yGK`).
2. The request is retried with exponential backoff. After `Fq5 = 3` attempts, if a `fallbackModel` is configured **or** `FALLBACK_FOR_ALL_PRIMARY_MODELS` is set **or** (api-key path and a legacy Opus model), it throws `HAH(model, fallbackModel)` and emits **`tengu_api_opus_fallback_triggered`**.
3. Non-retryable errors with a `fallbackModel` set throw a *last-resort* fallback (`tengu_api_fallback_last_resort`).

**Backoff** — `QqH(attempt, retryAfter, cap=32000)` (`216462`):

```
delay = min(500 * 2^(attempt-1), cap) + random(0..25%) of that
```

Base `lq5 = 500ms`. A `retry-after` header takes precedence (`max(header*1000, computed)`). Non-sandbox runs reject a single retry-after > `60s` (`nq5`); the overload cooldown cap is 6h (`nR6`). CCR auth gets 2 retries (`Qq5`).

`--fallback-model` (CLI) accepts a list of model names/aliases tried in order; the literal `"default"` expands to `ej()`. CLI takes precedence over the `fallbackModel` setting.

### 2. Streaming → non-streaming fallback (`561020-561160`)

If a streaming request errors mid-flight, Claude Code first retries the **stream** (stale-connection retries `PH<YH`; idle-watchdog retries `dH<xH`). If it still fails and **no partial content was yielded**, it falls back to a **non-streaming** request (`tengu_streaming_fallback_to_non_streaming` → `tengu_nonstreaming_fallback_started`). If partial content was already streamed, the error is rethrown instead. Disable with `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` or flag `tengu_disable_streaming_to_non_streaming_fallback`.

### 3. Refusal fallback (`Aa`, `429349-429761`, `2780-2815`)

When a turn returns `stop_reason == "refusal"`, Claude Code can transparently retry on a different model. A per-turn latch (`refusalFallbackModelLatch`) holds the fallback model and the refused assistant turns it supersedes. A user dialog/prompt may be shown (`tengu_refusal_fallback_prompt_shown` / `_choice`). Controlled by:

- Flag `tengu_loggia_carousel` (must be on).
- **`CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`** disables it outright (`102051`).
- Server-side variant via betas `server-side-fallback-2026-06-01` and `fallback-credit-2026-06-09`.

Events: `tengu_refusal_fallback_triggered`, `_suppressed`, `_supersedes`, `_setting_changed`, `_dialog_suppressed`, `_resume_latch`, `tengu_model_fallback_triggered`.

## Fast Mode ("penguin mode")

Fast Mode is **not** a separate model id in the CLI main loop — it adds a `speed: "fast"` flag (beta `fast-mode-2026-02-01`, `pcH`) to requests on an eligible Opus. (`claude-opus-4-6-fast` *is* a distinct API model string, but the migration doc bundled in the binary states Opus 4.7/4.8 have **no** `-fast` variant; only 4.6 Fast exists as a model string.)

- **Gate** `q1()` (`98929`): `firstParty` provider **and** `!CLAUDE_CODE_DISABLE_FAST_MODE`.
- **Eligible models** `nY()`: any id containing `opus-4-6` / `opus-4-7` / `opus-4-8`.
- **Display name** `VU()` = "Opus 4.8".
- **Org kill switch**: flag `tengu_penguins_off` — a non-null string is the disable *reason*; `null` = allowed. Org status is also fetched from `/api/claude_code_penguin_mode` (`penguinModeOrgEnabled`).
- **Pricing** (`oNH`, `99234`): standard Opus 4.8 is $5/$25 per Mtok (`T8H`); **fast** Opus 4.8 is $10/$50 (`GA_`); fast on other eligible Opus is $30/$150 (`ZA_`).
- **Cooldown**: overload/rate-limit puts fast mode on a timed cooldown that auto-re-enables (`S36`/`yGK`).

| Env / flag | Effect |
|------------|--------|
| `CLAUDE_CODE_DISABLE_FAST_MODE` | Disables fast mode entirely (via `q1`) |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` | Boolean gate for Opus 4.7 fast mode (`fV1`) |
| `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS` | Treat fast-mode network errors as "available" |
| `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` | Bypass the org status check (`a88`) |
| `tengu_penguins_off` (flag) | Org-side disable reason |
| `/fast` (command) | Toggle (`tengu_fast_mode_toggled`) |

## 1M context

The 1M window is expressed as a **`[1m]` suffix** on a normal model id (parsed by `bW`, stripped for the API by `iY`). The beta header is `context-1m-2025-08-07` (`Ec`).

- **Disable**: `CLAUDE_CODE_DISABLE_1M_CONTEXT` (`T_H`, `129936`) — short-circuits `bW`/`V8H`/`NU` so `[1m]` is ignored everywhere.
- **Explicit 1M models** (`V8H`): `claude-opus-4-7`, `claude-opus-4-8` — but only on `firstParty`+canonical base URL, `anthropicAws`, or `mantle`.
- **Beta-eligible** (`NU`): Opus 4.6/4.7/4.8 and Sonnet 4.6/4.5/4.0. Excluded: all `claude-3-*`, Opus 4.0/4.1/4.5, Haiku 4.5.
- **Window** (`MT`): returns `1_000_000` when `[1m]`, or when the long-context beta is present and the model is `NU`-eligible. Sonnet 4.6 can have its base window overridden by the `kelp_forest_sonnet` client-data key.
- **Merge toggle** `isOpus1mMergeEnabled (CW)`: false on Pro, non-firstParty, or when 1M disabled; for subscription users also false when subscription type is null.

> **On `marble_lantern`**: the assignment lists "marble_lantern kill switches" for 1M. In this build the live 1M kill switch is `CLAUDE_CODE_DISABLE_1M_CONTEXT` (`T_H`); a flag literally named `marble_lantern` was **not** found. The internal codename for the 1M feature in 2.1.169 is unconfirmed (see Uncertainties).

## Effort / adaptive thinking

Effort beta header `effort-2025-11-24` (`mcH`). Levels (`zv`): `low`, `medium`, `high`, `xhigh`, `max`.

| Capability | Predicate | Models |
|------------|-----------|--------|
| Supports effort | `IP` | Opus 4.8/4.7/4.6, Sonnet 4.6 (+ any when `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`) |
| Supports `max` | `ShH` | Opus 4.8/4.7/4.6, Sonnet 4.6 |
| Supports `xhigh` | `kXH` | Opus 4.8, Opus 4.7 |
| Adaptive thinking | `xnH` | Opus 4.8/4.7/4.6, Sonnet 4.6 |
| Interleaved thinking | `iX$` | all except Haiku 4.5 and `claude-3-*` |

**Launch defaults** (`xY8`): Opus 4.8 → `high`, Opus 4.7 → `xhigh`, everything else → `high`. Requested levels **silently downgrade** if unsupported (`max`→`high` without `ShH`; `xhigh`→`high` without `kXH`, see `Rs`, `184157`).

| Env / setting | Effect |
|---------------|--------|
| `CLAUDE_CODE_EFFORT_LEVEL` | Session effort override; `unset`/`auto` → null (auto). Overrides everything for the session |
| `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT` | Force effort capability on for all models |
| `CLAUDE_CODE_DISABLE_THINKING` | Disable thinking entirely |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Disable adaptive thinking — **only effective for `opus-4-6`/`sonnet-4-6`** (`560222`) |
| `DISABLE_INTERLEAVED_THINKING` | Drop the interleaved-thinking beta |
| `MAX_THINKING_TOKENS` / `--max-thinking-tokens` | Thinking budget; `>0` enables, else `alwaysThinkingEnabled` setting governs (`FDH`) |
| `settings.ultracode = true` / `>` cmd | Maps to effort `xhigh` |

The active per-turn effort (after downgrades) is exported to hooks and Bash as **`CLAUDE_EFFORT`**.

## Capabilities matrix

| Model | Fast | 1M | Effort | xhigh | Adaptive think | Interleaved | max_output / upper |
|-------|------|-----|--------|-------|----------------|-------------|--------------------|
| `claude-opus-4-8` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 64k / 128k |
| `claude-opus-4-7` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 64k / 128k |
| `claude-opus-4-6` | ✅ | beta | ✅ | ❌ | ✅ | ✅ | 64k / 128k |
| `claude-opus-4-5` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 32k / 64k |
| `claude-opus-4-1` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | 32k / 32k |
| `claude-opus-4-0` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 32k |
| `claude-sonnet-4-6` | ❌ | beta | ✅ | ❌ | ✅ | ✅ | 32k / 128k |
| `claude-sonnet-4-5` | ❌ | beta | ❌ | ❌ | ❌ | ✅ | 32k / 64k |
| `claude-sonnet-4-0` | ❌ | beta | ❌ | ❌ | ❌ | ✅ | 32k / 64k |
| `claude-haiku-4-5` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |
| `claude-3-7-sonnet` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |

"1M = beta" means eligible via `NU()` (long-context beta header) but not "explicit 1M" via `V8H()`. Tool-search capability is provider-gated (`UFK` returns `advanced-tool-use-2025-11-20` on first-party planes, `tool-search-tool-2025-10-19` on Vertex/Bedrock/Mantle/Gateway) and additionally requires structured-outputs support (`SyH`) on 4.6+ non-`claude-3` models. Capability overrides per env-pinned model come from `ANTHROPIC_*_SUPPORTED_CAPABILITIES` via `Ea()`.

## Small / fast model usage

`getSmallFastModel (xW)` resolves `ANTHROPIC_SMALL_FAST_MODEL` → else Haiku 4.5 (`dcH`) on Haiku-eligible providers → else the main-loop model. Haiku is used for: the command-injection prefix classifier, WebFetch page summarisation, the auto-mode command classifier, title/summary generation, and as the default model for prompt hooks.

## What's new vs 2.1.32

- **New families**: **Opus 4.8** (now the firstParty default — the model running this analysis), **Opus 4.7**, **Sonnet 4.6**. Opus 4.6 is demoted to the 3P-default / legacy slot.
- **Effort levels** (`low`/`medium`/`high`/`xhigh`/`max`) with per-model support, silent downgrade, launch defaults, and the `CLAUDE_EFFORT` hook/Bash export — new surface.
- **Adaptive thinking** (`xnH`) and `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` — new.
- **Fast Mode / "penguin mode"** expanded: org kill switch `tengu_penguins_off`, `/api/claude_code_penguin_mode`, fast-mode pricing tiers, cooldown, `CLAUDE_CODE_DISABLE_FAST_MODE`, `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE`.
- **1M context** extended to Opus 4.7/4.8 as *explicit* 1M models (`V8H`), with `CLAUDE_CODE_DISABLE_1M_CONTEXT`.
- **Refusal fallback** + **server-side fallback** (betas `server-side-fallback-2026-06-01`, `fallback-credit-2026-06-09`) — new, with `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`.
- **`mantle`** and **`gateway`** provider planes added (vs bedrock/vertex/foundry/anthropicAws in 2.1.32).
- `claude-mythos-preview` confirmed as the Opus 4.6 preview codename; `fruitcake`/`macaroon`/`mythos` internal eval-build substrings (`bnH`).

## Uncertainties

- **`marble_lantern`** / **`penguins_off`**: `tengu_penguins_off` is confirmed (fast-mode org kill switch). A flag literally named `marble_lantern` was **not** found in this build; the 1M kill switch is the env var `CLAUDE_CODE_DISABLE_1M_CONTEXT`. The internal feature-flag codename for 1M-context (if any) in 2.1.169 is unconfirmed.
- `DISABLE_FAST_MODE` (assignment spelling) is in the binary as `CLAUDE_CODE_DISABLE_FAST_MODE`; a bare `DISABLE_FAST_MODE` was not found.
- The minified identifiers (`HT`, `KE`, `c7`, `Mq`, etc.) are build-specific; names will differ in other builds.
- Exact `max`/`xhigh` thinking-token budgets are computed dynamically (`xFK`/`UDH` upper limits) rather than fixed per level.
