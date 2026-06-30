# Hidden Commands

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64

See [data/commands.yaml](data/commands.yaml) for the full structured dataset (active + hidden + upsell-stubs + filtering pipeline). This page focuses on the hidden / disabled / gated commands and easter eggs, and on what changed since 2.1.32.

## How status is decided (verified from source)

Each command is a registry object. The loader (`getCommands` = `mL`, `cli.beauty.js:547131`) keeps a command only if `meetsAvailabilityRequirement(cmd) && isCommandEnabled(cmd)`:

- `isCommandEnabled` (`Uk`, `:393366`) — `return cmd.isEnabled?.() ?? true`. **No `isEnabled` ⇒ enabled.**
- `meetsAvailabilityRequirement` (`du$`, `:547111`) — if no `availability[]`, allow; else allow if any token matches: `"claude-ai"` ⇒ `hq()` (signed into claude.ai), `"console"` ⇒ `!hq() && !sc() && zf()` (API/console enterprise).
- `isHidden: !0` (or a `get isHidden()` returning true) keeps a command **runnable but unlisted** in `/help`.
- A handful of commands are compiled to a disabled **stub** (`{isEnabled:()=>!1, isHidden:!0, name:"stub"}`) — the feature exists in the codebase but is shipped off in this build.

Key gate helpers: `hq()` first-party+oauth (`:131552`), `z4()` remote/cloud workspace (`:3665`), `F6()` non-interactive/headless (`:3032`), `K2()` coordinator mode (`:210508`), `b7(cap)` capability e.g. `allow_remote_sessions` (`:183916`), `pq$()` cloud-bridge (`:368642`), `j$(flag,default)` GrowthBook flag.

## Hidden / Disabled / Gated commands

| Command | Aliases | Status | Why hidden / disabled |
|---------|---------|--------|-----------------------|
| `/radio` | -- | **Hidden + flag-gated** | Easter egg. `isEnabled: j$("tengu_velvet_static", !1)` (default **off**). Opens `https://clau.de/radio` — **"Claude FM lo-fi radio"**. Load handler `KQf` just launches the browser. |
| `/stickers` | -- | **Active** (unlisted-ish) | Order Claude Code stickers; opens `stickermule.com/claudecode`. Enabled, no `isHidden`. |
| `/heapdump` | -- | **Hidden** (`isHidden:!0`) | Dev/diagnostic. `supportsNonInteractive:!0`. Dumps the JS heap to `~/Desktop` via `performHeapDump()`. Always loadable, just not advertised. |
| `/bridge-kick` | -- | **Disabled** (`isEnabled:()=>!1`) | **NEW** test harness. "Inject Remote Control failures for recovery testing." Used to fault-inject the Remote Control bridge; never user-runnable. |
| `/btw` | -- | **Stub** (`isEnabled:()=>!1, isHidden:!0`) | **DOWNGRADED.** "Ask a quick side question without interrupting the main conversation." In 2.1.32 it was gated behind the `ENABLE_BTW` env var; in 2.1.169 it's reduced to a disabled+hidden stub — the env gate is gone. |
| `/toggle-memory` | -- | **Disabled** (`isEnabled:()=>!1`) | **NEW** but shipped off. Would toggle automemory on/off for the session. `isHidden:!1` so it'd show if it were enabled. |
| `/pro-trial-expired` | -- | **Hidden** (`isHidden:!0`) | System screen, not for manual use. `isEnabled:()=>!0`. Shown when the Pro-plan Claude Code trial ends (upsell flow). |
| `/rate-limit-options` | -- | **Hidden + gated** (`isHidden:!0`, `isEnabled: hq() \|\| !1`) | System screen shown when a rate limit is hit; first-party only. |
| `/loops` | -- | **Disabled** (`isEnabled:()=>!1`) | **NEW** scaffolding. "List, create, and delete loops." Not hidden, just non-runnable. |
| `/wellbeing` | `/breaks`, `/break-reminder`, `/downtime` | **Disabled** (`isEnabled:()=>!1`) | **NEW** scaffolding. Break reminders / quiet-hours nudges. Shipped off. |
| `/desktop` | `/app` | **Hidden/off** | **NEW.** `availability:[claude-ai]`; `isEnabled`=`isHidden`=`Cg4()` and `Cg4()` is `()=>!1` in this build — desktop hand-off compiled off. |
| `/mobile` | `/ios`, `/android` | **Stub** | Was active in 2.1.32; now a disabled+hidden stub (`isEnabled:()=>!1, isHidden:!0`). Show-QR-to-download-app feature shipped off. |
| `/install-slack-app` | -- | **Stub** | `availability:[claude-ai]` but compiled to a disabled+hidden stub here. Was a real command in 2.1.32. |
| `/voice` | -- | **Conditionally hidden** | **NEW.** `availability:[claude-ai]`; `isEnabled: Pu$()` (returns true); `get isHidden(){ return !E1$() }` — hidden unless terminal + platform support voice. |
| `/setup-bedrock` | -- | **Conditionally hidden** | `get isHidden(){ return !CLAUDE_CODE_USE_BEDROCK }` — only visible when running on Bedrock. |
| `/setup-vertex` | -- | **Conditionally hidden** | `get isHidden(){ return !CLAUDE_CODE_USE_VERTEX }` — only visible when running on Vertex. |
| `/passes` | -- | **Conditionally hidden** | Referral feature; `get isHidden()` depends on referral availability. "Share a free week of Claude Code." |

### Enterprise upsell-stubs (`w1$()` wrapper)

`w1$(cmd)` (`cli.beauty.js:524…`) wraps a name+description into a **hidden** command whose `isEnabled: () => !ZQf() && PQf()` (not-claude-ai **and** console-enterprise), description suffixed `— available with Claude for Enterprise`, that just fires the `tengu_c4e_slash_upsell_shown` telemetry event. Six features ship a second, upsell-stub copy this way (the real, working versions are listed in the active set when their gates pass):

`/ultraplan`, `/ultrareview`, `/teleport` (`/tp`), `/remote-control` (`/rc`), `/schedule` (`/routines`), `/autofix-pr`.

## What's new vs 2.1.32

2.1.169 roughly **doubles** the command surface. New themes:

- **Background / multi-session orchestration:** `/background` (`/bg`), `/fork`, `/branch`, `/tasks` (broadened), `/stop`, `/daemon`, `/loops` (off), `/workflows`.
- **Cloud / cross-device:** `/session` (`/remote`), `/remote-control` (`/rc`), `/remote-env`, `/teleport` (`/tp`), `/schedule` (`/routines`), `/autofix-pr`, `/ultraplan`, `/ultrareview`, `/web-setup`, `/desktop` (`/app`).
- **Session UX:** `/effort`, `/goal`, `/focus`, `/brief`, `/recap`, `/voice`, `/tui`, `/scroll-speed`, `/wellbeing` (off).
- **Onboarding / insight:** `/insights`, `/powerup`, `/team-onboarding`, `/init-verifiers`.
- **Misc new:** `/advisor`, `/cd`, `/diff`, `/export`, `/keybindings`, `/statusline`, `/plugin` (+`/marketplace`), `/reload-plugins`, `/reload-skills`, `/usage-credits` (renamed from `/extra-usage`).
- **Easter eggs / dev:** `/radio` (Claude FM, flag `tengu_velvet_static`), `/heapdump`, `/bridge-kick`.

**Removed since 2.1.32:** `/thinkback-play` and `/think-back` (the 2025 Year-in-Review, flag `tengu_thinkback`) are gone; `/files` no longer exists as a slash command (the `name:"files"` strings that remain are tool/sub-command params).

**Downgraded:** `/btw` went from env-gated to a disabled stub; `/mobile` and `/install-slack-app` went from active commands to disabled stubs.

## New gating mechanisms vs 2.1.32

- **Availability tokens** `claude-ai` / `console` (`meetsAvailabilityRequirement`) — plan/auth-surface gating that didn't exist in 2.1.32.
- **Mode-aware dual variants:** several commands ship interactive + headless copies gated by `F6()` (`/context`, `/autocompact`, `/usage-credits`, `/goal`, `/version`); the unfit copy is `isHidden`.
- **Remote/bridge allow-lists:** `REMOTE_SAFE_COMMANDS` (`Ip8`) and `BRIDGE_SAFE_COMMANDS` (`Q3q`) restrict which commands run inside a cloud session or over the Remote Control bridge. `INTERNAL_ONLY_COMMANDS` (`jof`) holds system/dev commands (incl. the disabled stub and `/bridge-kick`).
- **ANT_GATED_COMMANDS** (`Dof`) exists in the export surface but resolves to **empty** in this build (`[gu$, m3q, B3q, p3q]` are all `null`).
