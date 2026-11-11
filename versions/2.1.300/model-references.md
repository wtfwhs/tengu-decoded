# Model References

> [Back to version index](../README.md)
>
> **Version**: 2.1.300 | **Build**: `2026-10-14T12:54:55Z` | **GIT_SHA**: `c6733ae1276880507ca0c5b053ae18fb0df090d6` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.4.3
> **Baseline**: [2.1.197](../2.1.197/model-references.md)

See [data/models.yaml](data/models.yaml) for the structured dataset. All line numbers are
`bundle/cli.beauty.js` of this build. Minified names are build-specific. Where the build ships a
readable alias (the `export { … as getDefaultOpusModel }` block in module 1290 `chunk-b9arwed5.js`,
`cli.beauty.js:1041466`), the real name is given next to the minified one.

## Headline

1. **A new Claude 5.5 generation is the default.** Six catalog entries are new: `claude-opus-5`,
   `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-1` and
   `claude-mythos-5-1`. Every alias default moved to the newest model of its family: `opus` →
   **Opus 5.5**, `sonnet` → **Sonnet 5.5**, `haiku` → **Haiku 5.5**, `fable` → **Fable 5.1**
   (`aliases`, `:21186-21227`; `latest_per_family`, `:21230-21235`).
2. **Code-default main model on firstParty: `claude-opus-5-5`.** This is the path with the model
   catalog switched off, which is the flag default (see item 3). Any account that qualifies for the
   Opus default gets `getDefaultOpusModel` (`Hg`, `:125270`). With no env override that resolves
   through the catalog alias `opus.default` = `claude-opus-5-5` (`dn`, `:125276`). Opus 5.5 has
   native 1M, so no `[1m]` tag is appended.
3. **NEW: a remote model catalog can override the compiled defaults.** Claude Code can now load a
   *served* catalog (`/api/model_selector/{surface}`) or a signed *published* catalog. A published
   seed is embedded in the binary: `version: 2224`, `issued_at 2026-10-14T01:15:26Z`, `key_id
   claude-code-release-signing-key`, `:793515-797346`. When active, that catalog's
   `model_selector_state.model` becomes the default model. In the embedded seed this value is
   **`claude-opus-5`**, not Opus 5.5 (`:793527`). Both modes are gated by the remote flag
   **`tengu_delegated_quail`**, whose compiled default is `{mode:"off"}` (`:792214-792217`). The flag
   value actually served at runtime is **not knowable from the binary**.
4. **Who gets Opus by default has widened.** In 2.1.197 the Opus default went to Max, Team-5x,
   Enterprise-usage-based and API-key users. 2.1.300's `isOpusDefaultSubscriber` (`qVn`, `:126308`)
   also covers **Pro, standard Team and all Enterprise** subscribers, unless only
   `ANTHROPIC_DEFAULT_SONNET_MODEL` is set. Bedrock and Vertex now default to Opus as well
   (`av`, `:125660-125691`).
5. **New env var `ANTHROPIC_DEFAULT_MODEL`** sets the default model directly (`getEnvDefaultModel`,
   `A1e`, `:125640`). In the picker it is labelled "Set by ANTHROPIC_DEFAULT_MODEL" (`:125457`).
6. **Capability override env var `CLAUDE_CODE_MODEL_CAPABILITIES`** (NEW) can force any catalog
   capability on or off per model pattern (`dHo`, `:21430-21449`).
7. **Pricing now lives in the catalog** as named `pricing_tiers`, including a long-prompt surcharge
   tier (`:20308-20405`). The 2.1.197 catalog carried no pricing at all. Prices that differ from
   2.1.197: Sonnet 5 is **$2/$10** (2.1.197: $3/$15, verified in source). The new Haiku 5.5 is **$0.10/$0.50**, rising
   to $0.50/$2.50 above 100k prompt tokens.
8. **Fast mode** now covers **Opus 4.8, Opus 5 and Opus 5.5**. **Opus 4.7 lost fast mode** (no
   catalog `fast_mode`, and the substring fallback matches only `opus-4-8`/`opus-5`, `:121092-121100`).
   The `tengu_sunset_penguin_opus47` sunset flag is gone.

## Model catalog (`iDr`, `:20305-21237`, module 39 `chunk-g2bbyzcc.js`)

The baked catalog is a frozen object with the comment *"Hand-maintained baked-in model catalog — the
source of truth for per-model provider IDs and metadata… `bun run generate:model-catalog` validates
this file"* (`:20306`). Top-level keys: `schema_version: 1`, **`pricing_tiers`** (NEW), `models[]`,
`aliases`, **`defaults: {}`** (NEW, empty), **`best: "fable"`** (NEW, data-driven), `latest_per_family`,
**`alias_migration: {}`** (NEW, empty).

### Schema (Zod, `S` `:21281-21333`, top-level `oe` `:21338-21347`)

Per-model fields that are NEW vs 2.1.197:

| Field | Meaning | Consumer |
|---|---|---|
| `provider_ids.anthropic_google_cloud` | id on the new `anthropicGoogleCloud` plane | `N()` `:21492` |
| `vertex_region_env_var` | per-model `VERTEX_REGION_CLAUDE_*` (was a separate table) | vertex region map `:2618` |
| `fallback_3p` | older model to step down to on 3P providers | `n0o`/`XIn` `:449059-449091` |
| `context.supports_1m_suffix` | model may be shown/sent with `[1m]` | `uv` display `:126352-126357` |
| `pricing` | tier name or inline cost object | `iHo` `:21388`, `iI` `:21603` |
| `effort_cost_index` | relative cost per effort level (high = 1) | effort picker `b1t` `:1335252` |
| `advisor_rank` | ranking for the Advisor tool | `nl`/`rl` `:313855-313866` |
| `slogan`, `fallback_chain`, `picker{section,badge,disabled_reason,tiers}`, `deprecation{retirement_dates,remapped_to}`, `min_cli_version` | schema-only; **no baked entry uses them** | — |

**REMOVED from the schema:** `context.native_1m_3p`. The string occurs 0 times in 2.1.300 and 2 times
in 2.1.197.

`I()` (`:21349`) indexes entries by id and by every lower-cased provider id. It throws `"model
catalog: provider id collision across distinct entries"`. `Sl(id)` (`:21384`) is the entry getter.
`JXe(alias, provider)` (`:21455`) resolves an alias, using a `per_provider` override when present.

### Capability vocabulary (`aHo`, `:21394`): 31 names

`effort, max_effort, xhigh_effort, adaptive_thinking, rejects_disabled_thinking,
thinking_disabled_effort_cap, mid_conv_system, mid_conv_tool_change, per_turn_effort, per_turn_timing,
context_management, fast_mode, lean_prompt, fable_5_mitigations, refusal_fallback, opus_5_prompt_bundle,
fable_5_1_prompt_bundle, opus_5_5_prompt_bundle, thrifty_sonic, turn_updates, bash_output_audience_note,
silent_turn_reminder, thinking_display_updates, quizzical_shore, lucky_cerf, amber_astrolabe, bison_cairn,
larch_cistern, haiku_5_5_early_stopping_guidance, org_locked_thinking, elapsed_time_reminder`

Capability resolution is `lb(model, cap)` (`:21413`). It checks, in order:

1. **`CLAUDE_CODE_MODEL_CAPABILITIES`** env (`dHo`, `:21430`). Format: `pattern=cap1,-cap2;…`.
   A `*` suffix is a prefix match. A leading `-` turns the capability off.
2. The served catalog's `runtime.capabilities` (`servedCapabilityLookup`). This only applies if the
   capability's feature gate passes. `per_turn_effort` is gated by `tengu_per_turn_effort`
   (`:21399-21411`).
3. The baked `capabilities[]` (`lHo`, `:21422`).

`lb` returns `true` or `undefined`, never `false` from the catalog. Predicates then fall back to
hard-coded id lists.

`claude-mythos-5` keeps its 2.1.197 role as "capability-complete by name". It has an empty
`capabilities[]` (`:21138`) but is special-cased in `Mb`/`cie`/`Uut` (`:163049`, `:163063`, `:163077`),
`gRo` (`:127229`), `gU` (`:127297`), `qve` (`:127337`) and `he` (`:161277`).

### Bridge to the routing table (unchanged design)

`CATALOG_ID_TO_KEY` `U` (`:21469-21490`) has 20 keys. NEW keys: `haiku55`, `sonnet55`, `opus5`,
`opus55`, `fable51`. `N()` (`:21492-21506`) converts each entry into the per-plane routing record. It
adds **`anthropicGoogleCloud`**, and `gateway` falls back to `first_party` when unset. `Fo = z()`
(`:21517`) is the routing object (2.1.197's `va`). The named `CLAUDE_*_CONFIG` exports are guarded by
`s()` (`:21519`), which throws if bedrock/vertex/foundry/anthropicAws is `null`. Mythos 5 is still
outside `U` and is carried by the separate const `xBs` (`:21542-21555`, 2.1.197 `IQs`), which has a
full provider set including `anthropicGoogleCloud`. `Pln = ["opus55","opus5","opus48","opus47","opus46","opus45"]`
(`:21556`) is the Opus lineup used by the refusal and classifier fallbacks.

`iw()`/`Wt()` (`:116247-116257`) return the per-provider key→id map. On Bedrock that map may be
replaced with discovered inference profiles (`DO`, `:116170`). `iw()` also applies the
`modelOverrides` setting (`g_`, `:116202`).

## Current models (22 catalog entries; 2.1.197 had 16 + Mythos 5)

| Model | Catalog id | Key | firstParty id | Bedrock | anthropicGoogleCloud | Mantle | Cutoff | Pricing tier | Default effort | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| **Opus 5.5** | `claude-opus-5-5` | `opus55` | `claude-opus-5-5` | `us.anthropic.claude-opus-5-5` | `claude-opus-5-5` | `anthropic.claude-opus-5-5` | June 2026 | `tier_4_20_cache_read_0_20` ($4/$20) | **medium** | **NEW**, default `opus` |
| Opus 5 | `claude-opus-5` | `opus5` | `claude-opus-5` | `us.anthropic.claude-opus-5` | `claude-opus-5` | `anthropic.claude-opus-5` | May 2026 | `tier_5_25` | high | **NEW** |
| Opus 4.8 | `claude-opus-4-8` | `opus48` | `claude-opus-4-8` | `us.anthropic.claude-opus-4-8` | `claude-opus-4-8` | `anthropic.claude-opus-4-8` | Jan 2026 | `tier_5_25` | high | was default `opus` |
| Opus 4.7 | `claude-opus-4-7` | `opus47` | `claude-opus-4-7` | `us.anthropic.claude-opus-4-7` | `claude-opus-4-7` | `anthropic.claude-opus-4-7` | Jan 2026 | `tier_5_25` | xhigh | lost `fast_mode` |
| Opus 4.6 | `claude-opus-4-6` | `opus46` | `claude-opus-4-6` | `us.anthropic.claude-opus-4-6-v1` | `claude-opus-4-6` | null | May 2025 | `tier_5_25` | — | |
| Opus 4.5 | `claude-opus-4-5` | `opus45` | `claude-opus-4-5-20251101` | `…-20251101-v1:0` | `claude-opus-4-5-20251101` | null | May 2025 | `tier_5_25` | — | |
| Opus 4.1 | `claude-opus-4-1` | `opus41` | `claude-opus-4-1-20250805` | `…-20250805-v1:0` | null | null | Jan 2025 | `tier_15_75` | — | legacy remap |
| Opus 4 | `claude-opus-4-0` | `opus40` | `claude-opus-4-20250514` | `…-20250514-v1:0` | null | null | Jan 2025 | `tier_15_75` | — | legacy remap |
| **Sonnet 5.5** | `claude-sonnet-5-5` | `sonnet55` | `claude-sonnet-5-5` | `us.anthropic.claude-sonnet-5-5` | `claude-sonnet-5-5` | `anthropic.claude-sonnet-5-5` | June 2026 | `tier_2_10_cache_read_0_10` ($2/$10) | **medium** | **NEW**, default `sonnet` |
| Sonnet 5 | `claude-sonnet-5` | `sonnet5` | `claude-sonnet-5` | `us.anthropic.claude-sonnet-5` | `claude-sonnet-5` | `anthropic.claude-sonnet-5` | Jan 2026 | `tier_2_10` ($2/$10) | high | was default `sonnet` |
| Sonnet 4.6 | `claude-sonnet-4-6` | `sonnet46` | `claude-sonnet-4-6` | `us.anthropic.claude-sonnet-4-6` | `claude-sonnet-4-6` | null | Aug 2025 | `tier_3_15` | — | |
| Sonnet 4.5 | `claude-sonnet-4-5` | `sonnet45` | `claude-sonnet-4-5-20250929` | `…-20250929-v1:0` | `claude-sonnet-4-5-20250929` | null | Jan 2025 | `tier_3_15` | — | |
| Sonnet 4 | `claude-sonnet-4-0` | `sonnet40` | `claude-sonnet-4-20250514` | `…-20250514-v1:0` | null | null | Jan 2025 | `tier_3_15` | — | |
| Sonnet 3.7 | `claude-3-7-sonnet` | `sonnet37` | `claude-3-7-sonnet-20250219` | `…-v1:0` | null | null | — | `tier_3_15` | — | |
| Sonnet 3.5 | `claude-3-5-sonnet` | `sonnet35` | `claude-3-5-sonnet-20241022` | `…-v2:0` | null | null | — | `tier_3_15` | — | |
| **Haiku 5.5** | `claude-haiku-5-5` | `haiku55` | `claude-haiku-5-5` | `us.anthropic.claude-haiku-5-5` | `claude-haiku-5-5` | `anthropic.claude-haiku-5-5` | June 2026 | `haiku_55` ($0.10/$0.50) | **medium** | **NEW**, default `haiku` |
| Haiku 4.5 | `claude-haiku-4-5` | `haiku45` | `claude-haiku-4-5-20251001` | `…-20251001-v1:0` | `claude-haiku-4-5-20251001` | `anthropic.claude-haiku-4-5` | Feb 2025 | `haiku_45` | — | default `haiku` on every 3P plane |
| Haiku 3.5 | `claude-3-5-haiku` | `haiku35` | `claude-3-5-haiku-20241022` | `…-v1:0` | null | null | — | `haiku_35` | — | |
| **Fable 5.1** | `claude-fable-5-1` | `fable51` | `claude-fable-5-1` | `us.anthropic.claude-fable-5-1` | `claude-fable-5-1` | `anthropic.claude-fable-5-1` | June 2026 | `tier_10_50_cache_read_0_25` | high | **NEW**, default `fable` |
| Fable 5 | `claude-fable-5` | `fable5` | `claude-fable-5` | `us.anthropic.claude-fable-5` | `claude-fable-5` | `anthropic.claude-fable-5` | Jan 2026 | `tier_10_50` | high | `fable` default on gateway only |
| **Mythos 5.1** | `claude-mythos-5-1` | — | `claude-mythos-5-1` | null | null | null | June 2026 | `tier_10_50_cache_read_0_25` | high | **NEW**, firstParty-only |
| Mythos 5 | `claude-mythos-5` | — (`xBs`) | `claude-mythos-5` | null (catalog) / `us.anthropic.claude-mythos-5` (`xBs`) | null / `claude-mythos-5` | null / `anthropic.claude-mythos-5` | Jan 2026 | `tier_10_50` | — | |

- Vertex and Foundry ids equal the firstParty id for every 5.x entry. Older entries keep their dated
  `@YYYYMMDD` Vertex ids.
- `claude-haiku-5-5` is the only entry with no `gateway` key. `N()` substitutes the firstParty id.
- Context windows: `window: 1e6` + `native_1m` for Haiku 5.5, Sonnet 5/5.5, Opus 4.7/4.8/5/5.5,
  Fable 5/5.1 and Mythos 5/5.1. All others are `window: 200000`.
- Max output `default/upper`:
  - Opus 5.5, Sonnet 5.5, Haiku 5.5: **128000/128000** (NEW higher default)
  - Opus 4.6/4.7/4.8/5, Sonnet 5, Fable, Mythos: 64000/128000
  - Sonnet 4.6: 32000/128000
  - Opus 4.5, Sonnet 4/4.5, Sonnet 3.7, Haiku 4.5: 32000/64000
  - Opus 4/4.1: 32000/32000
  - 3.5 models: 8192/8192
- Image limits `2576×2576`, `maxImageTokens: 4784` on every 5.x entry plus Opus 4.7/4.8 (2.1.197's
  Sonnet 5 had 2000×2000).

### Pricing tiers (`pricing_tiers`, `:20308-20405`). USD per Mtok

| Tier | input | output | cache write 5m | cache write 1h | cache read | Used by |
|---|---|---|---|---|---|---|
| `haiku_35` | 0.8 | 4 | 1 | 1.6 | 0.08 | Haiku 3.5 |
| `haiku_45` | 1 | 5 | 1.25 | 2 | 0.1 | Haiku 4.5 |
| `haiku_55` | 0.1 | 0.5 | 0.125 | 0.2 | 0.01 | Haiku 5.5. **long_prompt above 1e5 prompt tokens: 0.5 / 2.5 / 0.625 / 1 / 0.05** |
| `tier_2_10` | 2 | 10 | 2.5 | 4 | 0.2 | Sonnet 5 |
| `tier_2_10_cache_read_0_10` | 2 | 10 | 2.5 | 4 | 0.1 | Sonnet 5.5 |
| `tier_3_15` | 3 | 15 | 3.75 | 6 | 0.3 | Sonnet 3.5–4.6 |
| `tier_4_20_cache_read_0_20` | 4 | 20 | 5 | 8 | 0.2 | Opus 5.5 |
| `tier_5_25` | 5 | 25 | 6.25 | 10 | 0.5 | Opus 4.5–4.8, Opus 5 |
| `tier_10_50` | 10 | 50 | 12.5 | 20 | 1 | Fable 5, Mythos 5 |
| `tier_10_50_cache_read_0_25` | 10 | 50 | 12.5 | 20 | 0.25 | Fable 5.1, Mythos 5.1 |
| `tier_15_75` | 15 | 75 | 18.75 | 30 | 1.5 | Opus 4, Opus 4.1 |

Every tier has `web_search: 0.01`. The long-prompt switch is `vI` (`:121632`): above the threshold, the
whole request is priced at the long-prompt rate. A US `inference_geo` multiplies cost by **1.1**
(`SI`, `:121626-121630`). The table `iX` (`:121613`) is built from the catalog. A remote override is
possible through the client-data key `alder_ford` (`jy`, `:121664-121675`). 2.1.197 priced Sonnet 5 at
$3/$15: its table `Fje` maps `EQs` (= `Cj(va.sonnet5)`, 2.1.197 `cli.beauty.js:94588`) to `jte`
(`inputTokens: 3`) at 2.1.197 `cli.beauty.js:101076`. The Sonnet 5 price is therefore **CHANGED**
(verified).

## Model ids: 62 (2.1.197: 61)

The canonical count comes from `_facts.md` §1.7, using the regex
`claude-(opus|sonnet|haiku|fable)-N…|claude-N…` over `cli.min.js` plus the decompressed text assets.
Totals: **62** (family 40), JS-only 50.

- **NEW (8):** `claude-opus-5`, `claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`,
  `claude-fable-5-1`, `claude-sonnet-4-5-v1`, and the doc-prose tokens `claude-2` and `claude-2.x`.
  `claude-sonnet-4-5-v1` appears only inside the example string `anthropic.claude-sonnet-4-5-v1:0`
  in a provider-id help text (`cli.min.js`), so it is not a real model.
- **REMOVED (7):** `claude-1.3`, `claude-1.3-100k`, `claude-3-5-haiku-latest`, `claude-3-7-sonnet-latest`,
  `claude-4-opus-20250514`, `claude-haiku-4`, `claude-sonnet-4-6-20251114`.
- **Outside the regex (both builds):** the `mythos` family. **`claude-mythos-5-1` is NEW** (0
  occurrences in 2.1.197 `cli.beauty.js`). `claude-mythos-5` is unchanged. `claude-mythos-preview`
  survives as the constant `oFt` (`:14033`), counted as recognised and as native-1M (`Yfe`
  `:126176`, `_v` `:126824`). It has 3 occurrences in this build, against 12 in 2.1.197.
- The constant list `Bme` (`CATALOG_MODEL_IDS`, `:14030`) holds exactly the 22 catalog ids. `iI()`
  throws if a catalog id is missing from it (`:121608`).

## Aliases and resolution

User-facing aliases `Pq` (`:14031`): `sonnet opus haiku fable best sonnet[1m] opus[1m] fable[1m] opusplan`.
Short aliases `Iq` (`:14032`): `sonnet opus haiku fable`. Both are **unchanged** vs 2.1.197.

`parseUserSpecifiedModel` (`Ot`, `:126465-126491`) is the single alias→id entry point (2.1.197 `Bo`):

| Alias | Resolves via | firstParty result |
|---|---|---|
| `opus` | `getDefaultOpusModel` `Hg` `:125270`: `ANTHROPIC_DEFAULT_OPUS_MODEL` → served family map (`Ka`/`wS`, firstParty + served catalog only) → `dn()` = catalog `aliases.opus` | **`claude-opus-5-5`** |
| `sonnet` | `getDefaultSonnetModel` `Cm` `:125280` (same pattern; `Na` fallback key `sonnet46`) | **`claude-sonnet-5-5`** |
| `haiku` | `getDefaultHaikuModel` `IU` `:125290` (`Ic` fallback `haiku45`) | **`claude-haiku-5-5`** |
| `fable` | `getDefaultFableModel` `k1e` `:125250`: `ANTHROPIC_DEFAULT_FABLE_MODEL` → `Mc()` = `aliases.fable` (fallback `fable51`) | **`claude-fable-5-1`** |
| `best` | `oL` `:124925`: catalog `best:"fable"` → Fable default if `isFableAvailable` and allowed, else `Hg()` | Fable 5.1 or Opus 5.5 |
| `opusplan` | resting `Cm()` (Sonnet); plan-mode upgrade in `SIr` | Sonnet 5.5 resting / Opus 5.5 planning |
| `…[1m]` | `Cj()` appends `[1m]` (`:125395`); for `fable[1m]` the tag is dropped when the Fable id is natively 1M on canonical firstParty (`:126471-126474`) | |

### Per-provider alias defaults (`aliases.*.per_provider`, `:21186-21227`)

| Alias | default (firstParty) | bedrock | vertex | foundry | anthropicAws | anthropicGoogleCloud* | mantle | gateway |
|---|---|---|---|---|---|---|---|---|
| opus | **5-5** (was 4-8) | **5-5** (was 4-6) | **5-5** (was 4-6) | 4-6 | **5-5** (was 4-7) | 5-5 | **5-5** (was 4-7) | 4-7 |
| sonnet | **5-5** (was 5) | 4-5 | 4-5 | 4-5 | 4-6 | 5-5 | 4-5 | 4-6 |
| haiku | **5-5** (was 4-5) | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 | 4-5 |
| fable | **5-1** (was 5) | 5-1 | 5-1 | 5-1 | 5-1 | 5-1 | 5-1 | **5** |

\* `anthropic_google_cloud` has an explicit row only for `haiku`. Elsewhere it inherits `default`
through `JXe` (`:21455-21461`) and `tv`/`Ha` (`:125225-125235`). The plane name mapping is `mL`
(`:125214`).

Default 3P keys (`:124940-124946`):

| Key | Value | 2.1.197 |
|---|---|---|
| `DEFAULT_3P_OPUS_KEY` | `opus46` | unchanged |
| `DEFAULT_3P_SONNET_KEY` | `sonnet45` | unchanged |
| `DEFAULT_3P_HAIKU_KEY` | `haiku45` | unchanged |
| **`DEFAULT_BEDROCK_OPUS_KEY`** | `opus55` | NEW |
| **`DEFAULT_VERTEX_OPUS_KEY`** | `opus55` | NEW |
| `DEFAULT_MANTLE_OPUS_KEY` | `opus55` | was `opus47` |
| `DEFAULT_3P_FABLE_KEY` | `fable51` | was `fable5` |

### Canonicaliser (`DL`, `:126120-126156`) and legacy remap

`DL` resolves in this order:

1. The provider-id index.
2. Regional Bedrock prefixes, re-keyed as `us.`.
3. Structured parse.
4. A substring ladder, newest first: `fable-5-1, fable-5, mythos-5-1, mythos-5, opus-5-5, opus-5,
   opus-4-8 … haiku-4-5, 3-x`.
5. If nothing matched, strip the `-YYYYMMDD` date.

Legacy ids `claude-3-opus/-sonnet/-haiku` stay recognised via `lv()` (`:126171`). The legacy Opus
remap list `GL` (`:126514`) is **unchanged**: `claude-opus-4-20250514`, `claude-opus-4-1-20250805`,
`claude-opus-4-0`, `claude-opus-4-1`. On `usesFirstPartyModelIds` planes these resolve to
`getDefaultOpusModel`, which is now **Opus 5.5** (`Ot`, `:126487`). Disable with
`CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP` (`isLegacyModelRemapEnabled` `oNt`, `:126520`).

## Defaults per role

### Main loop

`getMainLoopModel` (`Ze`, `:124906`): an explicit user setting wins (`getUserSpecifiedModelSetting`
`ey`, `:124852`). The precedence is: session override `dc()` → initial `--model` (`FD()`) →
`ANTHROPIC_MODEL` → `settings.model`, each vetted by `FVn`. Otherwise
`getDefaultMainLoopModel` (`Hl`, `:126044`) = `Ot(Lb())`, where `getDefaultMainLoopModelSetting`
(`Lb`, `:125444`) = `lX().setting`.

`resolveDefaultMainLoopModelSetting` (`lX`, `:125464`) uses these layers, in order. **Every layer
except the last is NEW in 2.1.300:**

| # | Layer | Attribution label |
|---|---|---|
| 1 | Served-catalog **enforced** default (`state.org_enforced_default_model`, via `Yb` `:123499` → `sv` `:125517`) | `org` |
| 2 | Org default model (`getResolvedOrgDefaultModel` `jVn` `:125399`, firstParty only, skipped when a served catalog is active) | `org` |
| 3 | **`ANTHROPIC_DEFAULT_MODEL`** env (`A1e` `:125640`). Ignored if `default`/`inherit`/`opusplan`/`haiku`, if model enforcement is active, or if the model is not allowed | `env` |
| 4 | Served/published catalog `state.model`, unless `ANTHROPIC_DEFAULT_{OPUS,SONNET}_MODEL` steers the tier family (`iv` `:125485-125499`) | `served` |
| 5 | Managed `availableModels` + `enforceAvailableModels` (`Fc` `:125693`) or deny-list step-down (`Dc` `:125553`) | `enforced` / `managed_deny` / `entitlement` |
| 6 | Tier baseline `av()` (`:125660-125691`) | `tier` |

Tier baseline `av()`:

```
if claude.ai subscriber (kt):
    if isOpusDefaultSubscriber (qVn):          -> Opus  (Hg, +[1m] if opus1mMergeAddsTagTo)
elif usesFirstPartyModelIds (au: firstParty/anthropicAws/anthropicGoogleCloud/gateway):
                                               -> Opus
if provider == mantle:                         -> iw()[opus55]       (was opus47)
if provider in (bedrock, vertex):
    sonnet-only env steering (qS) ? Sonnet : Opus                    (NEW: was Sonnet)
otherwise (foundry, non-qualifying subscriber) -> Sonnet (Cm)
```

`qVn` (`:126308`) is true for Max, Team with `default_claude_max_5x`, or Enterprise
`enterprise_usage_based`. It is **also** true for **any Enterprise, Team or Pro** subscriber unless
`qS()` (only `ANTHROPIC_DEFAULT_SONNET_MODEL` set, no enforcement). Subscriber predicates:
`mmt`/`bKn`/`SKn`/`sEe`/`Jsn`/`qIe`, `:130985-131007`. In 2.1.197 `$4r` only counted Max, Team-5x and
Enterprise-usage-based (`2.1.197 cli.beauty.js:101904-101911`).

**What the code makes the current default:**

- **Compiled path, firstParty, any Opus-default account: `claude-opus-5-5`.**
- Non-qualifying firstParty: `claude-sonnet-5-5`.
- Bedrock/Vertex: the provider's Opus 5.5 id.
- Mantle: `anthropic.claude-opus-5-5`.
- Foundry: `claude-sonnet-4-5` via the per-provider alias.
- **If the served/published catalog is active:** the published seed's `state.model` is
  **`claude-opus-5`** for surfaces `cc` and `ccd` (`:793527`, `:794346`). Activation depends on the
  remote flag `tengu_delegated_quail` (default `off`). Whether it is on for any given account is
  **unknown** from static analysis.
- Corroboration, not proof: this analysis session's harness reports model id `claude-opus-5-5`, which
  matches the compiled firstParty path.

### Plan mode (opusplan / haiku)

`planModeConstituentFamily` (`kee`, `:125304`) gives:

- `opusplan` / `opusplan[1m]` → `opus`
- `haiku` → `sonnet` (the symmetric "haiku plan upgrade")

`resolveRuntimeMainLoopModel` (`SIr`, `:125362-125393`) applies the upgrade only in `plan`
permission mode. It skips the Opus upgrade when the conversation exceeds 200k tokens. If org policy
blocks the target, it either **steps down to the newest permitted model of that family**
(`clamp:"stepDown"`, via `Mv` `:125314`), which is NEW, or keeps the resting model. In both cases it
emits a warning (`:125388`).

### Small/fast (background) model

`getSmallFastModel` (`Ov`, `:124745-124760`) resolves in this order:

1. `ANTHROPIC_SMALL_FAST_MODEL`.
2. If no dedicated small/fast model exists (`hasDedicatedSmallFastModel` `Jft`, `:124735`: true for
   SMALL_FAST or HAIKU env, canonical firstParty, anthropicAws/anthropicGoogleCloud, or a gateway
   that allows Haiku):
   - on bedrock/vertex with no user model, use **Sonnet** if allowed (NEW);
   - otherwise use the main loop model.
3. Otherwise `getDefaultHaikuModel`, which is **`claude-haiku-5-5` on firstParty** (2.1.197:
   Haiku 4.5) and `claude-haiku-4-5` on every 3P plane.

`getBareCheckModel` (`_9e`, `:124762`) still pins **Haiku 4.5** (`iw().haiku45`) on canonical
firstParty, for the quota probe at `:184239`.

Small/fast consumers verified in this build:

- plugin `model.classify` default (`:506257`)
- artifact comment triage / fast-ack (`:706584`, `:709665`)
- agent hooks: *"If not specified, uses Haiku"* (`:31465`)
- WebFetch-style helper `Fho`, which uses Sonnet instead on Vertex-global and Bedrock/Vertex
  (`:418505-418507`)
- WebSearch, when `tengu_plum_vx3` is true (`:739678`, CHANGED meaning vs the 2.1.197 doc's
  "classifier")

### Classifier (auto-mode permission classifier)

`o4e` (`:457354-457378`) resolves in this order:

1. The server config `tengu_auto_mode_config.modelByMainModel` / `.model`, vetted against org
   policy (`dqe`).
2. `getPermissionClassifierExternalDefault` (`eRo` → `cL`, `:125104-125124`): **Sonnet 5**
   (`iw().sonnet5`), or `ANTHROPIC_DEFAULT_SONNET_MODEL`. If that env names **Sonnet 5.5 or
   Opus 5.5** (list `dL`, `:125101`), it is rejected with *"cannot serve as the classifier; using the
   Sonnet 5 default instead"*. Returns nothing when the main model is Sonnet 4.6/4.5, or when the
   `externalSonnet5Probe` was `demoted`.
3. `classifierFlagshipRerouteTarget` (`UVn`, `:125126`): the main model itself. If the main model is
   **Fable/Mythos**, it is rerouted to Opus via `uL` (`:125085-125095`), which starts the `Pln`
   rotation at **`opus5`**. On firstParty the first allowed entry of
   `opus5, opus48, opus47, opus46, opus45, opus55` is chosen.

### Subagents

`h1` (`:443314-443362`) resolves the model in this order:

0. **`CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`** (NEW, `KRe` `:378798`), only inside workflow runs
   (`y?.inWorkflowRun`). When set (and not `inherit`) it **wipes both the tool-call and frontmatter
   models** (`[e, r] = Q !== void 0 ? [void 0, void 0] : hWt(e, r)`, `:443343`), so it beats them.
   Under `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` it is honoured only if it matches the value `xje` reports
   for that env name (`:378801`).
1. Tool-call `model` param.
2. Agent frontmatter `model`.
3. `CLAUDE_CODE_SUBAGENT_MODEL` (`aoe`, `:443309`).
4. `inherit`: the parent's *runtime* model, so plan-mode upgrades carry over (`Dg`).

Further rules:

- **`CLAUDE_CODE_SUBAGENT_MODEL_FORCE`** (NEW, `hWt` `:443393`) drops tool/frontmatter models. Two
  exceptions survive: a tool-call `model:"inherit"`, and an object-form frontmatter `inheritCap` when
  `CLAUDE_CODE_SUBAGENT_MODEL` is unset or `inherit`.
- A disallowed alias steps down within its family (`Mv`).
- Opus aliases gain `[1m]` when the 1M merge applies (`lGe`, `:443406`).
- Telemetry `subagent_model_resolve` records the precedence source (`:443364-443390`).

### Advisor, refusal fallback, fast mode

See the sections below.

## Model-availability and org gating

- **`isFableAvailable`** (`BIe`, `:124956-124975`) has **CHANGED**:
  - If no served catalog is active, it returns `false` when every Fable picker entry is disabled
    (`WS`). Otherwise it is `true` if `ANTHROPIC_DEFAULT_FABLE_MODEL` is set, **`true` on any
    firstParty**, and picker-driven on gateway.
  - In 2.1.197 `Vle()` also required firstParty to be the canonical base URL **and** the picker to
    offer a non-disabled Fable entry (`2.1.197 cli.beauty.js:101681-101688`).
  - With a served catalog, availability comes from the served rows.
- **`isMythosAvailable`** (`_Ir`, `:125010`) requires canonical firstParty, plus served rows or picker
  entries that offer Mythos.
- **`getModelUnavailabilityReason`** (`E$`, `:125156-125193`) returns `disabled` (served row
  disabled, `min_claude_code_version` not met, or picker disabled) or `absent` (Fable/Mythos
  unavailable).
- **Managed settings `availableModels` / `availableModelsMatch` (NEW `"prefix"`|`"exact"`) /
  `deniedModels` (NEW)** are documented in the settings schema (`:36811-36814`). Enforcement is
  `li()`/`Fc()`/`Dc()`/`GC()` (`:125553-125968`). When every candidate is denied, the Default option
  steps down. If nothing remains, *"Claude Code will not start"* (`:36814`).
- **Entitlement deny overlay** (`EG`, `:123669`) comes from the account's model-access rows. A cached
  deny under the running model triggers a server **re-probe** before demotion (`MF`, `:123554`;
  event `tengu_session_model_cached_deny_reprobe`).
- **Usage-credits-only families:** `i5`/`Gve` (`:126442-126451`) mark Fable, plus any family listed
  in flag `tengu_calm_seal` (NEW), as needing usage credits. `qfe` (`:126096`) picks a non-credits
  model when consent is declined (the 2.1.197 Fable-decline fallback, generalised).
- **3P access ladders** (class `xS`, `:124403`): per-provider/tier rung lists from a 3P probe drive
  step-downs on Bedrock/Vertex (`VVn` `:126080`, `yIr` `:124808`). `CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK`
  (NEW) turns them off (`v1e`, `:124422`). How the rungs are populated was not fully traced
  (tentative).

## Served / published model catalog (NEW)

This is the most significant structural addition to the model layer.

- **State:** `Br().servedCatalogActive = {catalog, source:"served"|"published"|"fallback", …}`
  (`fc` `:123181`, served setter `v0s` `:123119`, published setter `rIr` `:123164`).
  `PU()` (`:123377`) returns the active catalog **only when** `Aa()` (firstParty + canonical base URL)
  holds.
- **Mode flag:** `tengu_delegated_quail`, default `{mode:"off"}` (`:792214-792217`). It can carry
  separate `served` / `published` modes, each `off|shadow|primary` (`hrt`/`w`/`I`, `:792238-792268`).
- **Served gates** (`wkt`, `:792225+`). The served catalog is off when any of these hold:
  - `CLAUDE_CODE_MODEL_CATALOG` is falsy (`env_off`)
  - bare mode
  - essential-traffic-only
  - `ANTHROPIC_UNIX_SOCKET`
  - not firstParty
  - policy `allow_model_catalog` disallows it
- **Endpoint:** `GET /api/model_selector/{surface}`. Auth depends on the credential kind:
  - account: `/api/organizations/:orgUUID/model_selector/…`, `teleport-org`
  - OAuth token: `claude-ai-oauth`
  - API key: `required`
  - profile/federation: `async`

  Requests carry the `anthropic-client-platform` header and an ETag / `If-None-Match`, with a 5,000 ms
  timeout (`he` `:792915-792941`, `B` `:792816+`). `CLAUDE_CODE_ORGANIZATION_UUID` scopes the cache.
- **Published (signed) catalog:** `$schema https://downloads.claude.ai/model-catalog/v1/schema.json`.
  - Sources `hosted | custom_url | file` (`R`, `:792512`). `CLAUDE_CODE_MODEL_CATALOG_URL` sets the
    custom URL (`:758925`).
  - Documents are signature-checked against roots (`kkt`) and rejected on `replayed_version` or
    `catalog_version_rollback` (`qe`/`D`, `:797407-797469`).
  - The embedded **seed** (`ae`, `:793515`) has `version 2224` and covers surfaces
    `cc, ccd, ccr, chat, cowork` (`:793524`, `:794343`, `:795158`, `:795945`, `:796671`).
- **Seed `cc` content:**
  - `model_selector_state.model: "claude-opus-5"`, `selection_source: "global_default"`.
  - Per-model thinking defaults: Fable 5.1 high, **Opus 5.5 medium, Sonnet 5.5 medium, Haiku 5.5
    medium**.
  - Picker **main** section: Opus 5.5, Sonnet 5.5, Fable 5.1, Haiku 5.5.
  - **overflow:** Haiku 4.5, Sonnet 5, Opus 5, Fable 5, Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 4.6, and
    Opus 4.1 (`offered_on` bedrock/vertex only).
  - `min_claude_code_version`: Opus 5.5 and Sonnet 5.5 `2.1.280`; Fable 5.1 `2.1.251`.
  - Each row carries `runtime{max_input_tokens, max_output_tokens, effort_levels, default_effort, …}`,
    which feeds `_c`/`jb`/`bc` (window/output, `:123461-123471`) and default effort (`je`).
- **Masking:** served rows can mark ids confidential. `maskModelCodename` (`TIr`, `:126359`) prints
  the first 3 characters and stars the rest (e.g. `myt***-5`).

## Provider planes (`Ie`, `:21727-21730`)

Order: gateway (`Fr()||b7e()||w7e()`) → bedrock → foundry → anthropicAws → **anthropicGoogleCloud**
(`CLAUDE_CODE_USE_ANTHROPIC_GOOGLE_CLOUD`, NEW) → mantle → vertex → firstParty. Display names `$v`
(`:21673`): **"Claude Platform on Google Cloud"** (NEW), "Claude Platform on AWS", "Amazon Bedrock
(Mantle)", "Cloud gateway", …

| Predicate | Members | 2.1.197 |
|---|---|---|
| `usesFirstPartyModelIds` (`au`, `:21766`) | firstParty, anthropicAws, **anthropicGoogleCloud**, gateway | `ud()` without AGC |
| `wD` (`:21770`) | anthropicAws, anthropicGoogleCloud | NEW |
| `VG` hasFirstPartyCapabilities (`:21778`) | firstParty, anthropicAws, **anthropicGoogleCloud**, foundry, mantle | `S1()` without AGC |
| `pd` getProviderForModel (`:21753`) | mantle secondary when the bedrock id is null | `l_()` |

Vertex region env per model: map `d` (`:2618`). NEW entries: `VERTEX_REGION_CLAUDE_5_5_OPUS`,
`_5_OPUS`, `_5_5_SONNET`, `_HAIKU_5_5`, `_FABLE_5_1`.

## Fallback system

### 1. Overload (529) → fallback model (`:524763-524780`)

The condition is effectively **unchanged**: a fallback is thrown as `tengu_api_opus_fallback_triggered`
after `xJ` consecutive 529s when `FALLBACK_FOR_ALL_PRIMARY_MODELS` is set, or when a `fallbackModel`
is set. The api-key path (`!kt()`) applies when the model is **Opus or Fable or Mythos** family
(`rae||E1e||XLt`). Without a fallback model it throws `tengu_api_custom_529_overloaded_error` (not in
sandbox). NEW in this region: background query sources drop 529s immediately
(`tengu_api_529_background_dropped`, `:524759`). The last-resort fallback for non-retryable status is
`tengu_api_fallback_last_resort` (`:524812`), and a 404 is now tagged `model_not_found`.

### 2. Availability chain (NEW)

`buildAvailabilityFallbackChain` (`Kfe`, `:126065`) = `[primary, ...configured --fallback-model]`, or
3P ladder rungs. **`CLAUDE_CODE_NO_MODEL_FALLBACK`** (NEW, `kG` `:126048`) collapses it to
`[primary]`. It also disables refusal fallback, and any later fallback pivot hits a tripwire that
throws (`xsn`, `:126052`). The 3P stepdown uses the catalog `fallback_3p` (`XIn`, `:449084`). From
Fable it steps to Opus with `ANTHROPIC_DEFAULT_OPUS_MODEL` precedence.

### 3. Refusal fallback (`:179401-179500`)

- **Enable:** `fj()` = `!CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK && !CLAUDE_CODE_NO_MODEL_FALLBACK`.
  `tengu_loggia_carousel` is still mapped from the server key `refusalFallbackLaneEnabled`
  (`:1502880`).
- **Eligibility:** `j9` (`:179425`) checks for an EAP model, then the catalog capability
  **`refusal_fallback`** (Sonnet 5.5, Opus 5, Opus 5.5, Fable 5, Fable 5.1), then a GrowthBook list.
- **Target** (`rf`, `:179477`):
  - On first-party-id planes (`au`): `getRefusalFallbackOpusModel` (`rRo` → `Pc()`, `:125137-125150`).
    `Pc` returns `zS = "opus5"` unless the plane's per-provider `opus` alias is *older* than Opus 5 in
    `Oc = Pln`, in which case it keeps that alias. Result: **`claude-opus-5`** on firstParty,
    anthropicAws and anthropicGoogleCloud, but **`claude-opus-4-7` on gateway** (gateway `opus` alias
    is `claude-opus-4-7`, `:21186-21196`). `ANTHROPIC_DEFAULT_OPUS_MODEL` overrides it.
  - On firstParty accounts without entitlement rows (`qft`), Opus 5 is swapped to
    **`claude-opus-4-8`** unless it is explicitly listed (`ef`/`tf`, `:179462-179476`; constants
    `Zc="claude-opus-4-8"`, `cy="claude-opus-5"`).
  - On 3P planes: Opus 4.8 by family env.
  - `[1m]` is preserved only if the source had it.
- **Other:** new beta `server-side-fallback-2026-07-01` (`server_side_fallback_category`, `wS`,
  `:92310`), alongside `server-side-fallback-2026-06-01` and `fallback-credit-2026-06-01`.
  `CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL` (NEW, `:179298`) is read raw from `process.env` (behaviour
  not traced).

### 4. Streaming → non-streaming

Unchanged mechanism (`tengu_streaming_fallback_to_non_streaming`, 7 occurrences vs 4).
`CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK` and flag `tengu_disable_streaming_to_non_streaming_fallback`
are both still present.

## Fast mode ("penguin")

The mechanism is the same as in 2.1.197: `speed:"fast"` with beta `fast-mode-2026-02-01` (`Hin`,
`:92291`). It is not a separate main-loop id.

- **Gate** `jo()` (`:120923`): firstParty and `!CLAUDE_CODE_DISABLE_FAST_MODE`.
- **Eligible model** `Mg` (`:121092-121100`): `lb(model,"fast_mode")`, else the id contains
  `opus-4-8` or **`opus-5`**. The catalog grants `fast_mode` to **Opus 4.8, Opus 5, Opus 5.5**.
  **CHANGED:** Opus 4.7 is no longer eligible (2.1.197: Opus 4.7 + 4.8). The `opus-5` substring also
  matches `opus-5-5`.
- **Display model** `SG`/`Wfe` (`:121035-121042`): the default `opus` alias (+`[1m]` when merged),
  which is "Opus 5.5" on firstParty.
- **Availability** `aI` (`:120982-121004`): `not_first_party`, `disabled_by_env`, `unknown` (flag
  `tengu_penguins_off` non-null; its string is shown, `:121026`), `model_not_allowed`, `preference`
  (policy `fastMode:false`, or **NEW** `fastModePerSessionOptIn`), **NEW** `sdk_opt_in_required`,
  `pending`, `free`, `extra_usage_disabled`, `network_error`. Org status still comes from
  `/api/claude_code_penguin_mode` (`:121386`).
- **Fast pricing** (`zLt` `:121710-121714`, `Wft` `:121551-121556`):

  | Model | Fast price | Constant | Status |
  |---|---|---|---|
  | **Opus 5.5** | **$8/$40** | `Gy` `:121541` | NEW |
  | Opus 4.8, **Opus 5** | $10/$50 | `ba` `:121533` | |
  | Opus 4.6/4.7 | $30/$150 | `Ky` `:121525` | retained for legacy cost lookup |

- **REMOVED:** flag `tengu_sunset_penguin_opus47` (0 occurrences). `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE`
  and `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE` survive **only** as names in an env-name list
  (`cli.beauty.js:814975`, 1 occurrence each) and are inert.
- Env `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` (`_a`, `:120932`) and `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`
  (`:121000`) are unchanged. `tengu_auto_mode_config.disableFastMode` can disable fast mode in auto
  mode (`:127419`).

## 1M context

- The suffix is `[1m]`. **NEW:** the parser also strips `[2m]` (`yc` `:14064`, `On` `:14053`). No
  model or alias produces `[2m]` in this build. Its purpose is **unknown**.
- Beta `context-1m-2025-08-07` (`qw`, `:92279`) is unchanged.
- **Disable:** `CLAUDE_CODE_DISABLE_1M_CONTEXT` (`uI`, `:126797`).
- **Native 1M** `modelHasNative1MContext` (`CE`, `:126847` → `_v` `:126824`): catalog
  `context.native_1m` or `claude-mythos-preview`.
  - **CHANGED:** there is no longer any provider condition. 2.1.197's `_I()` required canonical
    firstParty/anthropicAws/mantle, or `native_1m_3p` for 3P. That field is gone.
  - Native set: Haiku 5.5, Sonnet 5, Sonnet 5.5, Opus 4.7, 4.8, 5, 5.5, Fable 5, 5.1, Mythos 5, 5.1.
- **Beta-eligible** `Cee` (`:126855`): not in the excluded list `Kve` (`:126851`, unchanged:
  `claude-3-*`, Opus 4/4.1/4.5, Haiku 4.5), and catalog `supports_1m_beta`, **or** any model on a
  first-party-capable plane. Mode `Wa` (`:126863`) is `native` | `optIn` | `never`.
- **Window** `bv` (`:126914-126925`), in order:
  1. 1e6 if `[1m]` or the long-context beta applies.
  2. The served catalog `runtime.max_input_tokens` (clamped 8192–1e6). It is **believed** only up to
     200k unless the model is native 1M (`pRo`, `:126883`).
  3. Native → 1e6.
  4. The Sonnet 4.6 `kelp_forest_sonnet` client-data override (`eKn`, `:126936`, unchanged).
  5. `CLAUDE_CODE_MAX_CONTEXT_TOKENS` when the model is not a recognised Claude id.
  6. 200,000.
- **Opus 1M merge** `isOpus1mMergeEnabled` (`lq`, `:126313`) is false when 1M is disabled, on Pro,
  off firstParty, for a subscriber with no tier, or when the default Opus is `never`. `[1m]` is added
  only for `optIn` models (`Wve`, `:126323`). Opus 5.5 is native, so its default is untagged.
- Display "(1M context)" uses `supports_1m_suffix` (`uv`) or the set `WL` (`:126532`), which covers
  Opus 4.6–5.5 and Sonnet 4–4.6.

## Effort / thinking

Levels `ha = ["low","medium","high","xhigh","max"]` (`:34695`, unchanged); `med` is an alias for
`medium`, and `ultracode` maps to `xhigh` (`:163226-163231`).

| Predicate | Fn | Catalog holders |
|---|---|---|
| effort | `Mb` `:163038` | Haiku 5.5, Sonnet 4.6/5/5.5, Opus 4.6/4.7/4.8/5/5.5, Fable 5/5.1, Mythos 5.1 (+Mythos 5 by name) |
| max | `cie` `:163053` | same set |
| xhigh | `Uut` `:163067` | same minus Sonnet 4.6 and Opus 4.6 |
| adaptive thinking | `gRo` `:127222` | same as effort |
| rejects_disabled_thinking | `WIe`/`E9e` `:127173-127183` | Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5, 5.1, Mythos 5.1 (thinking cannot be turned off) |
| thinking_disabled_effort_cap | `jAr` `:163132` | Opus 5 (also by name) |
| per_turn_effort | `L` gate → `tengu_per_turn_effort` | Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5.1 |
| per_turn_timing | beta `timing-2026-09-09` | Sonnet 5.5, Opus 5.5, Fable 5.1, Mythos 5.1 |
| mid_conv_tool_change | `qve` `:127330` | Haiku 5.5, Sonnet 5.5, Opus 4.8/5/5.5, Fable 5/5.1, Mythos 5.1 |
| lean_prompt | `he` `:161273` | Haiku 5.5, Sonnet 5.5, Opus 4.8/5/5.5, Fable 5/5.1, Mythos 5.1 |
| prompt bundles | `:160613`, `:161046-161051` | `opus_5_prompt_bundle` (Opus 5), `opus_5_5_prompt_bundle` (Opus 5.5), `fable_5_1_prompt_bundle` (Fable 5.1, Mythos 5.1) |
| org_locked_thinking | — | Haiku 5.5, Sonnet 5.5 |

**CHANGED vs 2.1.197:**

- `mid_conv_system` is **no longer listed on any catalog model**. Fable 5, Sonnet 5 and Opus 4.8 had
  it in 2.1.197. `_U` (`:127340`) now defaults it to **true**, except for `opus-4-8` and HIPAA.
- Sonnet 5 lost `mid_conv_system`. Fable 5 gained `refusal_fallback` and `mid_conv_tool_change`.
- Opus 4.8 gained `mid_conv_tool_change`. Opus 4.7 lost `fast_mode`.

**Default effort** (`szn`, `:163650`), in order:

1. Flag `tengu_witty_wand` (NEW per-model map, `:163668-163679`).
2. Org default effort (`uBe`).
3. Served `runtime.default_effort` (`je`).
4. Client-data `default_effort` (`Ne`).
5. Catalog `default_effort ?? "high"` (`Je`, `:163686`).

New catalog defaults are **medium** for Opus 5.5, Sonnet 5.5 and Haiku 5.5, and high for Opus 5 and
Fable 5.1. The launch-effort pins `unpinOpus47/48/Fable5LaunchEffort` survive (`Fe`, `:163333`), but
apply only to configs without `firstStartVersion`. `CLAUDE_CODE_EFFORT_LEVEL` `unset`/`auto` maps to
null (`ZR`, `:163291`). `CLAUDE_CODE_MAX_EFFORT_REMINDER` / flag `tengu_proud_clover` (NEW,
`:163034`).

## API betas (`:92276-92323`)

**NEW vs 2.1.197** (each string occurs 0 times in 2.1.197):

| Beta | Purpose / registry key |
|---|---|
| `prompt-caching-evict-2026-05-12` | |
| `cache-keepalive-2026-09-03` | |
| `thinking-resumption-2026-07-17` | |
| `per-turn-control-2026-07-01` | `per_message_effort` |
| `timing-2026-09-09` | `per_turn_timing` |
| `mid-conversation-tool-changes-2026-07-01` | |
| `inline-tools-2026-09-15` | |
| `server-side-fallback-2026-07-01` | category routing |
| `auto-mode-classifier-2026-07-16` | |
| `dangerous-tool-use-2026-09-03` | |
| `thinking-display-updates-2026-08-18` | |
| `thinking-binding-controls-2026-08-01` | |
| `message-threads-2026-08-12` | |
| `mid-conversation-system-clear-at-2026-08-21` | |

Internal latch headers: `x-cc-internal-mid-conv-cache-promotion[-ok]`.

**REMOVED:** `summarize-connector-text-2026-03-13` (0 occurrences in 2.1.300).

**Unchanged:** `context-1m-2025-08-07`, `effort-2025-11-24`, `fast-mode-2026-02-01`,
`interleaved-thinking-2025-05-14`, `context-management-2025-06-27`, `structured-outputs-2025-12-15`,
`redact-thinking-2026-02-12`, `thinking-token-count-2026-05-13`, `server-side-fallback-2026-06-01`,
`fallback-credit-2026-06-01`, `task-budgets-2026-03-13`, `advisor-tool-2026-03-01`, and
`mid-conversation-system-2026-04-07` (now a plain const `eje`, `:92304`).

## Model-related environment variables

Diffed with the same regex over `cli.min.js` of both builds.

| Env var | Status | Effect |
|---|---|---|
| `ANTHROPIC_MODEL` | kept | main-loop override (`QLt`) |
| **`ANTHROPIC_DEFAULT_MODEL`** | NEW | default-model layer (`A1e`) |
| `ANTHROPIC_DEFAULT_{OPUS,SONNET,HAIKU,FABLE}_MODEL` (+`_NAME/_DESCRIPTION/_SUPPORTED_CAPABILITIES`) | kept | family overrides |
| `ANTHROPIC_SMALL_FAST_MODEL` (+`_AWS_REGION`) | kept | small/fast override (`Ov`) |
| `ANTHROPIC_CUSTOM_MODEL_OPTION` (+siblings) | kept | custom picker entry |
| `CLAUDE_CODE_SUBAGENT_MODEL` | kept | subagent default (`aoe`) |
| **`CLAUDE_CODE_SUBAGENT_MODEL_FORCE`** | NEW | force env subagent model over tool/frontmatter |
| **`CLAUDE_CODE_WORKFLOW_SUBAGENT_MODEL`** | NEW | subagent model inside workflow runs |
| **`CLAUDE_CODE_COORDINATOR_FORCE_WORKER_INHERIT_MODEL`** | NEW | coordinator workers ignore `model` (`:372595`) |
| **`CLAUDE_CODE_MODEL_CAPABILITIES`** | NEW | per-model capability overrides (`dHo`) |
| **`CLAUDE_CODE_MODEL_CATALOG`** / **`CLAUDE_CODE_MODEL_CATALOG_URL`** | NEW | served-catalog kill switch / published-catalog URL |
| **`CLAUDE_CODE_NO_MODEL_FALLBACK`** | NEW | disable every model fallback |
| **`CLAUDE_CODE_DISABLE_MODEL_ACCESS_FALLBACK`** | NEW | disable 3P access ladders |
| **`CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL`** | NEW | read at `:179298`; semantics not traced |
| **`CLAUDE_CODE_3P_PROBE_WROTE_{OPUS,SONNET,HAIKU}_DEFAULT`**, **`CLAUDE_CODE_3P_SEEDED_{OPUS,SONNET}_DEFAULT`** | NEW | internal markers written by the 3P probe (`YLt`/`M0s`, `:124376-124385`) |
| **`CLAUDE_CODE_MAX_EFFORT_REMINDER`** | NEW | effort reminder toggle |
| `CLAUDE_CODE_DISABLE_LEGACY_MODEL_REMAP`, `CLAUDE_CODE_DISABLE_1M_CONTEXT`, `CLAUDE_CODE_DISABLE_FAST_MODE`, `CLAUDE_CODE_SKIP_FAST_MODE_*`, `CLAUDE_CODE_EFFORT_LEVEL`, `CLAUDE_CODE_ALWAYS_ENABLE_EFFORT`, `CLAUDE_CODE_DISABLE_THINKING`, `CLAUDE_CODE_DISABLE_ADAPTIVE_THINKING`, `CLAUDE_CODE_DISABLE_REFUSAL_FALLBACK`, `CLAUDE_CODE_DISABLE_NONSTREAMING_FALLBACK`, `CLAUDE_CODE_MAX_CONTEXT_TOKENS`, `FALLBACK_FOR_ALL_PRIMARY_MODELS` | kept | as in 2.1.197 |
| `VERTEX_REGION_CLAUDE_{5_5_OPUS,5_OPUS,5_5_SONNET,HAIKU_5_5,FABLE_5_1}` | NEW | per-model Vertex region |
| `CLAUDE_CODE_FABLE_BRIDGE_DIALOG_TIMEOUT_MS` | REMOVED | — |
| `CLAUDE_CODE_ENABLE_OPUS_4_7_FAST_MODE`, `CLAUDE_CODE_OPUS_4_6_FAST_MODE_OVERRIDE` | inert | name-list only (`:814975`) |

## Capabilities matrix (baked `capabilities[]`)

| Model | fast | 1M | effort | xhigh | adaptive | rejects-off | mid_conv_tool | lean | refusal_fb | output default/upper |
|---|---|---|---|---|---|---|---|---|---|---|
| `claude-opus-5-5` | ✅ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 128k/128k |
| `claude-opus-5` | ✅ | native | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ✅ | 64k/128k |
| `claude-opus-4-8` | ✅ | native | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ | 64k/128k |
| `claude-opus-4-7` | ❌ (CHANGED) | native | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 64k/128k |
| `claude-opus-4-6` | ❌ | beta | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 64k/128k |
| `claude-opus-4-5` / `4-1` / `4-0` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k/64k, 32k/32k, 32k/32k |
| `claude-sonnet-5-5` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 128k/128k |
| `claude-sonnet-5` | ❌ | native | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | 64k/128k |
| `claude-sonnet-4-6` | ❌ | beta | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | 32k/128k |
| `claude-sonnet-4-5` / `4-0` | ❌ | beta | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k/64k |
| `claude-haiku-5-5` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 128k/128k |
| `claude-haiku-4-5` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 32k/64k |
| `claude-fable-5-1` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 64k/128k |
| `claude-fable-5` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 64k/128k |
| `claude-mythos-5-1` | ❌ | native | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | 64k/128k |
| `claude-mythos-5` | ❌ | native | by name | by name | by name | ❌ | by name | by name | ❌ | 64k/128k |

`context_management` is on every entry except the three 3.x models and Mythos 5, whose list is
empty; `gU` (`:127290`) still grants it to Mythos 5 by name. Output caps come from `sae`
(`:126973`). A served `runtime.max_output_tokens` (1024–128000) overrides them. If the catalog has no
`default_output_tokens`, the account's server-sent `client_data.heather_vale` can set the default instead
(`Sv()`, `:126962`; capped at the upper limit), before `CLAUDE_CODE_MAX_OUTPUT_TOKENS` is applied. See
[feature-flags: server-sent client data](feature-flags.md#server-sent-client-data-client_data-a-second-remote-config-channel).

## What's new vs 2.1.197 (summary)

- **+6 catalog entries:** Opus 5, Opus 5.5, Sonnet 5.5, Haiku 5.5, Fable 5.1, Mythos 5.1. The model-id
  count is 61 → **62** per `_facts.md` (8 new, 7 removed; Mythos is outside that regex).
- **Alias defaults:** `opus` 4.8 → **5.5**, `sonnet` 5 → **5.5**, `haiku` 4.5 → **5.5** (firstParty;
  3P stays 4.5), `fable` 5 → **5.1**. 3P Opus defaults moved to 5.5 on bedrock/vertex/mantle/anthropicAws.
- **Default model:** Opus default extended to Pro, Team and Enterprise subscribers, and to
  Bedrock/Vertex. New layers: `ANTHROPIC_DEFAULT_MODEL`, served/published catalog, org enforced
  default.
- **Served/published model catalog** with signed seed v2224, flag `tengu_delegated_quail` (default off).
- **Catalog schema:** `pricing_tiers` with long-prompt pricing, `anthropic_google_cloud` ids,
  `fallback_3p`, `effort_cost_index`, `advisor_rank`, `supports_1m_suffix`, `best`; `native_1m_3p` removed.
- **Capability vocabulary** expanded to 31 names, overridable by `CLAUDE_CODE_MODEL_CAPABILITIES`.
- **Fast mode:** Opus 4.8/5/5.5 (Opus 4.7 dropped); Opus 5.5 fast $8/$40; the Opus 4.7 sunset flag is
  removed.
- **Native 1M** is no longer provider-conditional. Sonnet 5.5, Haiku 5.5 and Opus 5/5.5 are native.
- **Refusal fallback** targets Opus 5 (Opus 4.7 on gateway), with Opus 4.8 for unentitled firstParty accounts. A catalog
  `refusal_fallback` capability was added. `CLAUDE_CODE_NO_MODEL_FALLBACK` is a hard kill switch.
- **Classifier** default is pinned to **Sonnet 5**, refusing Sonnet 5.5/Opus 5.5 env overrides.
  Fable/Mythos main models reroute to an Opus-5-first lineup.
- **Small/fast** model on firstParty is Haiku 5.5. Bedrock/Vertex without Haiku now use Sonnet.
- **14 new API betas**; `summarize-connector-text` removed.

## Uncertainties

- **Runtime default under the remote catalog.** If `tengu_delegated_quail` turns the published or
  served catalog on, the default becomes the catalog's `state.model`. In the embedded seed that is
  **`claude-opus-5`**, not the compiled `claude-opus-5-5`. The flag's live value per account cannot
  be read from the binary. Both values are reported; neither is asserted as what every user sees.
- **`[2m]` suffix:** the parser strips it, but nothing produces it in this build. Its meaning is unknown.
- **3P access ladders and probe** (`xS`, `CLAUDE_CODE_3P_PROBE_*`): partially traced only.
- `CLAUDE_CODE_REFUSAL_FALLBACK_CATCH_ALL` semantics are not traced.
- Minified names (`Hg`, `Cm`, `Ot`, `lX`, …) are build-specific. Readable names are taken from the
  module-1290 re-export (`:1041466`).
