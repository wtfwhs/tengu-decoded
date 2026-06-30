# Feature Flags

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64 | **Runtime**: Bun v1.3.14 standalone

## Feature Flag System

Anthropic still uses **[GrowthBook](https://www.growthbook.io/)** as their feature-flag and A/B platform (`cachedGrowthBookFeatures`). What changed since 2.1.32 is the **scale**: the gating surface jumped from ~48 documented flags to **218 distinct flags** (206 enumerated via the primary accessor + 12 more reached through wrapper accessors / flag-name constants). The binary is now a Bun standalone build, but the flag plumbing is unchanged in spirit.

### Flag Accessor Functions

Minified identifiers rotate every build. In 2.1.169:

| Function | Signature | Purpose | 2.1.32 equivalent |
|----------|-----------|---------|-------------------|
| `j$()` | `j$(flag, default)` | Primary flag get | `kL` |
| `cS()` | `cS(flag, default, _)` | Thin wrapper around `j$` (3rd arg is an ignored const) | — |
| `gS()` | `gS(flag, default)` | Thin wrapper around `j$` (config objects) | `Cu` |
| `Cg8()` | `Cg8(flag, default)` | Thin wrapper around `j$` (survey configs) | — |
| `lS()` / `OG6()` | `lS(flag)` async | Async boolean flag check | `df` |

`j$` resolution order (cli.beauty.js): **(1)** `HP$()` local/env override map → **(2)** `$P$()` managed/remote-settings override map → **(3)** if GrowthBook not ready, return the `default` arg via `ru()` → **(4)** track exposure → **(5)** `cachedGrowthBookFeatures[flag]` else `default`. So the second argument is the value used until GrowthBook confirms otherwise.

### How dual-gating works (unchanged pattern, more of it)

```js
// Agent Teams (cli.beauty.js:273739)
function _4() {
    if (!$$(process.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS) && !qG5()) return !1; // env OR --agent-teams
    if (!j$("tengu_amber_flint", !0)) return !1;                                    // GrowthBook rollout gate
    return !0
}
```

The env var (or CLI flag) is the user opt-in; the GrowthBook flag is Anthropic's rollout control. Many 2.1.169 features add this env-OR-flag pattern (see the `related_env_var` column in [data/feature-flags.yaml](data/feature-flags.yaml)).

### Codename caveat

Most non-descriptive names (`amber_*`, `slate_*`, `velvet_*`, `cobalt_*`, `cedar_*`, `pewter_*`, `basalt_*`, etc.) are **auto-generated from internal word lists** (adjective + noun, found at cli.beauty.js:140670 — `["ancient","bright",...]` × `["aurora","harbor",...]`). The label carries no meaning; behavior below is inferred from call sites only, with line citations.

---

## What's New vs 2.1.32

The count roughly quadrupled. The big new families:

| Family | Prefixes | What it is |
|--------|----------|------------|
| **Background agents** | `bg_*`, `auto_background_agents` | A persistent background **daemon/supervisor** that runs detached agent sessions, with binary takeover (kill stale older daemon), pre-warmed spare worker pool, low-mem throttling, retire-grace, attach/upgrade. cli.beauty.js:541824, 542069, 659698 |
| **Loops & scheduling (kairos)** | `kairos_*` | The `/loop` autonomous-loop engine + `ScheduleWakeup`/`CronCreate` scheduling, persistent/dynamic loop variants, brief mode, and PushNotification. cli.beauty.js:209584-209746 |
| **Remote control / bridge** | `bridge_*`, `ccr_*`, `relay_*`, `slate_harbor`, `surreal_dali`, `cobalt_lantern` | Mobile/remote "Remote Control" bridge: attestation enforcement, REPL v2 CSE shim, min-version gate, CCR cloud-bundle execution. cli.beauty.js:288328, 368836, 371672 |
| **Workflows** | `workflows_enabled` | Workflows feature, default-on for non-pro. cli.beauty.js:184020 |
| **Cowork / team onboarding** | `flint_harbor_*`, `cedar_inlet`, `herring_clock` | `/team-onboarding` command, discovery banner/step arm, team memory dir. cli.beauty.js:498816, 498850 |
| **Channels (harbor)** | `harbor`, `harbor_ledger`, `harbor_prism`, `harbor_permissions` | "Channels" with a zod-validated allowlist and an FNV-hashed permission rule engine. cli.beauty.js:363241, 363411 |
| **Classifier** | `classifier_*`, `cobalt_wren`, `iron_gate_closed` | A per-"surface" (cli/bg/bridge/desktop/ccr) context classifier choosing LLM vs heuristic summary, with a fail-closed auto-mode gate. cli.beauty.js:428434, 450386 |
| **Advisor** | `sage_compass2` | An experimental "Advisor" tool (firstParty only). cli.beauty.js:287322 |
| **Plan v2 / ultraplan** | `ultraplan_*` | Cloud "ultraplan" plan phase (prompt id `simple_plan`, 90-min timeout). cli.beauty.js:504466 |
| **Review / bughunter** | `review_*`, `fleetview_pr_batch` | Workflow-routed `/code-review`, fleet "bughunter" cloud review, PR batching. cli.beauty.js:605422, 627979 |
| **System-prompt arms** | `amber_sextant`, `verified_vs_assumed`, `walnut_prism`, `cedar_lantern`, `sparrow_ledger`, `orchid_mantis*` | Toggleable system-prompt sections: autonomous operation, verified-vs-assumed honesty, ownership frame, act-don't-rederive, verify-prompt, and `/schedule` follow-up offers. cli.beauty.js:558361-558491 |
| **Auto mode** | `auto_mode_config`, `harbor_willow`, `moss_anchor`, `iron_gate_closed` | Auto-accept / auto-mode config and its classifier-driven approval. cli.beauty.js:183675 |

Smaller new clusters: **session-memory/dream** (`onyx_plover`, `billiard_aviary`, `passport_quail`, `sepia_*`, `ochre_finch`), **terminal/rendering** (`xterm_atlas_reset`, `basalt_meadow`, `malort_pedway`, `cicada_nap_ms`), and a **tips/promo carousel** (`alder_compass`, `cedar_plume`, `dune_wren`, `garnet_finch`, `kestrel_arch`).

### Notable default changes vs 2.1.32

| Flag | 2.1.32 | 2.1.169 | Effect |
|------|--------|---------|--------|
| `tengu_amber_flint` | `false` | **`true`** | Agent Teams now rolled out by default (still needs env/CLI opt-in) |
| `tengu_chomp_inflection` | `true` | **`false`** | Prompt suggestions now OFF by default |
| `tengu_keybinding_customization_release` | `false` | **`true`** | Custom keybindings now on |
| `tengu_compact_cache_prefix` | `false` | **`true`** | Compaction prompt-caching now on |
| `tengu_amber_sextant` | (n/a) | `true` | Autonomous-operation prompt section on by default (for autonomous models) |
| `tengu_cedar_lantern` | (n/a) | `true` | "Act, don't rederive" prompt arm on |
| `tengu_turtle_carbon` | (n/a) | `true` | Thinking summaries shown |
| `tengu_sedge_lantern` | (n/a) | `true` | "Away summary" on |
| `tengu_workflows_enabled` | (n/a) | `true` | Workflows on (non-pro) |

`tengu_attribution_header` and `tengu_mcp_tool_search` from 2.1.32 are **not present** in this build's enumerated flag set (attribution header logic still exists but is no longer flag-gated via `j$`). The 2.1.32 file-guard flag `tengu_marble_kite` is replaced by a split pair: `tengu_velvet_hammer` (Edit) and `tengu_velvet_mallet` (Write).

---

## Category Tables

### Agent Teams / Coordination

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_amber_flint` | **`true`** | Agent Teams rollout (env `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` or `--agent-teams`) |
| `tengu_coordinator_panel` | **`true`** | Coordinator panel UI |
| `tengu_copper_thistle` | `false` | Rename "task" → "job" in coordinator |
| `tengu_idle_amber_finch` | `false` | Teammate idle detection |
| `tengu_amber_sentinel` | `false` | Gate near Monitor / event-monitoring path |
| `tengu_quiet_slate_wren` | `false` | Teammate-mode quiet variant |

### Background Agents

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_auto_background_agents` | `false` | Auto-dispatch long tasks to bg (env `CLAUDE_AUTO_BACKGROUND_TASKS`) |
| `tengu_bg_binary_takeover` | **`true`** | New binary retires stale older daemon (SIGKILL) |
| `tengu_bg_spare_enable` | **`true`** | Pre-warmed spare worker pool |
| `tengu_bg_prewarm_per_sweep` | `3` | Spares pre-warmed per sweep |
| `tengu_bg_low_mem_mb` | `1024` | Free-mem floor (MB) for dispatch throttling (0 on macOS) |
| `tengu_bg_retire_grace_bridged_min` | `480` | Bridged session retire grace (min) |
| `tengu_bg_attach_upgrade` | **`true`** | Allow attach/upgrade to existing bg session |
| `tengu_bg_attach_stall_ms` | `5000` | Attach stall timeout (ms) |
| `tengu_bg_leftarrow_inprocess` | **`true`** | In-process left-arrow/detach handling |
| `tengu_bg_classifier_config` | `{useSmallFastModel:true,disableThinking:true}` | Model config for bg event classifier |

### Loops & Scheduling (kairos)

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_kairos_loop_persistent` | `false` | Persistent `/loop` preamble (env `CLAUDE_CODE_LOOP_PERSISTENT`) |
| `tengu_kairos_loop_prompt` | `false` | Autonomous-loop tick prompt resolution |
| `tengu_kairos_loop_dynamic` | `false` | Self-paced dynamic `/loop` mode |
| `tengu_kairos_loop_keepalive` | `false` | Keepalive re-scheduling (env `CLAUDE_CODE_LOOP_KEEPALIVE`) |
| `tengu_kairos_brief` | `false` | Brief mode — hide plain text, only dedicated reply tool reaches user (env `CLAUDE_CODE_BRIEF`) |
| `tengu_kairos_brief_config` | config | Brief-mode config |
| `tengu_kairos_brief_stop_hook_text` | `""` | Brief-mode stop-hook override text |
| `tengu_kairos_push_notifications` | `false` | PushNotification tool (terminal + mobile) |
| `tengu_kairos_input_needed_push` | `false` | Push when loop needs input |
| `tengu_kairos_cron` | **`true`** | Cron scheduling / routines (env `CLAUDE_CODE_DISABLE_CRON`) |
| `tengu_kairos_cron_durable` | **`true`** | Durable cron jobs |
| `tengu_kairos_cron_config` | config | Cron timing config |

### Remote Control / Bridge / CCR

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_bridge_attestation_enforce` | `false` | Enforce bridge attestation |
| `tengu_bridge_attestation_enforce_config` | `{}` | Attestation config |
| `tengu_bridge_repl_v2_cse_shim_enabled` | **`true`** | REPL v2 client-side-execution shim |
| `tengu_bridge_requires_action_details` | `false` | Detailed requires-action prompts |
| `tengu_bridge_system_init` | `false` | Send system_init on connect |
| `tengu_bridge_vivid` | `false` | Bridge "vivid" variant |
| `tengu_bridge_min_version` | `{minVersion:"0.0.0"}` | Min client version for Remote Control |
| `tengu_bridge_poll_interval_config` | config | Bridge poll interval |
| `tengu_amber_relay` | `false` | REPL-bridge enable gate |
| `tengu_relay_chain_v1` | `false` | Removes multi-command bash guidance from prompt |
| `tengu_slate_harbor` | `false` | REPL mode availability (env `CLAUDE_CODE_REPL`) |
| `tengu_remote_backend` | `false` | Remote backend mode (carried over) |
| `tengu_slate_harbor_experiment` | `false` | New `/init` CLAUDE.md flow (env `CLAUDE_CODE_NEW_INIT`) |
| `tengu_surreal_dali` | `false` | Remote-sessions onboarding |
| `tengu_cobalt_lantern` | `false` | Quick web setup for remote sessions |
| `tengu_ccr_bridge` | `false` | CCR bridge mode (sync+async) |
| `tengu_ccr_v2_send_events_cli` | `false` | Send CCR v2 events from CLI |
| `tengu_ccr_bundle_max_bytes` | `null` (→100MB) | CCR bundle upload cap |
| `tengu_ccr_bundle_seed_enabled` | `false` | CCR bundle seeding (env `CCR_ENABLE_BUNDLE`) |

### Auto Mode / Permissions / Classifier

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_auto_mode_config` | sentinel/config | Auto-mode config (`.enabled === "disabled"` kills it) |
| `tengu_harbor_willow` | `false` | Default session to auto mode |
| `tengu_moss_anchor` | `false` | Auto-mode default in non-interactive |
| `tengu_iron_gate_closed` | **`true`** | **Fail-closed**: deny when auto-mode classifier unavailable |
| `tengu_classifier_disabled_surfaces` | `""` | CSV of classifier surfaces to disable |
| `tengu_classifier_summary_kill` | `false` | **Kill switch**: drop classifier summary stage |
| `tengu_classifier_summary_llm_emit` | `false` | Force summary via LLM |
| `tengu_classifier_summary_heuristic_emit` | `false` | Force summary via heuristic |
| `tengu_cobalt_wren` | `false` | Downgrade summary LLM→heuristic |
| `tengu_cfc_in_product_permissions` | `false` | Claude-for-Chrome in-product permissions |
| `tengu_disable_bypass_permissions_mode` | `false` | **Kill switch**: disable bypass-permissions mode |
| `tengu_bash_allowlist_strip_all` | `false` | Strip all flags in bash allowlist match |
| `tengu_ant_yolo_equiv_strip_config` | `{}` | Bash flag-strip equivalence config |
| `tengu_destructive_command_warning` | `false` | Warn before destructive commands |
| `tengu_harbor_permissions` | `false` | Harbor permission rule engine |

### Channels (harbor)

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_harbor` | `false` | Channels feature |
| `tengu_harbor_ledger` | `[]` | Channel allowlist (zod-validated) |
| `tengu_harbor_prism` | `false` | Channels prism variant |
| `tengu_quiet_harbor` | `false` | Daemon-install prompt → "ask" vs "transient" |

### Cowork / Team Onboarding

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_flint_harbor_prompt` | `{}` | `/team-onboarding` config |
| `tengu_flint_harbor_share` | `false` | Team onboarding share |
| `tengu_cedar_inlet` | `"off"` | Onboarding discovery arm (off/banner/step; env `CLAUDE_CODE_TEAM_ONBOARDING`) |
| `tengu_herring_clock` | `false` | Team memory dir (env `CLAUDE_MEMORY_STORES`) |

### Workflows / Review / Plan v2 / Advisor

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_workflows_enabled` | **`true`** | Workflows (non-pro default-on; env `CLAUDE_CODE_WORKFLOWS`) |
| `tengu_review_workflow_routing` | `false` | Route `/code-review` through workflow router |
| `tengu_review_bughunter_config` | `null` | Bughunter fleet config (env `BUGHUNTER_FLEET_SIZE`) |
| `tengu_fleetview_pr_batch` | **`true`** | Batch PR fleet-view ops |
| `tengu_ultraplan_config` | `null` | Cloud ultraplan config (`.enabled`) |
| `tengu_ultraplan_prompt_identifier` | `"simple_plan"` | Ultraplan prompt id |
| `tengu_ultraplan_timeout_seconds` | `5400` | Ultraplan timeout (90 min) |
| `tengu_sage_compass2` | `{}` | Advisor tool (`.enabled`; env `CLAUDE_CODE_*_ADVISOR_TOOL`) |

### System-Prompt Arms

| Flag | Default | What it injects |
|------|---------|-----------------|
| `tengu_amber_sextant` | **`true`** | "Operating autonomously" section (autonomous models only) |
| `tengu_verified_vs_assumed` | `false` | "Be accurate about verified vs assumed" |
| `tengu_walnut_prism` | `false` | "Ownership frame" (env `CLAUDE_CODE_OWNERSHIP_FRAME`) |
| `tengu_cedar_lantern` | **`true`** | "Act, don't rederive" (env `CLAUDE_CODE_ACT_DONT_REDERIVE`) |
| `tengu_sparrow_ledger` | `false` | "Verify prompt" (env `CLAUDE_CODE_VERIFY_PROMPT`) |
| `tengu_orchid_mantis` | `false` | `/schedule` follow-up offer (v1, looser) |
| `tengu_orchid_mantis_v2` | `false` | `/schedule` follow-up offer (v2, stricter; wins over v1) |
| `tengu_relay_chain_v1` | `false` | **Removes** bash multi-command guidance |
| `tengu_heron_brook` | `""` | Custom system-prompt notice |
| `tengu_cinder_plover` | `""` | Custom tool/model prompt override |
| `tengu_chair_sermon` | `false` | Alternate content mapping in prompt assembly |
| `tengu_chert_bezel` | `false` | Append extra system-prompt block |

### Model Access / Routing

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_velvet_falcon_model` | `""` | Model substring → "velvet falcon" autonomous treatment (env `CLAUDE_CODE_VELVET_FALCON`) |
| `tengu_velvet_cascade` | `null` | `{models:[…]}` → "simple system prompt" treatment |
| `tengu_pewter_owl_model` | `""` | Model override string |
| `tengu_quartz_heron` | `false` | Subagent inherits parent model vs haiku |
| `tengu_amber_redwood2` | `""` | opus-4-8 numeric tuning |
| `tengu_amber_redwood3` | `""` | opus-4-8 boolean gate |
| `tengu_penguins_off` | `null` | **Kill switch**: non-null string = Fast mode reason-disabled |
| `tengu_crimson_vector` | `false` | First-party routing affordance |
| `tengu_marble_lark` | `false` | Model-availability gate |
| `tengu_immediate_model_command` | `false` | Apply `/model` immediately |
| `tengu_gypsum_kite` | `false` | "~2x usage vs Sonnet" hint (pro) |

### Context Management / Caching

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_amber_rokovoko` | `0.2` | Autocompact precompute buffer fraction |
| `tengu_compact_cache_prefix` | **`true`** | Prompt caching during compaction |
| `tengu_memory_bulk_inflate` | **`true`** | Bulk-inflate memory on load |
| `tengu_read_dedup_killswitch` | `false` | **Kill switch**: disable Read dedup cache |
| `tengu_prompt_cache_1h_config` | config | 1h prompt-cache allowlist |
| `tengu_prompt_cache_diagnostics` | `false` | Prompt-cache diagnostics |
| `tengu_amber_prism` | `false` | Append extra context block |
| `tengu_hazel_osprey` | `false` | Context-window flooring |
| `tengu_hazel_osprey_floor` | `75000` | Token floor value |
| `tengu_paper_halyard` | `false` | Context/message assembly variant |
| `tengu_moth_copse` | `false` | Message-history transform |
| `tengu_velvet_ibis` | `{}` | Tool-result clearing + MCP output cap (env `MAX_MCP_OUTPUT_TOKENS`) |

### Session Memory / Dream

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_ochre_finch` | `false` | Session-memory feature |
| `tengu_onyx_plover` | `null` | Dream/memory thresholds (minHours/minSessions) |
| `tengu_bramble_lintel` | `null` | Memory/dream pacing (→1) |
| `tengu_passport_quail` | `false` | Memory/dream capability |
| `tengu_sepia_cormorant` | `null` | Memory/dream config |
| `tengu_sepia_moth` | `false` | Memory/dream gate |
| `tengu_billiard_aviary` | `false` | Alternate memory artifact set |
| `tengu_umber_petrel` | `false` | Memory/dream gate |
| `tengu_shale_finch` | `false` | Memory gate |
| `tengu_tussock_oriole` | `false` | projectSettings-scoped memory store |

### File / Tool Operations

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_velvet_hammer` | `false` | Skip "read before Edit" guard |
| `tengu_velvet_mallet` | `false` | Skip "read before Write" guard |
| `tengu_velvet_static` | `false` | "velvet static" tool |
| `tengu_edit_minimalanchor_jrn` | `false` | "Minimal anchor" Edit tool description |
| `tengu_amber_wren` | `{}` | Read tool config (size/token limits) |
| `tengu_tab_read_sep` | `false` | Read output tab/separator handling |
| `tengu_hawthorn_steeple` | `false` | Early-return file/tool-results behavior |
| `tengu_send_user_file` | **`true`** | SendUserFile tool (remote/bridge) |

### MCP / Plugins / Skills

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_mcp_skills` | `false` | Skills as MCP tools |
| `tengu_mcp_singleton_unwrap` | **`true`** | Unwrap singleton MCP results |
| `tengu_mcp_stateless_skip_init` | `false` | Skip init for stateless MCP |
| `tengu_mcp_subagent_prompt` | `false` | New subagent MCP prompt |
| `tengu_mcp_directory_bff` | `false` | BFF endpoint for MCP directory |
| `tengu_mcp_directory_visibility` | `["commercial","gsuite","enterprise","health"]` | Org categories seeing MCP directory |
| `tengu_mcp_local_oauth_blocked_hosts` | `{hosts:[…m365/gmail/gcal…]}` | Hosts blocked from local MCP OAuth |
| `tengu_plugin_official_mkt_git_fallback` | **`true`** | Git fallback when marketplace GCS fetch fails |
| `tengu_amber_lattice` | `{}` | `{plugins:[…]}` allowlist |
| `tengu_skills_dashboard_enabled` | `false` | Skills dashboard UI |
| `tengu_slim_subagent_claudemd` | **`true`** | Omit CLAUDE.md from subagent context |

### UI / UX

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_chomp_inflection` | `false` | Prompt suggestions (was on) |
| `tengu_keybinding_customization_release` | **`true`** | Custom keybindings |
| `tengu_chrome_auto_enable` | `false` | Auto-enable Claude-in-Chrome (env `CLAUDE_CODE_ENABLE_CFC`) |
| `tengu_native_cursor` | `false` | Native cursor rendering |
| `tengu_terminal_sidebar` | `false` | Terminal sidebar / tab status |
| `tengu_silk_hinge` | `false` | Message timestamps |
| `tengu_mint_lanes` | `false` | Menu "kind lanes" (env `CLAUDE_CODE_ENABLE_MENU_KIND_LANES`) |
| `tengu_turtle_carbon` | **`true`** | Thinking summaries |
| `tengu_slate_prism` | **`true`** | Agent progress summaries |
| `tengu_cobalt_thicket` | **`true`** | UI behavior (with gw()) |
| `tengu_slate_finch` | `false` | Effort-level "burns fastest" hint |
| `tengu_slate_quill`, `tengu_slate_thimble` | `false` | UI gates |
| `tengu_slate_harrier` | `"off"` | String-arm UI/system section |
| `tengu_loggia_carousel`, `tengu_amber_lynx`, `tengu_amber_anchor`, `tengu_compass_dial`, `tengu_gleaming_fair`, `tengu_gouda_loop`, `tengu_maple_sundial`, `tengu_shining_fractals`, `tengu_marlin_porch`, `tengu_ochre_hollow`, `tengu_cedar_marsh`, `tengu_cobalt_ridge` | `false` | Miscellaneous UI element gates (see YAML) |

### Terminal / Streaming / Networking

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_xterm_atlas_reset` | **`true`** | Reset xterm glyph atlas cache |
| `tengu_basalt_meadow` | `false` | Terminal redraw/atlas behavior |
| `tengu_malort_pedway` | config | Terminal input (paste/mouse) config |
| `tengu_cicada_nap_ms` | `0` | Render/idle loop delay (ms) |
| `tengu_byte_stream_idle_timeout_ms` | computed | Byte-stream idle timeout (env overrides) |
| `tengu_stream_watchdog_default_on` | **`true`** | Stream watchdog (env `CLAUDE_ENABLE_STREAM_WATCHDOG`) |
| `tengu_event_watchdog_default_on` | `false` | Event/SSE watchdog |
| `tengu_disable_keepalive_on_econnreset` | `false` | Disable keep-alive after ECONNRESET |
| `tengu_disable_streaming_to_non_streaming_fallback` | `false` | **Kill switch**: disable non-streaming fallback |
| `tengu_fgts` | `false` | Eager input streaming (firstParty) |
| `tengu_drift_lantern` | `false` | Event-loop stall detector |
| `tengu_trace_lantern` | `false` | Detailed beta tracing |
| `tengu_plum_vx3` | `false` | Disable thinking tokens for WebSearch |
| `tengu_tool_pear` | `false` | `strict:true` tool schemas + extra beta |

### Subscription / Upsells

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_copper_lantern` | `false` | Extra-usage upsell |
| `tengu_jade_anvil_4`, `tengu_coral_beacon`, `tengu_pewter_summit` | `false` | Upgrade/overage upsell variants |
| `tengu_amber_creek` | `false` | TUI fullscreen "downsell" gate |
| `tengu_pewter_brook` | `false` | TUI fullscreen GrowthBook rollout |
| `tengu_amber_lark` | `false` | Extra detail on usage status message |
| `tengu_c4e_slash_upsell` | `false` | Claude-for-Enterprise slash upsell |
| `tengu_desktop_upsell` | config | Claude Desktop upsell config |

### Tips / Promo Carousel

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_alder_compass` | `false` | `/powerup` tutorial tip |
| `tengu_cedar_plume` | `false` | Claude Design promo tip |
| `tengu_birch_kettle`, `tengu_dune_wren`, `tengu_garnet_finch` | `false` | Carousel tip items |
| `tengu_kestrel_arch` | `"off"` | Tip arm (== "on") |
| `tengu_pewter_lark` | `"off"` | Tip string-arm |
| `tengu_maple_pier` | `false` | Auto-default-mode onboarding nudge |
| `tengu_mocha_barista` | `false` | Append wording to `/schedule` skill desc |
| `tengu_startup_notice` | `""` | Free-form startup notice |

### Feedback / Surveys / IDE / Sessions / Diagnostics

| Flag | Default | What it gates |
|------|---------|---------------|
| `tengu_feedback_survey_config` | config | Feedback survey config |
| `tengu_bad_survey_transcript_ask_config` | config | Ask transcript on negative survey |
| `tengu_good_survey_transcript_ask_config` | config | Ask transcript on positive survey |
| `tengu_vscode_feedback_survey` | `false` | VS Code feedback survey |
| `tengu_vscode_onboarding` | `false` | VS Code onboarding |
| `tengu_vscode_review_upsell` | `false` | VS Code review upsell |
| `tengu_rename_full_session_fork` | `false` | Fork full session on rename |
| `tengu_agent_list_attach` | `false` | Agent/session list attach |
| `tengu_canary` | `{}` | Canary/diagnostics payload |
| `tengu_scratch` | `false` | Generic experimental gate |
| `tengu_sedge_lantern` | **`true`** | "Away summary" (env `CLAUDE_CODE_ENABLE_AWAY_SUMMARY`) |
| `tengu_sedge_lantern_config` | `{delayMs:180000}` | Away-summary config |
| `tengu_basalt_scarp`, `tengu_basalt_spur` | `false` | Diagnostics gates (require SN()) |
| `tengu_ember_latch` | `false` | Coordinator/state gate |
| `tengu_brick_follow`, `tengu_vellum_siding` | `false` | Telemetry-context feature gates |

---

## Notable Kill Switches

These flags **disable** a feature when set to `true` (or non-null):

| Flag | Effect when ON |
|------|----------------|
| `tengu_disable_bypass_permissions_mode` | Disables `--dangerously-skip-permissions` |
| `tengu_disable_keepalive_on_econnreset` | Disables HTTP keep-alive after reset |
| `tengu_disable_streaming_to_non_streaming_fallback` | Disables the non-streaming fallback path |
| `tengu_read_dedup_killswitch` | Disables Read-result dedup cache |
| `tengu_classifier_summary_kill` | Drops the classifier "summary" stage |
| `tengu_penguins_off` | Non-null string disables Fast mode (the string is the reason) |
| `tengu_iron_gate_closed` | Default-`true` fail-closed: **deny** when auto-mode classifier is unavailable |

`tengu_iron_gate_closed` is the most interesting: it's a *safety* kill switch defaulting to TRUE. When the auto-mode classifier can't run (e.g. context window exceeded), the tool call is denied with retry guidance rather than auto-approved (cli.beauty.js:450386).

## Dual-Gated Features (env var AND/OR GrowthBook)

| Feature | Env var | Flag | Logic |
|---------|---------|------|-------|
| Agent Teams | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` / `--agent-teams` | `tengu_amber_flint` | env/CLI **AND** flag |
| Background agents | `CLAUDE_AUTO_BACKGROUND_TASKS` | `tengu_auto_background_agents` | env **OR** flag |
| Workflows | `CLAUDE_CODE_WORKFLOWS` | `tengu_workflows_enabled` | env forces; else flag |
| Brief mode | `CLAUDE_CODE_BRIEF` | `tengu_kairos_brief` | env **OR** flag |
| Loop persistent / keepalive | `CLAUDE_CODE_LOOP_PERSISTENT` / `_KEEPALIVE` | `tengu_kairos_loop_*` | env **OR** flag |
| Cron scheduling | `CLAUDE_CODE_DISABLE_CRON` | `tengu_kairos_cron` | env disables; else flag (default on) |
| Away summary | `CLAUDE_CODE_ENABLE_AWAY_SUMMARY` | `tengu_sedge_lantern` | env overrides; else flag (default on) |
| New `/init` | `CLAUDE_CODE_NEW_INIT` | `tengu_slate_harbor_experiment` | env **OR** flag |
| Ownership / act / verify prompt arms | `CLAUDE_CODE_OWNERSHIP_FRAME` / `_ACT_DONT_REDERIVE` / `_VERIFY_PROMPT` | `tengu_walnut_prism` / `cedar_lantern` / `sparrow_ledger` | env overrides; else flag |
| Velvet falcon model | `CLAUDE_CODE_VELVET_FALCON` | `tengu_velvet_falcon_model` | env overrides; else flag |
| MCP output cap | `MAX_MCP_OUTPUT_TOKENS` | `tengu_velvet_ibis.mcp_tool` | env overrides; else flag |
| Stream watchdog | `CLAUDE_ENABLE_STREAM_WATCHDOG` | `tengu_stream_watchdog_default_on` / `event_watchdog_default_on` | env overrides; else flag |
| Advisor tool | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` / `_ENABLE_EXPERIMENTAL_ADVISOR_TOOL` | `tengu_sage_compass2.enabled` | env overrides; else flag |

## Flags whose precise purpose could not be confirmed

These are real `j$` gates but their concrete user-facing behavior was opaque at the call site (generic boolean gates inside minified UI/state code with no nearby strings). They are categorized by their surrounding code region as a best guess; treat the descriptions as tentative:

- **UI gates** (boolean, region = render/menu code, no descriptive strings): `tengu_amber_anchor`, `tengu_amber_lynx`, `tengu_compass_dial`, `tengu_gleaming_fair`, `tengu_gouda_loop`, `tengu_maple_sundial`, `tengu_shining_fractals`, `tengu_marlin_porch`, `tengu_ochre_hollow`, `tengu_cedar_marsh`, `tengu_cobalt_ridge`, `tengu_cobalt_thicket`, `tengu_loggia_carousel`, `tengu_slate_quill`, `tengu_slate_thimble`, `tengu_slate_harrier`.
- **Memory/dream cluster** (grouped by adjacency, individual roles unclear): `tengu_bramble_lintel`, `tengu_sepia_cormorant`, `tengu_sepia_moth`, `tengu_umber_petrel`, `tengu_shale_finch`, `tengu_billiard_aviary`, `tengu_passport_quail`.
- **State/diagnostics gates**: `tengu_ember_latch`, `tengu_basalt_scarp`, `tengu_basalt_spur`, `tengu_brick_follow`, `tengu_vellum_siding`, `tengu_scratch`, `tengu_chair_sermon`, `tengu_chert_bezel`, `tengu_amber_prism`, `tengu_paper_halyard`, `tengu_moth_copse`, `tengu_hawthorn_steeple`, `tengu_amber_sentinel`, `tengu_quiet_slate_wren`, `tengu_marble_lark`.

All other flags' behavior was confirmed at a cited call site.

### Summary

- **Total flags**: 218 (206 via primary accessors enumerated in `flags-j.txt` + 12 via `cS`/`gS`/`Cg8`/`lS` wrappers or flag-name constants).
- **Default TRUE**: `amber_flint`, `amber_sextant`, `coordinator_panel`, `bg_binary_takeover`, `bg_spare_enable`, `bg_attach_upgrade`, `bg_leftarrow_inprocess`, `kairos_cron`, `kairos_cron_durable`, `iron_gate_closed`, `bridge_repl_v2_cse_shim_enabled`, `workflows_enabled`, `fleetview_pr_batch`, `cedar_lantern`, `turtle_carbon`, `slate_prism`, `cobalt_thicket`, `compact_cache_prefix`, `memory_bulk_inflate`, `send_user_file`, `mcp_singleton_unwrap`, `plugin_official_mkt_git_fallback`, `slim_subagent_claudemd`, `keybinding_customization_release`, `xterm_atlas_reset`, `stream_watchdog_default_on`, `sedge_lantern`.
- **Default FALSE / off**: everything else (rolled out via GrowthBook).
- See [data/feature-flags.yaml](data/feature-flags.yaml) for the full structured dataset with per-flag line citations.
