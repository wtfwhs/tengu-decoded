# Hidden Commands

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64
> **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Runtime**: Bun v1.4.0

See [data/commands.yaml](data/commands.yaml) for the full structured dataset (active + hidden + upsell-stubs + filtering pipeline). This page focuses on the hidden / disabled / gated commands and easter eggs, and on what changed since **2.1.169**.

Headline: the slash-command registry is **93** distinct `name:` on a `type:"local"|"local-jsx"|"prompt"` object — **net unchanged** vs 2.1.169, but the set churned: **NEW** `/design-login`, `/pause-memory`; **REMOVED** `/bridge-kick`, standalone `/toggle-memory`. Separately, `/loop` + `/schedule` are **skill-registered** user-invocable commands (a second mechanism alongside the registry).

## How status is decided (verified from source)

Each registry command is an object. The loader `getCommands` (= `gA`, `cli.beauty.js:581288`) keeps a command only if `meetsAvailabilityRequirement(cmd) && isCommandEnabled(cmd)` — the filter is literally `t.filter((g) => VTt(g) && rx(g))` at `:581292`:

- `isCommandEnabled` (`rx`, `:387319`) — `return e.isEnabled?.() ?? !0`. **No `isEnabled` ⇒ enabled.**
- `meetsAvailabilityRequirement` (`VTt`, `:581268`) — if no `availability[]`, allow; else allow if any token matches: `"claude-ai"` ⇒ `Ao()` (signed into claude.ai), `"console"` ⇒ `!Ao() && !j7() && Eu()` (API/console enterprise). Unknown tokens fail.
- `isHidden: !0` (or a `get isHidden()` getter returning true) keeps a command **runnable but unlisted** in `/help`.
- A handful of commands compile to a shared disabled **stub** object `{isEnabled:()=>!1, isHidden:!0, name:"stub"}` (`WNo`, `:478399`) — the feature exists in the codebase but is shipped off in this build.
- `immediate` (resolved by `B$e`, `:387325`) runs the command the moment Enter is pressed without sending a turn to the model.

### Per-build symbol map (minified names change every build)

| Role | 2.1.197 | Line | 2.1.169 was |
|---|---|---|---|
| `getCommands` | `gA` | `:581288` | `mL` |
| `getBuiltinCommands` → list | `EVo` → `yen()` | `:581237` / `:581712` | `Jof` → `cu$` |
| `isCommandEnabled` | `rx` | `:387319` | `Uk` |
| `meetsAvailabilityRequirement` | `VTt` | `:581268` | `du$` |
| `INTERNAL_ONLY_COMMANDS` | `Tsm` | `:581712` | `jof` |
| `ANT_GATED_COMMANDS` | `vsm` | `:581562` | `Dof` |
| `REMOTE_SAFE_COMMANDS` | `Zcr` | `:581747` | `Ip8` |
| `BRIDGE_SAFE_COMMANDS` | `TVo` | `:581747` | `Q3q` |
| enterprise upsell wrapper | `uTt` | `:556786` | `w1$` |

### Key gate helpers (resolved from source)

| Helper | Line | Meaning | 2.1.169 was |
|---|---|---|---|
| `Ao()` | `:134427` | first-party + oauth scopes (`aS() && xj(qs()?.scopes)`) — logged into claude.ai | `hq()` |
| `Cr()` | `:3268` | `!Bt.isInteractive` — HEADLESS / non-interactive | `F6()` |
| `$x()` | `:3271` | `Bt.isInteractive` | `a2()` |
| `_a()` | `:3929` | `Bt.caps.workspace === "remote"` — running as cloud/remote agent | `z4()` |
| `Jv()` | `:225052` | coordinator mode (`CLAUDE_CODE_COORDINATOR_MODE`) | `K2()` |
| `js(cap)` | `:145859` | capability check (e.g. `allow_remote_sessions`, `allow_design_sync`) | `b7(cap)` |
| `Eu()` | `:94683` | assume first-party base URL (console availability) | — |
| `j7()` | `:134540` | `!xc()` (used in `console` availability) | `sc()` |
| `it(flag,default)` | `:145150` | GrowthBook flag get | `j$()` |

## Hidden / Disabled / Gated commands

| Command | Aliases | Status | Why hidden / disabled |
|---------|---------|--------|-----------------------|
| `/radio` | -- | **Flag-gated** (`:556542`) | Easter egg. `isEnabled: () => it("tengu_velvet_static", !1)` (default **off**); **no** `isHidden` field this build. Opens `https://clau.de/radio` — **"Claude FM lo-fi radio"** (`:556526`). Loadable/listed only when the flag is on. |
| `/heapdump` | -- | **Hidden** (`:554934`) | `isHidden:!0`, `supportsNonInteractive:!0`, no `isEnabled` (always loadable). Now invoked via `fleetHostCall` (not a plain `load`). Dumps the JS heap to `~/Desktop` via `performHeapDump()` (`:554730`). |
| `/btw` | -- | **Active** (`:478389`) | `type:"local-jsx"`, `immediate:!0`, **no** `isEnabled`/`isHidden` ⇒ fully enabled & listed. **Unchanged** vs 2.1.169 — it was already a full active `local-jsx` command there (const `l7q`, `2.1.169 cli.beauty.js:454068`, present in the `cu$` registry array at `:547461`). "Ask a quick side question without interrupting the main conversation." |
| `/pause-memory` | `/memory-pause`, `/toggle-memory` | **Disabled** (`:501509`) | **NEW.** `isEnabled: () => !1`, `isHidden: !1`. Absorbs the old `/toggle-memory` as an alias. "Pause automemory for this session." Shipped off in this build; the user-facing pause flow is reachable via config (`pause-memory: "config"`, `:629662`) and the "Run /pause-memory to resume" messaging (`:456050`, `:485395`). |
| `/pro-trial-expired` | -- | **Hidden** (`:560380`) | `isHidden:!0`, `isEnabled:()=>!0`. System screen shown when the Pro-plan trial ends (upsell). Not for manual use. |
| `/rate-limit-options` | -- | **Hidden + gated** (`:560711`) | `isHidden:!0`, `isEnabled: () => Ao() || !1` (first-party only). System screen shown when a rate limit is hit. |
| `/loops` | -- | **Disabled** (`:549743`) | `isEnabled: () => !1` (not hidden, just non-runnable). "List, create, and delete loops." Distinct from the active `/loop` **skill** below. |
| `/version` | -- | **Disabled** (`:555138`, `:555150`) | Both variants `isEnabled: () => !1`, `isHidden:!0`. The compiled binary owns version reporting; use `/status`. |
| `/update` | -- | **Disabled** (`:558118`) | `isEnabled: () => !1`, `isHidden:!0`. Headless update variant shipped off. |
| `/wellbeing` | `/breaks`, `/break-reminder`, `/downtime` | **Disabled** (`:561795`) | `isEnabled: () => !1`. Break reminders / quiet-hours nudges. Still shipped off. |
| `/desktop` | `/app` | **Effectively off** (`:482056`) | `availability:["claude-ai"]`; `isEnabled: lAt`, `get isHidden(){return !lAt()}`. `lAt() = V$f() && js("allow_desktop_handoff")` and **`V$f()` is hardcoded `()=>!1`** (`:482046`), so `lAt()` is always false — desktop hand-off compiled off (now behind capability `allow_desktop_handoff`, was `Cg4()` in 2.1.169). |
| `/mobile` | `/ios`, `/android` | **Disabled + hidden** (`:524099`) | `isEnabled: () => !1`, `isHidden:!0`. Show-QR-to-download-app feature shipped off. |
| `/install-slack-app` | -- | **Disabled + hidden** (`:506168`) | `availability:["claude-ai"]`; `isEnabled: () => !1`, `isHidden:!0`. |
| `/voice` | -- | **Conditionally hidden** (`:572161`) | `availability:["claude-ai"]`; `isEnabled: () => BZt()`; hidden unless terminal + platform support voice. |
| `/setup-bedrock` | -- | **Conditionally hidden** (`:535088`) | `get isHidden(){ return !CLAUDE_CODE_USE_BEDROCK }` — only visible on Bedrock. |
| `/setup-vertex` | -- | **Conditionally hidden** (`:535151`) | `get isHidden(){ return !CLAUDE_CODE_USE_VERTEX }` — only visible on Vertex. |
| `/passes` | -- | **Conditionally hidden** (`:547344`) | Referral feature; `get isHidden()` depends on referral availability. "Share a free week of Claude Code." |
| `/fast` | -- | **Conditionally hidden** (`:547068`) | `type:"local-jsx"`; `get isHidden(){ return !uc() }` (`:547072`); `get immediate(){ return YHt() }`; `requires:{ink:!0}`. Toggle fast mode — hidden unless fast mode is available for the org/account (`uc()`, `:100600`). A headless `local` twin (`:547086`) carries `supportsNonInteractive:!0`. |
| `/advisor` | -- | **Conditionally hidden** (`:556755`) | `isEnabled: () => mz()`; `mz()` (`:363791`) = `firstParty + YM() + tengu_sage_compass2.enabled` (or `CLAUDE_CODE_ENABLE_EXPERIMENTAL_ADVISOR_TOOL`; off if `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`). Lets Claude consult a stronger model at key moments. |
| `/remote-control` | `/rc` | **Conditionally hidden** (`:562589`) | `isEnabled: LC`; `LC()` (`:605232`) gates on remote-control connectability (api.anthropic.com, not a cloud session). Description toggles when connected. |
| `/session` | `/remote` | **Conditionally hidden** (`:537078`) | `isEnabled: () => _a()` — only when running as a remote/cloud agent. Shows cloud session URL + QR. |
| `/teleport` | `/tp` | **Conditionally hidden** (`:543288`) | `isEnabled: () => Ao() && js("allow_remote_sessions")`. (A second copy ships as an enterprise upsell-stub.) |
| `/remote-env` | -- | **Conditionally hidden** (`:560221`) | `isEnabled: () => Ao() && js("allow_remote_sessions")`. Choose default cloud-agent environment. |
| `/goal` | -- | **Conditionally hidden** (`:572509`) | `isEnabled: () => Cr() || _a()` on the headless twin; interactive variant visible. |
| `/web-setup` | -- | **Conditionally hidden** (`:573352`) | `availability:["claude-ai"]`; `isEnabled: () => it("tengu_cobalt_lantern", …) && …`. Set up Claude Code on the web with GitHub. |
| `/team-onboarding` | -- | **Conditionally hidden** (`:573678`) | `isEnabled: () => js("allow_team_onboarding")`. Build a teammate ramp-up guide from your usage. |

### `/design-login` — NEW (`:503666`)

`type:"local-jsx"`, `name:"design-login"`, **no** `isHidden` (listed when enabled). `isEnabled: () => RSt()`:

```
function RSt() {                          // :430834
  if (!js("allow_design_sync")) return !1;   // capability gate
  if (Ki()) return !1;                       // off for this account class
  if (xc()) return !0;
  return it("tengu_slate_quill", !1)         // else flag-gated (default off)
}
```

Authorizes design-system access for the new **`/design-sync`** skill / `DesignSync` tool against the user's claude.ai login (or a dedicated design authorization). It is the human entry point for the new `/v1/design*` cloud surface; error paths all funnel back to "Run /design-login" (`:281705`, `:430758`, `:431117`). **0 occurrences of `design-login` in the 2.1.169 bundle** — genuinely new.

### Skill-registered commands (a second mechanism)

`/loop` and `/schedule` are **not** registry objects — they are registered via the skill-tool registrar `Bd({...})` with `userInvocable:!0`, and surface as slash commands alongside the registry:

- **`/loop`** (`:664632`) — aliases `["proactive"]`; `isEnabled: R$`. "Run a prompt or slash command on a recurring interval (e.g. `/loop 5m /foo`)." Distinct from the disabled `/loops` registry command.
- **`/schedule`** (`:665031`) — aliases `["routines"]`; `isEnabled: () => xc() && Ao() && !CLAUDE_CODE_REMOTE && it("tengu_surreal_dali", !1) && js("allow_remote_sessions")`. Create/manage scheduled cloud agents (cron routines). The model is steered to *offer* `/schedule` at end-of-task via flags `tengu_orchid_mantis_v2` / `tengu_orchid_mantis` / `tengu_mocha_barista` in the system prompt (`:593673`). A `type:"local"` `/schedule` **also** exists as an enterprise upsell-stub (below).

### Enterprise upsell-stubs (`uTt()` wrapper, `:556786`)

`uTt(cmd)` wraps a name+description into a **hidden** command (`isHidden:!0`) whose `isEnabled: () => !QXf() && XXf()`, description suffixed `— available with Claude for Enterprise`, that just fires the `tengu_c4e_slash_upsell_shown` telemetry event:

- `QXf() = Ao()` (`:556814`) — not first-party.
- `XXf() = vNe() && !Cr() && it("tengu_c4e_slash_upsell", !1)` (`:556779`) — console-ish, interactive, and flag `tengu_c4e_slash_upsell` (default off). This flag is **not** new: 2.1.169 gated the upsell identically (`P0H() && !F6() && j$("tengu_c4e_slash_upsell", !1)`, `2.1.169 cli.beauty.js:524643`).

Six features ship a second, upsell-stub copy this way (`Ltc`, `:556816`), identical set to 2.1.169:

`/ultraplan`, `/ultrareview`, `/teleport` (`/tp`), `/remote-control` (`/rc`), `/schedule` (`/routines`), `/autofix-pr`.

## What's new / changed vs 2.1.169

**Added (registry):**

- `/design-login` (`:503666`) — authorize design-system access for `/design-sync` (verified absent in 2.1.169). Aligns with the new `/v1/design` + `/v1/design/mcp` endpoints.
- `/pause-memory` (`:501509`) — replaces standalone `/toggle-memory` (kept as an alias). Ships **disabled** (`isEnabled:()=>!1`).

**Removed:**

- `/bridge-kick` — the 2.1.169 Remote-Control fault-injection test harness is **gone** (0 occurrences).
- `/toggle-memory` as a standalone command — now only an **alias** of `/pause-memory` (`:501511`).

**Status changes:**

- **`/desktop`** still effectively off, but the gate moved from `Cg4()=()=>!1` to `lAt() = V$f() && js("allow_desktop_handoff")` with `V$f()` hardcoded false (`:482046`) — desktop hand-off is now staged behind a real capability that's switched off.
- **Upsell wrapper** renamed `w1$`→`uTt`; its gate (incl. flag `tengu_c4e_slash_upsell`, default off) is **unchanged** vs 2.1.169.

**Unchanged (not a delta):** `/btw` was already a fully active `local-jsx` command in 2.1.169 (const `l7q`, in the `cu$` registry array) — no status change.

**Unchanged off-switches:** `/loops`, `/wellbeing`, `/version`, `/update` (headless), `/mobile`, `/install-slack-app` are all still shipped disabled/hidden, same as 2.1.169.

## Filtering / allow-list mechanisms

- **Availability tokens** `claude-ai` / `console` (`VTt`, `:581268`) — unchanged plan/auth-surface gating; tokens seen are exactly `["claude-ai","console"]`.
- **Mode-aware dual variants:** many commands ship an interactive `local-jsx` + a headless `local` twin gated by `Cr()`/`!Cr()`; the unfit copy is `isHidden`. Verified pairs: `/config` (`:495042`), `/usage` (`:543749`), `/context`, `/autocompact`, `/usage-credits`, `/goal`, `/effort`, `/exit`, `/model`, `/stop`, `/rename`, `/color`.
- **Remote/bridge allow-lists:** `REMOTE_SAFE_COMMANDS` (`Zcr`, `:581747`) and `BRIDGE_SAFE_COMMANDS` (`TVo`, `:581747`) restrict which commands run inside a cloud session / over the Remote Control bridge. `INTERNAL_ONLY_COMMANDS` (`Tsm`, `:581712`) holds system/dev commands incl. the disabled `stub` (`WNo`).
- **`ANT_GATED_COMMANDS`** (`vsm`, `:581562`) = `[hen, yVo, _Vo, bVo].filter(Boolean)` — **all four are `null`** (`:581562-581565`), so ANT_GATED resolves to **empty**, identically to 2.1.169.
