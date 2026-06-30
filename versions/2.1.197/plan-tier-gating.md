# Plan and Tier Gating

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64
>
> Source: `cli.beauty.js` (733,394 lines, carved from the Bun v1.4.0 binary). Minified identifiers
> change every build; names below are this-build's mangled symbols with line cites. Deltas are vs
> **2.1.169** (the previous deep analysis).

## Symbol map (2.1.169 → 2.1.197)

The whole plan-gating cluster was re-minified. Same logic, new names:

| Role | 2.1.197 | Line | 2.1.169 was |
|---|---|---|---|
| `subscriptionType` getter | `Di()` | `134480` | `O4()` |
| `rateLimitTier` getter | `TW()` | `134512` | `ac()` |
| `seatTier` getter | `Axi()` | `134521` | `_QK()` |
| `oauthAccount` object | `Oc()` | `134464` | `F_()` |
| plan display label | `Exn()` | `134525` | `W98()` |
| isOAuth (broad) | `aS()` | `133459` | `hq()` |
| consumer-OAuth (scoped) | `Ao()` | `134427` | (part of `hq`) |
| isMax | `zle()` | `134488` | `y8H()` |
| isPro | `Jye()` | `134508` | `V_H()` |
| isEnterprise | `tit()` | `134500` | `QnH()` |
| isTeam | `PMd()` | `134492` | `bV_()` |
| Team-5x | `Nxe()` | `134496` | `gjH()` |
| Enterprise-usage-based | `Xye()` | `134504` | `lcH()` |
| isPaidConsumer (max\|\|pro) | `Txi()` | `134622` | `AQK()` |
| any-known-plan | `DMd()` | `134475` | `CV_()` |
| recognised store billing | `Uke()` | `134468` | `nDH()` |
| billingType==="usage_based" | `fU()` | `134985` | `geH()` |
| has billing access | `sH()` | `94975` | `hS()` |
| default-model resolver | `$4r()` | `101904` | `hG()` |
| 1M-context-on-by-default | `cT()` | `102338` | `CW()` |
| `CLAUDE_CODE_DISABLE_1M_CONTEXT` | `Yye()` | `132482` | `T_H()` |
| max teammates | `Sfc()` | `600477` | `Wp4()` |
| explore-agent count | `Efc()` | `600489` | `Zp4()` |
| org-policy read | `js()` | `145859` | `b7()` |
| usage-credits cmd enabled | `Y_t()` | `378623` | `VK$()` |
| rate-limit upsell text | `Ncf()` | `378698` | `o4f()` |
| privacy-settings gate | `G_e()` | `134626` | `w5H()` |

## Subscription Types (the plan enum)

The OAuth profile (`/api/oauth/profile`) maps `organization.organization_type` to an internal
`subscriptionType` in `mAn()` (`cli.beauty.js:95337`):

| `organization_type` | internal `subscriptionType` | helper |
|---|---|---|
| `claude_max` | `"max"` | `zle()` — isMax (`134488`) |
| `claude_pro` | `"pro"` | `Jye()` — isPro (`134508`) |
| `claude_enterprise` | `"enterprise"` | `tit()` (`134500`) |
| `claude_team` | `"team"` | `PMd()` (`134492`) |
| (anything else / API key) | `null` | — |

The profile object (`mAn`, `95358`) carries the same rich billing/seat record as 2.1.169 — unchanged
shape:

```js
{ subscriptionType, rateLimitTier, seatTier, hasExtraUsageEnabled, billingType,
  ccOnboardingFlags, claudeCodeTrialEndsAt, claudeCodeTrialDurationDays,
  displayName, accountCreatedAt, subscriptionCreatedAt, rawProfile }
```

### Accessors
- `Di()` (`134480`) — current `subscriptionType`, the canonical plan getter. Checks the (dead) mock
  override `a2r()` first, then `aS()` (OAuth), then `qs().subscriptionType`.
- `TW()` (`134512`) — `rateLimitTier` (e.g. `default_claude_max_20x`). Checks env override `s2r()`
  (dead) first.
- `Axi()` (`134521`) — `seatTier`.
- `Oc()` (`134464`) — full `oauthAccount` object (billingType, hasExtraUsageEnabled, trial fields).
- `Exn()` (`134525`) — display label: `Claude Enterprise / Team / Max / Pro / Claude API`.
- `aS()` (`133459`) — is OAuth/subscription auth (vs API-key). Gates almost every consumer feature.
- `Ao()` (`134427`) — `aS() && xj(scopes)`: consumer-OAuth with subscription scopes. This is the
  narrower predicate used for the privacy/trial/usage-credit surfaces.
- `fU()` (`134985`) — `billingType === "usage_based"` (org is metered, not credit-pool).
- `Uke()` (`134468`) — billing via a recognised store: `stripe_subscription`,
  `stripe_subscription_contracted`, `apple_subscription`, `google_play_subscription`.

### Combined helpers
- `Txi(H)` (`134622`) — `H === "max" || H === "pro"` (isPaidConsumer).
- `DMd()` (`134475`) — any of max/enterprise/team/pro/null (covers all known states).
- `Nxe()` (`134496`) — Team on `default_claude_max_5x` (special "Team 5x" tier).
- `Xye()` (`134504`) — Enterprise with `seatTier === "enterprise_usage_based"`.
- `sH()` (`94975`) — has billing access: max/pro, or org role
  `admin`/`billing`/`owner`/`primary_owner`.

### Plan/tier env overrides + mock deadness
When `CLAUDE_CODE_OAUTH_TOKEN` (or a managed key via `W9()`) is present, the token record `qs()`
(`135126`) reads:
- `CLAUDE_CODE_SUBSCRIPTION_TYPE` → `subscriptionType` (`135133`,`135142`)
- `CLAUDE_CODE_RATE_LIMIT_TIER` → `rateLimitTier` (`135134`,`135143`)

Both also auto-set onto `process.env` from a successful profile fetch (`95851`–`95852`). As in
2.1.169 there is **no live mock-plan function** — the would-be plan/tier mock hooks are compiled to
constants: `s2r()` (`95011`) → `null`, `i2r()` (`95015`) → `null`, and the enable gate `a2r()`
(`95019`) ends in `&& !1` so it is always false. Plan can therefore only be overridden via those two
env vars.

## Model Access by Plan

The default-model resolver `$4r()` (`101904`) decides the startup model for OAuth users:

```js
function $4r() {
  if (Ao()) {
    if (zle() || Nxe() || Xye()) return { setting: cT() ? bU(O_()) : O_(), envFamily: "opus" };
  } else if (ud()) return { setting: cT() ? bU(O_()) : O_(), envFamily: "opus" };
  if (yr() === "mantle") return { setting: zd()[zMt], envFamily: null, ... };
  return { setting: nE(), envFamily: "sonnet" };
}
```

So **Opus is the default only for Max, Team-5x, and Enterprise-usage-based**; **Pro defaults to
Sonnet** (it is not in the `zle() || Nxe() || Xye()` branch). The default-option blurb reads "Best for
everyday, complex tasks" (`K4t`, `231901`). Behaviour identical to 2.1.169 for the default.

**Pro can manually pick Opus, metered against usage credits** (carried over from 2.1.169). The model
picker options annotate `" · Draws from usage credits"` via `Ao() ? … : ""` (`Xua()` `231424`, `Jua()`
`231435` for the 1M variants; the plain Opus option `Wlo()` `231413`). For Pro, the cost-warning
`" · ~2× usage vs Sonnet"` is appended by `Glo()` (`231408`) behind flag **`tengu_gypsum_kite`**
(`231409`). Enforcement remains server-side; the client only annotates.

### Fast mode (NEW in 2.1.197 — a `-fast` model tier gated on plan + usage credits)

2.1.197 introduces a "Fast mode" (the `claude-opus-4-7-fast` / opus-4-8 fast path; `iW()` = "Opus 4.8",
`100656`). It is its own plan/credit gate:

- `uc()` (`100600`) — Fast mode available only on **firstParty** and not
  `CLAUDE_CODE_DISABLE_FAST_MODE`.
- `Ule()` (`100629`) — full availability check: respects flag `tengu_penguins_off` (`100631`), the
  org's allowed-models list, an org status probe (`w1.status`), and the Agent SDK exclusion.
- `Khd(reason, authKind)` (`100614`) — the plan-tier messaging:
  - `"free"` → `"Fast mode requires a paid subscription"` (OAuth) / `"…purchase credits"` (eval/API)
  - `"extra_usage_disabled"` → `"Fast mode requires usage credits · /usage-credits to turn them on"`
  - `"preference"` → `"Fast mode has been disabled by your organization"`
- `Yhd(overageDisabledReason)` (`100742`) — maps the **same `overageDisabledReason` enum** used for
  usage-credits to Fast-mode copy (`out_of_credits` → "usage credits exhausted",
  `seat_tier_zero_credit_limit`/`member_zero_credit_limit` → "usage credits not available for your
  plan", etc.).
- Env escape hatches: `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK` (`100606`),
  `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS` (`100647`). Cooldown telemetry:
  `tengu_fast_mode_fallback_triggered` (`100717`).

Net: Fast mode is **free-tier-blocked** ("requires a paid subscription") and, beyond that, **gated on
usage-credit availability** — a brand-new plan-tier surface that did not exist in 2.1.169.

### Fable model + credits-only tiers (NEW)

The picker now offers a **Fable** option (`Ulo()`, `231252`): `"Fable 5 · … · Requires usage credits"`
when `!hF() && Sde()`. Out-of-credit messaging is Fable-specific: "You're out of usage credits. Run
/usage-credits to keep using Fable 5…" (`233791`).

Two NEW helpers formalise "credits-only" plans:
- `hF()` (`230975`) — "usage credits not applicable": true if non-firstParty, not consumer-OAuth,
  Enterprise-usage-based, **or `rateLimitTier === "default_claude_zero"`** (a NEW zero tier id).
- `Ede()` (`230998`) / `tfp()` (`230979`) — is the plan a credits-only tier: Enterprise (non-usage)
  OR a plan listed in flag **`tengu_saffron_credits_only_tiers`** (default `["enterprise"]`, `kua`,
  `231106`). Server-tunable allow-list — NEW.

### 1M context window
`cT()` (`102338`) — 1M-context-on-by-default. Returns **false** if `Yye()`
(`CLAUDE_CODE_DISABLE_1M_CONTEXT`, `132482`) **or `Jye()` (isPro) or non-firstParty, or OAuth with
`subscriptionType === null`**. So **Pro never gets 1M by default** — unchanged from 2.1.169.

The 1M picker entries (`Xua()`/`Jua()`, `231422`/`231433`) surface "Sonnet 4.6 (1M context)" / "Opus
(1M context)" with the "Draws from usage credits" suffix for consumer-OAuth.

### Model-access summary

| Plan | Default model | Opus selectable | 1M default | Fast mode |
|---|---|---|---|---|
| Free / API-key (`null`) | Sonnet (or `ud()` provider default) | provider-dependent | No (OAuth null) | **No — "requires a paid subscription"** |
| Pro | **Sonnet** | Yes — metered (usage credits) | **No** | Yes if usage credits |
| Max | **Opus** | Yes | Yes (Max 20x etc.) | Yes if usage credits |
| Team | Sonnet; Opus if Team-5x | Yes | Team-5x only | Yes if usage credits |
| Enterprise | Sonnet; Opus if usage-based | Yes | usage-based only | Yes if usage credits |

Enterprise admins can still pin `availableModels`/`enforceAvailableModels` allow-lists via managed
settings (consumed in `ZMt()`, `231925`).

## Agent Teams Teammate Limits

`Sfc()` (`600477`; was `Wp4()`) — max teammates, logic unchanged:

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

**Override**: `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` (1–10). Separate explore-agent count `Efc()`
(`600489`) — default **3**, override `CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT` (1–10), not
plan-gated. Both identical to 2.1.169.

## Background Agents / Cloud Sessions / Workflows / Routines

Org policy reads go through `js(name)` (`145859`; was `b7`), default **true** unless a managed
`policySettings` flips `allowed:false`, or a compliance taint applies (`UFd` table defined `145923`, iterated in `js()` at `145871`).
Throwing wrapper: `DW(name, label, verb)` (`145876`) — returns the "disabled by your organization's
policy" string.

| Feature | Gate | Notes |
|---|---|---|
| **Cloud / remote sessions** | `DW("allow_remote_sessions", "Cloud sessions", "are")` (`360774`,`361176`) | Throws "Cloud sessions are disabled by your organization's policy." (`361745`). |
| **Cloud-session promo** | `xc() && Ao() && !CLAUDE_CODE_REMOTE && it("tengu_surreal_dali",!1) && js("allow_remote_sessions")` (`429837`) | Flag-gated; consumer-OAuth-only. |
| **Ultraplan / cloud create** | `js("allow_remote_sessions")` (`536141`) | Event `tengu_ultraplan_create_failed` if denied. |
| **Quick web setup** | `js("allow_remote_sessions")` + remote-session predicate (`477316`) | Connects GitHub for cloud agents. |
| **`/bug` & feedback** | `js("allow_product_feedback")` | Off for ZDR/HIPAA orgs. |

No plan-tier (max/pro/team) directly gates cloud/workflows — gating is **OAuth-vs-API-key** (`aS`/`Ao`)
plus **org policy** (`js`) plus **GrowthBook flags**, not the plan enum. Same posture as 2.1.169.

## Rate-Limit Tiers & Usage Credits

Rate-limit types (`232354`+):

| `rateLimitType` | Surface label | Notes |
|---|---|---|
| `five_hour` | "session limit" | 5-hour rolling window. |
| `seven_day` | "weekly limit" | Weekly all-models. |
| `seven_day_opus` | "Opus limit" | Weekly Opus-specific. |
| `seven_day_sonnet` | "Sonnet limit" | Weekly Sonnet-specific. |
| `overage` | "usage" (usage-based via `fU()`) / "usage credits" | Extra-usage / credit pool. |

Known tier ids: `default_claude_max_20x` (highest Max), `default_claude_max_5x`,
`enterprise_usage_based`, and **NEW `default_claude_zero`** (`230976`) — a zero/credits-only tier
treated by `hF()` as "usage credits not applicable".

The `overageDisabledReason` enum drives both usage-credit and Fast-mode messaging:
`out_of_credits`, `org_level_disabled_until`, `org_service_level_disabled`, `org_spend_cap_reached`,
`seat_tier_level_disabled`, `seat_tier_zero_credit_limit`, `member_level_disabled`,
`member_zero_credit_limit`, `group_zero_credit_limit`, `overage_not_provisioned`,
`no_limits_configured` (`232323`+, `100744`+).

**`/usage-credits`** (`yse`/`ako`, `378634`/`378643`; was `/extra-usage`). "Configure usage credits to
keep working when you hit a limit." Enabled by `Y_t()` (`378623`): not `DISABLE_EXTRA_USAGE_COMMAND`,
and `R0()` override (dead, returns null) or `Uke()` (recognised store billing). Split into a
`local-jsx` (interactive) and `local` (non-interactive, `Cr()`) variant. `/extra-usage` survives as a
**hidden alias** described "Renamed to /usage-credits" (`lko`/`cko`, `378653`/`378663`).

**`/rate-limit-options`** (`lQf`, `560709`; hidden, OAuth-only `isEnabled: () => Ao() || !1`). The
menu (`trc`/`560601`) assembles options from `upgradePaths` + plan/credit state: flag
`tengu_jade_anvil_4` reorders it, `tengu_coral_beacon` adds the Team upsell, spend-limit copy via
`tengu_pewter_summit` (`xYn`, `378675`).

**`/usage`** (aliases `cost`,`stats`, `543731`) — "Show session cost, plan usage, and activity stats."
Always available.

**Per-plan runway nudges** (decision matrix `232415`+): `five_hour` for Pro/Max not managed →
"/upgrade to keep using Claude Code" (`232419`, gated `!gJ()`); team/enterprise with store billing →
"/usage-credits to …".

**NEW — context-tips nudge engine** (`351080`+, gated by various flags). Several rules are explicitly
plan-keyed:
- `high-effort-low-yield` — Pro on high/xhigh/max effort with a tiny output after a big thinking block
  → suggest `/effort medium` (`351086`).
- `opus-on-pro-near-limit` — Pro running Opus past 50% of window → suggest `/model`, behind NEW flag
  **`tengu_cobalt_heron`** (`351092`). This is the successor to 2.1.169's Pro-only weekly nudge `sd7()`.
- `pro-compact-threshold` — Pro past 200K tokens with no autoCompactWindow → suggest setting
  `autoCompactWindow: 200000` (`351104`).

## Upsell Mechanics

| Mechanism | Symbol / flag | Behaviour |
|---|---|---|
| `/upgrade` command | `ZJf` (`560281`) | "Upgrade to Max for higher rate limits and more Opus." `isEnabled: () => !gJ() && !DISABLE_UPGRADE_COMMAND && Di() !== "enterprise"` (`560286`). Opens `https://claude.ai/upgrade/max` (`560247`). |
| Upgrade availability helper | `nQf()` (`560389`) | `!gJ() && !DISABLE_UPGRADE_COMMAND && Di() !== "enterprise"` — reused in menus. |
| Rate-limit upsell text | `Ncf()` (`378698`) | Decision matrix → "/upgrade to increase your usage limit.", "/upgrade or /usage-credits to finish…", "/usage-credits to request more usage from your admin." Honors server `upgradePaths` (`upgrade_plan`/`overage`). |
| Team upsell in menu | `tengu_coral_beacon` (`378761`,`560601`) | Adds "Upgrade to Team plan" → `claude.ai/create/team`. |
| Menu ordering | `tengu_jade_anvil_4` (`560601`) | Reorders the rate-limit menu. |
| C4E slash-command upsell | `tengu_c4e_slash_upsell` (`556779`) | For **API-key (non-OAuth)** users (`vNe() && !Cr()`): gated commands become hidden shims printing "/X is available with Claude for Enterprise — ask your admin about migrating from API-key access." (`JXf`, `556782`). Event `tengu_c4e_slash_upsell_shown`. |
| Desktop-app upsell | `tengu_desktop_upsell` (`685382`) | Startup dialog promoting the desktop app. |
| Pro→Opus cost warning | `tengu_gypsum_kite` (`231409`) | Adds "~2× usage vs Sonnet" to Opus picker entries for Pro. |
| Opus-on-Pro near-limit nudge | `tengu_cobalt_heron` (`351092`) | "/model" suggestion at >50% window. |
| Spend-limit copy | `tengu_pewter_summit` (`xYn`, `378675`) | Org-level-disabled-until balance nudge in `/rate-limit-options`. |

`gJ()` (`232206`) is now a **feature flag** `tengu_idle_amber_finch` (default `false`), not a direct
managed-install probe — when on, `/upgrade` and the upgrade nudges are suppressed. This is a CHANGE
from 2.1.169's `mn()` managed-check; the gate is now server-flag-driven.

## Trial Flows (Pro trial)

State machine around `527614`+:
- `C4o()` (`527615`) — `claudeCodeTrialDurationDays` (was `i5q()`); `PRO_TRIAL_FALLBACK_DAYS = 14`
  (`N8l`, `527694`).
- `EHt()` (`527618`) — current trial state (was `y9$()`). Only for `Di() === "pro"`; eligibility from
  `ccOnboardingFlags.e10 === true`; computes from `claudeCodeTrialEndsAt`. Checks mock `l2r()` first.
- `hir(eligible, endsAt)` (`527663`) — status (was `Yu8()`): `active` (with `daysRemaining`),
  `expired`, `not_started`, `ineligible`.
- `I4o()` (`527626`) — **start trial** (was `r5q()`):
  `POST /api/oauth/organizations/:orgUUID/claude_code/pro_trial` (auth `teleport-org`). Events
  `tengu_pro_trial_start_pressed/ok/error` (`697402`).
- `EQt()` (`527649`) — badge: "Trial: N days left" / "Usage credits" (expired) (was `Kx$()`).
- `x4o()` (`527644`) — `shouldAutoOpenProTrialExpired` when expired and overage is disabled (was
  `o5q()`).

**`pro-trial-expired`** screen (`tQf`, `560380`; hidden, routed via `/pro-trial-expired`): "Your Claude
Code trial has ended." → choices "Upgrade to Max" or "Add funds to continue with usage credits"
(`Vnc`, `560291`). Event `tengu_pro_trial_expired_choice {chose_upgrade}` (`560326`).

**`CLAUDE_CODE_MOCK_TRIAL`** (`ALu`, env registry `46448`): the mock-trial path `l2r()` (`95027`)
begins `return null;` (dead code before its `switch`), so `CLAUDE_CODE_MOCK_TRIAL` has **no effect** in
2.1.197 release builds — same as 2.1.169.

## Feature Availability Matrix

| Feature | Free / API | Pro | Max | Team | Enterprise |
|---|---|---|---|---|---|
| Opus default | provider | No (Sonnet) | **Yes** | Team-5x only | usage-based only |
| Opus *selectable* | provider | Yes (metered) | Yes | Yes | Yes |
| 1M context default | No | **No** | Yes (20x etc.) | 5x only | usage-based only |
| Fast mode | **No (paid only)** | if credits | if credits | if credits | if credits |
| Agent Teams | 1 (off) | 1 (off) | 3 *(20x only)* | 3 | 3 |
| `/upgrade` | Yes (if OAuth) | Yes | Yes (no-op if 20x) | Yes | **Hidden** (`Di()!=="enterprise"`) |
| `/usage-credits` | If billing recognised | Yes | Yes | Yes/admin | Yes/admin |
| Cloud/remote sessions | OAuth + policy | OAuth + policy | OAuth + policy | + policy | + policy |
| `/privacy-settings` (`G_e`, `134626`) | No | **Yes** | **Yes** | No | No |
| `/bug` & feedback | policy | policy | policy | policy | policy (off if ZDR/HIPAA) |

`/privacy-settings` (`bYf`, `547852`) is **consumer-only** (max/pro): `isEnabled: () => G_e()` and
`G_e() = Ao() && Di() !== null && Txi(Di())` (`134626`).

## Organization Policies

`js(name)` (`145859`) — defaults true; managed `policySettings` can flip `allowed:false`; compliance
taints (`UFd`, defined `145923`, iterated in `js()` at `145871`) force-disable. The taint table grew in 2.1.197:
- `hipaa` → web_fetch, memory_sync, settings_sync, voice_mode, design_sync, **projects_tool**,
  remote_sessions, **cobalt_plinth**, **team_onboarding**, **team_discovery**, **error_reporting**,
  **context_tips**, **desktop_handoff**
- `zdr` → memory_sync, **cobalt_plinth**, **error_reporting**

(In 2.1.169 the hipaa set was just web_fetch/memory_sync/settings_sync/voice_mode/design_sync/remote_sessions
and zdr was memory_sync only — so the bolded entries above, including `error_reporting` on both, are NEW.)

`FFd` (`145940`) — the user-visible policy set — now `{allow_product_feedback, allow_remote_sessions,
allow_cobalt_plinth, allow_error_reporting, allow_desktop_handoff}` (was just product_feedback +
remote_sessions in 2.1.169). `DW()` (`145876`) wraps `js()` to throw the policy-denied string.

## What's New vs 2.1.169

1. **Fast mode is a new plan/credit gate.** The `-fast` Opus path is **free-tier-blocked** ("requires
   a paid subscription", `Khd()` `100614`) and otherwise gated on usage-credit availability
   (`Yhd()` reuses the `overageDisabledReason` enum, `100742`). New envs
   `CLAUDE_CODE_DISABLE_FAST_MODE`, `CLAUDE_CODE_SKIP_FAST_MODE_ORG_CHECK`,
   `CLAUDE_CODE_SKIP_FAST_MODE_NETWORK_ERRORS`; new flag `tengu_penguins_off`.
2. **Fable model + "credits-only tiers".** New picker option "Fable 5 · Requires usage credits"
   (`Ulo()` `231252`); new helpers `hF()` (`230975`) and `Ede()`/`tfp()` (`230998`/`230979`) with new
   flag **`tengu_saffron_credits_only_tiers`** (default `["enterprise"]`) and new tier id
   **`default_claude_zero`**.
3. **New per-plan nudge engine** (`351080`+) replaces the single `sd7()` weekly nudge: Pro effort-down
   (`/effort medium`), Pro Opus-near-limit (`/model`, flag `tengu_cobalt_heron`), Pro compact-threshold
   (autoCompactWindow).
4. **`gJ()` is now a feature flag** (`tengu_idle_amber_finch`, `232206`) gating `/upgrade`
   visibility/nudges, instead of 2.1.169's managed-install function `mn()`.
5. **Wider org-policy surface**: new compliance-taint targets — hipaa gains `projects_tool`,
   `cobalt_plinth`, `team_onboarding`, `team_discovery`, `error_reporting`, `context_tips`,
   `desktop_handoff`; zdr gains `cobalt_plinth` and `error_reporting` — plus a larger user-visible
   policy set `FFd` (`145940`).
6. **Plan enum, accessors, teammate limits, 1M-context gating, Pro-metered-Opus, and the Pro-trial
   state machine are functionally unchanged** — only re-minified (see symbol map). `CLAUDE_CODE_MOCK_TRIAL`
   and the plan/tier mock hooks remain compiled-out dead code.

## Uncertainties

- Whether Pro's metered-Opus and Fast-mode credit consumption are enforced server-side or merely
  surfaced — the client only annotates "Draws from usage credits" / Fast-mode reasons; actual
  enforcement is server-side.
- Exact numeric `five_hour`/`seven_day` limits per tier are server-driven; only type labels and
  reset/utilization rendering are local.
- `default_claude_zero` semantics: it appears only in `hF()` (`230976`) as a credits-not-applicable
  tier; its full server meaning isn't enumerable from the binary.
- `tengu_saffron_credits_only_tiers` default is `["enterprise"]` (`kua`, `231106`); real rollout value
  is GrowthBook-side. Likewise `tengu_cobalt_heron`, `tengu_surreal_dali`, `tengu_gypsum_kite`,
  `tengu_idle_amber_finch` defaults are `!1`/code-side only.
- `upgradePaths` is a server-provided string array (`upgrade_plan`/`overage`) consumed by the upsell
  UI; its full domain isn't enumerable from the client.
</content>
</invoke>
