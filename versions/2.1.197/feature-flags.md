# Feature Flags

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.4.0 standalone
> **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143`

## Feature Flag System

Anthropic still drives the gating surface through **[GrowthBook](https://www.growthbook.io/)** (`cachedGrowthBookFeatures`) — unchanged in spirit since 2.1.32/2.1.169. What moved is the **scale and the symbol names**: the binary is a fresh Bun v1.4.0 standalone build, every minified identifier rotated, and the flag count grew again — **243 distinct flags** reachable via the four primary accessors (244 enumerated live; the off-by-one is boundary noise, see *Counting*). That is **+25 vs 2.1.169's 218**.

### Flag Accessor Functions

Minified identifiers rotate every build. In 2.1.197:

| Function | Signature | Purpose | 2.1.169 was | Line |
|----------|-----------|---------|-------------|------|
| `it()` | `it(flag, default)` | Primary flag get | `j$` | `cli.beauty.js:145150` |
| `J7()` | `J7(flag, default, _)` | Thin wrapper around `it` (3rd arg ignored) | `cS` | `:145167` |
| `QYr()` | `QYr(flag)` async | Async boolean flag check | `lS` | `:145170` |
| `$U()` | `$U(flag)` async | Async boolean flag check | `OG6` | `:145181` |

`it` resolution order (`cli.beauty.js:145150`): **(1)** `CBt()` local/env override map → **(2)** `IBt()` managed/remote-settings override map → **(3)** if GrowthBook not ready (`!LW()`), return the `default` arg → **(4)** track GrowthBook exposure → **(5)** `Pt().cachedGrowthBookFeatures[flag]` else `default`. The second argument is the value used until GrowthBook confirms otherwise.

**Additional config wrappers** (not in the headline four, but they *also* read GrowthBook flags — analogous to 2.1.169's `gS`/`Cg8`): `ik(flag, default)` for config objects (e.g. `tengu_bridge_min_version` `:605482`, `tengu_desktop_upsell` `:685382`, `tengu_malort_pedway` `:280730`), and `ern(flag, default)` for survey configs (`tengu_feedback_survey_config`, `tengu_bad/fine/good_survey_transcript_ask_config`, all at `:683900`). A few flags are read through a **`Gst()` name-transform**: `it(Gst("tengu_velvet_mallet", d), !1)` (`:367220`) and `it(Gst("tengu_velvet_hammer", s), !1)` (`:444422`) — so the Edit/Write read-before-guard flags survive but no longer appear as bare `it("tengu_…")` literals.

### How dual-gating works (unchanged pattern, more of it)

The env var (or CLI flag) is the user opt-in; the GrowthBook flag is Anthropic's rollout control. Examples in this build:

```js
// Skill-description reframe arm (cli.beauty.js:223333)
Taa = wn(() => {
    let e = Oe.CLAUDE_CODE_SKILL_DESC_REFRAME,
        t = e || it("tengu_russet_linnet", !1);   // env OR flag
    if (t) T(`skill_desc_reframe_arm_active source=${e ? "env" : "growthbook"}`);
    return t
})
```

```js
// 'shoji' engine (cli.beauty.js:619857) — env OR flag
function oge() {
    return ct(process.env.CLAUDE_CODE_SHOJI_ENGINE) || it("tengu_shoji_engine", !1)
}
```

### Codename caveat

Most non-descriptive names (`amber_*`, `cobalt_*`, `saffron_*`, `cedar_*`, `lapis_*`, `slate_*`, etc.) are **auto-generated adjective+noun labels** — the label carries no meaning; behavior below is inferred from call sites, with line citations.

---

## What's New vs 2.1.169

**+49 flags appear that were absent from the 2.1.169 enumeration** (and ~23 names dropped — see *Removed*). The new clusters track exactly where the product is expanding: **Frame artifacts / Design**, **credits & overage billing**, **Remote Control defaults**, and a wave of MCP/plugin hardening.

| Family | New flags | What it is |
|--------|-----------|------------|
| **Frame artifacts** (`cobalt_plinth_*`, `saffron_anchor`, `frame_publish_context`) | 7 | The "Frame" artifact pipeline — base-version rendering, a reader-persist store, a PUT guard, a direct-upload lane (≤ `MAX_ARTIFACT_BYTES`), and publish-context. Aligns with the new `/api/frame/deploy/*` + `/v1/design*` endpoints. `cli.beauty.js:405990-406100` |
| **Credits / overage billing** (`saffron_lattice`, `saffron_credits_only_tiers`, `saffron_picker_dim`, `cedar_lattice`, `lantern_spool`) | 5 | Plan-limits/overage-consent config, credits-only subscription tiers (dim the model picker), and first-party `fallback_credit_token` header injection. `cli.beauty.js:230934-231006`, `595982-595983` |
| **Remote Control defaults** (`cobalt_harbor`, `cobalt_harbor_notice`, `harbor_moth`, `neapolitan`, `silent_harbor`) | 5 | Remote Control ON-by-default at startup, a ≤3-impression "auto-on" notice, remote recap over CCR, remote agent-isolation availability, and an anti-verbosity system-prompt arm. `cli.beauty.js:605504, 529669, 292198, 420423, 593724` |
| **MCP hardening** (`mcp_normalize_root_combinators`, `mcp_strip_trailing_xml_tags`, `mcp_server_policy_bypass_exempt`, `mcp_startup_policy_seed`) | 4 | Root-URL combinator normalization, trailing-XML stripping, and two **default-TRUE** remote-policy guards. `cli.beauty.js:281908, 283778, 598639, 729107` |
| **Context tips** (`amber_quill`, `cobalt_heron`, `slate_moth`) | 3 | A spinner-tip engine with concrete coaching cards (Opus-on-Pro-near-limit → Sonnet; large stale context → `/compact`). `cli.beauty.js:351092-351098, 351892` |
| **Onboarding / discovery** (`team_discovery`, `birch_lantern`, `fleetview_onboarding_v2`) | 3 | Team-discovery fetch, a powerup-onboarding arm (replaces `maple_pier`), and fleet-view onboarding v2. `cli.beauty.js:350724, 528623, 679474` |
| **Plugins** (`plugin_autoupdate_allow_credential_helper`, `plugin_binary_assets`) | 2 | Credential-helper gate during marketplace autoupdate, and plugin binary-asset download. `cli.beauty.js:514238, 471694` |
| **Diagnostics / limits** (`shoji_engine`, `lapis_anchor`, `lapis_anchor_budget`, `defer_cap_ms`, `non_deferrable_builtins`, `media_byte_cap`, `memory_store_resync_interval_minutes`) | 7 | Token-reminder mode + budget (15M), defer-then-fork cap (10 s), non-deferrable built-ins, a 75 MiB media byte cap, periodic memory resync (60 min). |
| **Misc** (`report_findings_tool`, `malformed_tool_use_clean_retry`, `rewind_first_message`, `reactive_compact_remote`, `ccr_delta_rehydrate`, `russet_linnet`, `cedar_sundial`, `amber_heron`, `soft_slate_nudge`, `cowork_chrome_automode_default`, `pencil_farmer`, `sunset_penguin_opus47`, `silk_almanac`) | 13 | ReportFindings tool, malformed-tool-use clean retry, rewind anchoring, remote reactive compaction, CCR delta rehydrate, skill-desc reframe, edit gate, subagent background isolation, todo-reminder mode, Chrome auto-mode floor, schedule timing, opus-4-7 sunset banner, team-memory multistore. |

### Notable default changes vs 2.1.169

| Flag | 2.1.169 | 2.1.197 | Effect |
|------|---------|---------|--------|
| `tengu_mcp_stateless_skip_init` | `false` | **`true`** | Stateless MCP servers now **skip the init handshake by default** (`it("tengu_mcp_stateless_skip_init", !0)`, `:268422`) |
| `tengu_mcp_server_policy_bypass_exempt` | (new) | **`true`** | Remote MCP server policy is authoritative even under bypass-permissions |
| `tengu_mcp_startup_policy_seed` | (new) | **`true`** | Remote MCP permission policy seeded at startup |
| `tengu_cobalt_plinth_putguard` | (new) | **`true`** | Artifact-reader PUT guard on by default |
| `tengu_cobalt_harbor_notice` | (new) | **`true`** | Remote-Control "auto-on" notice shown by default |

All other 2.1.169 default-TRUE flags that persist (`amber_flint`, `amber_sextant`, `coordinator_panel`, `bg_*`, `kairos_cron*`, `workflows_enabled`, `fleetview_pr_batch`, `send_user_file`, `turtle_carbon`, etc.) **kept their values** — spot-verified `workflows_enabled` (`!0`), `send_user_file` (`!0`), `turtle_carbon` (`!0`), `kairos_cron` (`!0`), `fleetview_pr_batch` (`!0`). No 2.1.169 default-TRUE → FALSE regressions were found.

### Removed / no longer flag-gated vs 2.1.169

These 2.1.169 flag literals are **entirely absent** from the 2.1.197 bundle (0 occurrences):

`tengu_iron_gate_closed`, `tengu_slim_subagent_claudemd`, `tengu_auto_background_agents`, `tengu_velvet_falcon_model`, `tengu_event_watchdog_default_on`, `tengu_agent_list_attach`, `tengu_bash_allowlist_strip_all`, `tengu_cedar_inlet`, `tengu_compass_dial`, `tengu_pewter_lark`, `tengu_dune_wren`, `tengu_garnet_finch`, `tengu_billiard_aviary`, `tengu_chert_bezel`.

`tengu_loggia_carousel` is **no longer flag-gated** but is **not** 0-occurrences: the name survives only as a telemetry payload field (`tengu_loggia_carousel: t?.refusalFallbackLaneEnabled ?? !1`, `cli.beauty.js:237979-237980`), not as an `it("tengu_…")` read.

The most consequential is **`tengu_iron_gate_closed`** — in 2.1.169 this was the default-TRUE *fail-closed* kill switch that **denied** a tool call when the auto-mode classifier could not run. In 2.1.197 the fail-closed behavior still exists in code (`"Classifier unavailable — blocking based on stage 1 assessment …"`, `cli.beauty.js:373248`) but is **no longer flag-gated** — it is now unconditional (the live string is `"Classifier unavailable - blocking for safety"`; a sibling stage-2 path reads `"Stage 2 classifier error - blocking based on stage 1 assessment …"`). `tengu_cedar_inlet` (team-onboarding discovery arm) is superseded by `tengu_team_discovery` + `tengu_birch_lantern`.

> **Note**: `tengu_velvet_hammer`, `tengu_velvet_mallet`, `tengu_bridge_min_version`, `tengu_desktop_upsell`, `tengu_malort_pedway`, `tengu_pewter_summit`, and the survey-config flags are **not removed** — they are reached via the `Gst()`/`ik()`/`ern()` wrappers (above) rather than a bare `it("tengu_…")` literal, so they fall outside the four-accessor enumeration.

---

## Category Tables (highlights — full set in [data/feature-flags.yaml](data/feature-flags.yaml))

### Frame Artifacts / Design (NEW family)

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_cobalt_plinth` | `false` | Master gate for the Frame artifact pipeline (`Ela()`/`xLe()`, `:224993`) |
| `tengu_cobalt_plinth_fern` | `false` | `isFrameBaseVersionEnabled()` — base-version artifact rendering (`:405997`) |
| `tengu_cobalt_plinth_putguard` | **`true`** | Guard PUT writes to the artifact-reader store (`:406009`) |
| `tengu_cobalt_plinth_reader_persist` | `false` | Persist `artifactReadVersions` across reads (`:406005`) |
| `tengu_cobalt_plinth_direct` | `false` | Direct artifact-upload lane (env `CLAUDE_CODE_ARTIFACT_DIRECT_UPLOAD`, `:406097`) |
| `tengu_saffron_anchor` | `false` | Frame artifact gate `lKt()` (`:406001`) |
| `tengu_frame_publish_context` | `false` | Include publish context on Frame publish (`:406013`) |

### Credits / Overage Billing (NEW family)

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_saffron_lattice` | `{}` (zod config) | Overage/plan-limits config `{enabled, overageConsentRequired, planLimitsEndDate}` → "extra usage" consent + plan-limit-end banner (`:230934`) |
| `tengu_saffron_credits_only_tiers` | `[]` (config) | Subscription tiers restricted to credits (`Ede()`, `:230980`) |
| `tengu_saffron_picker_dim` | `false` | Dim the model picker for credits-only tiers (`:231006`) |
| `tengu_cedar_lattice` | `false` | First-party: inject `fallback_credit_token` header on non-auxiliary queries (`:595983`) |
| `tengu_lantern_spool` | `false` | First-party: credit/query-tracking header on deep compact queries (`:595982`) |

### Remote Control (harbor)

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_cobalt_harbor` | `false` | Remote Control ON at startup (managed `remote_control_at_startup` overrides, `:605504`) |
| `tengu_cobalt_harbor_notice` | **`true`** | One-time "Remote Control auto-on" notice, ≤3 impressions (`:529669`) |
| `tengu_harbor_moth` | `false` | Remote recap / away-summary over CCR (env `CLAUDE_CODE_ENABLE_REMOTE_RECAP`, `:292198`) |
| `tengu_neapolitan` | `false` | Allow `remote` agent isolation for subagents (`BKt()`, `:420423`) |
| `tengu_silent_harbor` | `false` | System-prompt anti-verbosity arm; adds `:send_user_msg` steering (`:593724`) |

### MCP

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_mcp_stateless_skip_init` | **`true`** (was `false`) | Skip init handshake for stateless MCP (`:268422`) |
| `tengu_mcp_server_policy_bypass_exempt` | **`true`** | Remote: server policy authoritative under bypass-permissions (env `CLAUDE_CODE_REMOTE`, `:598639`) |
| `tengu_mcp_startup_policy_seed` | **`true`** | Remote: seed MCP permission policy at startup (`:729107`) |
| `tengu_mcp_normalize_root_combinators` | `[]` | Normalize MCP root-URL combinators for listed hostnames (`:281908`) |
| `tengu_mcp_strip_trailing_xml_tags` | `false` | Strip trailing XML tags from MCP tool output (`:283778`) |

### Context / Memory / Limits

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_media_byte_cap` | `78643200` (75 MiB) | Byte cap on media (base64) blocks in normalization (`:595311`) |
| `tengu_defer_cap_ms` | `10000` | Max wait before defer-then-fork to background (`:693491`) |
| `tengu_non_deferrable_builtins` | `null` → list | Built-ins that must not be deferred (`:224448`) |
| `tengu_memory_store_resync_interval_minutes` | `60` (floor 1) | Periodic team-memory resync (env `CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC`, `:449395`) |
| `tengu_reactive_compact_remote` | `false` | Reactive autocompact in remote (env `CLAUDE_CODE_REMOTE`, `:230153`) |
| `tengu_soft_slate_nudge` | `"baseline"` | Todo-reminder mode; `"off"` disables (env `CLAUDE_CODE_TODO_REMINDER_MODE`, `:466938`) |
| `tengu_silk_almanac` | `false` | Team-memory multistore gate (`:448919`) |

### Tools / Review

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_report_findings_tool` | `false` | Expose the **ReportFindings** structured code-review tool (env `CLAUDE_CODE_REPORT_FINDINGS`, `:653604`) |
| `tengu_malformed_tool_use_clean_retry` | `false` | Clean retry on malformed `tool_use` (`:458683`) |
| `tengu_cedar_sundial` | `false` | Extra "applies" gate before a file edit applies (`:444410`) |
| `tengu_fleetview_onboarding_v2` | `false` | Fleet-view onboarding v2 (`:679474`) |
| `tengu_amber_heron` | `false` | Force a spawned subagent into background/isolated execution (`:420970`) |

### Tips / Onboarding

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_amber_quill` | `false` | Master gate for context/spinner tips (managed `allow_context_tips`, `:351892`) |
| `tengu_cobalt_heron` | `false` | Tip: Opus-on-Pro >50% usage → suggest Sonnet (`:351092`) |
| `tengu_slate_moth` | `false` | Tip: >300K ctx & >100K stale-file tokens → suggest `/compact` (`:351098`) |
| `tengu_team_discovery` | `false` | Fetch team-discovery data (managed `allow_team_discovery` + logged-in, `:350724`) |
| `tengu_birch_lantern` | `"off"` | Powerup onboarding arm (banner/step; env `CLAUDE_CODE_POWERUP_ONBOARDING`, `:528623`) |

### Model / Diagnostics

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_sunset_penguin_opus47` | `"2026-07-25"` | Sunset date → deprecation banner while current model is `claude-opus-4-7` (`:100689`) |
| `tengu_lapis_anchor` | `"off"` | Total-tokens reminder mode (env `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`, `:454944`) |
| `tengu_lapis_anchor_budget` | `15000000` | Token budget for the reminder (env `…_BUDGET`, `:454951`) |
| `tengu_shoji_engine` | `false` | Enable the "shoji" engine path (env `CLAUDE_CODE_SHOJI_ENGINE`, `:619857`) |
| `tengu_cowork_chrome_automode_default` | `false` | Chrome classifier-floor default for cowork (env `CLAUDE_CHROME_CLASSIFIER_FLOOR`, `:599631`) |

> The full **244-flag** dataset — including all carried-over 2.1.169 families (agent-teams, background-agents, kairos loops/cron, bridge/ccr/relay, channels, classifier, auto-mode, system-prompt arms, context-management, session-memory, UI/UX, streaming, subscription upsells, surveys/IDE/diagnostics) with per-flag defaults, accessors, and line citations — lives in [data/feature-flags.yaml](data/feature-flags.yaml).

---

## Notable Kill Switches (carried)

| Flag | Effect when ON |
|------|----------------|
| `tengu_disable_bypass_permissions_mode` | Disables `--dangerously-skip-permissions` (now read via async `QYr`, `:599807`) |
| `tengu_disable_keepalive_on_econnreset` | Disables HTTP keep-alive after reset |
| `tengu_disable_streaming_to_non_streaming_fallback` | Disables the non-streaming fallback path |
| `tengu_read_dedup_killswitch` | Disables Read-result dedup cache |
| `tengu_classifier_summary_kill` | Drops the classifier "summary" stage |
| `tengu_penguins_off` | Non-null string disables Fast mode (the string is the reason) |

The 2.1.169 fail-closed switch `tengu_iron_gate_closed` is **gone** — the deny-when-classifier-unavailable behavior is now hardcoded (`cli.beauty.js:373248`), not toggleable.

## Dual-Gated Features (env var AND/OR GrowthBook) — NEW in 2.1.197

| Feature | Env var | Flag | Logic |
|---------|---------|------|-------|
| Skill-desc reframe | `CLAUDE_CODE_SKILL_DESC_REFRAME` | `tengu_russet_linnet` | env **OR** flag |
| Shoji engine | `CLAUDE_CODE_SHOJI_ENGINE` | `tengu_shoji_engine` | env **OR** flag |
| Direct artifact upload | `CLAUDE_CODE_ARTIFACT_DIRECT_UPLOAD` | `tengu_cobalt_plinth_direct` | env/entrypoint **OR** flag |
| Plugin binary assets | `CLAUDE_CODE_PLUGIN_BINARY_ASSETS` | `tengu_plugin_binary_assets` | env **OR** flag |
| ReportFindings tool | `CLAUDE_CODE_REPORT_FINDINGS` | `tengu_report_findings_tool` | env **OR** flag |
| Remote recap | `CLAUDE_CODE_ENABLE_REMOTE_RECAP` | `tengu_harbor_moth` | env overrides; else flag |
| Total-tokens reminder | `CLAUDE_CODE_TOTAL_TOKENS_REMINDER(_BUDGET)` | `tengu_lapis_anchor(_budget)` | env overrides; else flag |
| Todo-reminder mode | `CLAUDE_CODE_TODO_REMINDER_MODE` | `tengu_soft_slate_nudge` | env overrides; else flag |
| Powerup onboarding | `CLAUDE_CODE_POWERUP_ONBOARDING` | `tengu_birch_lantern` | env overrides; else flag |
| Chrome auto-mode floor | `CLAUDE_CHROME_CLASSIFIER_FLOOR` | `tengu_cowork_chrome_automode_default` | env overrides; else flag |
| Reactive compact (remote) | `CLAUDE_CODE_REMOTE` | `tengu_reactive_compact_remote` | remote gate **AND** flag |
| Memory periodic resync | `CLAUDE_CODE_DISABLE_MEMORY_PERIODIC_RESYNC` | `tengu_memory_store_resync_interval_minutes` | env disables; else flag (default 60 min) |

(Carried dual-gates from 2.1.169 — Agent Teams, Background agents, Workflows, Brief mode, kairos loops/cron, away-summary, velvet-falcon, MCP output cap, stream watchdog, advisor — remain; see the 2.1.169 file.)

## Counting

Live enumeration over the four accessors (`grep` for `it("tengu_…"` / `J7(` / `QYr(` / `$U(`) yields **244** distinct names (accessor split: `it` ≈ 294 calls, `J7` 6, `QYr` 1, `$U` 8). The canonical headline is **243**; the +1 is a regex-boundary artifact (one borderline literal). Use **243** as the published figure. **30** flags default to a truthy value (`!0`/non-empty); the rest default off and roll out via GrowthBook.

### Summary

- **Total flags**: 243 (244 enumerated) via `it`/`J7`/`QYr`/`$U`; more reachable through `ik`/`ern`/`Gst` wrappers.
- **+49 new** flag names vs 2.1.169; **~15** removed entirely (incl. the `iron_gate_closed` fail-closed switch).
- **Confirmed default flip**: `tengu_mcp_stateless_skip_init` `false`→**`true`**; new default-TRUE guards `mcp_server_policy_bypass_exempt`, `mcp_startup_policy_seed`, `cobalt_plinth_putguard`, `cobalt_harbor_notice`.
- The growth is concentrated in **Frame artifacts / Design**, **credits/overage billing**, **Remote Control defaults**, and **MCP/plugin hardening**.
- See [data/feature-flags.yaml](data/feature-flags.yaml) for the full structured dataset with per-flag line citations.
</content>
</invoke>
