# Model References

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.4.0

See [data/models.yaml](data/models.yaml) for the structured dataset.

## Headline: the model layer was rewritten into a validated catalog

In 2.1.169 the routing table was a hand-coded object literal (`tz`) and every capability was its
own bespoke predicate function. **2.1.197 replaces that with a declarative, Zod-validated model
catalog.** The shape:

- **Catalog data** — a frozen object `pQs` (`cli.beauty.js:94000-94405`): `schema_version`, a `models`
  array (each entry has `id`, `family`, `display_name`, `knowledge_cutoff`, `provider_ids`,
  `eager_input_streaming`, `context`, `capabilities[]`, `default_effort`, `image_limits`), an
  `aliases` map (with `default` + `per_provider`), and `latest_per_family`.
- **Schema + parse** — `hfd()` (Zod schema, `:94492`) validates it; `iMt()` (`:94507`) returns the
  parsed catalog (or empty fallback `yfd` on failure).
- **Lookups** — `_fd()` builds `id → entry` (`:94510`); `bfd()` builds `providerId → id` (`:94514`,
  throws on collisions). `WM(id)` (`:94412`) = entry getter; `dU(id, cap)` (`:94416`) = capability
  check; `fQs(alias, provider)` (`:94420`) = alias→id with per-provider override.
- **Bridge to legacy code** — `Sfd` (`CATALOG_ID_TO_KEY`, `:94570`) maps each catalog id to a short
  key (`opus48`, `fable5`, …); `Afd()` (`:94543`) converts the catalog into the old per-plane routing
  object **`va`** (the 2.1.169 `tz` successor, `:94587`); `Cj()` asserts no 3P id is `null`.
- **Capabilities are now data, not code.** A model "supports effort" because its catalog
  `capabilities` array contains `"effort"`, queried via `dU(id,"effort")`. The old predicate functions
  still exist (`Jw`/`c0e`/`Rne` for effort tiers) but now mostly delegate to `dU(...)`.

The other coupled blocks:

- **Provider planes** `yr()`/`l_()`/`ud()`/`S1()` (`93xxx-94640`).
- **Alias resolution** `Bo()` (`:102388`, the `c7` successor) + default getters `O_/nE/Rj/Wje`
  (`:101772-101807`) + main-loop selection `Ey/Ww` (`:101860-102249`).
- **Capability / window / output** predicates (`132480-133050`, `146660-146945`).
- **Fallback / fast mode / pricing** (`100577-101086`, `596700-596930`, `604459-604480`).

## Current Models

| Family | Catalog ID | Key | firstParty API ID | Bedrock | Vertex | Cutoff | Std price $/Mtok |
|--------|-----------|-----|-------------------|---------|--------|--------|------------------|
| **Fable 5** (Mythos-class, `best`) | `claude-fable-5` | `fable5` | `claude-fable-5` | `us.anthropic.claude-fable-5` | `claude-fable-5` | Jan 2026 | 10 / 50 |
| Mythos 5 (approved orgs) | `claude-mythos-5` | — | `claude-mythos-5` | (catalog null; `IQs` `us.anthropic.claude-mythos-5`) | null | Jan 2026 | 10 / 50 |
| **Opus 4.8** (default Opus; model running this analysis) | `claude-opus-4-8` | `opus48` | `claude-opus-4-8` | `us.anthropic.claude-opus-4-8` | `claude-opus-4-8` | Jan 2026 | 5 / 25 |
| Opus 4.7 | `claude-opus-4-7` | `opus47` | `claude-opus-4-7` | `us.anthropic.claude-opus-4-7` | `claude-opus-4-7` | Jan 2026 | 5 / 25 |
| Opus 4.6 | `claude-opus-4-6` | `opus46` | `claude-opus-4-6` | `us.anthropic.claude-opus-4-6-v1` | `claude-opus-4-6` | May 2025 | 5 / 25 |
| Opus 4.5 | `claude-opus-4-5` | `opus45` | `claude-opus-4-5-20251101` | `…-4-5-20251101-v1:0` | `…@20251101` | May 2025 | 5 / 25 |
| Opus 4.1 | `claude-opus-4-1` | `opus41` | `claude-opus-4-1-20250805` | `…-4-1-20250805-v1:0` | `…@20250805` | Jan 2025 | 15 / 75 |
| Opus 4.0 | `claude-opus-4-0` | `opus40` | `claude-opus-4-20250514` | `…-4-20250514-v1:0` | `…@20250514` | Jan 2025 | 15 / 75 |
| **Sonnet 5** (default Sonnet) | `claude-sonnet-5` | `sonnet5` | `claude-sonnet-5` | `us.anthropic.claude-sonnet-5` | `claude-sonnet-5` | Jan 2026 | 3 / 15 |
| Sonnet 4.6 | `claude-sonnet-4-6` | `sonnet46` | `claude-sonnet-4-6` | `us.anthropic.claude-sonnet-4-6` | `claude-sonnet-4-6` | Aug 2025 | 3 / 15 |
| Sonnet 4.5 | `claude-sonnet-4-5` | `sonnet45` | `claude-sonnet-4-5-20250929` | `…-4-5-20250929-v1:0` | `…@20250929` | Jan 2025 | 3 / 15 |
| Sonnet 4.0 | `claude-sonnet-4-0` | `sonnet40` | `claude-sonnet-4-20250514` | `…-4-20250514-v1:0` | `…@20250514` | Jan 2025 | 3 / 15 |
| Sonnet 3.7 | `claude-3-7-sonnet` | `sonnet37` | `claude-3-7-sonnet-20250219` | `…-v1:0` | `…@20250219` | — | 3 / 15 |
| Sonnet 3.5 | `claude-3-5-sonnet` | `sonnet35` | `claude-3-5-sonnet-20241022` | `…-v2:0` | `…-v2@20241022` | — | 3 / 15 |
| **Haiku 4.5** (small/fast) | `claude-haiku-4-5` | `haiku45` | `claude-haiku-4-5-20251001` | `…-v1:0` | `…@20251001` | Feb 2025 | 1 / 5 |
| Haiku 3.5 | `claude-3-5-haiku` | `haiku35` | `claude-3-5-haiku-20241022` | `…-v1:0` | `…@20241022` | — | 0.8 / 4 |

Standard prices from the pricing map `Fje` (`:101068`): Haiku 3.5 `E4r`=$0.8/$4, Haiku 4.5 `A4r`=$1/$5,
all Sonnet (incl. Sonnet 5) `jte`=$3/$15, Opus 4.5–4.8 `jle`=$5/$25, Opus 4.0/4.1 `$ai`=$15/$75,
Fable 5 + Mythos 5 `OHn`=$10/$50. (Fast-mode pricing differs — see below.)

### NEW vs 2.1.169 — five new model ids (56 → 61)

- **`claude-fable-5`** (family `fable`, display "Fable 5") — the marquee addition. The bundled identity
  prompt `Dam` (`:593910`) describes it as "the first model in Anthropic's new Claude 5 family and part
  of a new **Mythos-class** model tier that sits above Claude Opus in capability… Fable 5 is the most
  advanced generally available Claude model." Native 1M, all premium capabilities, plus three
  Fable-only ones (`rejects_disabled_thinking`, `fable_5_mitigations`, `lean_prompt`).
- **`claude-mythos-5`** (family `mythos`, "Mythos 5") — Fable 5's sibling; "Fable 5 and Mythos 5 share
  the same underlying model… Mythos 5 is available without those [dual-use safety] measures to only
  approved organizations" (`:593910`). In the catalog **all 3P provider ids are `null`** (`:94356`),
  so it is firstParty-only there; a separate const `IQs` (`:94589`) does carry full provider ids, and
  it is hard-coded as "capability-complete" across the predicate functions (`|| e==="claude-mythos-5"`
  appears in `dU`-wrapping checks at `:132704`, `:132842`, `:133036`, `:146670`, `:146679`, `:146688`).
- **`claude-sonnet-5`** (family `sonnet`, "Sonnet 5") — **now the default `sonnet` alias** (was 4.6).
  Native 1M with `native_1m_3p` on bedrock/vertex/foundry (`:94182`). Cutoff Jan 2026.
- **`claude-opus-4-7-fast`** — appears only in the bundled migration doc as a (future-retired) Fast
  Mode string (`:671877`); it is NOT a catalog entry. The CLI synthesises Opus-4.7 fast via the speed
  flag, not this id.
- A `claude-fable-5.md` doc reference (`data/raw/models.txt:28`) — a docs path, not a model id.

### Eager input streaming
Per-plane via the catalog `eager_input_streaming` object (`Efd`, `:94528`). Vertex on every 4.x+
family; Bedrock additionally on Sonnet 4.6/5, Opus 4.7/4.8, **Fable 5** (and `IQs` Mythos 5). Activated
at request time by `:594037` (also gated by `tengu_fgts` for firstParty).

### Mantle plane
Non-null `mantle` id only for: Fable 5, Sonnet 5, Opus 4.7, Opus 4.8, Haiku 4.5 (all `anthropic.<id>`),
plus Mythos 5 via `IQs`. Everything else is `null` on mantle.

## Legacy Models

`claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `claude-2.1`, `claude-2.0`, `claude-1.3`,
`claude-instant-1.1`, `claude-instant-1.2` — recognised by the canonicaliser `c_()` (`:102261`) but
absent from the catalog/`va` routing map. The canonicaliser strips dated `-\d{8}` snapshots, `-v1`/`-v2`
Bedrock suffixes, and `-latest` aliases down to the short id.

## Codenamed / internal model strings

- **`claude-mythos-preview`** — still referenced (`_I` 1M check special-cases it at `:132495`); the
  bundled SDK deprecation map continues to alias it to Opus 4.6. With Mythos **5** now shipping as a
  real id, `mythos-preview` is the older Opus-4.6 preview codename, distinct from `claude-mythos-5`.
- The 2.1.169 `fruitcake`/`macaroon`/`mythos` eval-substring list (old `bnH`) is no longer the gate —
  internal-build behaviour is now driven by the catalog `capabilities` array.

## Alias resolution

`Bo(e)` (`:102388`, was `c7`) is the single entry point turning a user string into a concrete id.
User-facing aliases `Uye` (`:94616`):

```
sonnet  opus  haiku  fable  best  sonnet[1m]  opus[1m]  fable[1m]  opusplan
```

Short aliases `Hfd` (`:94617`): `sonnet  opus  haiku  fable`.

| Alias | Resolves via | To (firstParty) |
|-------|--------------|-----------------|
| `opus` | `O_()` → `$xe()` | `ANTHROPIC_DEFAULT_OPUS_MODEL` → else catalog `aliases.opus.default` = **opus-4-8** |
| `sonnet` | `nE()` → `VHn()` | `ANTHROPIC_DEFAULT_SONNET_MODEL` → else `aliases.sonnet.default` = **sonnet-5** |
| `haiku` | `Rj()` → `M4r()` | `ANTHROPIC_DEFAULT_HAIKU_MODEL` → else `aliases.haiku.default` = **haiku-4-5** |
| `fable` | `Wje()` → `L4r()` | `ANTHROPIC_DEFAULT_FABLE_MODEL` → else `aliases.fable.default` = **fable-5** |
| `best` | `Zai()` (`:101659`) | **Fable 5** if available (`Vle()`), else Opus (`O_()`) |
| `opusplan` | `Bo`→`nE()` resting; upgrade in `rL()` | Sonnet as the resting model; Opus in plan mode (see below) |
| `…[1m]` | `bU()`/`uI()` | same id + `[1m]` (unless `CLAUDE_CODE_DISABLE_1M_CONTEXT`) |

The alias getters resolve **through the catalog**: `KHn(alias,table)` (`:101764`) calls
`fQs(alias, provider)` to get the catalog id, then maps it back to a `va` key via `Trt`. The
**per-provider** alias overrides are new in the catalog (`aliases.*.per_provider`, `:94367`):

| Alias | firstParty | bedrock | vertex | foundry | anthropicAws | mantle | gateway |
|-------|-----------|---------|--------|---------|--------------|--------|---------|
| opus | 4-8 | 4-6 | 4-6 | 4-6 | 4-7 | 4-7 | 4-7 |
| sonnet | 5 | 4-5 | 4-5 | 4-5 | 4-6 | 4-5 | 4-6 |
| haiku | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 |
| fable | 5 | 5 | 5 | 5 | 5 | 5 | 5 |

### opusplan / haiku plan-mode upgrade — `rL()` (`getRuntimeMainLoopModel`, `:101813`)

`Bo("opusplan")` returns the **resting** model `nE()` (Sonnet). The plan-mode upgrade is applied at
runtime by `rL()`: when the session model is `opusplan`/`opusplan[1m]`, permission mode is `plan`, and
context ≤200k, it swaps in Opus (`O_()`, +`[1m]` if `opusplan[1m]` or `cT()`). If the org model
restrictions (`availableModels` allowlist / `model_access` entitlement) forbid the upgrade target it
**warns and keeps the resting model** (`:101822`). A symmetric `haiku`→Sonnet plan upgrade exists
(`:101829`).

### Default main-loop model — `getDefaultMainLoopModelSetting (Ww)` (`:101860`) → `$4r()` (`:101904`)

```
$4r():
  if subscription user (Ao):
     if Max (zle) || Team-5x (Nxe) || Enterprise-usage-based (Xye):  -> Opus (O_, +[1m] if cT())
  else if api-key/ud():                                              -> Opus (O_, +[1m] if cT())
  if provider == mantle:                                             -> zd()[opus47]
  otherwise:                                                         -> Sonnet (nE = Sonnet 5)
```

`getMainLoopModel (Ts)` (`:101653`) honours an explicit user setting first (`lW()` reads
`--model`/profile/`ANTHROPIC_MODEL`), and only falls back to `Ey() = Bo(Ww())` (`:102247`) when none
is set. **For the firstParty subscription account running this analysis that resolves to
`claude-opus-4-8`** (confirmed: the live session reports model id `claude-opus-4-8`). Note the
*non-premium* firstParty default is now **Sonnet 5**, and `best` is **Fable 5**.

### Fable decline fallback — `getFableDeclineFallbackModel (Kye)` (`:102251`)

New. If the resolved default model is Fable (`iH()`), `Kye()` picks the first non-Fable of
`[O_(), nE(), Rj()]` that is org-allowed — i.e. a safe degrade target if Fable refuses/declines or is
restricted.

### Model-availability gating — `qye()` (`:101725`)

New first-class check: a model id is reported `"absent"` if it is Fable but `Vle()` is false (Fable not
enabled for this account/provider), or Mythos but `zHn()` is false. `Vle()` (`:101681`) enables Fable
only on firstParty (canonical base URL) or gateway, when the picker offers a non-disabled Fable entry
or `ANTHROPIC_DEFAULT_FABLE_MODEL` is set. Org `availableModels`/`modelOverrides` enforcement runs
through `ZMt()`/`SU()`/`tli()` (`:101925`+) — substantially expanded vs 2.1.169.

### Model-related environment variables

| Env var | Effect |
|---------|--------|
| `ANTHROPIC_MODEL` | Main-loop model override (read by `lW`) |
| `ANTHROPIC_DEFAULT_OPUS_MODEL` (+`_NAME`/`_DESCRIPTION`/`_SUPPORTED_CAPABILITIES`) | Override what `opus` resolves to (`O_`) + picker/capability siblings |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` (+siblings) | Override `sonnet` (`nE`) |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` (+siblings) | Override `haiku`/small-fast (`Rj`) |
| **`ANTHROPIC_DEFAULT_FABLE_MODEL`** (+siblings) | **NEW** — override `fable` (`Wje`); also flips `Vle()`/`J9()` so Fable is treated as available |
| `ANTHROPIC_SMALL_FAST_MODEL` (+`_AWS_REGION`) | Highest-priority small/fast override (`qw`) |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Model for Task subagents/teammates; `inherit` = use parent's model (`fDo`, `:419845`) |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` | Disable legacy-Opus remap (`Gje`, `:102434`) |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` (+siblings) | Adds a custom entry to the model picker |
| `VERTEX_REGION_CLAUDE_*` | Per-model Vertex region (`pJc`, `:4507`) — **NEW** `VERTEX_REGION_CLAUDE_FABLE_5`, `VERTEX_REGION_CLAUDE_5_SONNET` |
| `modelOverrides` (managed setting) | Map anthropic id → provider id (e.g. Bedrock ARN) |

### Legacy model remap — `Gje` / `hyd`

Enabled by default; disable with `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`. On `ud()`-style providers,
the legacy Opus ids `hyd` (`:102505`) = `claude-opus-4-20250514`, `claude-opus-4-1-20250805`,
`claude-opus-4-0`, `claude-opus-4-1` silently resolve to the **current default Opus** (`O_()`),
preserving any `[1m]` suffix (`Bo`, `:102410`). Unchanged set vs 2.1.169.

## Provider planes — `yr()` (`:94636`)

`CLAUDE_CODE_USE_{BEDROCK,FOUNDRY,ANTHROPIC_AWS,MANTLE,VERTEX,GATEWAY}` select the plane; otherwise
`firstParty`. `yr()` checks the **gateway** plane first (`Lm()` → `"gateway"`) before the
Bedrock/Foundry/AnthropicAws/Mantle/Vertex/firstParty ternary.

- **`ud()` / usesFirstPartyModelIds**: `firstParty`, `anthropicAws`, `gateway` (use the first-party id).
- **`S1()` / hasFirstPartyCapabilities** (gates betas, effort, thinking): `firstParty`, `anthropicAws`,
  `foundry`, `mantle`.
- `l_(model)` resolves the *effective* plane for a model (allows a `mantle` secondary when the primary
  plane lacks the id).
- Vertex regions from `VERTEX_REGION_CLAUDE_*` (`pJc`, `:4507`).

## Fallback system

### 1. Overload / retry chain (`604459-604480`, streaming path `596700-596930`)

Overload = HTTP **529** or an `overloaded_error` body. After the retry budget, a fallback throws
**`tengu_api_opus_fallback_triggered`** when a `fallbackModel` is set **or** `FALLBACK_FOR_ALL_PRIMARY_MODELS`
is set **or** (api-key path `!Ao()` **and** the model is **opus/fable/mythos** family —
`qte(S)||not(S)||rot(S)`, `:604459`). **CHANGED vs 2.1.169:** the api-key trigger broadened from
"legacy-Opus only" to the whole premium tier (Opus + Fable + Mythos). Non-retryable errors with a
`fallbackModel` throw a last-resort fallback (`tengu_api_fallback_last_resort`, `:604479`).

Fast mode is disabled and put on cooldown on overload/rate-limit (`kai`, `:100709` →
`tengu_fast_mode_fallback_triggered`).

### 2. Streaming → non-streaming fallback (`596700-596930`)

If a streaming request errors mid-flight before any content is yielded, Claude Code falls back to a
non-streaming request (`tengu_streaming_fallback_to_non_streaming`, `:596722`/`:596803`). If partial
content was already streamed, the error is rethrown. Disable with
`CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` / flag `tengu_disable_streaming_to_non_streaming_fallback`.

### 3. Refusal fallback (`refusalFallbackModelLatch`, `2504`/`2976-2997`)

When a turn returns `stop_reason == "refusal"`, Claude Code can transparently retry on a different
model via a per-turn latch. Gated by the flag **`tengu_loggia_carousel`** (now driven by server config
key `refusalFallbackLaneEnabled`, `:237979`) and disablable via `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`.
Server-side variant via betas `server-side-fallback-2026-06-01` (`T1`) and **`fallback-credit-2026-06-01`**
(`v1`) — note the credit beta date moved from `…06-09` (2.1.169) to `…06-01`. Events:
`tengu_refusal_fallback_triggered`/`_prompt_shown`/`_prompt_choice`/`_suppressed`/`_supersedes`/
`_setting_changed`/`_dialog_suppressed`, plus `tengu_model_fallback_triggered` and a new
`tengu_refusal_retraction_*` family (`:606734`).

### 4. CLI / setting

`--fallback-model` accepts a list; the literal `"default"` expands to `Ey()`. CLI takes precedence over
the `fallbackModel` setting.

## Fast Mode ("penguin mode")

Fast Mode adds a `speed: "fast"` request flag (beta `fast-mode-2026-02-01`, `Xrt`) on an eligible Opus —
not a separate main-loop model id.

- **Gate** `uc()` (`:100600`): `firstParty` provider **and** `!CLAUDE_CODE_DISABLE_FAST_MODE`.
- **Eligible models** `ig()` (`:100678`): `dU(model,"fast_mode")` **or** id contains `opus-4-7`/`opus-4-8`.
  **CHANGED vs 2.1.169:** the catalog grants `fast_mode` only to **Opus 4.7 and Opus 4.8** (`:94287`,
  `:94316`) — **Opus 4.6 is no longer fast-eligible in the CLI** (it was in 2.1.169). Fable 5 and
  Sonnet 5 do **not** carry `fast_mode`.
- **Display name** `iW()` (`:100656`) = "Opus 4.8".
- **Opus 4.7 sunset** — `vai()` (`:100687`) reads flag **`tengu_sunset_penguin_opus47`** (default
  `"2026-07-25"`) and, while the resting model is Opus 4.7, surfaces a sunset date. **NEW.**
- **Org kill switch**: flag `tengu_penguins_off` (`:100631`) — non-null string is the disable *reason*.
  Org status also fetched from `/api/claude_code_penguin_mode` (`:100794`, `penguinModeOrgEnabled`).
- **Pricing** (`eot`/`v4r`, `:100933`/`:100953`): Opus 4.8 fast = **$10/$50** (`OHn`); Opus 4.6/4.7 fast
  = **$30/$150** (`Nai`). Standard Opus 4.8 = $5/$25 (`jle`).
- **Availability reasons** `Khd()` (`:100614`): `free` (needs paid sub / credits), `preference` (org
  disabled), `extra_usage_disabled` (needs usage credits), `network_error`, `unknown`.
- **Cooldown** `kai`/`_4r` (`:100709`/`:100699`): overload/rate-limit → timed cooldown that
  auto-re-enables.

| Env / flag | Effect |
|------------|--------|
| `CLAUDE_CODE_DISABLE_FAST_MODE` | Disable fast mode entirely (via `uc`) |
| `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS` | Treat fast-mode network errors as "available" |
| `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` | Bypass the org status check (`$Hn`) |
| `tengu_penguins_off` (flag) | Org-side disable reason (string) |
| `tengu_sunset_penguin_opus47` (flag) | Opus 4.7 fast-mode sunset date (default 2026-07-25) |
| `/fast` (command) | Toggle (`tengu_fast_mode_toggled`) |

> `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` (present in 2.1.169) is now **inert** — its env binding is
> still registered (`:46550` → `nPu`) but `nPu` is declared and **never read** by any fast-mode logic
> (`ig()`/`uc()` don't consult it). Opus 4.7 fast mode is on by default, gated only by the catalog
> `fast_mode` capability and the sunset date.

## 1M context

The 1M window is a `[1m]` suffix on a normal model id (`mh()` parses it, `S7()`/`Gu()` strip it for the
API). Beta header `context-1m-2025-08-07` (`h7`).

- **Disable**: `CLAUDE_CODE_DISABLE_1M_CONTEXT` (`Yye`, `:132482`) — short-circuits `mh`/`_I`/`Q9` so
  `[1m]` is ignored everywhere.
- **Native 1M** `_I()` (`:132491`): the catalog entry has `context.native_1m` (or Mythos) — i.e.
  **Sonnet 5, Opus 4.7, Opus 4.8, Fable 5** — on firstParty (canonical base URL), anthropicAws, or
  mantle; on 3P planes via `context.native_1m_3p` (`YPd`, `:132501`). **Sonnet 5 uniquely** declares
  `native_1m_3p` for bedrock/vertex/foundry (`:94182`).
- **Beta-eligible** `Q9()` (`:132519`): catalog `context.supports_1m_beta` true — Opus 4.6/4.7/4.8,
  Sonnet 4.0/4.5/4.6/5, Fable 5 (and Mythos). Excluded `QHn` (`:132515`): all `claude-3-*`, Opus
  4.0/4.1/4.5, Haiku 4.5.
- **Window** `WIi()` (`:132546`): `1e6` when `[1m]`, or long-context beta present + `Q9`, or `_I`; else
  the per-model base. Catalog `window` is `200000` for non-native models and `1e6` for Fable 5 /
  Sonnet 5 / Opus 4.7 / Opus 4.8. Sonnet 4.6's base window can still be overridden by the
  `kelp_forest_sonnet` client-data key (`exn`, `:132565`).
- **Merge toggle** `cT()` (`:102338`): false on Pro, non-firstParty, or when 1M disabled.

## Effort / adaptive thinking

Effort beta `effort-2025-11-24` (`Krt`). Levels `$v` (`:146942`): `low`, `medium`, `high`, `xhigh`, `max`.

| Capability | Predicate | Models (catalog `capabilities`) |
|------------|-----------|--------------------------------|
| Supports effort | `Jw` (`:146664`) | Fable 5, Sonnet 5, Opus 4.6/4.7/4.8, Sonnet 4.6 (+ any when `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`) |
| Supports `max` | `c0e` (`:146674`) | Fable 5, Sonnet 5, Opus 4.6/4.7/4.8, Sonnet 4.6 |
| Supports `xhigh` | `Rne` (`:146683`) | Fable 5, Sonnet 5, Opus 4.7/4.8 |
| Adaptive thinking | `dU(id,"adaptive_thinking")` (`:132842`) | Fable 5, Sonnet 5, Opus 4.6/4.7/4.8, Sonnet 4.6 |
| `mid_conv_system` | `dU(id,"mid_conv_system")` (`:133036`) | Fable 5, Sonnet 5, Opus 4.8 |

**Launch defaults** now read from the catalog `default_effort` field via `qBt()` (`:146921`, fallback
`high`): Opus 4.8 → `high`, **Opus 4.7 → `xhigh`**, Sonnet 5 → `high`, Fable 5 → `high`. Resolution
`nX()` (`:146824`) silently downgrades `max`→`high` without `c0e`, `xhigh`→`high` without `Rne`, and
clamps to the org's per-model max effort (`Xit`/`u0e`, `:146708`/`:146725`).

**NEW — launch-effort "unpin" latch** (`AGe`/`zj`, `:146802`/`:146815`): launch defaults are pinned for
Opus 4.7 / Opus 4.8 / Fable 5 until the user explicitly changes effort, which sets
`unpinOpus47LaunchEffort` / `unpinOpus48LaunchEffort` / `unpinFable5LaunchEffort` and stops re-pinning.

| Env / setting | Effect |
|---------------|--------|
| `CLAUDE_CODE_EFFORT_LEVEL` | Session effort override; `unset`/`auto` → null (auto) (`EGe`, `:146797`) |
| `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT` | Force effort capability on for all models |
| `CLAUDE_CODE_DISABLE_THINKING` | Disable thinking entirely |
| `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING` | Disable adaptive thinking |
| `DISABLE_INTERLEAVED_THINKING` | Drop the interleaved-thinking beta |
| `MAX_THINKING_TOKENS` / `--max-thinking-tokens` | Thinking budget |
| `settings.ultracode = true` / `>` cmd | Maps to effort `xhigh` (`H7r`, `:146787`) |

The active per-turn effort (after downgrades) is exported to hooks and Bash as **`CLAUDE_EFFORT`**
(`:290542`, in the env-passthrough allowlist `Tgp` at `:237436`).

### Thinking model behaviour

- **`rejects_disabled_thinking`** (Fable 5 only, `:132833`) — `dU(id,"rejects_disabled_thinking")`
  forces thinking-on; you cannot disable thinking on Fable 5.
- **`fable_5_mitigations`** (Fable 5 + Mythos 5, `B_e`, `:132703`) — pulls in Fable-specific prompt
  mitigations / tool-param-JSON handling (`tengu_silent_harbor` flag, `:593724`).
- **`lean_prompt`** (Opus 4.8, Fable 5, Mythos 5, `eMd`, `:132681`) — these models get the short
  "# Harness" system prompt rather than the full one. `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` forces it.

## Capabilities matrix (canonical ids; from catalog `capabilities[]`)

| Model | Fast | 1M | Effort | xhigh | Adaptive | mid_conv | lean | max_output / upper |
|-------|------|-----|--------|-------|----------|---------|------|--------------------|
| `claude-fable-5`  | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | 64k / 128k |
| `claude-mythos-5` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | 64k / 128k |
| `claude-opus-4-8` | ✅ | native | ✅ | ✅ | ✅ | ✅ | ✅ | 64k / 128k |
| `claude-opus-4-7` | ✅ | native | ✅ | ✅ | ✅ | ❌ | ❌ | 64k / 128k |
| `claude-opus-4-6` | ❌ | beta | ✅ | ❌ | ✅ | ❌ | ❌ | 64k / 128k |
| `claude-opus-4-5` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |
| `claude-opus-4-1` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 32k |
| `claude-opus-4-0` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 32k |
| `claude-sonnet-5`  | ❌ | native | ✅ | ✅ | ✅ | ✅ | ❌ | 64k / 128k |
| `claude-sonnet-4-6`| ❌ | beta | ✅ | ❌ | ✅ | ❌ | ❌ | 32k / 128k |
| `claude-sonnet-4-5`| ❌ | beta | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |
| `claude-sonnet-4-0`| ❌ | beta | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |
| `claude-haiku-4-5` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |
| `claude-3-7-sonnet`| ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k / 64k |

"1M = native" = `_I()` eligible (native_1m); "beta" = `Q9()` only. Output caps from `$ke()` (`:132598`).
Every modern model also carries `context_management` (context-editing beta `context-management-2025-06-27`).
All Opus/Fable/Sonnet/Mythos honour interleaved thinking (`interleaved-thinking-2025-05-14`); Haiku 4.5
and `claude-3-*` do not.

## Small / fast model usage — `getSmallFastModel (qw)` (`:101613`)

`qw()` resolves `ANTHROPIC_SMALL_FAST_MODEL` → else Haiku 4.5 (`Rj`) when on a Haiku-eligible plane
(firstParty canonical / anthropicAws) → else the main-loop model (`Ts`). Haiku is the default for: the
command-injection prefix classifier, WebFetch page summarisation, the auto-mode command classifier,
title/summary generation, and the default model for prompt/agent hooks (hook schema notes "If not
specified, uses Haiku", `:57729`). A flag `tengu_plum_vx3` (`:426632`) can route a classifier to the
small/fast model vs the main loop.

## New / changed API betas (`:100577`)

The beta registry `zhd` adds several headers vs 2.1.169: `task-budgets-2026-03-13`,
`summarize-connector-text-2026-03-13` (narration summaries), `afk-mode-2026-01-31`,
`advisor-tool-2026-03-01`, `cache-diagnosis-2026-04-07`, `context-hint-2026-04-09`,
`mcp-servers-2025-12-04`, `files-api-2025-04-14`, `environments-2025-11-01`, `ccr-byoc-2025-07-29`,
`mid-conversation-system-2026-04-07`, `server-side-fallback-2026-06-01`, **`fallback-credit-2026-06-01`**
(was `…06-09`), `structured-outputs-2025-12-15`. Fast mode `fast-mode-2026-02-01`, effort
`effort-2025-11-24`, 1M `context-1m-2025-08-07`, redact-thinking `redact-thinking-2026-02-12`, and
thinking-token-count `thinking-token-count-2026-05-13` are unchanged.

## What's new vs 2.1.169

- **Model layer rewritten** as a Zod-validated declarative catalog (`pQs`/`hfd`/`iMt`/`WM`/`dU`/`fQs`),
  with `Sfd` bridging to the legacy `va` (was `tz`) routing object. Capabilities are now string arrays,
  not predicate functions.
- **+5 model ids (56 → 61): Fable 5, Mythos 5, Sonnet 5** are the headline additions (`opus-4-7-fast`
  is doc-only; `fable-5.md` is a docs path).
- **Fable 5 is the new top tier** ("Mythos-class, above Opus"); **`best` now resolves to Fable 5**.
- **Default `sonnet` alias → Sonnet 5** (was Sonnet 4.6); default Opus stays 4.8; new **`fable`** /
  **`fable[1m]`** aliases and **`ANTHROPIC_DEFAULT_FABLE_MODEL`** env family.
- **Per-provider alias defaults** baked into the catalog (`aliases.*.per_provider`).
- **Fast-mode eligibility narrowed to Opus 4.7/4.8** (Opus 4.6 dropped); new
  `tengu_sunset_penguin_opus47` (default 2026-07-25); `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE` now inert
(still in the env map at `:46550` → `nPu`, but never read).
- **Fast pricing simplified**: Opus 4.8 fast $10/$50, Opus 4.6/4.7 fast $30/$150; Fable 5 / Mythos 5
  standard $10/$50.
- **Overload api-key fallback broadened** to the whole Opus+Fable+Mythos tier (`qte||not||rot`), not
  just legacy Opus.
- **New per-model capabilities**: `lean_prompt` (short harness — Opus 4.8/Fable 5/Mythos 5),
  `rejects_disabled_thinking` (Fable 5), `fable_5_mitigations` (Fable 5/Mythos 5), `mid_conv_system`,
  `context_management`.
- **Launch-effort "unpin" latch** (`unpinOpus47/48/Fable5LaunchEffort`); `default_effort` is now a
  catalog field.
- **Sonnet 5 native 1M on bedrock/vertex/foundry** via `context.native_1m_3p`.
- New betas (task-budgets, afk-mode, advisor-tool, cache-diagnosis, context-hint, environments,
  ccr-byoc, mid-conversation-system, etc.); `fallback-credit` date moved 06-09 → 06-01.

## Uncertainties

- The **catalog `pQs` carries no inline `pricing` field** for the shipped models — prices come from the
  separate map `Fje` (`:101068`); the schema *supports* per-model `pricing` (`:94468`) but the data
  doesn't use it in this build. Pricing claims are grounded in `Fje`/`jle`/`OHn`/`Nai`/`jte` constants.
- **Mythos 5 provider ids**: the catalog entry has all 3P ids `null` (`:94356`) yet the const `IQs`
  (`:94589`) defines a full `us.anthropic.claude-mythos-5` set. Which one wins depends on the code path;
  `IQs` is the one wired into the `va`-style pricing/cap maps (`:101084`). Marked as observed, not
  fully traced.
- Minified identifiers (`Bo`, `O_`, `nE`, `WM`, `dU`, `yr`, …) are build-specific and will differ in
  other builds.
- `claude-mythos-preview` vs `claude-mythos-5` are distinct (preview = old Opus-4.6 codename; `-5` = the
  new shipping Mythos id). The exact runtime relationship between Fable 5 and Mythos 5 ("same underlying
  model") is asserted only by the bundled identity prompt, not provable from routing code.
