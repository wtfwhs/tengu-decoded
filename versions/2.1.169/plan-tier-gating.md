# Plan and Tier Gating

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64
>
> Source: `/tmp/cc-deep/cli.beauty.js`. Minified identifiers change every build; names below are
> this-build's mangled symbols with line cites.

## Subscription Types (the plan enum)

The OAuth profile (`/api/oauth/profile`, fetched via `RjH`) maps `organization.organization_type`
to an internal `subscriptionType` in `R$8()` (`cli.beauty.js:93743`):

| `organization_type` | internal `subscriptionType` | helper |
|---|---|---|
| `claude_max` | `"max"` | `y8H()` -- isMax (`131613`) |
| `claude_pro` | `"pro"` | `V_H()` -- isPro (`131633`) |
| `claude_enterprise` | `"enterprise"` | `QnH()` (`131625`) |
| `claude_team` | `"team"` | `bV_()` (`131617`) |
| (anything else / API key) | `null` | -- |

The profile object (`R$8`, `93764`) now carries a richer billing/seat record:

```js
{ subscriptionType, rateLimitTier, seatTier, hasExtraUsageEnabled, billingType,
  ccOnboardingFlags, claudeCodeTrialEndsAt, claudeCodeTrialDurationDays,
  displayName, accountCreatedAt, subscriptionCreatedAt }
```

### Accessors
- `O4()` (`131605`) — current `subscriptionType` (the canonical plan getter; was `P0()` in 2.1.32).
- `ac()` (`131637`) — `rateLimitTier` (e.g. `default_claude_max_20x`).
- `_QK()` (`131646`) — `seatTier`.
- `F_()` (`131589`) — full `oauthAccount` object (billingType, hasExtraUsageEnabled, trial fields).
- `W98()` (`131650`) — display label: `Claude Enterprise / Team / Max / Pro / Claude API`.
- `hq()` (`131552`) — is OAuth/subscription auth (vs API-key). Gates almost every consumer feature.
- `geH()` (`273767`) — `billingType === "usage_based"` (org is metered, not credit-pool).
- `nDH()` (`131593`) — billing via a recognised store: `stripe_subscription`,
  `stripe_subscription_contracted`, `apple_subscription`, `google_play_subscription`.

### Combined helpers
- `AQK(H)` (`131747`) — `H === "max" || H === "pro"` (isPaidConsumer; was `$q0`).
- `CV_()` (`131600`) — any of max/enterprise/team/pro/null (covers all known states).
- `gjH()` (`131621`) — Team on `default_claude_max_5x` (special "Team 5x" tier).
- `lcH()` (`131629`) — Enterprise with `seatTier === "enterprise_usage_based"`.
- `hS()` (`93389`) — has billing access (max/pro, or org role admin/billing/owner/primary_owner).

### Plan/tier env overrides (`j7()` token shim, `132244`)
When `CLAUDE_CODE_OAUTH_TOKEN` (or a managed key) is present, the token record reads:
- `CLAUDE_CODE_SUBSCRIPTION_TYPE` → `subscriptionType`
- `CLAUDE_CODE_RATE_LIMIT_TIER` → `rateLimitTier`

Both also auto-set from a successful profile fetch (`94122`). There is **no live mock-plan
function** — `WY6()/ZY6()/GY6()` (the would-be plan/trial mock hooks at `93421`) are compiled to
`null`/`false` (`GY6` ends `&& !1`), so plan can only be overridden via these two env vars.

## Model Access by Plan

The default-model resolver `hG()` (`99543`) decides the startup model for OAuth users:

```js
function hG() {
  if (hq()) { if (y8H() || gjH() || lcH()) return HT() + (CW()?"[1m]":"") }   // Opus default
  else if (wz()) return HT() + (CW()?"[1m]":"");
  if (Mq() === "mantle") return FA().opus47;
  return KE();                                                                 // Sonnet default
}
```

So **Opus is the default only for Max, Team-5x, and Enterprise-usage-based**; **Pro defaults to
Sonnet** (and the default-option blurb `t88()` at `99592` reads "Sonnet · Best for everyday tasks"
for Pro). This matches 2.1.32 *for the default*.

**NEW vs 2.1.32 — Pro can now manually pick Opus (drawing from usage credits).** The model picker
`QGf()` (`460244`) builds the menu. For OAuth Pro (the non-Max branch at `460252`) it lists Opus
options with a "Draws from usage credits" suffix (`yd4`/`Ed4`, `460206`/`460216`) and, behind
`tengu_gypsum_kite`, a "~2× usage vs Sonnet" warning (`o4q()`, `460190`). In 2.1.32 Opus was
hard-blocked on Pro (model forced to Sonnet at startup); here it is *available but metered*.

### 1M context window
`CW()` (`99614`) — 1M-context-on-by-default. Returns **false** if `T_H()`
(`CLAUDE_CODE_DISABLE_1M_CONTEXT`, `129936`) **or `V_H()` (isPro) or non-firstParty, or OAuth with
`subscriptionType === null`.** So **Pro never gets 1M by default.**

1M *visibility in the picker* for OAuth users is gated by `bt()`/`_zH()` (`287690`/`287696`),
which delegate to `gr7()` (`287665`): 1M Opus/Sonnet options appear only when usage-credits /
overage are available (`cachedExtraUsageDisabledReason` is `null` or `out_of_credits`).
`V8H()` (`129945`) restricts 1M to `claude-opus-4-7`/`4-8` on firstParty(+1m)/anthropicAws/mantle.

> **CHANGED**: the 2.1.32 `marble_lantern` / `tengu_marble_lantern_disabled[_3p]` flags and the
> `/claude_code_sonnet_1m_access` "prepaid tier 3" API gate are **gone**. 1M access is now keyed on
> firstParty + model version + usage-credit availability, not a dedicated flag or tier API.

### Model-access summary

| Plan | Default model | Opus selectable | 1M default | 1M selectable |
|---|---|---|---|---|
| Free / API-key (`null`) | Sonnet (or `wz()` provider default) | provider-dependent | No (OAuth null) | provider-dependent |
| Pro | **Sonnet** | **Yes — metered (usage credits)** *(new)* | **No** | only if credits available |
| Max | **Opus** | Yes | Yes (Max 20x etc.) | Yes |
| Team | Sonnet; Opus if Team-5x | Yes | Team-5x only | if credits available |
| Enterprise | Sonnet; Opus if usage-based | Yes | usage-based only | if credits available |

Enterprise admins can also pin `availableModels` / `modelOverrides` / `fallbackModel` allow-lists
via managed settings (`56398`–`56400`).

## Agent Teams Teammate Limits

`Wp4()` (`444836`; was `ZoD()` in 2.1.32) — max teammates:

```js
if (env CLAUDE_CODE_PLAN_V2_AGENT_COUNT in 1..10) return it;
if (subscriptionType==="max" && rateLimitTier==="default_claude_max_20x") return 3;
if (subscriptionType==="enterprise" || "team") return 3;
return 1;
```

| Plan | Max teammates |
|---|---|
| Max **20x only** | 3 |
| Enterprise | 3 |
| Team | 3 |
| Pro / Max (non-20x) / API / Free | **1** (effectively disabled) |

**Override**: `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` (1–10). Unchanged from 2.1.32 except Max now
explicitly requires the **20x** tier (`131552`+ helpers split tiers more finely).

**NEW**: `Zp4()` (`444848`) — separate **explore-agent count**, default **3**, override
`CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` (1–10). Not plan-gated.

## Background Agents / Cloud Sessions / Workflows / Routines

Org policy reads go through `b7(name)` (`183916`); default **true** unless `policy-limits.json`
restricts, or a compliance taint (`hipaa`/`zdr`) applies (`Gi_`, `183963`). Relevant policies:
`allow_remote_sessions`, `allow_product_feedback`, `allow_web_fetch`, `allow_memory_sync`,
`allow_settings_sync`, `allow_voice_mode`, `allow_design_sync`, `allow_quick_web_setup`.

| Feature | Gate | Notes |
|---|---|---|
| **Cloud / remote sessions** (`/teleport`, `/tp`) | `hq() && b7("allow_remote_sessions")` (`511545`) | OAuth-only; throws "Cloud sessions are disabled by your organization's policy." (`371193`). |
| **Cloud-session promo / launch** | `o_() && hq() && !CLAUDE_CODE_REMOTE && j$("tengu_surreal_dali",!1) && b7("allow_remote_sessions")` (`404432`,`615038`) | Flag-gated; OAuth-only. |
| **Routines** (scheduled cloud agents, `claude.ai/code/routines`) | `RemoteTrigger` tool; needs `allow_remote_sessions` | API: `/v1/agents`, `/v1/environments` (`6199`,`5876`, beta). Requires GitHub App or `/web-setup` for repo access. |
| **Quick web setup** (`/web-setup`) | `j$("tengu_cobalt_lantern",!1) && b7("allow_remote_sessions") && b7("allow_quick_web_setup")` (`541085`) | Connects GitHub for cloud agents. |
| **Background agents** (in-process teammates → bg) | `hq()` + teammate limit `Wp4()` | In-process teammates **cannot** spawn bg agents (`396486`). Daemon: `tengu_bg_*`/`tengu_daemon_*` events. |
| **Workflows** | `RY8()` (`183974`): disabled by `CLAUDE_CODE_DISABLE_WORKFLOWS` or `settings.disableWorkflows`. Not plan-gated. |
| **`/bug` & feedback surfaces** | `b7("allow_product_feedback")` (`287862`,`454280`) | Off for ZDR/HIPAA orgs. |

No plan-tier (max/pro/team) directly gates cloud/workflows in 2.1.169 — gating is
**OAuth-vs-API-key** (`hq()`) plus **org policy** plus **GrowthBook flags**, not the plan enum.

## Rate-Limit Tiers & Usage Credits

Rate-limit types (`fG5`/`AG5`, `273859`/`273870`):

| `rateLimitType` | Surface label | Notes |
|---|---|---|
| `five_hour` | "session limit" | 5-hour rolling window. |
| `seven_day` | "weekly limit" | Weekly all-models. |
| `seven_day_opus` | "Opus limit" | Weekly Opus-specific. |
| `seven_day_sonnet` | "Sonnet limit" (Pro/Enterprise show "weekly limit") | Weekly Sonnet-specific. |
| `overage` | "usage" (usage-based) / "usage credits" | Extra-usage / credit pool. |

Key tier id: `default_claude_max_20x` (highest Max). Also `default_claude_max_5x`,
`enterprise_usage_based`.

**Usage-credits terminology shift** (NEW): the credit/overage pool is now surfaced as
**"usage credits"** (or "usage" / "usage allocation" for usage-based orgs via `geH()`).
`overageDisabledReason` enum drives the messaging: `out_of_credits`, `org_level_disabled_until`,
`org_service_level_disabled`, `seat_tier_level_disabled`, `seat_tier_zero_credit_limit`,
`member_level_disabled`, `member_zero_credit_limit`, `group_zero_credit_limit`,
`org_spend_cap_reached`, `overage_not_provisioned`, `no_limits_configured` (`273839`+,`287669`+).

**`/usage-credits` command** (`Te`, `386074`; was `/extra-usage`). "Configure usage credits to
keep working when you hit a limit." Enabled by `VK$()` (`386063`): not
`DISABLE_EXTRA_USAGE_COMMAND`, and `nDH()` (recognised store billing) or a local override.
`/extra-usage` still exists as a **hidden alias** that prints "**/extra-usage is now
/usage-credits**" (`py8`, `386034`). Docs note "The feature is unchanged" (`624178`).

**`/rate-limit-options`** (`Igf`, `528250`; hidden, OAuth-only) — the menu shown when a limit is
hit (`Sgf`, `528131`). Options assembled from `upgradePaths` + plan/credit state:
- "Request more / Switch to usage credits / Add funds" → `extra-usage` (when overage allowed).
- "Upgrade your plan" → `/upgrade` (shown unless Max-20x or team/enterprise; `Z0H.isEnabled()`).
- "Upgrade to Team plan" → opens `https://claude.ai/create/team` (behind `tengu_coral_beacon`).
- "Stop / Stop and wait for limit to reset".
- `tengu_jade_anvil_4` reorders the menu (puts Stop **last** instead of first).

**`/usage`** (aliases `cost`,`stats`, `511937`) — "Show session cost, plan usage, and activity
stats." Always available.

**Blocking-limit override**: `CLAUDE_CODE_BLOCKING_LIMIT_OVERRIDE` (`433186`) — a *test*
`testBlockingOverride` (parseInt) for the hard token blocking limit. `blocking_limit` is a turn
stop-reason (`429083`,`279220`).

**Per-plan runway nudges** (`zG5`, `273912`):
- five_hour, Pro/Max, not managed → "/upgrade to keep using Claude Code".
- five_hour/overage, team/enterprise with store billing → "/usage-credits to request more".
- `sd7()` (`273930`) — **Pro-only** weekly-limit nudge: "try /model sonnet · ~2× runway" (if on
  Opus) or "try /effort medium" (if effort high/xhigh/max).

## Upsell Mechanics

| Mechanism | Symbol / flag | Behaviour |
|---|---|---|
| `/upgrade` command | `Vgf`/`Z0H` (`527825`) | "Upgrade to Max for higher rate limits and more Opus." Enabled when `!mn()` (not managed) `&& !DISABLE_UPGRADE_COMMAND && O4()!=="enterprise"`. Opens `https://claude.ai/upgrade/max`; Max-20x users instead see "already on the highest Max…" (`527798`). |
| Rate-limit upsell text | `o4f()` (`386138`) | Decision matrix → e.g. "/upgrade to increase your usage limit.", "/upgrade or /usage-credits to finish…", "/usage-credits to request more usage from your admin." Honors server `upgradePaths` allow-list (`upgrade_plan`/`overage`). |
| Team upsell in menu | `tengu_coral_beacon` (`528177`) | Adds "Upgrade to Team plan" → `claude.ai/create/team`. |
| Menu ordering | `tengu_jade_anvil_4` (`528135`) | Stop option moved to end. |
| C4E slash-command upsell | `tengu_c4e_slash_upsell` (`524643`) | For **API-key (non-OAuth)** users: gated commands become hidden upsell shims printing "/X is available with Claude for Enterprise — ask your admin about migrating from API-key access." Event `tengu_c4e_slash_upsell_shown`. |
| Desktop-app upsell | `tengu_desktop_upsell` (config flag, `632843`) | Startup dialog promoting the desktop app. Default config object `H3A` = all `false` (`632970`), max 3 views, dismissable (`desktopUpsellDismissed`/`desktopUpsellSeenCount`). Event `tengu_desktop_upsell_shown`. |
| Pro→Opus cost warning | `tengu_gypsum_kite` (`460191`) | Adds "~2× usage vs Sonnet" to Opus picker entries for Pro. |
| Schedule offer | `tengu_schedule_offer` → event `tengu_schedule_offer_shown` (`431248`) | Offers to schedule a recurring/cloud run. |
| Spend-limit copy | `tengu_pewter_summit` (`Uy8`, `386115`) | Org-level-disabled-until balance nudge in `/rate-limit-options`. |

> No `tengu_silver_lantern`-style promo found in this build. `tengu_copper_lantern` is just a
> telemetry/feature ping (`140842`,`660633`), not an upsell. Many `*_lantern` flags exist
> (`sedge`, `cedar`, `cobalt`, `trace`, `drift`, `copper`) — mostly feature toggles, not promos.

## Trial Flows (Pro trial)

State machine in `E9$` module (`496344`+):
- `i5q()` — `claudeCodeTrialDurationDays`; `PRO_TRIAL_FALLBACK_DAYS = 14` (`t$9`, `496432`).
- `y9$()` (`496356`) — current trial state. Only for `O4()==="pro"`; eligibility from
  `ccOnboardingFlags.e10 === true`; computes from `claudeCodeTrialEndsAt`.
- `Yu8()` (`496401`) — status: `active` (with `daysRemaining`), `expired`, `not_started`,
  `ineligible`.
- `r5q()` (`496364`) — **start trial**: `POST /api/oauth/organizations/:orgUUID/claude_code/pro_trial`
  (auth `teleport-org`). Events `tengu_pro_trial_start_pressed/ok/error` (`643122`).
- `Kx$()` (`496387`) — badge: "Trial: N days left" / "Usage credits" (expired).
- `o5q()` (`496382`) — `shouldAutoOpenProTrialExpired` when expired and overage is disabled.

**`pro-trial-expired`** screen (`iA9`, `527835`; routed via `/pro-trial-expired`, `527921`,
`640215`): "Your Claude Code trial has ended." → choices "Upgrade to Max" (`nx$`) or "Add funds to
continue with usage credits" (`kS$`). Event `tengu_pro_trial_expired_choice {chose_upgrade}`.
Trial-start screen events: `tengu_pro_trial_start_screen_shown` (`644146`).

**`MOCK_TRIAL` / `CLAUDE_CODE_MOCK_TRIAL`** (`R01`, `45986`): the mock-trial state machine
`TY6()` (`93437`) accepts `not-started` | `expired` | a positive number-of-days, BUT in this prod
build it is **dead code** — `TY6()` begins with `return null;` and `UjK()` (`93457`) is a no-op
`return`. So `CLAUDE_CODE_MOCK_TRIAL` has no effect in 2.1.169 release builds.

## Feature Availability Matrix

| Feature | Free / API | Pro | Max | Team | Enterprise |
|---|---|---|---|---|---|
| Opus default | provider | No (Sonnet) | **Yes** | Team-5x only | usage-based only |
| Opus *selectable* | provider | **Yes (metered)** *new* | Yes | Yes | Yes |
| 1M context default | No | **No** | Yes (20x etc.) | 5x only | usage-based only |
| 1M *selectable* | provider | if credits | Yes | if credits | if credits |
| Agent Teams | 1 (off) | 1 (off) | 3 *(20x only)* | 3 | 3 |
| `/upgrade` | Yes (if OAuth) | Yes | Yes (no-op if 20x) | Yes | **Hidden** |
| `/usage-credits` | If billing recognised | Yes | Yes | Yes/admin | Yes/admin |
| `/teleport` (cloud) | OAuth + policy | OAuth + policy | OAuth + policy | + policy | + policy |
| `/privacy-settings` (`w5H`, `131751`) | No | **Yes** | **Yes** | No | No |
| `/bug` & feedback | policy | policy | policy | policy | policy (off if ZDR/HIPAA) |

`/privacy-settings` is **consumer-only** (max/pro): `w5H() = hq() && O4()!==null && AQK(O4())`.

## Organization Policies

`b7(name)` (`183916`) — defaults true; `policy-limits.json` (`Zi_`) can flip `allowed:false`;
compliance taints (`Gi_`, `183963`) force-disable:
- `hipaa` → web_fetch, memory_sync, settings_sync, voice_mode, design_sync, remote_sessions
- `zdr` → memory_sync

`allow_product_feedback` / `allow_remote_sessions` are the user-visible gates (`Ti_`, `183971`).
`product_feedback_disabled` is surfaced to IDE clients (`279876`) so they hide thumbs/surveys.

## What's New vs 2.1.32

1. **Pro can now select Opus** (metered against usage credits) instead of being hard-switched to
   Sonnet. Default still Sonnet for Pro; warning via `tengu_gypsum_kite`.
2. **`/extra-usage` renamed to `/usage-credits`** (old name kept as hidden alias with a redirect
   notice). Terminology shifted from "extra usage" to "usage credits"/"usage allocation".
3. **`marble_lantern` 1M flags and the `/claude_code_sonnet_1m_access` tier-3 API gate removed.**
   1M now gated on firstParty + opus-4-7/4-8 + usage-credit availability (`gr7`).
4. **Richer profile**: `seatTier`, `billingType`, `hasExtraUsageEnabled`, `ccOnboardingFlags`,
   `claudeCodeTrialEndsAt/DurationDays` added to the oauthAccount record.
5. **Finer tier helpers**: Team-5x (`gjH`/`default_claude_max_5x`) and Enterprise-usage-based
   (`lcH`/`enterprise_usage_based`) are now first-class for model/teammate gating.
6. **Max teammate limit now explicitly requires the 20x tier** (`Wp4`); plus new
   `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` (explore-agent count, default 3).
7. **New upsell surfaces**: `tengu_c4e_slash_upsell` (Enterprise migration for API-key users),
   `tengu_desktop_upsell` (desktop-app startup dialog), `tengu_coral_beacon` (Team upsell),
   `tengu_jade_anvil_4` (menu reorder). Segment-based upsell telemetry is gone (Segment removed).
8. **Cloud/routines surface**: `/teleport`, `claude.ai/code/routines`, `/v1/agents`,
   `/v1/environments`, `tengu_surreal_dali` (cloud promo), `tengu_cobalt_lantern` (`/web-setup`).
9. **`CLAUDE_CODE_MOCK_TRIAL` and the plan/trial mock hooks are compiled out** (dead code) in
   release builds.

## Uncertainties

- Whether Pro's metered-Opus is enforced server-side or merely surfaced client-side — the client
  only annotates "Draws from usage credits"; actual enforcement is server-side and not visible.
- Exact numeric values of `five_hour`/`seven_day` limits per tier are server-driven (not in the
  binary); only the *type labels* and reset/utilization rendering are local.
- `tengu_surreal_dali` (cloud) and `tengu_cobalt_lantern` (web-setup) defaults are `!1` (off) in
  code; real rollout state is GrowthBook-side and unknown from the binary.
- `upgradePaths` is a server-provided string array (`upgrade_plan`/`overage`/…) consumed by the
  upsell UI; its full domain isn't enumerable from the client.
