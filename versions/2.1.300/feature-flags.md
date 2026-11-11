# Feature Flags

> [Back to version index](../README.md)
>
> **Version**: 2.1.300 | **Build**: `2026-10-14T12:54:55Z` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.4.3 (ESM, code-split, 2,651 embedded files)
> **GIT_SHA**: `c6733ae1276880507ca0c5b053ae18fb0df090d6`
> **Baseline**: [2.1.197](../2.1.197/feature-flags.md) | **Dataset**: [data/feature-flags.yaml](data/feature-flags.yaml)

## Feature Flag System

GrowthBook is still the backend (`cachedGrowthBookFeatures` on disk, remote-eval payload in memory). Three things changed:

1. **The resolver is now a class.** 2.1.197 had a free function `it()` with a four-step lookup. 2.1.300 has a class `vf` in module 152 (`chunk-7rwjz6p0.js`). Every read returns `{value, source}`, and code can branch on where a value came from.
2. **Scale.** **704** distinct flags (canonical, [`_facts.md` §1.1](bundle/_facts.md)), against **251** in 2.1.197 under the same method (the published 2.1.197 figure, 243, used a narrower accessor set). Churn: **519 NEW**, **66** gone from the literal set (**58 removed**, **8 rerouted** to a constant or wrapper), **185 kept**.
3. **Defaults flipped to on.** **232 of 704** flags default to literal `true`, up from **30 of 251** in 2.1.197. **199 of the 519 new flags** ship default-on. Most new flags are kill switches for code that runs by default, not opt-in experiments.

### Flag accessor functions

Minified names rotate every build. Module 907 (`chunk-e1ck0rsm.js`, `cli.beauty.js:879942`) re-exports the GrowthBook API under readable names, which is where the real names below come from. All accessors are defined in module 152.

| Symbol | Readable name (module 907) | Def line | Body | Distinct flags | 2.1.197 was |
|---|---|---|---|---|---|
| `k(name, def)` | `getFeatureValue_CACHED_MAY_BE_STALE` | `:142865` | `vn(name, def).value` | **634** | `it` |
| `vr(name, def)` | `getFeatureValue_SESSION_PINNED` | `:142869` | first `k()` result cached in `To().pinnedFeatureValues` (a `Map`) | **44** | — (NEW) |
| `vn(name, def)` | `getFeatureValueWithSource_CACHED_MAY_BE_STALE` | `:142861` | `Fe().getFeatureValueWithSource(name, def)` → `{value, source}` | **23** | — (NEW) |
| `MG(name, def, _)` | `getFeatureValue_CACHED_WITH_REFRESH` | `:142879` | `k(name, def)`; third argument ignored | 7 | `J7` |
| `rb(name)` | `checkGate_CACHED_OR_BLOCKING` | `:142882` | async; `Fe().checkGateCachedOrBlocking` | 7 | `$U` |
| `V9e(name)` | `checkGate_OWN_OFF_FIRST` | `:142885` | `QOr(name) ? false : rb(name)` | 0 literal (2 via constants) | — (NEW) |
| `KC(name, def)` | `getDynamicConfig_CACHED_MAY_BE_STALE` | `:142994` | `k(name, def)` | 4 | `ik` |
| `Mj(name, def)` | `getDynamicConfig_BLOCKS_ON_INIT` | `:142990` | `JOr(name, def)` | 3 | `Q7` |
| `JOr(name, def)` | `getFeatureValue_DEPRECATED` | `:142857` | `Fe().getFeatureValueBlocking` (awaits `initialize()`) | 1 | `sRn` |
| `Lxo(name)` | `peekSessionPinnedFeatureValue` | `:142875` | reads the pin map without populating it | — | — |
| `QOr(name)` | `isGateOffInOwnEvaluation` | `:142889` | `value !== true && f5(source)` | — | — |
| `f5(source)` | `isServedFeatureSource` | `:142897` | source classifier (below) | — | — |

Distinct-flag counts are per accessor, so a flag read through two accessors appears in both rows. My module-aware scan reproduces `_facts.md` exactly: 704 names, and k 634 / vr 44 / vn 23 / MG 7 / rb 7 / KC 4 / Mj 3 / JOr 1. Lazy code paths also reach the accessors through destructuring: `let {getFeatureValue_CACHED_MAY_BE_STALE: n} = await import("/$bunfs/root/chunk-e1ck0rsm.js")` (`Rs()`, `:1050402`), or through `import.meta.require` (`OX()`, `:103974–103979`, `tengu_session_stable_address`). The scan counts both.

Module 152's tail (`:142994–143022`) passes `k`/`vn`/`vr` into **17 reader registries** (`D$s(k); Sm(k); cw(vn); kw(vr); …`), so lower-level chunks can read flags without importing module 152. Flags read only through those registries or through local wrappers are **not** in the 704 (see [Supplementary](#supplementary-flags-outside-the-704)).

### The resolver class `vf` — decoded (STRUCTURAL CHANGE vs 2.1.197)

`Fe()` (`:142671`) lazily builds one `vf` per host slot (`Ui()` → `qOr.of(j().host)`). It injects dependencies: `isEnabled: Ng()`, `isDiskCacheReadableWhileDisabled: e6s()`, `hasWorkspaceTrust: YOr()`, `readGlobalConfig: ce()`, `saveGlobalConfig`, `readEnvironmentOverrides: () => a.CLAUDE_INTERNAL_FC_OVERRIDES`, `logExposure`, `getRefreshCadence: n6s()`, and others.

**`getFeatureValueWithSource(name, def)`** (`:134156–134197`). Every `k`/`vn`/`vr`/`MG`/`KC` read goes through it:

```js
let r = this.getEnvironmentOverrides();               // 1
if (r && ml(r, e)) return { value: r[e], source: "override" };
let s = this.readConfigOverrides();                   // 2
if (s && ml(s, e)) return { value: s[e], source: "override" };
if (!this.deps.isEnabled() && !this.deps.isDiskCacheReadableWhileDisabled())
    return { value: n, source: "disabled" };          // 3
if (this.experimentDataByFeature.has(e)) this.logExposureForFeature(e);
let h = this.remoteEvalFeatureValues.get(e);          // 4 live payload
if (h !== void 0) return { value: Sf(h, n), source: "payload" };
if (this.remoteEvalFeatureValues.size > 0) return { value: n, source: "fallback" }; // 5
if (_r.has(e)) return { value: n, source: "fallback" };                            // 6
try { let y = this.deps.readGlobalConfig(), S = y.cachedGrowthBookFeatures?.[e];
      if (S !== void 0) return this.recordDeferredExposure(e, y), { value: Sf(S, n), source: "disk" }; // 7
} catch {}
return { value: n, source: "fallback" };              // 8
```

| Step | Source | Condition | Notes |
|---|---|---|---|
| 1 | `override` | name in environment overrides | **Stubbed in this build.** `getEnvironmentOverrides()` returns `null` (`:133811–133813`). The dep `readEnvironmentOverrides → CLAUDE_INTERNAL_FC_OVERRIDES` is wired (`:142689`) but nothing reads it. `CLAUDE_INTERNAL_FC_OVERRIDES` is set only by an eval harness path (`:1647001`). |
| 2 | `override` | name in config overrides | **Stubbed.** `readConfigOverrides()` returns `undefined` (`:133828`). `setConfigOverride`/`clearConfigOverrides` are no-ops. |
| 3 | `disabled` | `!Ng() && !e6s()` | `Ng()` = `!DISABLE_GROWTHBOOK && Oj()` (`:142788`). `e6s()` keeps the **disk cache readable while telemetry is off** when `CLAUDE_CODE_GB_DISK_CACHE_WHEN_TELEMETRY_OFF` is set (`:142792`). |
| 4 | `payload` | value in the live remote-eval payload | A served `null` falls back to the caller default (`Sf`, `:134324`). |
| 5 | `fallback` | a payload exists but does not contain the name | When fresh data has arrived, a missing key means "use the code default", **not** "use the stale disk value". |
| 6 | `fallback` | name is in `_r` | Never read from disk (below). |
| 7 | `disk` | `cachedGrowthBookFeatures[name]` exists | Records a **deferred exposure**. It is logged only if the live payload later confirms the same experiment/variation (`drainPendingExposures`, `:133896`). |
| 8 | `fallback` | nothing found | caller default |

Override detection uses `ml(obj, name)` (`:134338`). It has one special case: for `tengu_plugin_hooks_modules` (`My`), an override counts only if its value is exactly `true`.

**`checkGateCachedOrBlocking(name)`** (`rb`, `:134198`): overrides → `false` if disabled → `true` if payload `=== true` → `true` if disk `=== true` and the name is not in `_r` → otherwise `await getFeatureValueBlocking(name, false)`, which awaits client init.

**`getFeatureValueBlocking(name, def)`** (`JOr`/`Mj`, `:134143`): overrides → `def` if disabled → `await initialize()` → payload value or SDK `getFeatureValue`. It never consults the disk cache.

#### Source classification `f5` (`:142897`)

| `source` | `f5` | Meaning |
|---|---|---|
| `payload` | `true` | served by GrowthBook in this process |
| `override` | `true` | operator override (stubbed in external builds) |
| `disabled` | `true` | GrowthBook is off, so the default is authoritative |
| `fallback` | `Wi()` | authoritative only once fresh remote-eval values exist (`Wi()` = `hasFreshGrowthBookFeatures`, `:142740`) |
| `disk` | `false` | stale cache; never treated as a decision |

How code uses provenance:

- **`QOr`/`V9e`, "own-off-first" gates.** `V9e(name)` returns `false` without blocking if the flag is already known off from a served/authoritative source. Otherwise it falls through to the blocking `rb`. Used by `b0t()` and `blt()` for `tengu_violin_maple` (`:280555`, `:315654`) and by `nzr()` for `tengu_violin_willow` (`:814830`).
- **Served-only flips via `da(name, {safe})`** (module 201, `:188448`). This returns the non-safe value only when the value came from a live `payload` **and** the client is on the default API host (`!FU()`). Disk, fallback and override can never move it off the safe value. Used for `tengu_bridge_attestation_enforce`, `tengu_ccr_unread_state_exit_killswitch` and others.
- **"Ignored when override".** Several `violin_*`/tool-host gates read `vn()` and return `value === true && source !== "override"` (`:434864`, `:1089693`, `:1090328`, `:1189727`, `:1518568`). An override cannot switch those features on.
- **Default-vs-served logging.** `tengu_brindle_causeway` (MCP SDK runtime arm, `:373318`) logs whether it came from `env`, `default` (`disabled`/`fallback`) or `growthbook`. `tengu_cuddly_willow` (`pie()`, `:348693`) refuses to enable cross-session messaging while flags are unsettled and the source is `fallback`.

#### The `_r` set: flags that never touch disk (`:133709`)

```js
nk = new Set(["tengu_steady_bittern"]),
_r = new Set(["tengu_steady_bittern", ...[], "tengu_twinkly_clover", "tengu_candid_juniper", "tengu_steadfast_wren",
  "tengu_cobalt_plinth_orpine", "tengu_valiant_lantern", "tengu_level_plover", "tengu_splendid_lynx", "tengu_tender_mitten",
  "tengu_snug_quill", "tengu_mellow_heron", "tengu_wondrous_haven", "tengu_mighty_flask", "tengu_zippy_harbor",
  "tengu_fallow_lantern", "tengu_mellow_hollerith"]);
```

The set has 16 members. Membership has four effects:

- No disk read: step 6 above, and the `rb` disk shortcut is skipped.
- No persistence: `syncRemoteEvalToDisk()` strips the members with `ws(..., [..._r])` (`:133963`), and so does `getAllFeatures()` (`:133833`).
- No experiment attribution from disk: `isFeatureFromExperiment()` returns `false` for them (`:133825`).
- The `...[]` spread inside the literal looks like a build-time-empty slot (tentative).

None of the 16 is in the 704. Each is read through a constant: `nNs`…`gNs` (`:133693–133707`, 14 names) plus `XA = "tengu_mellow_heron"` (`:1485922`). Seven of them (`twinkly_clover`, `candid_juniper`, `steadfast_wren`, `splendid_lynx`, `tender_mitten`, `snug_quill`, `fallow_lantern`) are read through **`pr(name)`** (`:1488467`), a CCR-only tri-state:

```js
function pr(e) { if (!a.CLAUDE_CODE_REMOTE) return "off"; if (k(e, !1)) return "on"; return Bc() ? "cold" : "off" }
function Bc() { return Ng() && !Wi() }      // GrowthBook enabled but no fresh payload yet
```

These are remote-worker behaviours that must come from a **live** evaluation for the current session and never from a previous session's cached value. `tengu_steady_bittern` is read with `da(gNs, {safe: true})` (`qZ()`, `:188487`). The second set `nk` is used by `sk()` (`:134343`) to strip that key from feature maps.

#### Session pinning (`vr`)

```js
function vr(e, n) { let r = To().pinnedFeatureValues ??= new Map; if (!r.has(e)) r.set(e, k(e, n)); return r.get(e) }
```

The first read wins for the life of the session state (`To()`). A mid-session GrowthBook refresh does not change a pinned flag. The 44 `vr` flags are mostly prompt/behaviour arms that would be inconsistent if they flipped mid-conversation: `tengu_cedar_lantern`, `tengu_idempotent_wolf`, `tengu_wobbly_dahl`, `tengu_snappy_pelican`, `tengu_virtual_pancake`, `tengu_twinkling_boole`, and the built-in **mods** `tengu_agents_md_mod`, `tengu_mermaid_mod`, `tengu_tips_mod`, `tengu_quiet_ember`. `pinnedFeatureValues` does not occur in 2.1.197 (0 matches).

#### Remote eval, refresh and identity (new plumbing)

- **Authenticated remote eval.** When `tengu_gb_eval_authed_enable` is on (read inside the class, `:134017`), the client POSTs to `${host}/api/eval-authed/${clientKey}`. Only when the workspace is trusted (`hasWorkspaceTrust()`) does it first refresh OAuth and attach the auth headers; an untrusted workspace still hits `eval-authed`, just without them (`:134026–134034`). On a non-OK response or a throw it falls back to the stock `/api/eval` (`:134036–134055`). `eval-authed` occurs 0 times in 2.1.197.
- **Cache keys.** The remote-eval cache is keyed on `["id", "organizationUUID", "slackTagConnected", "atisPin", "ccrDerivedSurface"]` (`:134100`).
- **Refresh cadence `n6s()`** (`:142924`). `tengu_gb_refresh_interval_minutes` null → every 360 min (`flagged:false`). Otherwise a positive finite number (strings are coerced) is clamped to [5, 360] min, multiplied by a 0.9–1.1 jitter factor and re-capped at 360 min; a non-numeric or non-positive value falls back to 360 min but still returns `flagged:true`. When `flagged`, a refresh that does not raise the OK-fetch count is retried after up to 5 s (`periodicRefreshLoop`, `:134296`).
- **Disk persistence.** `syncRemoteEvalToDisk()` writes `cachedGrowthBookFeatures`, `cachedExperimentFeatures`, `cachedExperimentData` and `cachedGrowthBookFeaturesAt`. It skips the write when the client was built for a Slack-tag-connected identity, or after auth was lost mid-session (`:133960–133983`). `cachedExperimentData` is NEW (0 occurrences in 2.1.197).
- **ATIS pin.** `tengu_serene_teacup` (`BW()`, `:142951`) re-evaluates when the `atisPin` attribute changes. `tengu_kestrel_moor` (`r6s()`, `:142963`) latches the conversation ATIS. The account-level ATIS comes from
  `client_data.atis`; see [Server-sent client data](#server-sent-client-data-client_data-a-second-remote-config-channel).

### Server-sent client data (`client_data`): a second remote-config channel

Besides GrowthBook flags, the server sends each account a free-form JSON object called `client_data`.
Several features read it before (or instead of) their flag, so a value found in `~/.claude.json` is not
necessarily a GrowthBook flag.

- **Source.** `GET {base}/api/claude_cli/bootstrap` (module 668 `chunk-92kvs3r1.js`, `:760225`). The same
  response carries `oauth_account`, `additional_model_options`, `additional_model_costs`, `model_access`,
  `org_model_default` and `auto_compact_windows` (schema at `:759998`).
- **When it is fetched.** Skipped when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set (`Ct()`, `:760218`;
  any non-empty value counts) and on every non-`firstParty` provider plane (`:760219`). `DISABLE_TELEMETRY`
  and `DO_NOT_TRACK` select a separate "no-telemetry" mode that does **not** skip it (`VUt()`, module
  `chunk-sw5grb7z.js`).
- **Storage.** `~/.claude.json` → `clientDataCacheSlots[<slot>]` = `{data, at, entrypoint, model, org}`
  (`:760369`). The slot key is `"bi1-"` (`:112645`) + the first 16 hex characters of
  `sha256(JSON.stringify([entrypoint, model, ccVersion, organizationUuid]))` (`sMr`). A slot older
  than 24 h (`i$s = 86400000`, `:112654`) counts as stale. The older single `clientDataCache` key is still read as a
  fallback (`legacy_fallback`, `:760348`). Each bootstrap fires `tengu_client_data_cache_key`
  `{slot_hit, slot_changed, legacy_fallback, slot_stale}` (`:760345`).
- **Readers.** `Cl(model)` reads the slot for a model and `Iin()` the unkeyed slot (module 152, `:115797`,
  `:115814`). Both return `null` when `clientDataReadGate()` refuses. All six modules below import module
  152's `Cl`, so the short name is not a collision.

Keys the 2.1.300 client reads directly (`Cl(…)?.key`); at least two more are read indirectly
(`tengu_lapis_anchor`, `meadow_lantern`, see below):

| Key | Effect | Evidence |
|---|---|---|
| `atis` | An opaque string the client sends back: as the `x-cc-atis` request header from the `Gw` fetch wrapper (`:182426`) when `Wl()` holds (`firstParty` plus a further check `Si()`, not decoded; or `anthropicAws` without `ANTHROPIC_AWS_BASE_URL`), and as the GrowthBook targeting attribute `atisPin` (`Ein()` strips a `v1.<id>.<…>` wrapper, `:142838`). `tengu_kestrel_moor` can pin a conversation-level value instead (`Fxo()`, `:142966`). What "ATIS" stands for is not in the code. The header existed in 2.1.197; **`atisPin` is NEW** (0 occurrences in 2.1.197). | `:142940` |
| `heather_vale` | Default **max output tokens** per model: a number, or a map of model id → number. Used only when the served model catalog gives no `default_output_tokens` (`bc(e,s) ?? Sv(e,s)`), and capped at the model's upper limit; `CLAUDE_CODE_MAX_OUTPUT_TOKENS` is applied afterwards (`tmt()`, `:126992`). Non-integer or non-positive values are ignored. **CHANGED:** 2.1.197 (`XPd`, `2.1.197:132590`) accepted only the model-id map. | `:126962-126985` |
| `tengu_heron_brook` | Remotely supplied system-prompt text; the client data value wins over the flag of the same name. See [system-prompt](system-prompt.md). | `:491907` |
| `default_effort` | Default reasoning effort. | `:163656` |
| `footer_indicator` | Footer indicator in the UI. | `:685761`, `:1323253` |
| `model_notices` | Notices shown in the model picker. | `:1315738` |
| `non_deferrable_builtins` | Built-in tools exempt from deferred loading. | `:219718` |
| `pewter_owl_model` | Unreleased-model preview gating (also flag `tengu_pewter_owl_model`). | `:368641` |
| `tengu_juniper_sundial` | Read beside the flag of the same name. | `:553825` |

The effects for `default_effort`, `footer_indicator`, `model_notices`, `non_deferrable_builtins` and
`tengu_juniper_sundial` are inferred from the key name and the reading function, not traced in full.

**Removed since 2.1.197:** `cedar_basin` (0 occurrences in 2.1.300). In 2.1.197 it was a **promo end date**,
not an experiment: if the date was in the future, the model picker priced Sonnet 5 as
"$2/$10 per Mtok · promo through <Mon D>" against a $3/$15 list price, on the `firstParty`, `anthropicAws` and
`gateway` planes. See [2.1.197 plan-tier-gating](../2.1.197/plan-tier-gating.md#sonnet-5-promo-pricing-cedar_basin).
A stale `cedar_basin` value can remain in `~/.claude.json` from an older version.

### Dual-gated features (env var AND/OR flag): the dominant pattern

Many new flags follow `a.CLAUDE_CODE_X ?? k("tengu_…", default)`: the env var wins when it is set, otherwise the flag decides. Some examples:

| Feature | Env var | Flag | Logic | Line |
|---|---|---|---|---|
| Artifact delete | `CLAUDE_CODE_ARTIFACT_DELETE` | `tengu_cobalt_plinth_alder` | env ?? flag (off in remote unless `Dr()`) | `:783026` |
| Artifact multi-file | `CLAUDE_CODE_ARTIFACT_MULTI_FILE` | `tengu_cobalt_plinth_bracken` | env ?? flag | `:690415` |
| Artifact comments | `CLAUDE_CODE_ARTIFACT_COMMENTS` | `tengu_teal_corbel` | env ?? flag | `:698965` |
| Peer messaging | `CLAUDE_CODE_HARBOR_KITE` | `tengu_harbor_kite` (+`_win` on Windows) | env overrides, else flag | `:348689` |
| WebFetch agent | `CLAUDE_CODE_WEB_FETCH_AGENT` | `tengu_clever_orbit` | env ?? flag, latched | `:491147` |
| WebFetch deadline | `CLAUDE_CODE_WEBFETCH_DEADLINE_MS` | `tengu_webfetch_deadline_ms` | env (capped) else flag | `:489616` |
| Total-tokens reminder | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER` | `tengu_lapis_anchor` (via const) | env → settings → clientData → flag (`"padded-countdown"`) | `:491600–491618` |
| Silent-turn reminder | `CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS/_TEXT` | `tengu_hushed_lark(_text)` | env else flag | `:553417` |
| Memory push delete | `CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE` | `tengu_mem_push_delete_mode` | env else `"corroborate"` | `:317058` |
| Observer agents | `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` | `tengu_observer_agents_enabled` | env **AND** flag | `:725713` |
| MCP auto-background | `CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS` | `tengu_mcp_auto_background` | env ms else flag | `:1826627` |
| Windows sandbox | `CLAUDE_CODE_NANKEEN_KESTREL` | `tengu_nankeen_kestrel` | env OR flag (Windows only) | `:271482` |
| Transcript local GC | `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` | `tengu_transcript_local_gc` | env ?? flag | `:1474810` |
| SendFeedback | `CLAUDE_CODE_SEND_FEEDBACK` | `tengu_juniper_relay` | env false disables; else flag (firstParty only) | `:736637` |
| Proactivity | `CLAUDE_CODE_DISABLE_PROACTIVITY` | `tengu_proactivity_selector` | env disables, else flag (default true) | `:802951` |
| Dangerous `rm` prompt | `CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT` | `tengu_iridescent_boot` | env disables; only a **served** `false` disables | `:428433` |

### Codename caveat

Adjective-noun names (`violin_*`, `breezy_*`, `tidy_*`, …) are opaque labels. Behaviour below is inferred from call sites with line citations. Where a flag is only read inside a one-line wrapper whose callers I could not trace reliably, the dataset says so ("Not traced") rather than guessing. Short minified names are reused across chunks, so a wrapper name alone does not identify a caller.

---

## What's New vs 2.1.197

| Metric | 2.1.197 | 2.1.300 | Δ |
|---|---|---|---|
| Distinct flags (canonical method) | 251 (published 243) | **704** | +453 |
| NEW / gone / kept | — | **519** / **66** / **185** | — |
| Literal `true` defaults | 30 | **232** | +202 |
| Literal `false` defaults | 150 | 335 | +185 |
| Accessors | `it`, `J7`, `QYr`, `$U` (+`ik`/`Q7`/`sRn`) | `k`, `vr`, `vn`, `MG`, `rb`, `V9e` (+`KC`/`Mj`/`JOr`) | class-based |

### Families by size (flags in 2.1.300; family = first token after `tengu_`)

| Family | Total | NEW | Dominant category |
|---|---|---|---|
| `bridge_*` | 31 | 26 | remote-control-bridge |
| `ccr_*` | 29 | 25 | ccr-remote |
| `mcp_*` | 28 | 18 | mcp |
| `violin_*` | 28 | 28 | tool-host |
| `cobalt_plinth_*` | 21 | 19 | artifacts |
| `amber_*` | 18 | 5 | agents-subagents |
| `bg_*` | 12 | 4 | background-daemon |
| `kairos_*` | 11 | 1 | loops-kairos |
| `tidy_*` | 8 | 8 | model-api |
| `quiet_*` | 7 | 5 | sessions |
| `slate_*` | 7 | 4 | ui-tui |
| `vscode_*` | 7 | 4 | vscode-ide |
| `harbor_kite_*` | 6 | 6 | messaging |
| `lantern_*` | 6 | 5 | billing-usage |
| `saffron_*` | 6 | 3 | billing-usage |
| `velvet_*` | 6 | 5 | web-tools |
| `calm_*` | 5 | 5 | mcp |
| `cedar_*` | 5 | 1 | system-prompt |
| `cobalt_*` | 5 | 0 | remote-control-bridge |
| `harbor_*` | 5 | 0 | channels |
| `lucky_*` | 5 | 5 | agents-subagents |
| `ochre_*` | 5 | 4 | artifacts |
| `plugin_*` | 5 | 3 | plugins |
| `projects_*` | 5 | 5 | cowork-projects |
| `breezy_*` | 4 | 4 | tools |
| `copper_*` | 4 | 2 | artifacts |
| `dapper_*` | 4 | 4 | ui-tui |
| `humble_*` | 4 | 4 | skills |
| `hushed_*` | 4 | 4 | system-prompt |
| `juniper_*` | 4 | 4 | feedback |
| `mossy_*` | 4 | 4 | model-api |
| `pewter_*` | 4 | 2 | goals |
| `umber_*` | 4 | 3 | memory |

Notable new clusters:

- **`violin_*` (28, all NEW): served-tool host.** Gates around calls this machine "serves" to a remote session: own-record and session stances, `rewrite_own_hooks`, background-operator circuit breaker, ask-wait timing (`violin_spruce` `askWaitMs`), away re-checks. The surrounding strings include "This computer's own safety check did not clear this, so a person needs to approve it." (`:1089600–1092500`). The master pair `nx()`/`Xf()` reads `tengu_violin_wood` (`:280539–280553`). The "tool host" label is my inference (**tentative**), supported by `tengu_vast_tulip` → "tool host attestation" enforce/observe (`:1187882`).
- **`bridge_*` (26 NEW) and `ccr_*` (25 NEW): Remote Control / CCR worker.** A block of default-true bridge behaviour flags is defined back-to-back in `chunk-xpm5sbje.js` (`:289990–290180`): child auto-mode, machine settings, artifact and auto-compact in RC children, subagent frame forwarding. A matching block of CCR worker transport tuning sits in `chunk-ce99px70.js` (`:1051094–1051175`): heartbeats, flush intervals, no-subscriber hold, upload trim.
- **`cobalt_plinth_*` (19 NEW): artifacts.** Most are env-dual-gated (`CLAUDE_CODE_ARTIFACT_*`): delete, preview, multi-file, toolset, open action, plus a byte cap (`_sill`), a public-artifact read guard (`_sedge`) and dataviz guidance (`_dataviz`).
- **`mcp_*` (18 NEW): MCP transport hardening.** Per-transport protocol negotiation (`_http`/`_stdio`/`_ccr`/`_claudeai`), legacy SSE fallback, connect-timeout retry tagging, step-up auth dialog, listen-reopen parking, issuer metadata enforce/observe.
- **`harbor_kite_*` (6 NEW): cross-session peer messaging**, with Windows and cloud variants, limits (`MG` with 300 000 ms refresh) and pacing.
- **Built-in "mods"**: `tengu_agents_md_mod` (`cc-plugin-agents-md`, default **true**), `tengu_mermaid_mod`, `tengu_tips_mod`, `tengu_quiet_ember` (responsive mode). All four are session-pinned `vr` reads (`:1537781`, `:1525294`, `:1525014`, `:1526799`).

### FLIPPED defaults (kept flags whose default changed)

| Flag | 2.1.197 | 2.1.300 | Effect | Line |
|---|---|---|---|---|
| `tengu_lapis_anchor` | `"off"` | **`"padded-countdown"`** | Total-tokens reminder is **on by default**. The name moved into const `K9e`, so it left the literal count, but it is the same flag. Precedence: env → user setting `totalTokensReminder` → clientData → flag. | `:491617` |
| `tengu_cobalt_plinth` | `false` | **`pe()`** | Artifact master gate defaults **on** when `z9()` returns undefined, `prosumer_oauth` or `no_auth`, and **off** for `third_party_provider`, `custom_base_url` and `oauth_no_inference_scope` (`z9` at `:159344`; it returns undefined for e.g. an API key, `ZH()`, or team/enterprise OAuth) | `:355609–355615` |
| `tengu_cobalt_plinth_fern` | `false` | **`true`** | Frame base-version rendering on | `:690397` |
| `tengu_harbor_willow` | `false` | **`true`** | Sessions default into **auto mode** when permissions allow | `:162781` |
| `tengu_moss_anchor` | `false` | **`true`** | ...including non-interactive sessions | `:162553` |
| `tengu_maple_pier` | `false` | **`true`** | "make auto your default" nudge after onboarding | `:1479086` |
| `tengu_kairos_loop_keepalive` | `false` | **`true`** | `/loop` keepalive re-scheduling (env `CLAUDE_CODE_LOOP_KEEPALIVE` overrides) | `:734177` |
| `tengu_ccr_v2_send_events_cli` | `false` | **`true`** | CLI sends CCR v2 events | `:290066` |
| `tengu_sage_compass2` | `{}` | **`{enabled: wD(Ie())}`** | Advisor tool on by default on the `anthropicAws` / `anthropicGoogleCloud` planes | `:313845` |
| `tengu_bridge_min_version` | `{minVersion:"0.0.0"}` | **`{minVersion:"2.1.270"}`** | Hard floor; a served value is used only if it is ≥ 2.1.270 | `:1070652–1070679` |
| `tengu_bg_classifier_config` | `{useSmallFastModel, disableThinking}` | `+ midTurnLlmDebounceMs: 60000` | New debounce field | `:1380884` |

The other kept flags whose default text differs only by a renamed minified variable were checked where cheap: `tengu_bg_attach_stall_ms` 5000 → 5000, `tengu_memory_store_resync_interval_minutes` 60 → 60, `tengu_hazel_osprey_floor` → 75000 and `tengu_byte_stream_idle_timeout_ms` 180000 → 180000 are unchanged. `tengu_prompt_cache_1h_config` keeps the same four-entry allowlist, now via const `TYe` (`:477622`). The rest (`amber_rokovoko`, `bridge_poll_interval_config`, `bridge_repl_v2_config`, `desktop_upsell`, `feedback_survey_config`, `kairos_brief_config`, `mcp_directory_visibility`, `mcp_local_oauth_blocked_hosts`, `saffron_credits_only_tiers`, `saffron_lattice`, `sedge_lantern_config`, `startup_announcements`, `ultraplan_prompt_identifier`) were **not** value-compared and are recorded as renamed-variable defaults.

No kept boolean flag went from `true` to `false`.

### REMOVED / rerouted vs 2.1.197 (66)

58 names are **gone** (0 occurrences of the quoted name in 2.1.300). 8 are **rerouted**: the name survives but is read through a constant or wrapper, so it drops out of the literal count. Highlights:

- **`tengu_disable_bypass_permissions_mode` is gone.** In 2.1.197 this GrowthBook kill switch could disable `--dangerously-skip-permissions` ("Bypass permissions mode was disabled by your organization policy", 2.1.197 read sites `:147079`, `:147674`, `:599579`, and async `QYr` `:599807`). It has 0 occurrences in 2.1.300. The setting `disableBypassPermissionsMode` still exists (`:34760`). **Inference (tentative):** org disablement now goes only through managed settings, not a remote flag.
- **`tengu_report_findings_tool`, `tengu_shoji_engine`, `tengu_russet_linnet`, `tengu_cobalt_plinth_direct/putguard/reader_persist`, `tengu_saffron_anchor`, `tengu_frame_publish_context`, `tengu_team_discovery`, `tengu_amber_quill`, `tengu_cobalt_heron`, `tengu_slate_moth`, `tengu_sunset_penguin_opus47`.** Many 2.1.197-NEW flags were either graduated (the gate was removed and the code kept) or dropped within 103 patch versions. This analysis did not determine which happened to each.
- **`tengu_lapis_anchor`/`_budget`, `tengu_chair_sermon`, `tengu_review_bughunter_config`, `tengu_bridge_attestation_enforce(_config)`** are rerouted, not removed (see table). `tengu_media_byte_cap` and `tengu_mcp_normalize_root_combinators` moved behind the `PZe` and `lo`/`Hn` wrappers.

| Flag | 2.1.197 default | 2.1.197 line | Status in 2.1.300 | What it was |
|---|---|---|---|---|
| `tengu_amber_heron` | `!1` | `:420970` | gone (0 occurrences) | Force a spawned subagent into background/isolated execution |
| `tengu_amber_quill` | `!1` | `:351892` | gone (0 occurrences) | Master gate for in-conversation context tips / spinner tips |
| `tengu_amber_wren` | `{}` | `:272550` | gone (0 occurrences) | Read tool config: maxSizeBytes, maxTokens, includeMaxSizeInPrompt, targetedRangeNudge |
| `tengu_bg_retire_grace_bridged_min` | `480` | `:574201` | gone (0 occurrences) | Grace period (minutes) before retiring a bridged background session |
| `tengu_bridge_attestation_enforce` | `!1` | `:298872` | **REROUTED** - still read via da(name,{safe:true}) wrapper (module 201) - served-payload-only flip | Enforce bridge attestation (security gate for Remote Control bridge connections) |
| `tengu_bridge_attestation_enforce_config` | `{}` | `:298874` | **REROUTED** - name held in const F, read vn(F,{}) at :292386 | Config object accompanying bridge attestation enforcement |
| `tengu_bridge_system_init` | `!1` | `:624353` | gone (0 occurrences) | Bridge sends a system_init message on connection |
| `tengu_bridge_vivid` | `!1` | `:605520` | gone (0 occurrences) | Bridge 'vivid' rendering/feature variant (P6f()) |
| `tengu_ccr_delta_rehydrate` | `!1` | `:704630` | gone (0 occurrences) | CCR delta rehydration of session state (Ihr()) |
| `tengu_cedar_sundial` | `!1` | `:444410` | gone (0 occurrences) | File-edit 'applies' gate (Nxl()) — extra condition before an edit applies |
| `tengu_cfc_in_product_permissions` | `!1` | `:190059` | gone (0 occurrences) | Claude-for-Chrome (CFC) in-product permissions handling |
| `tengu_chair_sermon` | `!1` | `:601781` | **REROUTED** - name held in const rht, read k(rht,!1)/vn(rht,!1) at :389557-389560 (reminder fold) | Alternate message/content mapping in prompt assembly (maps content via DPf) |
| `tengu_classifier_summary_heuristic_emit` | `!1` | `:292134` | gone (0 occurrences) | Force the classifier summary stage to emit via heuristic |
| `tengu_cobalt_heron` | `!1` | `:351092` | gone (0 occurrences) | Context tip 'opus-on-pro-near-limit' (suggest Sonnet when Pro user on Opus >50% usage) |
| `tengu_cobalt_lantern` | `!1` | `:298639` | gone (0 occurrences) | Quick web setup for remote sessions (requires allow_remote_sessions + allow_quick_web_setup) |
| `tengu_cobalt_plinth_direct` | `!1` | `:406097` | gone (0 occurrences) | Direct artifact upload lane for rendered Frame pages (bypass relay) |
| `tengu_cobalt_plinth_putguard` | `!0` | `:406009` | gone (0 occurrences) | Guard PUT writes to the artifact reader store |
| `tengu_cobalt_plinth_reader_persist` | `!1` | `:406005` | gone (0 occurrences) | Persist artifactReadVersions across reads |
| `tengu_coral_beacon` | `!1` | `:378761` | gone (0 occurrences) | Upgrade-paths upsell UI variant gate |
| `tengu_disable_bypass_permissions_mode` | `!1, None` | `:147079` | gone (0 occurrences) | Kill switch: disables bypass-permissions (--dangerously-skip-permissions) mode |
| `tengu_disable_keepalive_on_econnreset` | `!1` | `:604386` | gone (0 occurrences) | Disable HTTP keep-alive for retry after ECONNRESET (stale connection) |
| `tengu_fleetview_onboarding_v2` | `!1` | `:679474` | gone (0 occurrences) | Fleet-view onboarding v2 flow |
| `tengu_frame_publish_context` | `!1` | `:406013` | gone (0 occurrences) | Include publish context when publishing a Frame artifact |
| `tengu_gouda_loop` | `!1` | `:628699` | gone (0 occurrences) | UI behavior gate (gouda loop) in an effect/ref-guarded render path |
| `tengu_harbor_prism` | `!1` | `:296779` | gone (0 occurrences) | Channels prism variant gate |
| `tengu_herring_clock` | `!1` | `:149163` | gone (0 occurrences) | Team memory directory gate (when off, team memdir disabled telemetry fires) |
| `tengu_immediate_model_command` | `!1` | `:546639` | gone (0 occurrences) | Apply /model command immediately (without confirmation step) |
| `tengu_kairos_loop_dynamic` | `!1` | `:224238` | gone (0 occurrences) | Dynamic-pacing /loop mode (ScheduleWakeup self-paced iterations) |
| `tengu_kairos_loop_prompt` | `!1` | `:224091` | gone (0 occurrences) | Enables autonomous-loop tick prompt resolution (sentinel <<autonomous-loop>> / -dynamic) |
| `tengu_lapis_anchor` | `"off"` | `:454944` | **REROUTED** - name held in const K9e, read k(K9e,"padded-countdown") at :491617 - DEFAULT FLIPPED off -> padded-countdown | Total-tokens reminder mode |
| `tengu_lapis_anchor_budget` | `NRl` | `:454951` | **REROUTED** - name held in const V9e (chunk-local, not the global V9e gate), read k(V9e, Cln=15000000) at :491643 | Token budget for the total-tokens reminder |
| `tengu_malformed_tool_use_clean_retry` | `!1` | `:458683` | gone (0 occurrences) | On a malformed tool_use, do a clean retry instead of erroring (hDl()) |
| `tengu_malort_pedway` | `iMa` | `:280730` | gone (0 occurrences) |  |
| `tengu_marble_lark` | `!1` | `:288164` | gone (0 occurrences) | Model-related gate (carried marble_* lineage; behavior tied to model availability) |
| `tengu_mcp_normalize_root_combinators` | `[]` | `:281908` | **REROUTED** - read through array-denylist wrappers lo()/Hn() | Normalize MCP root-URL combinators for hostnames in the list ('*' = all) |
| `tengu_media_byte_cap` | `xKi` | `:595311` | **REROUTED** - read through zod wrapper PZe("tengu_media_byte_cap"), after PZe("tengu_keen_pudding") | Byte cap applied to media (base64) blocks during message normalization |
| `tengu_mocha_barista` | `!1` | `:665037` | gone (0 occurrences) | Append one-time scheduled-run wording to the /schedule skill description |
| `tengu_ochre_hollow` | `!1` | `:527711` | gone (0 occurrences) | UI/feature gate (ochre hollow) |
| `tengu_orchid_mantis` | `!1` | `:593673` | gone (0 occurrences) | Inject /schedule follow-up offer guidance (v1: offer when natural future follow-up, 75%+ yes odds) |
| `tengu_orchid_mantis_v2` | `!1` | `:593673` | gone (0 occurrences) | More conservative /schedule follow-up guidance (v2: only when a named artifact has a quotable future obligation) |
| `tengu_plugin_autoupdate_allow_credential_helper` | `!1` | `:514238` | gone (0 occurrences) | Allow git credential helper during plugin-marketplace autoupdate refresh |
| `tengu_prompt_cache_diagnostics` | `!1` | `:595161` | gone (0 occurrences) | Emit prompt-cache diagnostics |
| `tengu_quartz_heron` | `!1` | `:374569` | gone (0 occurrences) | When true, a subagent/task inherits the parent model ('inherit') instead of haiku |
| `tengu_relay_chain_v1` | `!1` | `:450750` | gone (0 occurrences) | When true, removes the multi-command bash chaining guidance from the system prompt |
| `tengu_report_findings_tool` | `!1` | `:653604` | gone (0 occurrences) | Expose the ReportFindings tool (structured code-review findings) |
| `tengu_review_bughunter_config` | `null` | `:374609` | **REROUTED** - name held in const oE, read k(oE,null)/vn(oE,null) at :333547/:333605 | Bughunter (fleet code-review) configuration object |
| `tengu_review_workflow_routing` | `!1` | `:653700` | gone (0 occurrences) | Route /code-review through the workflow router |
| `tengu_rewind_first_message` | `!1` | `:709718` | gone (0 occurrences) | On rewind, anchor to the persistAnchor (first message) rather than the preceding assistant turn |
| `tengu_russet_linnet` | `!1` | `:223333` | gone (0 occurrences) | Skill-description reframe arm — swaps in reworded Skill tool description |
| `tengu_saffron_anchor` | `!1` | `:406001` | gone (0 occurrences) | Frame artifact gate (lKt()) |
| `tengu_sedge_lantern` | `!0` | `:292189` | gone (0 occurrences) | Enable the 'away summary' feature (summarize what happened while user was away) |
| `tengu_shale_finch` | `!1` | `:373755` | gone (0 occurrences) | Memory-related gate (returned directly; near memory permission code) |
| `tengu_shoji_engine` | `!1` | `:619857` | gone (0 occurrences) | Enable the 'shoji' engine path (oge()) |
| `tengu_silk_almanac` | `!1` | `:448919` | gone (0 occurrences) | Team-memory multistore gate (l7t()) |
| `tengu_slate_harbor` | `!1` | `:224806` | gone (0 occurrences) | REPL mode availability gate when entrypoint is cli or remote |
| `tengu_slate_harrier` | `"off"` | `:593902` | gone (0 occurrences) | String-arm gate ('off' default) controlling a system/UI section |
| `tengu_slate_moth` | `!1` | `:351098` | gone (0 occurrences) | Context tip 'large-context-stale-files' (suggest /compact at >300K ctx & >100K stale-file tokens) |
| `tengu_slate_prism` | `!0` | `:709576` | gone (0 occurrences) | Enable agent progress summaries rendering |
| `tengu_slate_quill` | `!1` | `:430838` | gone (0 occurrences) | UI/feature gate (slate quill) |
| `tengu_sparrow_ledger` | `!1` | `:593708` | gone (0 occurrences) | Arm the 'verify prompt' system-prompt variant |
| `tengu_sunset_penguin_opus47` | `"2026-07-25"` | `:100689` | gone (0 occurrences) | Sunset date for claude-opus-4-7 — shows a deprecation banner until the date passes |
| `tengu_surreal_dali` | `!1` | `:350999` | gone (0 occurrences) | Remote-sessions onboarding/affordance gate (requires allow_remote_sessions capability) |
| `tengu_team_discovery` | `!1` | `:350724` | gone (0 occurrences) | Fetch team-discovery data (suggest teams to join) |
| `tengu_velvet_cascade` | `null` | `:132673` | gone (0 occurrences) | Config {models:[...]} marking models that get the 'simple system prompt' treatment |
| `tengu_velvet_static` | `!1` | `:556545` | gone (0 occurrences) | Enables a 'velvet static' tool/feature (isEnabled gate) |
| `tengu_walnut_prism` | `!1` | `:593977` | gone (0 occurrences) | Arm the 'ownership frame' system-prompt variant |

---

## Notable kill switches (2.1.300)

| Flag | Default | Effect when ON | Line |
|---|---|---|---|
| `tengu_disable_streaming_to_non_streaming_fallback` | false | disables the non-streaming fallback (carried) | `:530742` |
| `tengu_watchdog_skip_nonstreaming_fallback` | false | NEW: on a watchdog timeout, skip the non-streaming fallback (also implied under `CLAUDE_CODE_REMOTE`) | `:530742` |
| `tengu_read_dedup_killswitch` | false | disables Read-result dedup (carried) | `:550388` |
| `tengu_classifier_summary_kill` | false | drops the classifier "summary" stage (carried) | `:808541` |
| `tengu_penguins_off` | null | a non-null string disables Fast mode (carried) | `:120988` |
| `tengu_disable_live_host_context` | false | NEW: stop attaching live host-context lines after tool calls | `:436237` |
| `tengu_ccr_exclude_dynamic_restore_killswitch` | false | NEW: skip restoring `excludeDynamicSections` on CCR resume | `:1505908` |
| `tengu_tools_exclusion_killswitch` | false | NEW: tools-exclusion processing | `:731144` |
| `tengu_happy_ocean` | false | NEW: "move-to-cloud names no permission mode" kill switch | `:1840117` |
| `tengu_ptc_enabled` | **true** | NEW: setting it **false** disables staged `mcp_call` ("staged mcp_call is disabled") | `:1513028` |
| `tengu_projects_thread_reply_lead_killswitch` | false | NEW (session-pinned) | `:345262` |
| `tengu_worker_owner_rows_killswitch` | false | NEW | `:345258` |
| `tengu_projects_other_thread_rows_killswitch` | `void 0` | NEW: honoured only from `payload`/`disk` sources (`vn` switch) | `:345276` |
| `tengu_rustling_orbit` | false | NEW: when ON, a policy-limits 404/304 with no cache no longer means "no restrictions for this session" | `:367459` |

The 2.1.197 kill switches `tengu_disable_bypass_permissions_mode` and `tengu_disable_keepalive_on_econnreset` are **gone** (0 occurrences).

## Supplementary: flags outside the 704

These are reachable but excluded from the headline because they are not literal first arguments to a public accessor. 2.1.197 was never counted this way either ([`_facts.md` §1.1](bundle/_facts.md) gives 736 including wrapper-forwarded names):

- **`_r` set (16)**: listed above, read via constants.
- **`da()` served-only wrapper**: `tengu_bridge_attestation_enforce`, `tengu_ccr_unread_state_exit_killswitch`, `tengu_delightful_goblet`, `tengu_glimmering_newt`, `tengu_merry_boot`, `tengu_moonlit_kettle`, `tengu_violin_camber`.
- **zod-parsed `PZe`**: `tengu_golden_dove`, `tengu_keen_pudding`, `tengu_media_byte_cap`.
- **array denylists `Hn`/`lo`**: `tengu_mcp_drop_invalid_tool_schemas`, `tengu_mcp_legacy_url_elicitation_server_denylist`, `tengu_mcp_listen_server_denylist`, `tengu_mcp_negotiation_server_denylist`, `tengu_mcp_normalize_root_combinators`.
- **env-then-`vr` `Z3t`/`cfr`**: `tengu_calm_mochi`, `tengu_streamed_bumblebee`, `tengu_streamed_bumblebee_text`, `tengu_harmonic_riddle`, `tengu_rippling_tulip`.
- **survey configs via `BP` (React hook over `Mj`)**: `tengu_bad/fine/good_survey_transcript_ask_config`, `tengu_plugin_feedback_survey_config`.
- **registry readers**: e.g. `tengu_warm_sunrise` (`:101687`), `tengu_foamy_spring` (`:120228`), `tengu_dapper_dusk`, `tengu_vast_puddle`, `tengu_tool_memory_cgroup` (`:51722`).
- **inside the class**: `tengu_gb_eval_authed_enable` (`:134017`).
- **constants**: `tengu_lapis_anchor(_budget)`, `tengu_chair_sermon`, `tengu_review_bughunter_config`, `tengu_violin_maple`, `tengu_violin_willow`, `tengu_violin_tailpiece`, `tengu_cobalt_plinth_comfrey`, `tengu_russet_pergola`, `tengu_dapper_truffle`, `tengu_wise_comet` and others (`var X = "tengu_…"` then `k(X, …)`).

The list is illustrative, not exhaustive. A full constant-indirection pass was not done. 2.1.300 has **3,056** distinct `tengu_*` string literals in total ([`_facts.md`](bundle/_facts.md)).

## Overlap with telemetry

Six names are both a flag and an event in 2.1.300 (2.1.197: 2): `tengu_ccr_orphan_restore_wake`, `tengu_copper_lantern`, `tengu_event_loop_stall`, `tengu_mcp_proxy_needs_approval_retry`, `tengu_send_file`, `tengu_send_user_file`. See [`_facts.md` §1.3](bundle/_facts.md).

---

## Category Tables (all 704 flags)

Each table lists flags sorted by family. "Line" is the first call site in `cli.beauty.js`. *(2.1.197 desc.)* marks a description carried from the baseline; its call site was re-located in 2.1.300 but its behaviour was not re-decoded. The full per-flag record (all call sites, module, enclosing function, nearby env vars, 2.1.197 defaults and lines) is in [data/feature-flags.yaml](data/feature-flags.yaml).

### remote-control-bridge (60; 44 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_relay` | `false` | k | kept | `:290127` | Bridge/relay-related gate (Ks6(), near REPL bridge enable code) *(2.1.197 desc.)* |
| `tengu_bridge_apply_server_session_config` | `true` | vn | NEW | `:290135` | o3e(): apply server-provided session config to the bridge. Off is only honoured when source is override, or payload without an org UUID. |
| `tengu_bridge_auth_revive` | `true` | k | NEW | `:290010` | xMt(): revive bridge after auth close code 4094. |
| `tengu_bridge_child_auto_mode` | `true` | k | NEW | `:290144` | JEr(): Remote-Control child sessions start in auto mode (unless mode pinned). |
| `tengu_bridge_child_auto_over_settings` | `true` | k | NEW | `:290148` | L_o(): child auto-mode wins over the settings defaultMode. |
| `tengu_bridge_child_file_upload` | `true` | k | NEW | `:1443140` | Allow bridge child sessions to upload files (_Oe() && flag). |
| `tengu_bridge_child_machine_settings` | `true` | k | NEW | `:290160` | ZEr(): project-thread child sessions inherit machine settings. |
| `tengu_bridge_child_tool_diff` | `true` | k | NEW | `:304664` | zyr(): emit tool diffs for bridge child sessions (always on under CLAUDE_CODE_REMOTE). |
| `tengu_bridge_host_declined_end` | `true` | k | NEW | `:290058` | YEr(): end the session when the host declines. |
| `tengu_bridge_host_profile` | `"off"` | k | NEW | `:1074678` | String arm: bridge host profile; value must be one of gJe else 'off'. |
| `tengu_bridge_inbox_pointer_boundary` | `true` | k | NEW | `:1036553` | Inbox pointer boundary tracking for the bridge inbox. |
| `tengu_bridge_initialize_commands` | `false` | k | NEW | `:1266729` | $mn(): send the command list in the bridge initialize handshake (off -> []). |
| `tengu_bridge_min_version` | `{ minVersion: c }` | vn | **default changed** | `:1070661` | Minimum CLI version for the Remote Control bridge. vn-read; baked-in floor const c="2.1.270" (2.1.197 default was {minVersion:"0.0.0"}). Served value is used only if >= floor (Iy(s,c)); source 'disabled' -> null; 'fallback' before fresh features -> floor with unknown:'unanswered'; malformed -> floor. |
| `tengu_bridge_owner_pinned_end` | `true` | k | NEW | `:290038` | wwe(): owner-pinned end-of-session handling. |
| `tengu_bridge_partial_messages` | `false` | k | NEW | `:289998` | A_o(): forward partial (streaming) messages over the bridge. |
| `tengu_bridge_placeholder_sweep` | `true` | k | NEW | `:1050402` | Rs(): sweep stale placeholder sessions (read via dynamic import of the readable API). |
| `tengu_bridge_poll_interval_config` | `n` | MG | kept | `:1044338` | Bridge polling interval configuration (default var v1$, fallback 300000ms) *(2.1.197 desc.)* |
| `tengu_bridge_rc_child_artifact` | `true` | k | NEW | `:290152` | QEr(): artifact support in Remote-Control child sessions. |
| `tengu_bridge_rc_child_auto_compact` | `true` | k | NEW | `:290164` | ekr(): auto-compact in RC child sessions. |
| `tengu_bridge_rc_child_idle_exit_ms` | `L` | k | NEW | `:290168` | Idle exit timeout (ms) for RC child sessions; invalid/<1 -> 0 (disabled); clamped to M. |
| `tengu_bridge_rc_child_restart_resume` | `true` | k | NEW | `:290174` | Resume RC child session after a restart. |
| `tengu_bridge_rc_projects_hint` | `true` | k | NEW | `:290156` | Projects hint for RC child sessions. |
| `tengu_bridge_recovery_patience` | `true` | k | NEW | `:1051098` | Gn(): patience budget before bridge recovery gives up (bi.charge). |
| `tengu_bridge_repl_v2_config` | `ws` | JOr | kept | `:1050642` | REPL v2 bridge config object, read via JOr (getFeatureValue_DEPRECATED = blocking getFeatureValueBlocking). Default var ws. |
| `tengu_bridge_repl_v2_cse_shim_enabled` | `true` | k | kept | `:289990` | REPL v2 client-side-execution shim for the bridge *(2.1.197 desc.)* |
| `tengu_bridge_requires_action_details` | `false` | k | kept | `:1053251` | Bridge requires detailed action descriptions for requires-action prompts *(2.1.197 desc.)* |
| `tengu_bridge_resume_respects_local_owner` | `true` | k | NEW | `:290030` | x_o(): resume respects a local session owner. |
| `tengu_bridge_selfheal_heartbeats` | `true` | k | NEW | `:1051094` | na(): self-healing heartbeats in the v2 remote bridge. |
| `tengu_bridge_signed_out_neutral` | `true` | k | NEW | `:290062` | H_o(): treat signed-out state neutrally in bridge reconnect logic. |
| `tengu_bridge_subagent_frames` | `true` | k | NEW | `:290179` | Ren().enabled: forward subagent frames over the bridge. |
| `tengu_bridge_subagent_text` | `false` | k | NEW | `:290180` | Ren().forwardText: also forward subagent text. |
| `tengu_bridge_unarchive_on_resume` | `true` | k | NEW | `:1079437` | Ro(): unarchive a session when it is resumed. |
| `tengu_ccr_bridge` | `!1` / `n/a` | k,rb | kept | `:289564` | CCR bridge mode (cloud-backed remote execution bridge) *(2.1.197 desc.)* |
| `tengu_ccr_bundle_max_bytes` | `null` | k | kept | `:469927` | Max bytes for CCR session bundle upload (falls back to qqf=104857600 / 100MB) *(2.1.197 desc.)* |
| `tengu_ccr_bundle_seed_enabled` | n/a | rb | kept | `:460356` | Enable CCR bundle seeding (upload conversation bundle for cloud session) *(2.1.197 desc.)* |
| `tengu_ccr_v2_bridge_create_cli` | `false` | k | NEW | `:290074` | JJs(): create the bridge via CCR v2 from the CLI. |
| `tengu_ccr_v2_send_events_cli` | `true` | k | **default changed** | `:290066` | Send CCR v2 events from the CLI (ken()). Default flipped false -> true. |
| `tengu_ccr_v2_session_crud_cli` | `false` | k | NEW | `:290070` | $z(): CCR v2 session CRUD from the CLI. |
| `tengu_cobalt_harbor` | `false` | k | kept | `:290108` | Default Remote Control ON at startup (a6o()) *(2.1.197 desc.)* |
| `tengu_cobalt_harbor_notice` | `true` | k | kept | `:1230928` | Show the 'Remote Control auto-on by default' one-time notification (≤3 impressions) *(2.1.197 desc.)* |
| `tengu_composed_quail` | `true` | k | NEW | `:290078` | Ten(): bridge-module gate (default on). |
| `tengu_compressed_river` | `true` | k | NEW | `:1251568` | Route an ask dialog through the bridge when it supports that kind. |
| `tengu_copper_kestrel` | `true` | k | NEW | `:290006` | KEr(): bridge flag-settings forwarding (off -> 'bridge_flag_settings disabled'). |
| `tengu_ethereal_mist` | `true` | k | NEW | `:290014` | qEr(): non-origin 403 retry for bridge HTTP. |
| `tengu_glimmering_glade` | `true` | k | NEW | `:290042` | e1n(): treat poll 404/401 as session-gone. |
| `tengu_gravel_chorus` | `true` | k | NEW | `:290082` | D_o(): bridge-module gate. |
| `tengu_harbor_moth` | `false` | k | kept | `:808699` | Remote recap / away-summary delivery over the CCR channel *(2.1.197 desc.)* |
| `tengu_humble_petal` | `true` | k | NEW | `:290022` | Cct(): bridge-module gate. |
| `tengu_keen_lantern` | `true` | k | NEW | `:290050` | O_o(): bridge poll gate. |
| `tengu_lucky_quill` | `true` | k | NEW | `:290046` | I_o(): poll 401 handling. |
| `tengu_luminous_seal` | `true` | k | NEW | `:289994` | Swe(): bridge requesting-state gate. |
| `tengu_moonlit_lagoon` | `true` | k | NEW | `:290026` | R_o(): bridge gate. |
| `tengu_neapolitan` | `false` | k | kept | `:552891` | Allow 'remote' agent isolation for spawned subagents (BKt()) *(2.1.197 desc.)* |
| `tengu_rc_long_turn_nudge` | `null` | k | NEW | `:814924` | Remote Control long-turn nudge config (thresholdSec default 90, clamp 5-3600). |
| `tengu_rc_permission_nudge` | `s` | k | NEW | `:814924` | RC permission nudge config; default {afterPromptCount:5, probability:0, maxImpressions:3}. |
| `tengu_remote_backend` | `false` | k | kept | `:815606` | Remote backend mode (carried over from 2.1.32) *(2.1.197 desc.)* |
| `tengu_sequential_puffin` | `true` | k | NEW | `:290034` | P_o(): bridge sequence gate. |
| `tengu_slate_harbor_experiment` | `false` | k | kept | `:458250` | New /init experiment (CLAUDE.md generation flow) *(2.1.197 desc.)* |
| `tengu_wild_gosling` | `false` | k | NEW | `:290018` | C_o(): HTTP timeout path. |
| `tengu_zany_melody` | `true` | k | NEW | `:290054` | M_o(). |

### ui-tui (52; 30 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_anchor` | `false` | k | kept | `:368794` | UI/feature gate (_JH()) *(2.1.197 desc.)* |
| `tengu_amber_lynx` | `false` | k | kept | `:1733636` | UI variant gate in a session/columns view component *(2.1.197 desc.)* |
| `tengu_basalt_meadow` | `false` | k | kept | `:828335` | Terminal redraw/atlas behavior gate (works with xterm_atlas_reset) *(2.1.197 desc.)* |
| `tengu_calm_riddle` | `true` | k | NEW | `:1306513` | React hook gate in the main REPL view (oo = zT(() => flag)); behaviour not traced. |
| `tengu_cedar_marsh` | `false` | k | kept | `:836925` | UI/feature gate requiring gw() (cedar marsh) *(2.1.197 desc.)* |
| `tengu_chomp_inflection` | `false` | k | kept | `:747393` | Prompt suggestions feature *(2.1.197 desc.)* |
| `tengu_chrome_auto_enable` | `false` | k | kept | `:335345` | Auto-enable Claude-in-Chrome (CFC) integration *(2.1.197 desc.)* |
| `tengu_cicada_nap_ms` | `0` | k | kept | `:805386` | Delay (ms) inserted in a render/idle loop (cicada nap) *(2.1.197 desc.)* |
| `tengu_cobalt_ridge` | `false` | k | kept | `:207745` | UI/feature gate (cobalt ridge) *(2.1.197 desc.)* |
| `tengu_cobalt_thicket` | `true` | k | kept | `:805071` | UI behavior enabled when gw() and flag (g67(true)) *(2.1.197 desc.)* |
| `tengu_concurrent_moonbeam` | `false` | k | NEW | `:1497373` | cT(): stdout-guard when terminal title is disabled. |
| `tengu_concurrent_shore` | `true` | k | NEW | `:450997` | o1(): idle-window gate ('flag:idle-window'). |
| `tengu_dapper_acorn` | `false` | k | NEW | `:802442` | Ua(): composite gate (not HIPAA). |
| `tengu_encapsulated_pebble` | `true` | vr | NEW | `:351219` | Session-pinned; $co() part of GS() composite (with spicy_blossom). |
| `tengu_event_loop_stall` | `false` | k | NEW | `:672854` | Non-blocking stdout remote flag. Also an event name (overlap). |
| `tengu_fancy_wand_copy` | `{}` | k | NEW | `:844843` | Restart prompt copy (.offer string), default '/restart to apply'. |
| `tengu_fleet_past_sessions` | `false` | k | NEW | `:368782` | Fleet view shows past sessions (env CLAUDE_CODE_FLEET_PAST_SESSIONS). |
| `tengu_fleetview_peers` | `false` | k | NEW | `:849695` | Fleet view heartbeat to peers. |
| `tengu_gleaming_fair` | `false` | k | kept | `:1300103` | UI/feature gate; when off returns null (feature hidden) *(2.1.197 desc.)* |
| `tengu_hidden_volcano` | `null` | k | NEW | `:1301022` | zod config with .words. Not traced. |
| `tengu_humming_locket` | `true` | k | NEW | `:1359283` | Slash-command guard (effort/model/rename/usage set). |
| `tengu_jazzy_ripple` | `false` | k | NEW | `:304853` | Sidebar/fullscreen layout: when ON returns false from x$e(). |
| `tengu_jiggly_mochi` | `false` | k | NEW | `:499910` | Queued-message editing hint. |
| `tengu_keen_sloth` | `true` | k | NEW | `:1290330` | Cancel deferred send if draft typed. |
| `tengu_keybinding_customization_release` | `true` | k | kept | `:306866` | Custom keybinding support *(2.1.197 desc.)* |
| `tengu_lantern_prism` | `false` | k | NEW | `:351211` | L0() gate (env CLAUDE_CODE_LANTERN_PRISM). |
| `tengu_left_arrow_carries_queued` | `true` | k | NEW | `:1288726` | Left-arrow carries queued messages. |
| `tengu_left_arrow_editing_guard` | `true` | k | NEW | `:839034` | Left-arrow editing guard. |
| `tengu_luminous_locket` | `sAo` | k | NEW | `:1364904` | Config parsed by pAo (default const sAo). |
| `tengu_maple_sundial` | `false` | k | kept | `:458071` | UI gate (maple sundial) *(2.1.197 desc.)* |
| `tengu_marbled_teal` | `false` | k | NEW | `:1335249` | zWo(). Not traced. |
| `tengu_marlin_porch` | `false` | k | kept | `:663909` | Memoized as n.decstbmRendererEnabled - enables the DECSTBM (scroll-region) renderer path. 2.1.197 called it a generic UI gate. |
| `tengu_mint_lanes` | `false` | k | kept | `:1311006` | Menu 'kind lanes' grouping in selection menus *(2.1.197 desc.)* |
| `tengu_moonlit_toucan` | `false` | k | NEW | `:1768714` | pe(): gate with yw(). |
| `tengu_native_cursor` | `false` | k | kept | `:663924` | Use native cursor rendering in the TUI *(2.1.197 desc.)* |
| `tengu_quill_marten` | `false` | vr | NEW | `:791292` | Session-pinned block rendering. |
| `tengu_quirky_teacup` | `true` | k | NEW | `:1366296` | Notification setup gate. |
| `tengu_quizzical_thimble` | `true` | k | NEW | `:744595` | SDK-cli terminal title skip. |
| `tengu_sharded_snowflake` | `false` | k | NEW | `:351223` | When ON disables GJt() path. |
| `tengu_shining_fractals` | `false` | k | kept | `:1103221` | UI/animation gate (shining fractals) *(2.1.197 desc.)* |
| `tengu_silk_hinge` | `false` | k | kept | `:967418` | Message timestamp display + related footer option *(2.1.197 desc.)* |
| `tengu_slate_finch` | `false` | k | kept | `:163644` | Show 'high · burns fastest — medium handles most tasks' effort-level hint *(2.1.197 desc.)* |
| `tengu_slate_thimble` | `false` | k | kept | `:112456` | Gate that, with F6(), enables a UI path (returns !F6() \|\| flag) *(2.1.197 desc.)* |
| `tengu_spicy_blossom` | `false` | vr | NEW | `:351215` | Session-pinned GS() composite. |
| `tengu_static_title_under_mux` | `true` | k | NEW | `:1350776` | Static terminal title under tmux/screen. |
| `tengu_terminal_sidebar` | `false` | k | kept | `:967374` | Terminal sidebar UI (status in terminal tab) *(2.1.197 desc.)* |
| `tengu_tidy_lemon` | `null` | k | NEW | `:1695921` | zod config. |
| `tengu_tranquil_cloud` | `true` | k | NEW | `:387389` | VIe() (also passed to VS Code). |
| `tengu_turtle_carbon` | `true` | k | kept | `:127141` | Show thinking summaries (EyH()) *(2.1.197 desc.)* |
| `tengu_vellum_anchor` | `false` | k | NEW | `:183059` | 'progress saved' suffix. |
| `tengu_wise_kite` | `false` | k | NEW | `:195749` | _e(): gate. |
| `tengu_xterm_atlas_reset` | `true` | k | kept | `:828334` | Reset the xterm glyph atlas cache (rendering correctness) *(2.1.197 desc.)* |

### ccr-remote (46; 46 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_packet` | `false` | k | NEW | `:518616` | gEe(): gate for session rehydrate on resume (requires WNe()/sepia_moth path, not remote, not me()). Tentative. |
| `tengu_async_goblet` | `true` | k | NEW | `:736771` | fxn(): upload-lane classifier; for SDK-hosted sessions returns 'sdk_hosted' when on, 'sdk_hosted_disabled' when off. |
| `tengu_breezy_haven` | `true` | k | NEW | `:1487283` | hasSetAside(): when off, request set-aside handling is skipped (runs e() directly). |
| `tengu_calm_osprey` | `true` | k | NEW | `:1470900` | NVr(): gate in the CCR print/stream loop (gy.heard()). Tentative. |
| `tengu_ccr_classifier_keepalive_enabled` | `false` | k | NEW | `:539983` | Send keepalives during auto-mode classifier calls (needs CLAUDE_CODE_REMOTE_SEND_KEEPALIVES). |
| `tengu_ccr_drop_unwatched_stream_events` | `false` | k | NEW | `:1051134` | Drop stream events when nobody watches the session. |
| `tengu_ccr_event_hold_enabled` | `true` | k | NEW | `:1051173` | CCR worker event-hold enabled. |
| `tengu_ccr_handoff_metadata` | `false` | k | NEW | `:1051707` | Collect worktree state + metadata for CCR handoff. |
| `tengu_ccr_hook_keepalive_enabled` | `false` | k | NEW | `:532766` | Send keepalives while hooks run (needs CLAUDE_CODE_REMOTE_SEND_KEEPALIVES). |
| `tengu_ccr_idle_heartbeat` | `false` | k | NEW | `:1051142` | Advertise heartbeat-probe support while idle. |
| `tengu_ccr_no_subscriber_flush_ms` | `0` | k | NEW | `:1051118` | Stream-event flush interval (ms) when no subscriber; 0 = default. |
| `tengu_ccr_no_subscriber_hold_ms` | `0` | k | NEW | `:1051122` | Upload hold (ms) when no subscriber; 0 = off. |
| `tengu_ccr_orphan_restore_wake` | `true` | k | NEW | `:1507734` | Wake an orphaned CCR session on restore. Also a telemetry event name (overlap). |
| `tengu_ccr_orphan_restore_wake_shells` | `true` | k | NEW | `:1507735` | Include background shells in orphan-restore wake. |
| `tengu_ccr_plugin_refresh_in_idle_enabled` | `false` | k | NEW | `:1490156` | Refresh plugins while CCR worker idle (disabled by CLAUDE_CODE_SYNC_PLUGIN_INSTALL). |
| `tengu_ccr_reactivation_beat` | `false` | k | NEW | `:1051150` | Heartbeat on reactivation. |
| `tengu_ccr_reconnect_beat` | `false` | k | NEW | `:1051146` | Heartbeat on stale reconnect. |
| `tengu_ccr_replay_acks_at_request_dispatch` | `false` | k | NEW | `:1508654` | Replay acks at request dispatch. |
| `tengu_ccr_skip_redundant_heartbeat` | `false` | k | NEW | `:1051154` | Skip redundant heartbeats. |
| `tengu_ccr_sse_keepalive_max_interval_s` | `0` | k | NEW | `:1051130` | Max SSE keepalive interval (s); 0 = default. |
| `tengu_ccr_stream_event_flush_ms` | `oAt` | k | NEW | `:1051106` | Stream-event flush interval (ms); default const oAt. |
| `tengu_ccr_stream_first_flush_ms` | `0` | k | NEW | `:1051110` | First-flush delay (ms) for stream events. |
| `tengu_ccr_stream_flush_on_first_delta` | `false` | k | NEW | `:1051114` | Flush stream events on the first delta. |
| `tengu_ccr_subagent_skip_on_delta` | `false` | k | NEW | `:1474806` | d6o(): passed to Iao() for subagent transcript upload - skip on delta. |
| `tengu_ccr_upload_hold_marker` | `false` | k | NEW | `:1051172` | Upload a hold marker. |
| `tengu_ccr_upload_trim` | `{}` | k | NEW | `:1051171` | Upload trim config object. |
| `tengu_cozy_kite` | `false` | k | NEW | `:486947` | Wait for staged file tool calls (ccr_stage_file_tool_call_wait). |
| `tengu_dazzling_garden` | `true` | k | NEW | `:1051102` | ei(): accept a resume-token match. |
| `tengu_eager_pillow` | `false` | k | NEW | `:1497316` | Find unresolved tool use via elo() first. |
| `tengu_gentle_hummingbird` | `true` | k | NEW | `:1512159` | Remote Linux list_directory request handling. |
| `tengu_hazy_nova` | `false` | vn | NEW | `:1493608` | Stage file home-files flag wait. |
| `tengu_indexed_pearl` | `IO` | k | NEW | `:1493287` | Hosted worker memory-census threshold. |
| `tengu_iterative_lightning` | `false` | k | NEW | `:1507065` | Lost-calls note critical_system_reminder. |
| `tengu_level_wren` | `true` | k | NEW | `:736996` | Upload lane option N = !flag. |
| `tengu_noble_snowflake` | `null` | k | NEW | `:1050269` | us(): config. |
| `tengu_ochre_dunlin` | `false` | k | NEW | `:1493651` | Staged file telemetry details. |
| `tengu_playful_panda` | `true` | k | NEW | `:736996` | Upload lane option b = !flag. |
| `tengu_reactive_quilt` | `false` | k | NEW | `:1478370` | Ts(): gate. |
| `tengu_record_created_pr_to_ccr` | `false` | k | NEW | `:338405` | Record created PR URL to CCR. |
| `tengu_shimmering_firefly` | `false` | k | NEW | `:1380897` | API error detail in recap. |
| `tengu_swirling_meteor` | `true` | k | NEW | `:1489587` | Coalesce task notifications. |
| `tengu_valiant_crescent` | `false` | k | NEW | `:1487741` | Rk(). |
| `tengu_valiant_rain` | `false` | k | NEW | `:321312` | Remote tools jump queue (env CLAUDE_CODE_REMOTE_TOOLS_JUMP_QUEUE). |
| `tengu_velvety_aurora` | `true` | k | NEW | `:1380901` | Chat relay recap. |
| `tengu_zany_flask` | `2` | k | NEW | `:736996` | Upload lane numeric (default 2). |
| `tengu_zippy_spindle` | `false` | k | NEW | `:1487636` | bk(). |

### mcp (46; 36 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_brindle_causeway` | `true` | vn | NEW | `:373318` | MCP SDK runtime arm: vn-read; false -> 'v1', otherwise 'v2'. Env MCP_SDK_GENERATION overrides; logs source env/default/growthbook. |
| `tengu_calm_crescent` | `true` | k | NEW | `:447225` | On HTTP 400 naming tools.N.input_schema: repair/drop the offending MCP tool and retry; off -> 'switched_off'. |
| `tengu_coral_anchor` | `true` | k | NEW | `:461353` | Notify when MCP server questions stay unanswered too long. |
| `tengu_deep_feather` | `true` | k | NEW | `:1429395` | Qe(): applySplit for MCP tools. |
| `tengu_dreamy_sundae` | `true` | k | NEW | `:1600265` | Vi(): MCP-server listing gate (false only if served false). |
| `tengu_eventual_noodle` | `false` | vr | NEW | `:1583946` | Session-pinned MCP gate (with CS()). |
| `tengu_flickering_lagoon` | `false` | k | NEW | `:1428296` | MCP tool alias resolution for display. |
| `tengu_gentle_brooks` | `true` | k | NEW | `:1600270` | $r(): MCP name-prefix gate. |
| `tengu_glowing_lark` | `false` | k | NEW | `:378828` | fk(): MCP task gate (with mcp_task_worker_wake). |
| `tengu_jaunty_ember` | `false` | k | NEW | `:1429399` | Ct(): MCP gate. |
| `tengu_mcp_auto_background` | `true` | k | NEW | `:1826627` | Auto-background long MCP calls after te ms (env CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS overrides; off -> 0). |
| `tengu_mcp_claudeai_eligibility_gate` | `false` | k | NEW | `:1583967` | Hide claude.ai-proxy MCP servers marked eligible:false. |
| `tengu_mcp_connect_timeout_retry` | `true` | k | NEW | `:1590333` | Tag MCP connect timeout errors with code CONNECT_TIMEOUT (retryable). |
| `tengu_mcp_directory_bff` | `false` | k | kept | `:139163` | Use BFF endpoint for the MCP directory *(2.1.197 desc.)* |
| `tengu_mcp_directory_visibility` | `eC` | k | kept | `:139106` | Org categories allowed to see the MCP directory (default var CtK) *(2.1.197 desc.)* |
| `tengu_mcp_discover_projection_prior` | `"off"` | k | NEW | `:495587` | 'off'\|'legacy_only'\|'all' discovery projection prior. |
| `tengu_mcp_discovery_cache_enable` | `null` | k | NEW | `:1279209` | MCP discovery cache enable (latched once). |
| `tengu_mcp_issuer_strict_echo` | `false` | k | NEW | `:1594595` | OAuth issuer metadata echo mode: 'enforce' vs 'observe'. |
| `tengu_mcp_legacy_sse_fallback` | `true` | k | NEW | `:1590723` | Fall back to legacy HTTP+SSE when initialize POST is rejected. |
| `tengu_mcp_legacy_url_elicitation` | `true` | k | NEW | `:495504` | Legacy URL elicitation capability for stdio/sse/http/ws servers. |
| `tengu_mcp_listen_reopen_park` | `true` | k | NEW | `:1601171` | Park re-listen when subscriptions/listen keeps getting killed. |
| `tengu_mcp_listen_reopen_park_tuning` | `null` | k | NEW | `:1601167` | Tuning {windowMax, parkDelayMinutes}. |
| `tengu_mcp_local_oauth_blocked_hosts` | `{ hosts: p }` | k | kept | `:1280210` | Hosts blocked from local MCP OAuth (default var VE7) *(2.1.197 desc.)* |
| `tengu_mcp_protocol_negotiation_ccr` | `true` | k | NEW | `:1602206` | Protocol negotiation for ccr-proxy (false -> legacy). |
| `tengu_mcp_protocol_negotiation_claudeai` | `true` | k | NEW | `:1602192` | Protocol negotiation for claudeai-proxy. |
| `tengu_mcp_protocol_negotiation_http` | `true` | k | NEW | `:1602185` | Protocol negotiation for http. |
| `tengu_mcp_protocol_negotiation_stdio` | `true` | k | NEW | `:1602199` | Protocol negotiation for stdio. |
| `tengu_mcp_proxy_needs_approval_retry` | `true` | k | NEW | `:1593443` | Retry proxy calls returning needs-approval (args_sha256). Also an event name (overlap). |
| `tengu_mcp_server_policy_bypass_exempt` | `true` | k | kept | `:542456` | Remote only: exempt mcpServerPolicy rules from being overridden by bypassPermissions mode *(2.1.197 desc.)* |
| `tengu_mcp_singleton_unwrap` | `true` | k | kept | `:1593304` | Unwrap singleton MCP tool results *(2.1.197 desc.)* |
| `tengu_mcp_skills` | `false` | k | kept | `:378904` | Expose skills as MCP tools / MCP skills integration *(2.1.197 desc.)* |
| `tengu_mcp_startup_policy_seed` | `true` | k | kept | `:805449` | Remote only: seed MCP permission policy from server config at startup *(2.1.197 desc.)* |
| `tengu_mcp_stateless_skip_init` | `true` | k | kept | `:495583` | Skip init handshake for stateless MCP servers *(2.1.197 desc.)* |
| `tengu_mcp_step_up_auth_dialog` | `true` | k | NEW | `:1600715` | Step-up OAuth scope dialog for http MCP. |
| `tengu_mcp_strip_trailing_xml_tags` | `false` | k | kept | `:1592302` | Strip trailing XML tags from MCP tool output before returning *(2.1.197 desc.)* |
| `tengu_mcp_subagent_prompt` | `false` | k | kept | `:488872` | Use new (non-legacy) subagent MCP prompt *(2.1.197 desc.)* |
| `tengu_mcp_task_worker_wake` | `false` | k | NEW | `:378832` | Wake keepers for backgrounded MCP tasks (needs glowing_lark). |
| `tengu_mcp_url_elicitation` | `true` | k | NEW | `:495500` | URL elicitation support. |
| `tengu_melodic_ember` | `false` | k | NEW | `:1470803` | When ON disables mer() path (jy() && !flag). |
| `tengu_peppy_riddle` | `false` | vn | NEW | `:1602139` | vn-read 'listed' for ccr-proxy legacy servers. |
| `tengu_sdk_mcp_manifests` | `true` | k,vr | NEW | `:1470818` | SDK MCP manifests (session-pinned and k). |
| `tengu_sorted_otter` | `false` | k | NEW | `:219780` | MCP instructions delta. |
| `tengu_surface_failed_mcp_servers` | `true` | k | NEW | `:219776` | Surface failed MCP servers to the model. |
| `tengu_tender_truffle` | `[]` | vn | NEW | `:1602148` | vn-read list for ccr-proxy. |
| `tengu_twinkling_cosmos` | `false` | k | NEW | `:1823829` | Held MCP host. |
| `tengu_walnut_tiller` | `false` | k | NEW | `:1830960` | File input for claudeai MCP. |

### model-api (41; 34 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_redwood2` | `""` | k | kept | `:184325` | Numeric config (parsed) applied only to claude-opus-4-8 (context/threshold tuning) *(2.1.197 desc.)* |
| `tengu_amber_redwood3` | `""` | k | kept | `:184325` | Boolean-ish gate (truthy string) tied to opus-4-8 behavior (pi()) *(2.1.197 desc.)* |
| `tengu_attempt_decision_shadow` | `false` | k | NEW | `:525397` | Dwn(): enables shadow evaluation of an API retry/attempt decision policy (logs alternative outcome). Tentative. |
| `tengu_binary_balloon` | `false` | vn | NEW | `:446355` | vn-read: this.sendsFromRecordFlag — skip rebuilding tool defs from the prompt snapshot record (prompt_snapshot_tool_build_skip_flag). |
| `tengu_calm_seal` | `null` | k | NEW | `:126445` | i5(): allowlist of model display names (array of strings); a model's name is honoured only if listed ('Fable' always passes). |
| `tengu_crimson_vector` | `false` | k | kept | `:505759` | First-party model routing/affordance gate (returns JA7 when on) *(2.1.197 desc.)* |
| `tengu_curious_tower` | `false` | k | NEW | `:523249` | Tether-live gate (env CLAUDE_CODE_TETHER_LIVE overrides). |
| `tengu_curious_tower_stateless_models` | `""` | k | NEW | `:523396` | Comma list of models treated as stateless for tether. |
| `tengu_dreamy_frost` | `false` | k | NEW | `:526103` | Dispatch v2 'd' arm (env CLAUDE_CODE_DISPATCH_V2D). |
| `tengu_eager_rain` | `true` | k | NEW | `:525393` | maxOutputFiltered constant VEe when on, else 0. |
| `tengu_expressive_whistle` | `false` | k | NEW | `:524314` | c1r(): early-return gate in pwn(). Not traced. |
| `tengu_groovy_eclipse` | `false` | k | NEW | `:184389` | xOs(): skipMessageCacheMarkers. |
| `tengu_gypsum_kite` | `false` | k | kept | `:178430` | Show '~2x usage vs Sonnet' hint for pro-plan users on certain models *(2.1.197 desc.)* |
| `tengu_hidden_frog` | `true` | k | NEW | `:184377` | AOs(): allowFallback. |
| `tengu_jaunty_charm` | `null` | k | NEW | `:523148` | Cache TTL config (ttl_seconds, cc_closed_turn_ttl_seconds). |
| `tengu_juniper_sundial` | `null` | k | NEW | `:553827` | Turns between maintenance for ultra effort. |
| `tengu_lucid_anchor` | `false` | k | NEW | `:523407` | FWr(): tool additions/removals gate. |
| `tengu_mellow_beacon` | `false` | k | NEW | `:521101` | isMarkWanted on idle reply. |
| `tengu_mossy_crown` | `true` | k | NEW | `:516402` | Host models for firstParty. |
| `tengu_mossy_gray` | `false` | k | NEW | `:505726` | Infinite limit for a provider (Aa()). |
| `tengu_penguins_off` | `null` | k | kept | `:120988` | Fast mode kill switch: a non-null string is the reason Fast mode is unavailable *(2.1.197 desc.)* |
| `tengu_pewter_owl_model` | `""` | k | kept | `:368643` | Model override string (pewter owl) used in model selection *(2.1.197 desc.)* |
| `tengu_precious_koala` | `"off"` | vn | NEW | `:219787` | 'everywhere'\|'hosted'\|'off' arm (inForce). |
| `tengu_proud_clover` | `false` | k | NEW | `:163035` | Max-effort reminder (env CLAUDE_CODE_MAX_EFFORT_REMINDER). |
| `tengu_quiet_heron` | `false` | k | NEW | `:523411` | Unless breaker tripped. |
| `tengu_quirky_kazoo` | `p` | vr | NEW | `:219733` | Session-pinned object config. |
| `tengu_rustling_sunset` | `true` | k | NEW | `:1505487` | iN(): not for gateway. |
| `tengu_saffron_ladder` | `false` | k | NEW | `:177063` | Fable model picker gate. |
| `tengu_shiny_stardust` | `false` | vr | NEW | `:219729` | Session-pinned XAs(). |
| `tengu_stellar_drift` | `false` | vr | NEW | `:446849` | Session-pinned echoApiBlockOrder. |
| `tengu_structured_output_strict` | `false` | k | NEW | `:446552` | Send strict:true tool input schemas. |
| `tengu_thinking_block_resumption` | `false` | k,vr | NEW | `:520828` | Resume truncated thinking blocks on max_tokens. |
| `tengu_tidy_cloud` | `true` | k | NEW | `:525389` | maxSleptThrough. |
| `tengu_tidy_frost` | `false` | k | NEW | `:525783` | 5m cache TTL live path. |
| `tengu_tidy_origami` | `false` | k | NEW | `:184420` | IOs(). |
| `tengu_tool_pear` | `false` | k | kept | `:127470` | Enable strict:true on tool schemas and push an extra API beta *(2.1.197 desc.)* |
| `tengu_truncated_response_recovery` | `true` | k | NEW | `:755301` | Recover truncated responses. |
| `tengu_vast_sunset` | `true` | k | NEW | `:529345` | Cut-short error for non-streaming response. |
| `tengu_wild_tome` | `false` | k | NEW | `:515752` | Sticky betas query. |
| `tengu_wondrous_acorn` | `null` | k | NEW | `:522975` | Continuation config {enabled, min_continues}. |
| `tengu_woolly_forest` | `true` | k | NEW | `:184381` | COs(). |

### artifacts (40; 38 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_bracken_sluice` | `false` | k | NEW | `:706538` | Artifact comment auto-react: responder-dispatch opt-in (env CLAUDE_CODE_ARTIFACT_COMMENT_RESPONDER overrides). |
| `tengu_brass_plover` | `false` | k | NEW | `:712505` | Artifact presence indicators (env CLAUDE_CODE_ARTIFACT_PRESENCE overrides). |
| `tengu_cedar_transom` | `false` | k | NEW | `:355887` | Kvo(): when ON disables a behaviour gated by gable_onyx_sluice (gie() && !flag). |
| `tengu_cobalt_plinth` | `pe()` | k | **default changed** | `:355615` | Master gate for the artifact (Frame) pipeline. Default is now computed pe(): true when z9() (:159344) returns undefined, 'prosumer_oauth' or 'no_auth'; false for 'third_party_provider', 'custom_base_url', 'oauth_no_inference_scope' (2.1.197: literal false). CLAUDE_CODE_ARTIFACT short-circuit is compiled to `&& !1` (dead). |
| `tengu_cobalt_plinth_alder` | `false` | k | NEW | `:783026` | Artifact delete action (env CLAUDE_CODE_ARTIFACT_DELETE overrides; off in remote unless Dr()). |
| `tengu_cobalt_plinth_aspen` | `false` | k | NEW | `:775721` | Artifact preview (env CLAUDE_CODE_ARTIFACT_PREVIEW; never in remote). |
| `tengu_cobalt_plinth_bracken` | `false` | k | NEW | `:690415` | Multi-file artifacts (env CLAUDE_CODE_ARTIFACT_MULTI_FILE). |
| `tengu_cobalt_plinth_campion` | `false` | k | NEW | `:690451` | K3(): base64 size accounting for artifact payloads (ceil(len/3)*4). |
| `tengu_cobalt_plinth_damson` | `false` | k | NEW | `:690277` | Bf(): artifact toolset latch (env CLAUDE_CODE_ARTIFACT_TOOLSET); emits tengu_artifact_toolset. |
| `tengu_cobalt_plinth_dataviz` | `false` | k | NEW | `:786722` | Inject charts/diagrams guidance into artifact skill text when the dataviz skill exists. |
| `tengu_cobalt_plinth_fennel` | `false` | k | NEW | `:687132` | fqe(): AX() && flag && QTt(). |
| `tengu_cobalt_plinth_fern` | `true` | k | **default changed** | `:690397` | Frame base-version rendering. Default flipped false -> true (a1(), :690397). |
| `tengu_cobalt_plinth_mallow` | `false` | k | NEW | `:690431` | HZr(): artifact sharing scope 'shared'. |
| `tengu_cobalt_plinth_moss` | `true` | k | NEW | `:690401` | mot(): artifact-module gate (default on). Callers not traced reliably. |
| `tengu_cobalt_plinth_sainfoin` | `false` | k | NEW | `:457730` | Zjo(): include tool_host_life_id. Tentative. |
| `tengu_cobalt_plinth_samphire` | `false` | k | NEW | `:690419` | hLe(): allow copy_from on artifact publish (off -> 'copy_from_flag_off'). |
| `tengu_cobalt_plinth_sedge` | `false` | k | NEW | `:352803` | Ek(): public-artifact read guard ('public_unasked'). |
| `tengu_cobalt_plinth_sill` | `null` | k | NEW | `:690410` | C_e(): artifact HTML byte cap (number, floor, min with bq); null -> SIo. |
| `tengu_cobalt_plinth_sorb` | `false` | k | NEW | `:1413841` | _m(): design-guard on artifact publish. |
| `tengu_cobalt_plinth_sorrel` | `true` | k | NEW | `:687094` | n7(): artifact availability composite gate. |
| `tengu_cobalt_plinth_tansy` | `false` | k | NEW | `:690427` | MZr(): writer + same-channel -> 'channel' sharing. |
| `tengu_cobalt_plinth_thrift` | `false` | k | NEW | `:355899` | Znn(): republish inline / thread. |
| `tengu_cobalt_plinth_willow` | `false` | k | NEW | `:783658` | Artifact open action (env CLAUDE_CODE_ARTIFACT_OPEN_ACTION). |
| `tengu_cobalt_plinth_yew` | `false` | k | NEW | `:781578` | p(): artifact-module gate (chunk-20weff0j). |
| `tengu_copper_hinge_wren` | `false` | k | NEW | `:690443` | Hot-reload of artifacts (env CLAUDE_CODE_ARTIFACT_HOT). |
| `tengu_gable_onyx_sluice` | `false` | k | NEW | `:355866` | gie(): artifact sub-gate under sM(). |
| `tengu_gorse_pylon` | `false` | k | NEW | `:706994` | Artifact comment fast-ack (env CLAUDE_CODE_ARTIFACT_COMMENT_FAST_ACK). |
| `tengu_gorse_sill` | `false` | k | NEW | `:707028` | Fixed fast-ack variant (env ..._FIXED). |
| `tengu_ochre_bittern` | `false` | k | NEW | `:706998` | Held reply for artifact comments. |
| `tengu_ochre_plover` | `false` | k | NEW | `:705380` | Reply action on artifact comments. |
| `tengu_onyx_sluice` | `false` | k | NEW | `:699948` | Artifact comments read; off -> 'comments are not available'. |
| `tengu_osier_pylon_trace` | `false` | k | NEW | `:777425` | Artifact verify (env CLAUDE_CODE_ARTIFACT_VERIFY; never in remote). |
| `tengu_pewter_canteen` | `false` | k | NEW | `:688608` | When ON disables chart runtime in artifacts. |
| `tengu_sorrel_trellis` | `false` | k | NEW | `:706990` | Artifact comments auto-react opt-in (env CLAUDE_CODE_ARTIFACT_COMMENTS_AUTOREACT). |
| `tengu_swirling_squid` | `false` | k | NEW | `:927342` | Inherited artifact type grant (env CLAUDE_CODE_ARTIFACT_INHERITED_TYPE_GRANT). |
| `tengu_teal_corbel` | `false` | k,vn | NEW | `:698965` | Artifact comments (env CLAUDE_CODE_ARTIFACT_COMMENTS). |
| `tengu_teal_corbel_finial` | `true` | k | NEW | `:706232` | Anchor file for artifact comments. |
| `tengu_teal_corbel_newel` | `false` | k | NEW | `:1403902` | ou(): gate. |
| `tengu_tidy_widget` | `true` | k | NEW | `:690423` | OZr(): preconditions. |
| `tengu_umber_stile` | `false` | k | NEW | `:775908` | Artifact DB str_replace (env CLAUDE_CODE_ARTIFACT_DB_STR_REPLACE). |

### permissions-auto-mode (34; 22 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_ant_yolo_equiv_strip_config` | `{}` | k | kept | `:730861` | Config controlling which bash flags are stripped for permission-equivalence ('yolo equiv') matching *(2.1.197 desc.)* |
| `tengu_auto_mode_config` | `{}` / `sc` / `null` | Mj,k,vn,vr | kept | `:127419` | Auto-mode (auto-accept) configuration object; field .enabled drives availability ('disabled' kills it) *(2.1.197 desc.)* |
| `tengu_auto_mode_worktree_fast_path` | `false` | k | NEW | `:229263` | Nkr(): enables a fast path in auto-mode for worktree paths (returns [] when off). |
| `tengu_classifier_disabled_surfaces` | `""` | k | kept | `:808546` | Comma-separated list of classifier surfaces (cli/bg/bridge/desktop/ccr/...) to disable *(2.1.197 desc.)* |
| `tengu_classifier_summary_kill` | `false` | k | kept | `:808541` | Kill switch: removes the 'summary' classifier stage *(2.1.197 desc.)* |
| `tengu_classifier_summary_llm_emit` | `false` | k | kept | `:808567` | Force the classifier summary stage to emit via LLM *(2.1.197 desc.)* |
| `tengu_cobalt_wren` | `false` | k | kept | `:808563` | Downgrade classifier summary from 'llm' to 'heuristic' mode *(2.1.197 desc.)* |
| `tengu_cowork_auto_mode_include_allowed_write_mcp` | `false` | k | NEW | `:432049` | Cowork: send destructive-but-allowed write MCP calls through the auto-mode classifier. |
| `tengu_cowork_chrome_automode_default` | `false` | k | kept | `:731339` | Default the Chrome classifier floor (auto-mode availability) for cowork *(2.1.197 desc.)* |
| `tengu_destructive_command_warning` | `false` | k | kept | `:1345793` | Show a warning before running detected destructive shell commands *(2.1.197 desc.)* |
| `tengu_drifting_dream` | `false` | k | NEW | `:1463025` | Launcher answer handling in permission prompt. |
| `tengu_expressive_church` | `false` | k | NEW | `:719021` | Orphaned permission handling: close-vs-drop decision for non-hearth servers. |
| `tengu_fizzy_grove` | `false` | k | NEW | `:491334` | Interrupt reason maps to TOe instead of Lk. |
| `tengu_harbor_permissions` | `false` | k | kept | `:1248861` | Enable harbor permission rule engine (FNV-hashed allow/deny rules) *(2.1.197 desc.)* |
| `tengu_harbor_willow` | `true` | k | **default changed** | `:162781` | Default the session into auto mode when permissions allow (YWn). Default flipped false -> true; also true when clientData meadow_lantern===true. |
| `tengu_humble_wand` | `true` | k | NEW | `:540750` | aKr(): permission pa.shouldBlock sub-gate. |
| `tengu_loggia_denkbild` | `false` | k | NEW | `:756467` | Permission relay dialog for bridge. |
| `tengu_maple_pier` | `true` | k | **default changed** | `:1479086` | Post-onboarding 'make auto your default mode' nudge (KBr). Default flipped false -> true. |
| `tengu_modular_mochi` | `false` | k | NEW | `:540473` | tKr(): MCP clients auto-mode gate. |
| `tengu_moss_anchor` | `true` | k | **default changed** | `:162553` | Allow the auto-mode default in non-interactive sessions. Default flipped false -> true. |
| `tengu_playful_hare` | `true` | k | NEW | `:1022002` | Refuse a request from non-person sources (Slack/Teams/routine). |
| `tengu_quiet_lantern` | `true` | k | NEW | `:431370` | Arbiter server-input-rewritten handling. |
| `tengu_quirky_shore` | `"off"` | k | NEW | `:540469` | Computer-use checks arm. |
| `tengu_radiant_teapot` | `true` | k | NEW | `:488690` | Arbiter permission mode at request. |
| `tengu_remote_auto_mode_include_destructive_mcp` | `false` | k | NEW | `:540465` | Remote: destructive MCP calls go through classifier. |
| `tengu_slate_lantern` | `false` | k | NEW | `:690435` | Arbiter local fallback. |
| `tengu_slate_lantern_ember` | `false` | k | NEW | `:690439` | nce(): ask behaviour. |
| `tengu_snug_reef` | `0` | k | NEW | `:1502354` | Numeric dial; 0 = off. |
| `tengu_sorted_zebra` | `false` | k | NEW | `:730963` | Tool alias permission rules. |
| `tengu_ticklish_whisper` | `false` | k | NEW | `:540296` | Env CLAUDE_CODE_TICKLISH_WHISPER. |
| `tengu_umber_sluice` | `false` | k | NEW | `:455071` | Artifact consent rule (env CLAUDE_CODE_AUTO_MODE_ARTIFACT_CONSENT_RULE). |
| `tengu_valiant_crayon` | `false` | k | NEW | `:1463271` | Suppress always-allow rule. |
| `tengu_velvet_gannet` | `false` | k | NEW | `:718943` | Orphaned permission for hearth server. |
| `tengu_virtual_knuth` | `false` | k | NEW | `:500691` | Auto mode tool approval. |

### tool-host (30; 30 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_ticklish_pnueli` | `false` | vn | NEW | `:1089692` | vn-read; ignored when override. |
| `tengu_vast_tulip` | `false` | k | NEW | `:1187882` | Tool host attestation 'enforce' vs 'observe'. |
| `tengu_violin_adjuster` | `false` | k | NEW | `:1488667` | nw(). |
| `tengu_violin_amati` | `n/a` / `!1` | k,rb | NEW | `:280615` | rb + k. |
| `tengu_violin_arching` | `false` | k | NEW | `:1091440` | Ft(). |
| `tengu_violin_corner` | `false` | k | NEW | `:1187835` | Eyn(): holdsWhileAsked. |
| `tengu_violin_endpin` | `false` | vn | NEW | `:1189726` | vn-read; ignored when override. |
| `tengu_violin_eye` | `false` | vn | NEW | `:1090327` | vn-read; ignored when override. |
| `tengu_violin_ferrule` | `false` | k | NEW | `:1091609` | Background operator circuit breaker. |
| `tengu_violin_fhole` | `false` | k | NEW | `:1187151` | qle(). |
| `tengu_violin_finetuner` | `false` | k | NEW | `:1197462` | Q(). |
| `tengu_violin_hair` | `false` | k | NEW | `:1091601` | Session onAsk stance. |
| `tengu_violin_lapping` | `false` | k | NEW | `:1517297` | 'returned' announce. |
| `tengu_violin_luthier` | `false` | vn | NEW | `:1627795` | vn-read source switch. |
| `tengu_violin_neck` | `false` | k | NEW | `:1089703` | rewrite_own_hooks. |
| `tengu_violin_nut` | `false` | k | NEW | `:1089711` | own_record stance. |
| `tengu_violin_overstand` | `false` | vn | NEW | `:434863` | vn-read; ignored when override. |
| `tengu_violin_pernambuco` | `false` | k | NEW | `:1463841` | Transport silence. |
| `tengu_violin_rib` | `false` | k | NEW | `:1112220` | Tet(): sed --expression parsing. |
| `tengu_violin_rosin` | `false` | vr | NEW | `:372481` | Session-pinned tool filter. |
| `tengu_violin_scroll` | `false` | k | NEW | `:960267` | Worker epoch announce. |
| `tengu_violin_spruce` | `null` | k | NEW | `:1188551` | askWaitMs config. |
| `tengu_violin_strad` | `n/a` / `!1` | k,rb | NEW | `:280526` | rb + k. |
| `tengu_violin_table` | `false` | k | NEW | `:1186895` | m(). |
| `tengu_violin_tailgut` | `false` | k | NEW | `:1091455` | Own file / file_or_folder. |
| `tengu_violin_tip` | `false` | k | NEW | `:1516810` | MUr(): did_wake. |
| `tengu_violin_varnish` | `false` | k | NEW | `:650126` | jW(). |
| `tengu_violin_waist` | `false` | k | NEW | `:1468450` | xt(). |
| `tengu_violin_winding` | `false` | k | NEW | `:1465151` | Away recheck. |
| `tengu_violin_wood` | `n/a` / `!1` | k,rb,vn,vr | NEW | `:280541` | Master gate (rb nx() / k Xf()); env CLAUDE_CODE_HIDE_CWD near a site. |

### agents-subagents (28; 22 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_agentview_inherit_mode_demote` | `true` | k | NEW | `:1289839` | tbt(): when on, an agent-view child gets {permissionMode, permissionModeInherited:true} (inherited mode marked so it can be demoted). |
| `tengu_amber_flint` | `true` | k | kept | `:346200` | Agent Teams (agent swarms / teammate mode) GrowthBook rollout gate *(2.1.197 desc.)* |
| `tengu_amber_kestrel` | `false` | k | NEW | `:728686` | jn(): when ON, bypasses the concurrent-subagent cap (CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS) that otherwise refuses a launch with 'subagent_concurrency_cap'. |
| `tengu_amber_sentinel` | `false` | k | kept | `:369550` | Gate (Gm()) near the Monitor tool / event-monitoring code path *(2.1.197 desc.)* |
| `tengu_breezy_diffie` | `true` | k | NEW | `:460782` | NGo(): extra condition in agent task progress logic (Kn = Q && V >= K && NGo()). Behaviour not fully traced. |
| `tengu_coordinator_panel` | `true` | k | kept | `:1215090` | Coordinator panel UI for Agent Teams (task list / teammate view) *(2.1.197 desc.)* |
| `tengu_copper_thistle` | `false` | k | kept | `:1321413` | Rename teammate tasks from 'task' to 'job' nomenclature in coordinator UI *(2.1.197 desc.)* |
| `tengu_hushed_kestrel` | `true` | k | NEW | `:410084` | Agent handback pointer notice. |
| `tengu_idle_amber_finch` | `false` | k | kept | `:176925` | Idle-detection behavior for teammate/agent sessions (mn()) *(2.1.197 desc.)* |
| `tengu_lively_waffle` | `true` | k | NEW | `:348172` | SendMessage handback in auto mode (env CLAUDE_CODE_SENDMESSAGE_HANDBACK). |
| `tengu_lucky_cerf` | `null` | vr | NEW | `:161172` | Session-pinned model allowlist for delegation guidance. |
| `tengu_lucky_cerf_text` | `null` | vr | NEW | `:443298` | Override delegation-cost guidance text. |
| `tengu_lucky_whisper` | `false` | vr | NEW | `:1442864` | Preserve tool-use results in subagents (env CLAUDE_CODE_ATTACHMENTS_BY_PATH). |
| `tengu_melodic_wolf` | `true` | k | NEW | `:348297` | Handback provenance (env CLAUDE_CODE_HANDBACK_PROVENANCE). |
| `tengu_nimble_wren` | `true` | vr | NEW | `:493661` | Built-in agent runs on haiku instead of inherit. |
| `tengu_observer_agents_enabled` | `true` | k | NEW | `:725713` | Observer agents (requires env CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS). |
| `tengu_observer_subagent_fanout` | `true` | k | NEW | `:725719` | Observer subagent fan-out. |
| `tengu_patient_meteor` | `false` | k | NEW | `:575570` | Small results for subagent tool calls. |
| `tengu_purring_pine` | `true` | k | NEW | `:725198` | Report tool result ends the turn. |
| `tengu_quiet_slate_wren` | `false` | k | kept | `:176929` | Teammate-mode quiet variant gate (near agent-swarm snapshot code) *(2.1.197 desc.)* |
| `tengu_rosy_donut` | `true` | k | NEW | `:395309` | Kill agent monitors on stop. |
| `tengu_snappy_pelican` | `false` | vr | NEW | `:443433` | Session-pinned subagent effort tagging (env CLAUDE_CODE_SNAPPY_PELICAN). |
| `tengu_starry_squid` | `true` | k | NEW | `:721329` | Agent tool_use/tool_result relay. |
| `tengu_subagent_cache_evict` | `false` | k | NEW | `:526333` | Evict cache on subagent completion (env CLAUDE_CODE_SUBAGENT_CACHE_EVICT). |
| `tengu_tidy_sloth` | `true` | k | NEW | `:390955` | Uot(): stop on memory pressure. |
| `tengu_twinkling_boole` | `false` | vr | NEW | `:552971` | Session-pinned parallel-agent worktree guidance. |
| `tengu_velvety_sprout` | `false` | vr | NEW | `:728518` | Session-pinned preserve tool-use result for the Agent tool. |
| `tengu_zinc_harbor` | `false` | vr | NEW | `:409987` | Session-pinned backgrounded running tasks. |

### tools (25; 23 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_breezy_crescent` | `true` | vr | NEW | `:369511` | Monitor tool: monitors expire and must be re-armed (session-pinned; always on for me()). Changes Monitor tool prompt text. |
| `tengu_bubbly_meteor` | `true` | k | NEW | `:499918` | qoo(): sub-gate under tengu_velvet_panda (ZMn()) used by tool-error handling. Tentative. |
| `tengu_dapper_dawn` | `false` | k | NEW | `:394932` | wAt(): record run end timing. |
| `tengu_deferred_stub_tool` | `true` | k | NEW | `:520885` | DSn(): register a deferred stub tool. |
| `tengu_indexed_corbato` | `false` | vr | NEW | `:372489` | Session-pinned _5e(). Not traced. |
| `tengu_jade_compass` | `true` | k | NEW | `:162205` | Streamed input repair. |
| `tengu_lazy_dove` | `false` | k | NEW | `:1463584` | echoWireToolInputs. |
| `tengu_linear_owl` | `false` | vr | NEW | `:437094` | Session-pinned nno(). |
| `tengu_merry_tide` | `false` | vr | NEW | `:1432863` | Session-pinned enable for a parametric tool (chunk-y2tvp62y; enable__mcp__/request_computer family). Tentative. |
| `tengu_misty_twilight` | `true` | k | NEW | `:1497132` | Abort controllers when set empties. |
| `tengu_mossy_wirth` | `false` | vr | NEW | `:1438249` | Session-pinned project_write inline doc. |
| `tengu_noble_mountain` | `true` | k | NEW | `:442701` | EDo(): gate. |
| `tengu_peaceful_leaf` | `false` | vr | NEW | `:1432816` | Session-pinned shared description for a parametric tool. |
| `tengu_plain_kestrel` | `min` | k | NEW | `:487453` | gD(): false only if served false. |
| `tengu_playful_lobster` | `true` | k | NEW | `:230065` | ig(): logged paths gate. |
| `tengu_polished_tulip` | `true` | vr | NEW | `:445772` | Session-pinned bash tool prompt section. |
| `tengu_sage_compass2` | `{ enabled: wD(Ie()) }` | k | **default changed** | `:313845` | Advisor tool config; .enabled. Default now {enabled: wD(Ie())} = true on the anthropicAws / anthropicGoogleCloud planes (2.1.197: {}). Env CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL forces on. |
| `tengu_send_file` | `false` | k | NEW | `:818843` | SendFile tool (needs Gi()). Also an event name (overlap). |
| `tengu_silent_heron` | `0` | k | NEW | `:579803` | Numeric threshold; 0 = off. |
| `tengu_snappy_plum` | `false` | k | NEW | `:448011` | tge(): gate. |
| `tengu_tidy_eclipse` | `true` | k | NEW | `:542129` | Set aside invalid input keys instead of throwing. |
| `tengu_tool_detach` | `true` | k | NEW | `:499952` | Detach tool execution. |
| `tengu_tool_search_unsupported_models` | `null` | k | kept | `:219688` | Array of model names that don't support tool search *(2.1.197 desc.)* |
| `tengu_velvet_panda` | `true` | k | NEW | `:499914` | ZMn(). |
| `tengu_witty_hearth` | `true` | k | NEW | `:463065` | Pewter owl tool endsTurn (env CLAUDE_CODE_PEWTER_OWL_TOOL). |

### context-compaction (24; 11 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_prism` | `false` | k | kept | `:584774` | Append extra block (fPf) to context/system content when in a particular mode (t1()) *(2.1.197 desc.)* |
| `tengu_amber_rokovoko` | `_ge` | k | kept | `:448872` | Autocompact precompute buffer fraction (must be 0 <= x < 1; default var hqq=0.2) *(2.1.197 desc.)* |
| `tengu_calm_noodle` | `true` | k | NEW | `:750871` | Compaction keeps tail announcements after the boundary (compact_kept_tail_announcements). |
| `tengu_chomp_thaw` | `false` | k | NEW | `:747531` | Prompt-suggestion cache: when on, a cache-write is not treated as 'cache_write' (allows suggestion). Tentative. |
| `tengu_compact_cache_prefix` | `true` | k | kept | `:516792` | Prompt caching during compaction *(2.1.197 desc.)* |
| `tengu_context_usage_bulk_counts` | `false` | k | NEW | `:494403` | /context 'full' view: bulk token counts. |
| `tengu_deep_shore` | `true` | k | NEW | `:752018` | Wait for model warmup before compaction. |
| `tengu_fallow_plover` | `false` | k | NEW | `:555572` | Settle touched-files attachment (env CLAUDE_CODE_SETTLE_TOUCHED_FILES). |
| `tengu_hazel_osprey` | `false` | k | kept | `:1021072` | Context-window flooring behavior gate *(2.1.197 desc.)* |
| `tengu_hazel_osprey_floor` | `b` | k | kept | `:1021077` | Token floor value used by hazel_osprey (default var tsf=75000) *(2.1.197 desc.)* |
| `tengu_humble_zephyr` | `false` | k | NEW | `:556500` | M5r(): early-return gate. |
| `tengu_iterative_falcon` | `true` | k | NEW | `:542693` | bEn(): false only if served false. |
| `tengu_lexical_glade` | `false` | k | NEW | `:754057` | Warn on org change with thinking blocks. |
| `tengu_memory_bulk_inflate` | `true` | k | kept | `:318725` | Bulk-inflate memory entries on load (vs lazy); when off, returns 'not-attempted' *(2.1.197 desc.)* |
| `tengu_mossy_thrush` | `false` | k | NEW | `:555573` | Touched-files settle with sfn(). |
| `tengu_moth_copse` | `false` | k | kept | `:112436` | Transform applied to message history (when off, returns history unchanged) *(2.1.197 desc.)* |
| `tengu_paper_halyard` | `false` | k | kept | `:439168` | Context/message assembly variant gate *(2.1.197 desc.)* |
| `tengu_plain_heron` | `true` | k | NEW | `:184385` | ROs(): gate. |
| `tengu_prompt_cache_1h_config` | `{ allowlist: [...TYe] }` | k | kept | `:525776` | 1-hour prompt-cache config (allowlist of cache keys eligible for 1h TTL) *(2.1.197 desc.)* |
| `tengu_reactive_compact_remote` | `false` | k | kept | `:184361` | Enable reactive (mid-turn) autocompact in remote sessions *(2.1.197 desc.)* |
| `tengu_read_dedup_killswitch` | `false` | k | kept | `:550388` | Kill switch: disables Read-tool result deduplication cache *(2.1.197 desc.)* |
| `tengu_soft_slate_nudge` | `"baseline"` | k | kept | `:553807` | Todo-reminder injection mode ('baseline' on, 'off' disables todo reminders) *(2.1.197 desc.)* |
| `tengu_sunny_locket` | `null` | k | NEW | `:452132` | Idle compact config {mode, minTokens} (env CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS). |
| `tengu_velvet_ibis` | `{}` | k | kept | `:1201975` | Tool-result clearing/limits config; .mcp_tool sets MCP output token cap *(2.1.197 desc.)* |

### background-daemon (20; 10 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_bg_attach_stall_ms` | `kn` | k | kept | `:643182` | Stall timeout (ms) when attaching to a background session (default var UJA=5000) *(2.1.197 desc.)* |
| `tengu_bg_attach_upgrade` | `true` | k | kept | `:644918` | Allow attaching to / upgrading an existing background session *(2.1.197 desc.)* |
| `tengu_bg_binary_takeover` | `true` | k | kept | `:644582` | Allow a newer client binary to retire a stale background daemon/supervisor running an older version *(2.1.197 desc.)* |
| `tengu_bg_classifier_config` | `{ useSmallFastModel: !0, disableThinki…` | k | **default changed** | `:1380884` | Background-session event classifier model config. Default gains midTurnLlmDebounceMs: 60000 (2.1.197: {useSmallFastModel:true, disableThinking:true}). |
| `tengu_bg_leftarrow_inprocess` | `true` | k | kept | `:1290251` | Handle left-arrow (detach/back) in-process for attached bg sessions *(2.1.197 desc.)* |
| `tengu_bg_low_mem_mb` | `1024` | k | kept | `:644879` | Free-memory floor (MB) below which bg dispatch is throttled (low-mem guard). 0 on macOS. *(2.1.197 desc.)* |
| `tengu_bg_prewarm_burst_concurrency` | `3` | k | NEW | `:651860` | Number of stale bg workers re-prewarmed concurrently in a burst after supervisor (re)start; <=0 disables. |
| `tengu_bg_prewarm_burst_delay_ms` | `15000` | k | NEW | `:651856` | Delay (ms) before the bg prewarm burst runs. |
| `tengu_bg_prewarm_per_sweep` | `3` | k | kept | `:651808` | Number of spare bg workers to pre-warm per supervisor sweep *(2.1.197 desc.)* |
| `tengu_bg_revival_guard` | `true` | k | NEW | `:646221` | Ge(): guard when reviving a bg session after a crash (sets CLAUDE_CODE_RESUME_INTERRUPTED_TURN path). |
| `tengu_bg_spare_enable` | `true` | k | kept | `:651477` | Enable pre-warmed spare background worker pool (claim/spawn spares) *(2.1.197 desc.)* |
| `tengu_bg_worker_ctty` | `true` | k | NEW | `:1539134` | With CLAUDE_BG_BACKEND=daemon: give the bg worker a controlling TTY (Fls()); off -> 'switched_off'. |
| `tengu_cosmic_cookie` | `false` | k | NEW | `:646229` | macOS: set CLAUDE_PTY_HOST_NO_STABLE_PATH for bg sessions. |
| `tengu_daemon_refuse_stale_upgrade` | `true` | k | NEW | `:652762` | Supervisor refuses to self-restart onto an OLDER binary. |
| `tengu_daemon_upgrade_defer_busy` | `true` | k | NEW | `:652776` | Defer daemon self-upgrade while workers are busy. |
| `tengu_defer_cap_ms` | `1e4` | k | kept | `:1290682` | Max wait (ms) for 'defer-then-fork' before forking a background task *(2.1.197 desc.)* |
| `tengu_greedy_crane` | `true` | k | NEW | `:646225` | vt(): stale-version bg revival check. |
| `tengu_hover_rest` | `false` | k | NEW | `:620121` | Hover-rest mode (env CLAUDE_CODE_HOVER_REST). |
| `tengu_non_deferrable_builtins` | `null` | k | kept | `:219711` | Built-in tool names that must NOT be deferred to background *(2.1.197 desc.)* |
| `tengu_resume_open_live_bg` | `true` | k | NEW | `:767642` | Resume opens live bg job. |

### memory (20; 11 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_bramble_lintel` | `null` | k | kept | `:746063` | Numeric config for memory/dream pacing (defaults to 1 when null) *(2.1.197 desc.)* |
| `tengu_breezy_fairy` | `false` | k | NEW | `:333777` | wmo(): gate in the memory/multi-store module (also feeds tengu_vast_tulip attestation 'off' when false). Tentative. |
| `tengu_cosmic_shore` | `true` | k | NEW | `:332295` | cmo(): memory gate under S7t(). |
| `tengu_haze_glass` | `false` | k | NEW | `:220959` | Org memory (disabled by CLAUDE_CODE_DISABLE_ORG_MEMORY). |
| `tengu_linen_orbit` | `false` | k | NEW | `:223458` | Memory mode 'tools' vs 'files'. |
| `tengu_linked_cake` | `true` | k | NEW | `:112499` | Auto-memory directory from trusted settings sources only. |
| `tengu_mem_push_delete_mode` | `"corroborate"` | k | NEW | `:317058` | 'corroborate'\|'immediate'\|'never' (env CLAUDE_CODE_MEMORY_PUSH_DELETE_MODE). |
| `tengu_memory_store_resync_interval_minutes` | `QI` | k | kept | `:319469` | Periodic team-memory store resync interval (minutes) *(2.1.197 desc.)* |
| `tengu_memory_stream_list` | `true` | k | NEW | `:318377` | Stream-list multi-store sync (disabled by CLAUDE_CODE_DISABLE_MEMORY_STREAM_LIST). |
| `tengu_mill_orange` | `false` | k | NEW | `:112432` | Lmt(): account recall interplay. |
| `tengu_misty_anchor` | `false` | k | NEW | `:314237` | Yo(): memory backend 'ccr'. |
| `tengu_nifty_finch` | `true` | k | NEW | `:332793` | mmo(): memory path handling. |
| `tengu_ochre_finch` | `false` | k | kept | `:224127` | Session-memory feature gate (memory types / save flow, tG6()) *(2.1.197 desc.)* |
| `tengu_onyx_plover` | `null` | k | kept | `:746442` | Thresholds config for 'dream'/memory sessions (minHours, minSessions) *(2.1.197 desc.)* |
| `tengu_passport_quail` | `false` | k | kept | `:112455` | Memory/dream-related capability gate (also gates a slate_thimble path) *(2.1.197 desc.)* |
| `tengu_sepia_cormorant` | `null` | k | kept | `:112445` | Memory/dream config object (read in same cluster as passport_quail/billiard_aviary) *(2.1.197 desc.)* |
| `tengu_sepia_moth` | `false` | k | kept | `:518607` | Memory/dream-related gate (xm4 cluster) *(2.1.197 desc.)* |
| `tengu_tussock_oriole` | `false` | k | kept | `:730336` | Gate for projectSettings-scoped memory store behavior *(2.1.197 desc.)* |
| `tengu_typed_koala` | `true` | k | NEW | `:317063` | Typed memory store. |
| `tengu_umber_petrel` | `false` | k | kept | `:112450` | Memory/dream-related gate in the same cluster (umber petrel) *(2.1.197 desc.)* |

### billing-usage (18; 7 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_creek` | `false` | k | kept | `:350530` | TUI fullscreen 'downsell' gate (downsell_on) — part of fullscreen rollout logic *(2.1.197 desc.)* |
| `tengu_amber_lark` | `false` | k | kept | `:955011` | Append extra usage/status detail (S34) to the usage status message *(2.1.197 desc.)* |
| `tengu_c4e_slash_upsell` | `false` | k | kept | `:476098` | Claude-for-Enterprise (c4e) slash-command upsell *(2.1.197 desc.)* |
| `tengu_cedar_lattice` | `false` | k | kept | `:526105` | First-party only: inject fallback_credit_token header on non-auxiliary queries *(2.1.197 desc.)* |
| `tengu_copper_lantern` | `false` | k | kept | `:368798` | Extra-usage upsell promo gate *(2.1.197 desc.)* |
| `tengu_jade_anvil_4` | `false` | k | kept | `:1697271` | Upgrade/overage upsell UI variant gate *(2.1.197 desc.)* |
| `tengu_juniper_bassoon` | `false` | k | NEW | `:1336452` | Promo tranches in usage display. |
| `tengu_lantern_hinge` | `false` | k | NEW | `:526733` | Extended usage-limit path. |
| `tengu_lantern_snuffer` | `false` | k | NEW | `:526737` | Workflow waits out usage limit. |
| `tengu_lantern_spool` | `false` | k | kept | `:526735` | First-party only: query-tracking/credit header on deep (depth>0) compact queries *(2.1.197 desc.)* |
| `tengu_pewter_brook` | `false` | k,vn | kept | `:350523` | TUI fullscreen GrowthBook rollout gate (gb_on/gb_off) *(2.1.197 desc.)* |
| `tengu_saffron_credits_only_tiers` | `zd` | k | kept | `:177037` | Subscription tiers that are credits-only (Ede() → restrict to credits) *(2.1.197 desc.)* |
| `tengu_saffron_lattice` | `Wd` | k | kept | `:176998` | Overage / plan-limits config: {enabled, overageConsentRequired, planLimitsEndDate}. Drives 'extra usage' consent + plan-limit-end banner *(2.1.197 desc.)* |
| `tengu_saffron_picker_dim` | `false` | k | kept | `:177059` | Dim/disable the model picker for credits-only tiers *(2.1.197 desc.)* |
| `tengu_satchel_banjo` | `false` | k | NEW | `:1335877` | Extra-usage expiry notice. |
| `tengu_smooth_harbor` | `false` | k | NEW | `:526734` | Extended usage-limit path (with lantern_spool). |
| `tengu_still_heron` | `true` | k | NEW | `:1265336` | Usage limit denied notice. |
| `tengu_velvet_heron` | `true` | k | NEW | `:540113` | Wqr(): not for pro/max/team. |

### telemetry-diagnostics (17; 9 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_agile_glade` | `null` | k | NEW | `:349769` | Per-feature sampling map for the tengu_feature_ok event inside the Datadog forwarder _e(): value[feature_name]=0 drops the event, else rate applied. null = no sampling. |
| `tengu_basalt_scarp` | `false` | k | kept | `:520910` | Diagnostics/feature gate requiring SN() (basalt scarp) *(2.1.197 desc.)* |
| `tengu_basalt_spur` | `false` | k | kept | `:520902` | Diagnostics/feature gate requiring SN() (basalt spur) *(2.1.197 desc.)* |
| `tengu_brass_sled` | `false` | k | NEW | `:1024613` | lts(): include detected build tools (fzs()) in the environment/edition report. Tentative. |
| `tengu_brick_follow` | `false` | k | kept | `:1502924` | Feature gate emitted into telemetry context; also a behavior gate (brick follow) *(2.1.197 desc.)* |
| `tengu_canary` | `{}` | k | kept | `:598674` | Canary config object (rollout canary / diagnostics payload) *(2.1.197 desc.)* |
| `tengu_cheerful_horizon` | `false` | k | NEW | `:935372` | d(): gate in an account-scoped store module (accountUuid schema). Behaviour not traced. |
| `tengu_cozy_dusk` | `Pe` | k | NEW | `:1470670` | OTel metrics export interval (ms), clamped [Pe, Lt]. |
| `tengu_elegant_meadow` | `true` | vr | NEW | `:393518` | Session-pinned recorder gate (env CLAUDE_CODE_ELEGANT_MEADOW). |
| `tengu_elegant_pancake` | `null` | k | NEW | `:597754` | et(): config passed to De(). Not traced. |
| `tengu_ember_latch` | `false` | k | kept | `:946770` | Gate OR'd with another condition (ember latch) in a coordinator/state path *(2.1.197 desc.)* |
| `tengu_fern_plover` | `{ off: !0 }` | k | NEW | `:1229668` | zod-parsed config, default {off:true}. |
| `tengu_glittery_fern` | `0` | k | NEW | `:1443853` | Q(): numeric config, default 0. |
| `tengu_radiant_heron` | `false` | k,vn | NEW | `:648840` | vn-read source switch. Not traced. |
| `tengu_scratch` | `false` | k | kept | `:228708` | Generic scratch/experimental gate (two call sites) *(2.1.197 desc.)* |
| `tengu_sedge_lantern_config` | `{ delayMs: bft }` | k | kept | `:1367304` | Config for the away-summary feature (default var eXq=180000ms) *(2.1.197 desc.)* |
| `tengu_vellum_siding` | `false` | k | kept | `:1502909` | Feature gate emitted into telemetry context (vellum siding) *(2.1.197 desc.)* |

### system-prompt (16; 10 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_sextant` | `true` | k | kept | `:491978` | Inject the 'operating autonomously' system-prompt section (don't ask permission mid-task) *(2.1.197 desc.)* |
| `tengu_cedar_lantern` | `true` | vr | kept | `:492100` | Arm the 'act, don't rederive' system-prompt variant *(2.1.197 desc.)* |
| `tengu_cinder_plover` | `""` | k | kept | `:734900` | Custom prompt override string for a specific tool/model path *(2.1.197 desc.)* |
| `tengu_cinder_wren` | `""` | k | NEW | `:734905` | Extra text appended to a tool description (trimmed); '' = none. |
| `tengu_heron_brook` | `""` | k | kept | `:491912` | Custom system-prompt notice string (Msf); also read from clientDataCache.tengu_heron_brook *(2.1.197 desc.)* |
| `tengu_hushed_lark` | `_An` | k | NEW | `:553417` | Silent-turn reminder interval in turns (env CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS). |
| `tengu_hushed_lark_text` | `kAn` | k | NEW | `:553393` | Silent-turn reminder text (env ..._TEXT). |
| `tengu_idempotent_wolf` | `true` | vr | NEW | `:491940` | Haiku 5.5 early-stopping guidance section. |
| `tengu_jaunty_plum` | `{}` | k | NEW | `:553782` | Per-model planning-guidance config map. |
| `tengu_proactivity_selector` | `true` | k | NEW | `:802951` | Proactivity selector (disabled by CLAUDE_CODE_DISABLE_PROACTIVITY). |
| `tengu_silent_harbor` | `false` | k | kept | `:492180` | System-prompt anti-verbosity arm — when on, adds ':send_user_msg' suffix steering replies to the dedicated user-message tool *(2.1.197 desc.)* |
| `tengu_slate_bittern` | `true` | k | NEW | `:492184` | Opus 5 reduced-delegation section. |
| `tengu_velvet_tide` | `false` | k | NEW | `:161296` | Simple system prompt. |
| `tengu_verified_vs_assumed` | `false` | k | kept | `:492018` | Inject 'be accurate about verified vs assumed' guidance into system prompt *(2.1.197 desc.)* |
| `tengu_virtual_pancake` | `false` | vr | NEW | `:454854` | Session-pinned IR(). |
| `tengu_wobbly_dahl` | `false` | vr | NEW | `:492038` | Session-pinned 'user pays per token' section. |

### file-tools (13; 9 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_ferry` | `false` | k | NEW | `:1473803` | J7r(): master gate for an 'ahead-of-files' early-read mode; off -> 'off', on -> 'on' (or 'on_with_pdfs' with tengu_slate_marten). |
| `tengu_dapper_brooks` | `false` | vn | NEW | `:1473898` | vn-read; byFileUuid message mapping in early-read flow. |
| `tengu_deep_starlight` | `true` | k | NEW | `:550859` | Whole-PDF read handling when over transport budget. |
| `tengu_edit_minimalanchor_jrn` | `false` | k | kept | `:575557` | Use the 'minimal anchor' variant of the Edit tool description (keep old_string 1-3 lines) *(2.1.197 desc.)* |
| `tengu_hawthorn_steeple` | `false` | k | kept | `:309722` | Gate for an early-return file/tool-results behavior (when off, returns early) *(2.1.197 desc.)* |
| `tengu_hazel_lantern` | `0` | k | NEW | `:1473906` | At(): numeric threshold for early reads; 0 = off. |
| `tengu_immutable_tide` | `0` | k | NEW | `:550620` | PDF size threshold for page counting. |
| `tengu_iterative_haven` | `false` | k | NEW | `:725462` | dtt(filePath): path-handling gate. |
| `tengu_misty_sunbeam` | `false` | k | NEW | `:550838` | Truncate PDF read to first pages instead of failing. |
| `tengu_send_user_file` | `true` | k | kept | `:1442881` | Enable the SendUserFile tool (remote/bridge sessions, firstParty) *(2.1.197 desc.)* |
| `tengu_slate_marten` | `false` | k | NEW | `:1473804` | Early reads include PDFs (with amber_ferry). |
| `tengu_tab_read_sep` | `false` | vr | kept | `:144584` | Tab/separator handling option for Read tool output *(2.1.197 desc.)* |
| `tengu_twinkling_hoare` | `false` | k | NEW | `:1473902` | Early reads stop. |

### plugins (13; 9 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_lattice` | `{}` | k | kept | `:536770` | Config {plugins:[...]} — allowlist of plugin names enabled via flag *(2.1.197 desc.)* |
| `tengu_amber_tollgate` | `false` | k | NEW | `:1692972` | hjt(): when OFF, an 'install-from-source' plugin update is marked as needing a hold/confirmation; ON lifts that. Tentative. |
| `tengu_keen_anchor` | `true` | k | NEW | `:545451` | Command spec lookup guard. |
| `tengu_official_plugin_prompt_overrides` | `{}` | k | NEW | `:1583182` | Prompt overrides for official marketplace plugins. |
| `tengu_plugin_binary_assets` | `false` | k | kept | `:564738` | Enable plugin binary-asset download/caching *(2.1.197 desc.)* |
| `tengu_plugin_command_source_refresh` | `true` | k | NEW | `:283100` | Refresh plugin command sources. |
| `tengu_plugin_input_refusal` | `true` | k | NEW | `:478257` | Refuse a $.prompt.submit text beginning with '/'. |
| `tengu_plugin_menu_close_reload` | `jh` | k | NEW | `:1691344` | Queue /reload-plugins when the menu closes. |
| `tengu_plugin_official_mkt_git_fallback` | `true` | k | kept | `:562249` | Allow git fallback when official marketplace GCS fetch fails *(2.1.197 desc.)* |
| `tengu_plugins_npm_marketplace` | `XQr` | k | NEW | `:566794` | Install plugins from npm (<package>@npm). |
| `tengu_skills_dashboard_enabled` | `false` | k | kept | `:1687671` | Enable the skills dashboard UI *(2.1.197 desc.)* |
| `tengu_steady_panda` | `TI` | k | NEW | `:1487191` | Plugin-origin message handling (default const TI=true). |
| `tengu_wobbly_pinwheel` | `true` | k | NEW | `:290002` | ZBn(): plugin disable message. |

### vscode-ide (12; 9 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_ide_rc_auto_enable` | `false` | k | NEW | `:1515414` | IDE Remote-Control auto-enable gate (reported in startup telemetry). |
| `tengu_lantern_sconce` | `false` | k | NEW | `:1361024` | Grace window passed to VS Code. |
| `tengu_lantern_sconce_copy` | `null` | k | NEW | `:1502911` | Copy config passed to VS Code. |
| `tengu_saffron_ferry` | `true` | k | NEW | `:1502921` | Passed to VS Code. |
| `tengu_staged_ladybug` | `true` | k | NEW | `:1502923` | Passed to VS Code. |
| `tengu_vscode_feedback_survey` | `false` | k | kept | `:1502774` | VS Code feedback survey experiment *(2.1.197 desc.)* |
| `tengu_vscode_inline_pastes` | `true` | k | NEW | `:1502920` | Passed to VS Code. |
| `tengu_vscode_onboarding` | `false` | k | kept | `:1502916` | VS Code onboarding experiment (now explicit boolean default) *(2.1.197 desc.)* |
| `tengu_vscode_python_beside_start` | `true` | k | NEW | `:1502919` | Passed to VS Code. |
| `tengu_vscode_resume_precheck` | `true` | k | NEW | `:1502917` | Passed to VS Code. |
| `tengu_vscode_review_upsell` | `false` | k | kept | `:1502908` | VS Code review upsell experiment (now explicit boolean default) *(2.1.197 desc.)* |
| `tengu_vscode_stored_startup_config` | `true` | k | NEW | `:1502918` | Passed to VS Code. |

### loops-kairos (12; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_kairos_brief` | `false` | MG,k | kept | `:368699` | Brief mode (plain assistant text hidden; only a dedicated reply tool reaches the user) *(2.1.197 desc.)* |
| `tengu_kairos_brief_config` | `n` | k | kept | `:1022522` | Brief-mode configuration object (default var mz9) *(2.1.197 desc.)* |
| `tengu_kairos_brief_stop_hook_text` | `""` | k | kept | `:368714` | Override text for the brief-mode stop-hook nudge *(2.1.197 desc.)* |
| `tengu_kairos_cron` | `true` | MG | kept | `:369682` | Cron-based scheduling (CronCreate/CronList, recurring routines) availability *(2.1.197 desc.)* |
| `tengu_kairos_cron_config` | `a6` | MG | kept | `:734100` | Timing config for cron scheduling (recurring fraction/caps, one-shot windows) *(2.1.197 desc.)* |
| `tengu_kairos_cron_durable` | `true` | MG | kept | `:369686` | Durable (persisted) cron jobs across sessions *(2.1.197 desc.)* |
| `tengu_kairos_input_needed_push` | `false` | k | kept | `:369434` | Push a notification when the loop/agent needs user input *(2.1.197 desc.)* |
| `tengu_kairos_loop_keepalive` | `true` | k | **default changed** | `:734177` | /loop keepalive re-scheduling. Default flipped false -> true; env CLAUDE_CODE_LOOP_KEEPALIVE overrides (G3o, :734174). |
| `tengu_kairos_loop_persistent` | `false` | k | kept | `:1454109` | Persistent /loop preamble variant (loop survives across turns) *(2.1.197 desc.)* |
| `tengu_kairos_push_notifications` | `false` | MG,k | kept | `:369430` | Enable agent PushNotification tool (terminal + mobile push when Remote Control connected) *(2.1.197 desc.)* |
| `tengu_kairos_ready_nudge` | `null` | k | NEW | `:814924` | Ready nudge config (probability, maxImpressions). |
| `tengu_pencil_farmer` | `false` | k | kept | `:1265356` | Schedule timing default — 'next' vs 'later' for follow-up turns *(2.1.197 desc.)* |

### sessions (10; 9 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_chomp_sable` | `false` | k | NEW | `:1490847` | BD(): return the 'not_user_started' reason only when on. |
| `tengu_gleaming_fair_reuse` | `false` | k | NEW | `:1300103` | Resume-return suggestion (with gleaming_fair). |
| `tengu_lucky_brooks` | `false` | k | NEW | `:744689` | Session title input cap. |
| `tengu_quartz_thimble` | `true` | k | NEW | `:1650938` | Publish session (not for eval interview sessions). |
| `tengu_quiet_elephant` | `true` | vr | NEW | `:1248865` | Session-pinned name generator gate (with profanity blocklist). |
| `tengu_rename_full_session_fork` | `false` | k | kept | `:950551` | Fork the full session when renaming (preferFork path) *(2.1.197 desc.)* |
| `tengu_session_name_uniqueness` | `true` | k | NEW | `:348878` | Unique session names. |
| `tengu_session_stable_address` | `false` | vr | NEW | `:103979` | Session-pinned stable address (via import.meta.require of the readable API). |
| `tengu_steady_plover` | `true` | k | NEW | `:462821` | Cut-reply nudge on interrupted turn. |
| `tengu_transcript_local_gc` | `false` | k | NEW | `:1474810` | Local transcript GC (env CLAUDE_CODE_TRANSCRIPT_LOCAL_GC). |

### messaging (10; 10 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_cuddly_willow` | `true` | k,vn | NEW | `:348693` | pie(): cross-session messaging available; returns false while flags unsettled and source=='fallback'. |
| `tengu_harbor_kite` | `true` | k | NEW | `:348689` | Peer messaging between sessions (env CLAUDE_CODE_HARBOR_KITE overrides). |
| `tengu_harbor_kite_cloud` | `false` | k | NEW | `:1042692` | Peer messaging to cloud sessions (firstParty only). |
| `tengu_harbor_kite_limits` | `J` | MG | NEW | `:347223` | MG-read limits object, refresh 300000 ms. |
| `tengu_harbor_kite_mode_emit` | `true` | k | NEW | `:1271282` | Emit fromMode in peer messages. |
| `tengu_harbor_kite_pacing_off` | `false` | k | NEW | `:347466` | Disable peer message pacing. |
| `tengu_harbor_kite_win` | `true` | k | NEW | `:348688` | Windows enablement for peer messaging. |
| `tengu_harmonic_cook` | `""` | k | NEW | `:586075` | Coordinator pending-message text override. |
| `tengu_humming_star` | `true` | k | NEW | `:1037598` | Relay rc_owner messages with attachments. |
| `tengu_tidy_fern` | `true` | k | NEW | `:347496` | FOr() peer info. |

### cowork-projects (10; 8 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_flint_harbor_prompt` | `{}` | k | kept | `:459208` | Config for the /team-onboarding command (prompt text, guide template, windowDays) *(2.1.197 desc.)* |
| `tengu_flint_harbor_share` | `false` | k | kept | `:458832` | Team onboarding share affordance gate *(2.1.197 desc.)* |
| `tengu_hearth_member_relay_rows_enabled` | `false` | k | NEW | `:345254` | Hearth member relay rows (env override). |
| `tengu_hearth_resolved_rows` | `"off"` | k | NEW | `:345248` | 'full'\|'model_only'\|'off'. |
| `tengu_parsed_willow` | `true` | vr | NEW | `:586067` | Session-pinned (env CLAUDE_CODE_PARSED_WILLOW). |
| `tengu_projects_compact_thread_rule_enabled` | `false` | k | NEW | `:345267` | 'compact' vs 'original' thread rule (env override). |
| `tengu_projects_thread_recap` | `false` | k | NEW | `:808576` | Thread recap. |
| `tengu_projects_thread_recap_prompt` | `""` | k | NEW | `:1380892` | Recap prompt override. |
| `tengu_sleepy_snowflake` | `"all"` | k | NEW | `:523281` | Scope 'threads'\|'all'\|'off'. |
| `tengu_squishy_newt` | `true` | vr | NEW | `:586071` | Session-pinned hearth relay (env CLAUDE_CODE_SQUISHY_NEWT). |

### streaming-network (9; 2 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_byte_stream_idle_timeout_ms` | `bm` | k | kept | `:182057` | Idle timeout (ms) for the byte stream; default is a computed value (firstParty vs default) *(2.1.197 desc.)* |
| `tengu_disable_streaming_to_non_streaming_fallback` | `false` | k | kept | `:530742` | Kill switch: disable the streaming -> non-streaming fallback *(2.1.197 desc.)* |
| `tengu_drift_lantern` | `false` | k | kept | `:803991` | Start the event-loop stall detector *(2.1.197 desc.)* |
| `tengu_fgts` | `false` | k | kept | `:446434` | Eager input streaming for firstParty requests *(2.1.197 desc.)* |
| `tengu_plum_vx3` | `false` | k | kept | `:739678` | Disables thinking tokens for WebSearch (carried over from 2.1.32) *(2.1.197 desc.)* |
| `tengu_serene_teapot` | `true` | k | NEW | `:1583963` | Ywn(): non-streaming timeout handling. |
| `tengu_stream_watchdog_default_on` | `true` | k | kept | `:182370` | Stream watchdog enabled by default *(2.1.197 desc.)* |
| `tengu_trace_lantern` | `false` | k | kept | `:286335` | Enable detailed beta tracing (with BETA_TRACING_ENDPOINT) *(2.1.197 desc.)* |
| `tengu_watchdog_skip_nonstreaming_fallback` | `false` | k | NEW | `:530742` | Watchdog timeout skips non-streaming fallback. |

### tips-promo (8; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_alder_compass` | `false` | k | kept | `:1541318` | Startup tip: '/powerup' interactive tutorial (new-user carousel item) *(2.1.197 desc.)* |
| `tengu_birch_kettle` | `false` | k | kept | `:1545582` | Startup tip carousel item gate *(2.1.197 desc.)* |
| `tengu_cedar_plume` | `false` | k | kept | `:1541679` | Startup tip: Claude Design ('mock 5 versions of your screen') promo *(2.1.197 desc.)* |
| `tengu_desktop_upsell` | `j` | KC | kept | `:1541087` | Desktop-app upsell config, read via KC (getDynamicConfig_CACHED_MAY_BE_STALE = k). Default var j. |
| `tengu_kestrel_arch` | `"off"` | k | kept | `:1541786` | Tip/promo arm; enabled when value == 'on' *(2.1.197 desc.)* |
| `tengu_maple_rung` | `false` | k | NEW | `:1541748` | Tip relevance gate. |
| `tengu_startup_announcements` | `i` | KC | kept | `:1224819` | Startup announcements config read via KC. Default var i. |
| `tengu_startup_notice` | `""` | k | kept | `:1368249` | Free-form startup notice text shown at launch *(2.1.197 desc.)* |

### kill-switch (8; 8 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_ccr_exclude_dynamic_restore_killswitch` | `false` | k | NEW | `:1505908` | Kill switch: skip restoring excludeDynamicSections on CCR resume. |
| `tengu_disable_live_host_context` | `false` | k | NEW | `:436237` | Kill switch: disable live host-context lines after tool calls. |
| `tengu_happy_ocean` | `false` | k | NEW | `:1840117` | Kill switch: move-to-cloud without permission mode. |
| `tengu_projects_other_thread_rows_killswitch` | `void 0` | vn | NEW | `:345276` | Uses source: payload/disk honoured. |
| `tengu_projects_thread_reply_lead_killswitch` | `false` | vr | NEW | `:345262` | Session-pinned kill switch for reply lead marker. |
| `tengu_ptc_enabled` | `true` | k | NEW | `:1513028` | Staged mcp_call kill switch (false disables). |
| `tengu_tools_exclusion_killswitch` | `false` | k | NEW | `:731144` | Tools exclusion kill switch. |
| `tengu_worker_owner_rows_killswitch` | `false` | k | NEW | `:345258` | Worker owner rows kill switch. |

### bash-safety (6; 6 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_amber_larch` | `true` | k | NEW | `:429237` | In _Be(): heredoc/pipeline-after-heredoc commands may be auto-allowed when sandboxing + auto-allow-if-sandboxed are on and this flag is on. |
| `tengu_fizzy_treasure` | `true` | k | NEW | `:229688` | Qbo(): bash-permission sub-gate. |
| `tengu_iridescent_boot` | `true` | vn | NEW | `:428433` | Prompt for `rm -r` on command-substitution targets; only a served false disables it. |
| `tengu_pale_kestrel` | `true` | k | NEW | `:428537` | Inline-shell rm prompt (disabled by CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT). |
| `tengu_quiet_larkspur` | `true` | k | NEW | `:427745` | Env-var prefix counting in bash permission. |
| `tengu_umber_plover` | `true` | k | NEW | `:427746` | Env var check in bash permission. |

### chrome (6; 6 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_chrome_install_upsell` | `false` | k | NEW | `:787207` | Show Claude-in-Chrome install upsell (many eligibility checks; dismissible). |
| `tengu_chrome_tab_group_close` | `true` | k | NEW | `:1560124` | Close the Chrome tab group at session end (disabled for remote sessions). |
| `tengu_cozy_eagle` | `true` | k | NEW | `:731480` | chromeHostToolAsksEnabled - Chrome host tool asks (false only if served false). |
| `tengu_fizzy_minsky` | `false` | k | NEW | `:1824951` | Chrome setup card answer for web/desktop entrypoints. |
| `tengu_hushed_lantern` | `true` | k | NEW | `:875738` | Chrome extension selection check over bridge. |
| `tengu_joyful_parasol` | `true` | k | NEW | `:967880` | Claude-in-Chrome default setting is consent-gated. |

### web-tools (6; 6 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_clever_orbit` | `false` | k | NEW | `:491147` | Yur(): WebFetch agent mode (env CLAUDE_CODE_WEB_FETCH_AGENT overrides). |
| `tengu_patient_finch` | `true` | k | NEW | `:490663` | Tell the model about earlier failures for a target URL. |
| `tengu_rosy_flute` | `true` | k | NEW | `:490619` | Shared URL state across tool calls (also CLAUDE_CODE_PROJECTS_SESSION). |
| `tengu_sleepy_shore` | `null` | vr | NEW | `:218542` | Session-pinned WebSearch fast arg config (env CLAUDE_CODE_WEB_SEARCH_FAST_ARG). |
| `tengu_velvet_cairn` | `true` | k | NEW | `:490635` | WebFetch cache note. |
| `tengu_webfetch_deadline_ms` | `$an` | k | NEW | `:489616` | WebFetch deadline (env CLAUDE_CODE_WEBFETCH_DEADLINE_MS). |

### review (6; 5 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_federated_flask` | `false` | vr | NEW | `:1453891` | Session-pinned; PR steward binding text. |
| `tengu_fleetview_pr_batch` | `true` | k | kept | `:849770` | Batch PR fleet-view operations (bughunter/ultrareview cloud review) *(2.1.197 desc.)* |
| `tengu_linear_brook` | `true` | k | NEW | `:460778` | Remote review startup failure handling. |
| `tengu_melodic_octopus` | `true` | k | NEW | `:480882` | Fetch refs/pull/N/head for PR checkout. |
| `tengu_pr_footer_surface_suffix` | `false` | k | NEW | `:445367` | Append ' via <surface>' to the 'Generated with Claude Code' PR footer. |
| `tengu_ultrareview_post_enabled` | `true` | k | NEW | `:333619` | Post ultrareview results. |

### mods (5; 5 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_agents_md_mod` | `N4r` | vr | NEW | `:1537781` | Session-pinned gate for the bundled 'cc-plugin-agents-md' mod (AGENTS.md support shipped as a built-in plugin). Default const N4r=true. |
| `tengu_fresh_heron` | `xJt` | k | NEW | `:478122` | Hooks-module plugin chain enabled (default const xJt=true). |
| `tengu_mermaid_mod` | `ae` | vr | NEW | `:1525294` | Mermaid diagrams mod (cc-plugin-mermaid), session-pinned; default const ae=false. |
| `tengu_quiet_ember` | `f()` | vr | NEW | `:1526799` | Responsive mode mod (cc-plugin-responsive-mode), session-pinned. |
| `tengu_tips_mod` | `T` | vr | NEW | `:1525014` | Spinner tips as a plugin, session-pinned; default const T=false. |

### workflows (5; 4 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_bubbly_harbor` | `true` | k | NEW | `:939911` | y6r(): workflow prompt provenance tagging (env CLAUDE_CODE_WORKFLOW_PROMPT_PROVENANCE overrides). |
| `tengu_linked_clover` | `true` | k | NEW | `:942291` | Killswitch check in workflow capMs. |
| `tengu_ochre_gantry` | `{}` | k | NEW | `:1304822` | Workflow size guideline warning (enabled:false disables). |
| `tengu_workflow_schema_lint_enforce` | `true` | k | NEW | `:942999` | Throw on unsatisfiable JSON schema in workflow agent(). |
| `tengu_workflows_enabled` | `true` | k | kept | `:162175` | Workflows availability; $xs() returns true (=disabled) when CLAUDE_CODE_WORKFLOWS===false or flag is false. |

### growthbook-infra (5; 5 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_gb_refresh_interval_minutes` | `null` | k | NEW | `:142926` | GrowthBook refresh cadence. null -> 360 min unflagged; else clamp [5,360] with +/-10% jitter; flagged=true triggers a retry if fetch count did not move. |
| `tengu_kestrel_moor` | `true` | k | NEW | `:142963` | r6s(): conversation ATIS latch. |
| `tengu_serene_teacup` | `true` | k | NEW | `:142951` | BW(): refresh ATIS pin after bootstrap. |
| `tengu_sleepy_rabbit` | `false` | k | NEW | `:804040` | GrowthBook kick on warm cache (also env CLAUDE_CODE_GROWTHBOOK_KICK_ON_WARM_CACHE). |
| `tengu_swift_whistle` | `false` | k | NEW | `:142322` | xW(): gate in module 152. |

### startup (4; 2 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_max_version_config` | `{}` | KC,Mj | kept | `:476280` | Max-version config; .external field read via KC. Default {}. |
| `tengu_noble_wozniak` | `true` | k | NEW | `:1118409` | When OFF, starts background housekeeping immediately at startup. |
| `tengu_quizzical_giraffe` | `false` | k | NEW | `:772820` | Prepare session gate. |
| `tengu_version_config` | `{ minVersion: "0.0.0" }` | Mj | kept | `:595606` | Minimum-version config read via Mj (getDynamicConfig_BLOCKS_ON_INIT, awaits init). Default {minVersion:"0.0.0"}. |

### goals (4; 4 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_pewter_avocet` | `true` | k | NEW | `:749177` | Goal check-in reminders (with saffron_wren minutes). |
| `tengu_propose_goal` | `false` | k | NEW | `:966192` | ProposeGoal tool / goal proposals from CLAUDE.md. |
| `tengu_quartz_pipit` | `true` | k | NEW | `:752901` | Stop handling for goals. |
| `tengu_saffron_wren` | `true` | k | NEW | `:749172` | Goal check-in interval (CLAUDE_CODE_GOAL_CHECKIN_MINUTES); off -> 0. |

### auth (4; 4 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_sharded_beacon` | `true` | k | NEW | `:181900` | Throw on lock_timeout after expiry. |
| `tengu_sharded_moonbeam` | `true` | k | NEW | `:183431` | jm(): allowed_warning handling. |
| `tengu_splendid_sutton` | `false` | k | NEW | `:177778` | firstParty only gate. |
| `tengu_streamed_thimble` | `true` | k | NEW | `:1302740` | Sibling login watch. |

### feedback (3; 2 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_feedback_survey_config` | `Rmn` | k | kept | `:1502778` | Feedback survey configuration (default var mg8) *(2.1.197 desc.)* |
| `tengu_juniper_relay` | `false` | k | NEW | `:736637` | SendFeedback tool (firstParty only; env CLAUDE_CODE_SEND_FEEDBACK). |
| `tengu_juniper_relay_config` | `{}` | KC | NEW | `:740429` | Limits: maxToolCallsPerSession, maxDraftPromptsPerSession. |

### sdk-print (3; 3 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_giggly_dragonfly` | `true` | k | NEW | `:1488339` | -p mode: stop when input closed and no budget limit. |
| `tengu_jazzy_puddle` | `true` | k | NEW | `:1503120` | Print text results at turn end. |
| `tengu_print_ceiling_stop_agents` | `true` | k | NEW | `:1488358` | -p: stop background agents after the wait ceiling (CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS). |

### channels (3; 0 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_harbor` | `!1` / `n/a` | k,rb | kept | `:775498` | Enable Channels feature (isChannelsEnabled) *(2.1.197 desc.)* |
| `tengu_harbor_ledger` | `[]` | k | kept | `:775492` | Channel allowlist (array of {name, marketplace} entries, zod-validated) *(2.1.197 desc.)* |
| `tengu_quiet_harbor` | `false` | k | kept | `:368802` | When true, daemon install prompt defaults to 'ask' (else 'transient') *(2.1.197 desc.)* |

### sandbox (3; 3 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_hazy_cosmos` | `true` | k | NEW | `:439876` | Linux: reject macOS-style paths (/Users, /Volumes). |
| `tengu_nankeen_kestrel` | `false` | k | NEW | `:271482` | Windows sandbox (ClaudeCodeSandbox) (env CLAUDE_CODE_NANKEEN_KESTREL). |
| `tengu_zesty_pearl` | `false` | k | NEW | `:229790` | WSL second root mount. |

### teleport (3; 3 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_on_branch_default_guard_observe` | n/a | rb | NEW | `:474334` | rb-gate: reuse-outcome-branch collision guard in 'observe' vs 'enforce' (env CCR_ON_BRANCH_DEFAULT_GUARD overrides). |
| `tengu_teleport_github_access_precheck` | `true` | k | NEW | `:1840225` | GitHub access precheck for teleport. |
| `tengu_teleport_send_to_cloud` | `false` | k | NEW | `:1676998` | Send-to-cloud UI. |

### policy (3; 3 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_rustling_orbit` | `false` | k | NEW | `:367459` | When OFF: policy-limits 404/304 with no cache -> no restrictions for the session (not persisted). ON suppresses that branch. |
| `tengu_shimmying_stardust` | `false` | k | NEW | `:366427` | Policy limits skipRetry. |
| `tengu_zippy_gosling` | `0` | k | NEW | `:365753` | Nt(): numeric. |

### plan (3; 0 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_ultraplan_config` | `null` | k | kept | `:475100` | Ultraplan (cloud plan phase) config; .enabled must be true (and not remote) *(2.1.197 desc.)* |
| `tengu_ultraplan_prompt_identifier` | `k7t` | k | kept | `:475115` | Prompt identifier used for ultraplan (default var zK9='simple_plan') *(2.1.197 desc.)* |
| `tengu_ultraplan_timeout_seconds` | `5400` | k | kept | `:475172` | Ultraplan cloud timeout in seconds (default 90 min; multiplied to ms) *(2.1.197 desc.)* |

### onboarding (2; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_birch_lantern` | `"off"` | k | kept | `:1224383` | Powerup onboarding arm (off/banner/step) *(2.1.197 desc.)* |
| `tengu_magical_pixel` | `false` | k | NEW | `:1541206` | macOS iOS-app dev intent tip. |

### skills (2; 2 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_gorse_fathom` | `false` | k | NEW | `:224151` | Inject 'Project skill upkeep' section. |
| `tengu_humble_emerson` | `true` | k | NEW | `:552784` | Skill mentions attachment for human-typed prompts. |

### sdk-host (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_dapper_platypus` | `false` | k | NEW | `:1509243` | sdkHostConfigs: SDK host config value. Behaviour not traced. |

### compliance (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_hipaa_history_retention_prune` | `true` | k | NEW | `:821195` | HIPAA orgs: prune history per retention. |

### cli (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_import` | `false` | k | NEW | `:458186` | `claude import` subcommand availability. |

### lsp (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_moonlit_panda` | `false` | vn | NEW | `:575337` | Remote session LSP manager enable. |

### hooks (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_silly_waterfall` | `false` | k | NEW | `:462397` | Drop empty SessionStart hook attachments. |

### worktrees (1; 1 new)

| Flag | Default | Acc | Status | Line | What it gates |
|---|---|---|---|---|---|
| `tengu_squishy_spring` | `true` | k | NEW | `:480435` | Copy settings.local.json to worktree. |

---

## Counting

- **Method:** split `cli.beauty.js` on the `//// ===== MODULE` separators. In each module, collect local names bound to the accessors by `import {…} from "/$bunfs/root/chunk-7rwjz6p0.js"` (or module 907 `chunk-e1ck0rsm.js`, mapping readable names back), by destructured `await import(…)` or by `import.meta.require(…)`. Module 152 itself binds them locally. Then match `name("tengu_…"` calls, including `...k(` spreads and excluding `.k(` member calls. Result: **799 call sites, 704 distinct names**, identical to `_facts.md`.
- **2.1.197** (single CJS bundle), same accessor family `it`/`J7`/`QYr`/`$U`/`ik`/`Q7`/`sRn`: **317 call sites, 251 distinct**, identical to the `_facts.md` recount.
- **Defaults:** taken from the literal second argument at each call site. A flag read with different defaults at different sites gets a list in the YAML. `rb` gates take no default.
- **Categories** were assigned by this analysis. **Families** are mechanical (first name token).

### Summary

- **704 flags** (251 in 2.1.197): **519 NEW**, **58 removed**, **8 rerouted**, **185 kept** (10 with changed defaults, plus `tengu_lapis_anchor`, which is rerouted *and* flipped).
- The resolver is a **class with provenance**: `override` (stubbed in this build), `disabled`, `payload`, `fallback`, `disk`. `f5()` treats disk as never authoritative. `vr()` pins values per session. A 16-name `_r` set is never persisted and never read from disk.
- **Default-on is now the norm**: 232 literal-`true` defaults (2.1.197: 30). The flips that matter for users are auto mode by default (`harbor_willow`, `moss_anchor`, `maple_pier`), the total-tokens reminder (`lapis_anchor`), artifacts for prosumer/no-auth (`cobalt_plinth`) and the advisor tool on the AWS/GCP Anthropic planes (`sage_compass2`).
- **Gone**: the remote bypass-permissions kill switch (`tengu_disable_bypass_permissions_mode`).
