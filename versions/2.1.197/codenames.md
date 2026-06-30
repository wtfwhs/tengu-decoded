# Internal Codenames

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Platform**: linux-x86_64
>
> Reference: [2.1.169 codenames](../2.1.169/codenames.md) · [2.1.32 codenames](../2.1.32/codenames.md) · [Glossary](../../docs/glossary.md)

This build has **243 feature flags** (was 218 in 2.1.169, ~48 in 2.1.32) — see [`_facts.md`](bundle/_facts.md). The
vast majority are `tengu_<adjective>_<noun>` names drawn from a fixed word-pool and are
**auto-generated, semantically meaningless** labels. As in 2.1.169, the real codenames are the
handful of nouns/prefixes that **recur across multiple flags and resolve to one coherent feature**.

The flag accessor renamed again this build: `it(name, default)` is the primary getter
(`cli.beauty.js:145150`, was `j$` in 2.1.169), with wrappers `J7`/`QYr`/`$U`. Every flag name is a
`tengu_`-prefixed string literal passed as the first arg.

---

## How to tell a real codename from random noise

`cli.beauty.js:102667` defines the word-pool Claude Code uses to mint friendly random identifiers
(session/agent names). It is a single statement assigning three arrays:

```js
ali = require("crypto"),
lli = ["abundant","ancient","bright", ... "velvet","vivid","warm", ... "quiet","slate"?... ]  // adjectives (~270)
cli = ["aurora","avalanche","blossom","brook", ... "coral", ... "grove","harbor","horizon", ...
        ... "willow","wind", ... "falcon","finch","owl","wren","moth","heron"?, ...
        ... "anchor","beacon","lantern","marble","prism","quill","creek","lattice"?, ... ]   // nouns (~400)
byd = ["baking","beaming", ... "zooming"]                                                    // gerunds
```

Critically, **`coral`, `grove`, `harbor`, `willow`, `marble`, `falcon`, `finch`, `owl`, `wren`,
`moth`, `prism`, `lantern`, `anchor`, `beacon`, `creek`, `lark`, `lynx`, `quill` are all in the
random `cli` noun pool.** A name appearing in **one** flag means nothing. The test, identical to
2.1.169, is: **does the same noun/prefix recur across multiple flags AND resolve at its call sites to
one coherent feature?** Only then is it a codename.

As in 2.1.169 the meaningful token is frequently the **noun** with a random adjective in front
(`flint_harbor`, `slate_harbor`, `quiet_harbor`, `silent_harbor`, `cobalt_harbor` all involve the
**harbor** family). But beware: in this build the `_harbor` suffix has become **partly opportunistic**
— `silent_harbor` gates a tool-JSON prompt section, `quiet_harbor` gates a notification mode — so
even the noun test needs the call-site check. Adjective prefixes (`amber_`, `cobalt_`, `slate_`,
`saffron_`, `cedar_`) are mostly minted per-flag and carry fixed meaning **only** where a cluster
forms (`amber`, `cobalt_plinth`, `saffron`, `lapis`, noted below).

---

## Confirmed meaningful codenames

| Codename | Domain / Feature | Evidence (flags / files / call sites) |
|----------|------------------|----------------------------------------|
| **tengu** | Claude Code (the product) | Universal prefix on all 243 flags + 1163 telemetry events. Unchanged. |
| **kairos** | Loops / scheduling / brief mode / push / **cron** | `tengu_kairos_brief(_config/_stop_hook_text)`, `_loop_persistent/_prompt/_dynamic/_keepalive`, `_push_notifications`, `_input_needed_push`, plus `_cron`, `_cron_config`, `_cron_durable`. `tengu_kairos_cron` gated with `!CLAUDE_CODE_DISABLE_CRON`, default `!0` (`cli.beauty.js:224838`); `_cron_config` (`:223861`), `_cron_durable` default `!0` (`:224842`). The `/loop` + `/schedule` subsystem. **`kairos_cron*` carried from 2.1.169 unchanged** (the same three flags exist there at `:209509/210390/210394` — NOT new this build). |
| **harbor** | Channels / cowork / teams sharing | Core gate `tengu_harbor` → `isChannelsEnabled()` (`cli.beauty.js:408347`, exported `:408335`); `tengu_harbor_ledger` → channel allowlist `getChannelAllowlist` (`:408337/408341`); `tengu_harbor_permissions` (`:408511`), `tengu_harbor_prism` (`:296779`), `tengu_harbor_willow` (auto-mode gate, `:147140`), **NEW** `tengu_harbor_moth` (`:292198`). Plus adjective-prefixed satellites `tengu_slate_harbor(_experiment)`, `tengu_quiet_harbor`, `tengu_flint_harbor_share/_prompt`, **NEW** `tengu_cobalt_harbor(_notice)` (`:605504`/`:529669`), `tengu_silent_harbor`. `$U("tengu_harbor")` awaited at `:698266`. |
| **bridge** + **ccr** | Remote control / remote-bridge REPL (claude.ai/code) | `tengu_bridge_repl_v2_cse_shim_enabled`, `tengu_bridge_attestation_enforce(_config)`, `tengu_bridge_system_init`, `tengu_bridge_requires_action_details`, `tengu_bridge_vivid`, **NEW** `tengu_bridge_poll_interval_config`. Coupled transport gate `tengu_ccr_bridge` (`:605213/605240/605268`, async `$U`), `tengu_ccr_v2_send_events_cli`, `tengu_ccr_bundle_max_bytes`, **NEW** `tengu_ccr_bundle_seed_enabled`, `tengu_ccr_delta_rehydrate`. Shown in GrowthBook diagnostics (`:605296`). Logs `[remote-bridge]`. |
| **baku** | Remote entrypoint variant ("baku" surface) | `remote_baku` is a `CLAUDE_CODE_ENTRYPOINT` value mapped to the `claude_code_remote` analytics surface (`Lx()`, `cli.beauty.js:214`), member of the remote entrypoint sets (`xMu`/`RMu`, `:46799/46801`). When `CLAUDE_CODE_ENTRYPOINT === "remote_baku"` MCP startup only loads `alwaysLoad`/allowlisted servers (`uZo`, `:710911`). Present in 2.1.169 too (not new). |
| **mantle** | Provider plane — Anthropic **Bedrock-Mantle** API | `yr()` provider selector returns `"mantle"` when `CLAUDE_CODE_USE_MANTLE` is set (`cli.beauty.js:94638`); secondary-provider `aMt()` returns `"mantle"` when bedrock+mantle (`:94649`). `AnthropicBedrockMantle`/`MantleClient`/`BedrockMantleBackend`, env `ANTHROPIC_BEDROCK_MANTLE_BASE_URL`, `CLAUDE_CODE_SKIP_MANTLE_AUTH`, model-id map key `mantle:"anthropic.claude-fable-5"` (`:94333`), flag `tengu_mantle_probe_result`. A gateway/proxy plane to Bedrock-hosted Anthropic models. |
| **amber** | Agent teams / coordinator + autonomy + downsell (mixed) | `tengu_amber_flint` (default `!0`) gates **agent teams** with env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` / `--agent-teams` (`cli.beauty.js:292360`); `tengu_amber_sextant` (default `!0`) arms the **autonomy_append** prompt section `Oam()` ("You are operating autonomously…", `:593578`); `tengu_amber_lattice` → plugin allowlist (`:590452`); `tengu_amber_creek` → **downsell gate** (`downsellGateCached`, `"downsell_on"`, `:152853/152884`); plus `_anchor`, `_relay`, `_lark`, `_lynx`, `_prism`, `_rokovoko`, `_redwood2/3`, `_sentinel`, `_wren`, `idle_amber_finch`, and **NEW** `tengu_amber_heron` (background-defer gate, `:420970`), `tengu_amber_quill` (`:351892`). `amber_flint`/`amber_sextant` are the meaningful core; the adjective is reused opportunistically for the rest. |
| **cobalt_plinth** | **Artifacts** subsystem (viewer / upload) | `tengu_cobalt_plinth` master gate (`cli.beauty.js:224993`); satellites `_fern` (frame base version, `vXn`, `:405997`), `_reader_persist` (`xhf`, `:406005`), `_putguard` (default `!0`, `Myl`, `:406009`), `_direct` (direct upload, `:406097`). Module exports `artifactViewerUrl`, `MAX_ARTIFACT_BYTES`, `goCpHeaders` ("go cobalt plinth", `:405990+`). Gated by tier (team/enterprise/pro/max, `Hla` `:225031`), policy `allow_cobalt_plinth` (hipaa+zdr restricted, `:145932`), env `CLAUDE_CODE_DISABLE_ARTIFACT` / `CLAUDE_CODE_ARTIFACT_DIRECT_UPLOAD`. **NEW.** Ties to the `/v1/design` + `/api/frame/deploy` endpoints. |
| **saffron** | Billing — credits / overage / plan-limits | `tengu_saffron_lattice` → overage/plan-limit config (`overageConsentRequired`, `planLimitsEndDate`, `Qpp`/`Sde`, `cli.beauty.js:230934`); `tengu_saffron_credits_only_tiers` → which tiers are credits-only (`tfp`/`Ede`, `:230980`); `tengu_saffron_picker_dim` → dims the model picker (`Rua`, `:231006`); `tengu_saffron_anchor` → frame/artifact billing toggle (`lKt`, `:406001`). Feeds `cachedExtraUsageDisabledReason`. **NEW** billing cluster — the successor/sibling to `copper`/`coral` upsell. |
| **lapis** (`lapis_anchor`) | **Token-budget reminder** UI | `tengu_lapis_anchor` (string default `"off"`, modes `off`/`infinite`/`fixed`/`countdown`/`padded-countdown`) and `tengu_lapis_anchor_budget` (numeric) drive the "total tokens remaining" reminder, overridden by env `CLAUDE_CODE_TOTAL_TOKENS_REMINDER(_BUDGET)` and settings `totalTokensReminder(Budget)` (`cli.beauty.js:454935–454955`). **NEW.** |
| **shoji_engine** | Response **wire-protocol validator** | `tengu_shoji_engine` flag; the stream walker emits telemetry `It("shoji_engine","wire_violation",{frame_type, violation_kind})` when an SSE frame fails validation (`cli.beauty.js:619214/619219/619499`) and `ke("shoji_engine")` on close (`:619422`). A new streaming-frame integrity engine. **NEW.** |
| **cobalt_heron** | Pro→Max usage-limit upsell nudge | `tengu_cobalt_heron` gate fires a nudge `when: subscriptionType==="pro" && model includes "opus" && pctLimitUsed > 0.5` (`cli.beauty.js:351092`). **NEW.** Distinct feature from `cobalt_plinth` — `cobalt` is an opportunistic adjective here, not a unifying codename. |
| **sage_compass** | Server-side **advisor** tool | `tengu_sage_compass2` (`{}` default, `.enabled`) gates `server_tool_use name=="advisor"`, env `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` / `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`. Carried over from 2.1.169. |
| **grove** | Policy & privacy system | API `POST /api/oauth/account/grove_notice_viewed` (`cli.beauty.js:300177`), `grove_enabled` (`:300191`), `groveConfigCache` (`:300206`). **CONFIRMED, unchanged** from 2.1.169. |
| **orchid_mantis** | `/schedule` proactive-offer prompt | `tengu_orchid_mantis` + `tengu_orchid_mantis_v2` inject the prompt text letting Claude offer to `/schedule` a follow-up. Carried from 2.1.169; ties into **kairos**. |
| **ultraplan** | `/ultraplan` extended-planning mode | `tengu_ultraplan_config` (`.enabled`, `cli.beauty.js:535851`), `tengu_ultraplan_prompt_identifier` (`:535949`), `tengu_ultraplan_timeout_seconds`. Carried from 2.1.169. Related to the new `/v1/ultrareview/preflight` endpoint. |
| **fleetview** | Fleet / PR-batch review onboarding | `tengu_fleetview_pr_batch` (default `!0`, `cli.beauty.js:679217`), `tengu_fleetview_onboarding_v2` (`:679474`, **NEW**). Carried from 2.1.169, expanded. |
| **frame** | Frame publish / design deploy | `tengu_frame_publish_context` (`cli.beauty.js:406013`), env `CLAUDE_CODE_ARTIFACT_DIRECT_UPLOAD`; `isFrameBaseVersionEnabled`/`goCpHeaders` in the same artifact module. Ties to `/api/frame/deploy/*` + `/v1/design*` endpoints and the new `/design-login` command. **NEW.** |
| **copper** | Subscription / upsell + job-mode | `tengu_copper_lantern` (extra-usage upsell), `tengu_copper_thistle` (job vs task terminology). Carried from 2.1.169 (`copper_fox` fork gate dropped). |
| **coral** | Session / billing-upgrade UI | `tengu_coral_beacon` (upgrade-paths billing component). Survives from 2.1.32. **CONFIRMED.** |
| **marble** | Model access / capabilities | `tengu_marble_lark` only. Survives from 2.1.32, still diminished to a single flag. **CONFIRMED, diminished.** |
| **rotunda** / **convolute_arcades** | (carried) fallback-credit header strip / request-retry | `rotunda_pennant` events and `convolute_arcades` retry gate carried from 2.1.169 (events present; not re-verified line-by-line here). |
| **sparrow_ledger** / **walnut_prism** / **heron_brook** | Prompt-arm slots | `tengu_sparrow_ledger`/`tengu_verified_vs_assumed` (verify-vs-assume), `tengu_walnut_prism` (ownership frame), `tengu_heron_brook` (remote-injectable prompt section, in composer at `:593724` as `qk("heron_brook", …)`). Carried from 2.1.169. |
| **team_discovery** | Team auto-discovery | `tengu_team_discovery` (default `!1`) + policy `allow_team_discovery` fetch team data hourly (`cli.beauty.js:350724`). **NEW.** Tied to **harbor**/teams; hipaa-restricted (`:145935`). |

---

## Model codenames (non-flag)

| Codename | What it is | Evidence |
|----------|-----------|----------|
| **fable** | Real model **family** — `claude-fable-5` | Model id with full plane map incl. `mantle:"anthropic.claude-fable-5"` (`cli.beauty.js:94323–94333`), Vertex region `VERTEX_REGION_CLAUDE_FABLE_5` (`:4508`), env `ANTHROPIC_DEFAULT_FABLE_MODEL*`. Family check `not(e)=family==="fable"` (`:101627`). **NEW family vs 2.1.169** (was only a hint). |
| **mythos** | Real model **family** + id `claude-mythos-5` | Promoted from a preview codename (2.1.169 `claude-mythos-preview`) to a **family**: model entry `{id:"claude-mythos-5", family:"mythos", display_name:"Mythos 5"}` (`cli.beauty.js:94352`), family check `rot(e)=D4r(e,"mythos")` (`:101630`); Fable 5 and Mythos 5 "share the same underlying model" (system-prompt string at `:593910`). The combined slug `claude-fable-5-mythos-5` appears **only** as the news-URL `anthropic.com/news/claude-fable-5-mythos-5` (`:593910`), NOT as a model id. Still listed as `claude-mythos-preview` in deprecation arrays `rQc`/`mQc=["claude-mythos-preview","claude-opus-4-6"]` (`:7871/9068`). **CHANGED — now a family, ~50 `mythos` occurrences.** |
| **sonnet-5 / opus-4-7-fast** | New model ids | `claude-sonnet-5`, `claude-opus-4-7-fast`, `claude-opus-4-8` present in id extraction. (Detail in [`_facts.md`](bundle/_facts.md) §1.) |
| **pewter_owl** | Unreleased-model preview gating | `tengu_pewter_owl_model` + `clientDataCache.pewter_owl_model`, env `CLAUDE_CODE_PEWTER_OWL(_TOOL)`. Carried from 2.1.169. |
| ~~fruitcake / macaroon~~ | **GONE** | The 2.1.169 preview-name pool `fV_=["fruitcake","macaroon","mythos"]` is removed; only `mythos` survives (now a family). `fruitcake`/`macaroon` = **0** occurrences in this build. |
| ~~velvet_falcon~~ | **GONE** | `tengu_velvet_falcon_model` removed (was a twin of `pewter_owl` in 2.1.169). |

---

## Auto-generated `adjective_noun` flag names (no semantic meaning)

These match the random `lli`/`cli` word-pool, appear in **one** flag each with **no** recurring
cluster, and are throwaway labels. (Representative, not exhaustive — see
[`data/feature-flags.yaml`](data/feature-flags.yaml).)

`alder_compass`, `basalt_meadow/_scarp/_spur`, `birch_kettle/_lantern`, `bramble_lintel`,
`brick_follow`, `cedar_lantern/_lattice/_marsh/_plume/_sundial`, `chair_sermon`, `chomp_inflection`,
`cinder_plover`, `cobalt_lantern/_ridge/_thicket/_wren`, `crimson_vector`, `drift_lantern`,
`ember_latch`, `gleaming_fair`, `gouda_loop`, `gypsum_kite`, `hawthorn_steeple`, `hazel_osprey(_floor)`,
`herring_clock`, `jade_anvil_4`, `kestrel_arch`, `lantern_spool`, `maple_pier/_sundial`,
`marlin_porch`, `mint_lanes`, `mocha_barista`, `moss_anchor`, `moth_copse`, `neapolitan`,
`ochre_finch/_hollow`, `onyx_plover`, `paper_halyard`, `passport_quail`, `pencil_farmer`,
`pewter_brook`, `plum_vx3`, `quartz_heron`, `russet_linnet`, `sedge_lantern(_config)`,
`sepia_cormorant/_moth`, `shale_finch`, `shining_fractals`, `silk_almanac/_hinge`,
`slate_finch/_moth/_prism/_quill/_thimble/_harrier`, `surreal_dali`, `trace_lantern`,
`turtle_carbon`, `tussock_oriole`, `umber_petrel`, `vellum_siding`, `velvet_cascade/_ibis/_static`.

**Note:** as in 2.1.169, a few single-flag names with dedicated gates (e.g. `neapolitan` →
remote-handoff offer `BKt` `:420423`, `russet_linnet` `:223333`, `kestrel_arch`) *might* be nascent
codenames that haven't accreted a second flag yet. Classified non-meaningful pending a second flag.

---

## Status of the 2.1.169 codenames

| 2.1.169 codename | Domain | 2.1.197 status |
|------------------|--------|----------------|
| **tengu** | Product prefix | **Holds.** Universal. |
| **kairos** | Loops/schedule/brief/push/cron | **Holds** — `kairos_cron*` already present in 2.1.169, carried unchanged. |
| **harbor** | Channels/cowork/teams | **Holds, expanded** — adds `harbor_moth`, `cobalt_harbor`, `silent_harbor`; suffix now partly opportunistic. |
| **bridge** + **ccr** | Remote control | **Holds, expanded** — `bridge_poll_interval_config`, `ccr_bundle_seed_enabled`, `ccr_delta_rehydrate` new; `bridge_min_version`/`bridge_repl_v2_config` dropped. |
| **amber** | Teams/autonomy/downsell | **Holds** — `amber_flint`/`amber_sextant` core intact; `amber_heron`/`amber_quill` new. |
| **sage_compass** | Advisor tool | **Holds.** |
| **rotunda** / **convolute_arcades** | Credit-strip / retry | **Holds** (carried). |
| **orchid_mantis** | `/schedule` offer prompt | **Holds.** |
| **sparrow_ledger** / **walnut_prism** / **heron_brook** | Prompt arms | **Holds.** |
| **pewter_owl** | Preview-model gate | **Holds.** |
| **velvet_falcon** | Preview-model gate | **GONE** (`velvet_falcon_model` removed). |
| **copper** / **coral** / **marble** / **grove** | Upsell / session / model / policy | **Hold** (`copper_fox` fork gate dropped; rest intact). |
| **mythos** / **fruitcake** / **macaroon** | Preview-model codenames | **mythos → promoted to a real family**; **fruitcake/macaroon GONE.** |

---

## What's new vs 2.1.169

New codename clusters / promotions in 2.1.197:

- **cobalt_plinth** — the **Artifacts** subsystem (viewer, direct upload, frame base versions),
  tier- and policy-gated (`allow_cobalt_plinth`, hipaa+zdr restricted).
- **saffron** — a dedicated **billing/credits/overage** cluster (plan-limit dates, credits-only
  tiers, model-picker dimming) sitting alongside `copper`/`coral`.
- **lapis** (`lapis_anchor`) — the **token-budget reminder** UI (off/countdown/padded-countdown modes).
- **shoji_engine** — a response **wire-protocol validator** emitting `wire_violation` telemetry.
- **frame** (`frame_publish_context`) — frame/design publish+deploy, tied to `/api/frame/deploy*`,
  `/v1/design*`, and the new `/design-login` command.
- **team_discovery** — hourly team auto-discovery (policy-gated, hipaa-restricted).
- **cobalt_heron** — a Pro→Max usage-limit upsell nudge (opportunistic `cobalt` adjective).
- Model: **fable** is now a real family (`claude-fable-5`), **mythos** promoted from preview to a
  family (id `claude-mythos-5`), **sonnet-5** / **opus-4-7-fast** ids added.

Removed since 2.1.169: `velvet_falcon_model`, `pewter_lark`, `velvet_hammer/_mallet`, `cedar_inlet`,
`compass_dial`, `garnet_finch`, `billiard_aviary`, `chert_bezel`, `dune_wren`, `loggia_carousel`,
`agent_list_attach`, `auto_background_agents`, `slim_subagent_claudemd`, `event_watchdog_default_on`,
`bash_allowlist_strip_all`; preview names `fruitcake`/`macaroon`.

---

## Uncertainties

- **`cobalt`** is two unrelated things: `cobalt_plinth*` (Artifacts, a real cluster) and
  `cobalt_heron`/`cobalt_harbor`/`cobalt_lantern`/`cobalt_ridge`/`cobalt_thicket`/`cobalt_wren`
  (separate features / pure noise). `cobalt` itself is **not** a unifying codename; `cobalt_plinth`
  is the meaningful token.
- **`_harbor`** suffix is now mixed: `tengu_harbor`(+ledger/permissions/prism/willow/moth) = channels,
  but `silent_harbor` (tool-JSON prompt, `:593724`), `quiet_harbor` (notification mode, `:145713`)
  are unrelated. Treat the bare `harbor`/`harbor_*` core as channels; adjective-prefixed `_harbor`
  flags need per-call-site checks.
- **`amber`** remains the muddiest — `amber_flint`/`amber_sextant` are clearly teams/autonomy, but the
  adjective is reused on ~15 unrelated flags (downsell, plugins, idle, relay, background-defer).
- **`saffron`** vs **`copper`**/**`coral`** — three overlapping monetization codenames now coexist;
  `saffron` looks like the newer credits/overage-specific layer, but the boundary is fuzzy.
- **`baku`** — only ever seen as the `remote_baku` entrypoint string; whether it names a distinct
  remote product surface or is just an internal alias for one `claude_code_remote` client is unclear.
- **`mythos`** as a family vs the legacy `claude-mythos-preview` id co-exist; the system-prompt
  string (`:593910`) states Fable 5 and Mythos 5 "share the same underlying model" and calls Mythos a
  "Mythos-class model tier that sits above Claude Opus" — i.e. mythos is a variant/tier of the fable
  base (Mythos 5 ships without the dual-use safety mitigations Fable carries) rather than a separate
  base model. Note the model id is `claude-mythos-5`, not `claude-fable-5-mythos-5` (that combined
  string is only the news-URL slug).
- Several single-flag names with dedicated gates (`neapolitan`, `russet_linnet`, `kestrel_arch`)
  could be nascent codenames; classified non-meaningful pending a second flag.
