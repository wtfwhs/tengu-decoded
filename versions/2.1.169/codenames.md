# Internal Codenames

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Platform**: linux-x86_64
>
> Reference: [2.1.32 codenames](../2.1.32/codenames.md) · [Glossary](../../docs/glossary.md)

This build has **218 feature flags** (was ~48 in 2.1.32). The vast majority are
`tengu_<adjective>_<noun>` names. Most are **auto-generated, semantically meaningless**
labels drawn from a fixed word-pool — but a handful of nouns/prefixes **recur across
multiple flags tied to a single feature**, and those are the real codenames.

---

## How to tell a real codename from random noise

`cli.beauty.js:140670` (function `TiH`) defines the word-pool Claude Code uses to mint
friendly random identifiers (session names, agent names, etc.):

```js
DeK = ["abundant","ancient","bright", ... "velvet","vivid","warm", ...]   // adjectives
JeK = ["aurora","blossom","brook", ... "coral","grove","harbor","marble", ...
        ... "falcon","finch","owl","wren", ... "lantern","prism","quill", ...]  // nouns
Bh_ = ["baking","beaming", ... "zooming"]                                  // gerunds
```

Critically, **`coral`, `grove`, `harbor`, `marble`, `falcon`, `owl`, `prism`, `lantern`,
`finch`, `wren` are all in this random pool.** A name appearing once in a flag means
nothing. The test applied below is: **does the same noun/prefix recur across multiple
flags AND resolve, at its call sites, to one coherent feature?** Only then is it a codename.

**Naming has shifted vs 2.1.32.** In 2.1.32 the codename was the *first* token after
`tengu_` (`tengu_marble_lantern`). In 2.1.169 the meaningful token is frequently the
*noun*, with a random adjective in front (`flint_harbor`, `slate_harbor`, `quiet_harbor`
all gate the **harbor** = channels subsystem). So `harbor`, not `flint`/`slate`/`quiet`,
is the codename. Adjective prefixes (`amber_`, `slate_`, `cedar_`, `pewter_`, `velvet_`)
are mostly minted per-flag and carry no fixed meaning **except** where noted (`amber`).

---

## Confirmed meaningful codenames

| Codename | Domain / Feature | Evidence (flags / files / call sites) |
|----------|------------------|----------------------------------------|
| **tengu** | Claude Code (the product) | All flags/events prefixed `tengu_`. Unchanged. |
| **kairos** | Loops / scheduling / brief mode / push notifications / cron | `tengu_kairos_brief`, `_brief_config`, `_brief_stop_hook_text`, `_loop_persistent`, `_loop_prompt`, `_loop_dynamic`, `_loop_keepalive`, `_push_notifications`, `_input_needed_push`, `_cron`, `_cron_durable`, `_cron_config`. State field `kairosActive`/`kairosEnabled` (`cli.beauty.js:3085`, `640532`); env `CLAUDE_CODE_BRIEF`, `CLAUDE_CODE_PROACTIVE`, `CLAUDE_CODE_DISABLE_CRON`. The `/loop` + `/schedule` subsystem. **NEW.** |
| **harbor** | Channels / cowork / teams sharing | `tengu_harbor` → `isChannelsEnabled()` (`cli.beauty.js:363246`); `tengu_harbor_ledger` → channel allowlist (`getChannelAllowlist`, `363241`); `tengu_harbor_permissions`, `tengu_harbor_prism`, `tengu_harbor_willow` (auto-mode gate), `tengu_quiet_harbor`, `tengu_slate_harbor`, `tengu_slate_harbor_experiment` (new-init), `tengu_flint_harbor_share` / `_prompt` (cowork share). Channels gated to `firstParty` only. **NEW.** |
| **bridge** | Remote control / remote-bridge REPL (CSE shim) | `tengu_bridge_repl_v2_cse_shim_enabled`, `_repl_v2_config`, `tengu_bridge_attestation_enforce(_config)`, `tengu_bridge_system_init`, `tengu_bridge_requires_action_details`, `tengu_bridge_vivid`, `tengu_bridge_min_version`. Logs tagged `[remote-bridge]`, events `bridge_repl_v2_session_created/_reattached/_transport_connected` (`cli.beauty.js:574210+`), JWT refresh per remote session. Drives `claude.ai/code` remote sessions. **NEW.** |
| **ccr** | (related to bridge) remote "ccr" channel/transport gate | `tengu_ccr_bridge` (`368643`, `368662`), `tengu_ccr_v2_send_events_cli`, `tengu_ccr_bundle_max_bytes`, event `tengu_ccr_unsupported_default_mode_ignored`. Gates the ccr remote-control path; shown in GrowthBook diagnostics output. **NEW.** |
| **amber** | Agent teams / coordinator + billing-downsell (mixed) | `tengu_amber_flint` (default `!0`) gates **agent teams** with env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` / `--agent-teams` (`cli.beauty.js:273739`); `tengu_amber_sextant` (default `!0`) gates the autonomy-append prompt; `tengu_amber_lattice` → plugin allowlist; `tengu_amber_creek` → **downsell gate** (`downsellGateCached`, `"downsell_on"`, `147287`); `tengu_amber_wren`, `_anchor`, `_relay`, `_lark`, `_lynx`, `_prism`, `_rokovoko`, `_redwood2/3`, `_sentinel`, `idle_amber_finch`. `amber` is **partly a real cluster (teams/autonomy)** but its adjective is also reused for unrelated flags — treat `amber_flint`/`amber_sextant` as meaningful, the rest as opportunistic. **NEW.** |
| **marble** | Model access / capabilities | `tengu_marble_lark` (`270163`). Survives from 2.1.32 (was `marble_lantern`/`marble_kite`/`marble_anvil`) but **heavily shrunk** — only `marble_lark` remains. **CONFIRMED, diminished.** |
| **copper** | Subscription / upsell — now also fork & job-mode | `tengu_copper_lantern` (extra-usage upsell event, `140842`/`660633`), `tengu_copper_thistle` (toggles "job" vs "task" terminology + team UI, `391154`/`587229`), `tengu_copper_fox` (fork-subagent gate, `210925`). **CONFIRMED, expanded** beyond pure upsell into job/fork UX. |
| **coral** | Session / prompt + billing upgrade UI | `tengu_coral_beacon` (`386201`, `528135` — appears in the upgrade-paths / hasExtraUsageEnabled billing component). Survives from 2.1.32 (`coral_fern`). **CONFIRMED.** |
| **grove** | Policy & privacy system | API `POST /api/oauth/account/grove_notice_viewed`, `grove_enabled`, `groveConfigCache`, `Grove: Cache stale...` logs (`cli.beauty.js:289070-289103`). **CONFIRMED, unchanged.** |
| **sage_compass** | Advisor tool | `tengu_sage_compass2` (`{}` default, `.enabled`) gates the server-side **advisor** tool: `server_tool_use name=="advisor"`, env `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` / `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` (`cli.beauty.js:287315-287323`). `firstParty` only. **NEW.** |
| **rotunda** (`rotunda_pennant`) | Server-side fallback credit-header stripping/retry | Events `tengu_rotunda_pennant_applied/_malformed/_strip/_credit_echoed/_tools/_esc/_replay`. On HTTP 400 with `` `fallback-credit-` `` / `` `server-side-fallback-` `` messages, strips the credit beta-header and retries (`cli.beauty.js:560527-560544`). **NEW.** |
| **convolute_arcades** | Request-retry mechanism | `clientDataCache.convolute_arcades === true` gate (`102098`), events `tengu_convolute_arcades_retry` / `_retry_outcome` (`429596+`). A retry/backoff path. **NEW.** |
| **orchid_mantis** | `/schedule` proactive-offer prompt | `tengu_orchid_mantis` and `tengu_orchid_mantis_v2` inject the system-prompt text that lets Claude offer to `/schedule` a follow-up agent (`cli.beauty.js:558456`, `615034`). v2 is the stricter "named-artifact-only" variant. Feeds event `tengu_schedule_offer_shown`. **NEW.** Closely tied to **kairos**. |
| **sparrow_ledger** | "Verify vs assume" prompt arm | `tengu_sparrow_ledger` (with env `CLAUDE_CODE_VERIFY_PROMPT`) arms the reproduce/verify system-prompt section `Nsf()` (`cli.beauty.js:558489`). Related flag `tengu_verified_vs_assumed` adds the "be accurate about what you verified vs assumed" line (`558406`). **NEW.** |
| **walnut_prism** | "Ownership frame" prompt arm | `tengu_walnut_prism` (env `CLAUDE_CODE_OWNERSHIP_FRAME`) arms an ownership-framing prompt section (`cli.beauty.js:558739`). **NEW.** |
| **heron_brook** | Remote-injectable extra system-prompt section | `tengu_heron_brook` (string default `""`) + `clientDataCache.tengu_heron_brook`; `Msf()` returns its trimmed text as a prompt section named `"heron_brook"` (`cli.beauty.js:558352`, in `iT` composer). A server-controlled prompt-injection slot. **NEW.** |
| **pewter_owl** | Unreleased-model preview gating (header/tool/brief) | `tengu_pewter_owl_model` + `clientDataCache.pewter_owl_model`; helpers `isPewterOwlHeader/Tool/Brief` (`cli.beauty.js:130066-130098`); env `CLAUDE_CODE_PEWTER_OWL`, `CLAUDE_CODE_PEWTER_OWL_TOOL`. Enables features only when the active model matches the configured preview model. **NEW.** |
| **velvet_falcon** | Unreleased-model preview gating | `tengu_velvet_falcon_model` + `clientDataCache.velvet_falcon_model`; helper `r0K` matches active model, env `CLAUDE_CODE_VELVET_FALCON` (`cli.beauty.js:101949-101959`). Parallel mechanism to pewter_owl. **NEW.** |

### Model codenames (non-flag)

| Codename | What it is | Evidence |
|----------|-----------|----------|
| **mythos** | Preview model `claude-mythos-preview` | Listed in SDK adaptive-thinking deprecation arrays `Oa9`/`Ga9 = ["claude-mythos-preview","claude-opus-4-6"]` (`cli.beauty.js:7551`, `8750`); appears in `models.txt`. Also in preview-name list `fV_`. |
| **fruitcake**, **macaroon** | Internal model preview codenames | `fV_ = ["fruitcake","macaroon","mythos"]` (`cli.beauty.js:130172`); `bnH(model)` returns true if a model name contains any of them — a "is-this-a-preview-model" check. Not exposed as real model IDs in this build. |
| **pewter_owl_model / velvet_falcon_model** | Placeholders for whichever model id is being soft-launched | See flag rows above. Empty string by default; populated remotely. |

---

## Auto-generated `adjective_noun` flag names (no semantic meaning)

These match the random word-pool and appear in **one** flag each with **no** recurring
feature cluster. They are obfuscated/throwaway labels, not codenames. (Representative,
not exhaustive — see [`data/feature-flags.yaml`](data/feature-flags.yaml) for full list.)

`alder_compass`, `basalt_meadow/_scarp/_spur`, `billiard_aviary`, `birch_kettle`,
`bramble_lintel`, `brick_follow`, `cedar_inlet/_lantern/_marsh/_plume`, `chair_sermon`,
`chert_bezel`, `chomp_inflection`, `cinder_plover`, `cobalt_lantern/_ridge/_thicket/_wren`,
`compass_dial`, `crimson_vector`, `drift_lantern`, `dune_wren`, `ember_latch`,
`garnet_finch`, `gleaming_fair`, `gouda_loop`, `gypsum_kite`, `hawthorn_steeple`,
`hazel_osprey`, `herring_clock`, `jade_anvil_4`, `kestrel_arch`, `loggia_carousel`,
`maple_pier/_sundial`, `marlin_porch`, `mint_lanes`, `mocha_barista`, `moss_anchor`,
`moth_copse`, `ochre_finch/_hollow`, `onyx_plover`, `paper_halyard`, `passport_quail`,
`pewter_brook/_lark`, `plum_vx3`, `quartz_heron`, `sedge_lantern`, `sepia_cormorant/_moth`,
`shale_finch`, `shining_fractals`, `silk_hinge`, `slate_finch/_prism/_quill/_thimble/_harrier`,
`surreal_dali`, `trace_lantern`, `turtle_carbon`, `tussock_oriole`, `umber_petrel`,
`vellum_siding`, `velvet_cascade/_hammer/_ibis/_mallet/_static`.

**Note:** a few of these *might* be early codenames that simply haven't accreted a second
flag yet (e.g. `kestrel_arch` is a tri-state `"off"/"on"` with a dedicated gate). Marked
non-meaningful only because they currently fail the "recurs-across-flags" test.

---

## Status of the five 2.1.32 codenames

| 2.1.32 codename | 2.1.32 domain | 2.1.169 status |
|-----------------|---------------|----------------|
| **tengu** | Claude Code product | **Holds.** Universal prefix. |
| **marble** | Model access/capabilities | **Holds but shrunk** — only `marble_lark` survives (was 3+ flags). |
| **copper** | Subscription/upsell | **Holds, expanded** — still upsell (`copper_lantern`) plus job-mode (`copper_thistle`) and fork (`copper_fox`). |
| **coral** | Session/prompt features | **Holds** — `coral_beacon`, now also surfacing in billing-upgrade UI. |
| **grove** | Policy/privacy | **Holds, unchanged** — same OAuth `grove_notice` / `grove_enabled` API. |

All five original codenames are still live.

---

## What's new vs 2.1.32

Whole new codename subsystems, all reflecting features added since 2.1.32:

- **kairos** — the `/loop` + `/schedule` + brief-mode + push + cron scheduling subsystem.
- **harbor** — channels / cowork / team-sharing (gated to first-party).
- **bridge** + **ccr** — remote control: `claude.ai/code` remote-bridge REPL v2, attestation, CSE shim.
- **amber** (`amber_flint`/`amber_sextant`) — agent teams / coordinator + autonomy prompting (+ `amber_creek` downsell).
- **sage_compass** — the server-side **advisor** tool.
- **rotunda** (`rotunda_pennant`) — server-side fallback **credit**-header stripping/retry.
- **convolute_arcades** — a request-retry path.
- **orchid_mantis** — the proactive `/schedule`-offer prompt (ties into kairos).
- **sparrow_ledger** / **verified_vs_assumed** — "verify vs assume" reporting discipline prompt.
- **walnut_prism** — "ownership frame" prompt.
- **heron_brook** — a remote-injectable free-text system-prompt slot.
- **pewter_owl** / **velvet_falcon** — twin unreleased-model preview gating mechanisms.
- Model codenames **mythos** (`claude-mythos-preview`), **fruitcake**, **macaroon**.

Naming convention also shifted: the meaningful token migrated from the *first* sub-token
to the *noun*, with random adjective prefixes minted per-flag from the `DeK`/`JeK` pool.

---

## Uncertainties

- **`amber`** is the muddiest: `amber_flint`/`amber_sextant` clearly = teams/autonomy, but
  the adjective is reused on ~12 unrelated flags (downsell, plugins, idle, relay). I treat
  it as a *partial* codename, not a clean one-feature mapping.
- **`copper`** has drifted from pure "upsell" to also cover job-mode terminology and forks;
  the unifying theme may now be "monetization + paid-feature surfaces" rather than upsell alone.
- **`fruitcake`/`macaroon`** are confirmed preview-model codenames in `fV_`, but no
  corresponding `claude-fruitcake-*`/`claude-macaroon-*` model id appears elsewhere in this
  build — they may be future/internal names not yet wired to a public id.
- **`ccr`** vs **`bridge`**: closely coupled (ccr_bridge); ccr may be the transport/protocol
  layer under the broader bridge remote-control feature rather than a separate product.
- Several single-flag `adjective_noun` names with dedicated gates (e.g. `kestrel_arch`,
  `compass_dial`) could be nascent codenames; classified as non-meaningful pending a second flag.
</content>
</invoke>
