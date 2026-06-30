# Tool Definitions

> [Back to version index](../README.md)
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.4.0

See [data/tools.yaml](data/tools.yaml) for the structured dataset.

This build ships **49 built-in tools** (was 46 in 2.1.169 → **+3 net**). The growth is **+5 new
tools** (`ReadMcpResourceDirTool`, `ShowOnboardingRolePicker`, `Projects`, `Artifact`,
`ReportFindings`) **minus 2 removed** (`TeamCreate`, `TeamDelete`). The team subsystem was not
deleted wholesale — `SendMessage` survives, and the team-shaped schema fields now live as a
runtime *strip list* (see [Schema property stripping](#schema-property-stripping-new)).

## How Tools Are Built

Every built-in tool is constructed by the factory **`Ys({...})`** (was `rK` in 2.1.169),
`cli.beauty.js:148125`:

```js
function Ys(e) {
  return Object.defineProperties({
    ...B2d,                          // default trait bag (isEnabled→true, isReadOnly→false, …)
    userFacingName: () => e.name
  }, Object.getOwnPropertyDescriptors(e))
}
```

`B2d` (`:148142`) is the default prototype: `isEnabled:()=>!0`, `isConcurrencySafe:()=>!1`,
`isReadOnly:()=>!1`, `isDestructive:()=>!1`, `checkPermissions → {behavior:"allow"}`. Any field a
tool omits falls through to this bag — so an absent `isEnabled` means **always on**, absent
`shouldDefer` means **not deferred**.

There are **52 `Ys({...})` call sites**; subtracting the three non-tools — the generic `"mcp"`
template (`:258427`), the dynamic `` `eval_registered__${e.name}` `` factory (`:423056`) and
`"TestingPermission"` (`lHl`, `:426897`) — leaves **49 real tools**. Each object carries:

| Member | Purpose |
|--------|---------|
| `name` | user-facing tool name, a mangled top-level const (e.g. `Co = "Bash"`) |
| `searchHint` | one-line summary used by **ToolSearch** and as the description when tool search is active |
| `async description()` / `async prompt()` | full description / system-prompt blurb |
| `get inputSchema()` | Zod schema, built **lazily** (getter), serialised to JSON Schema on demand |
| `get outputSchema()` | structured-output schema (where present) |
| `isReadOnly()` / `isConcurrencySafe()` | parallelism + plan-mode gating (Bash's & Projects' are dynamic) |
| `isEnabled()` | feature gate (flag/env) — absent ⇒ always on |
| `shouldDefer`, `strict`, `aliases`, `maxResultSizeChars`, `toAutoClassifierInput`, `isMcp`, `isOpenWorld` | misc traits |

> One block — **Monitor** (`K_f`, `:417376`) — takes its `name` and several members via a
> `...z_f` spread from a base object `z_f` (`:417349`, `name: vT`), rather than inline.

## How Tool Schemas Are Serialised for the API

The serialiser is **`Etr(tool, ctx)`** (was `QR8()` in 2.1.169), `cli.beauty.js:594019`, with
description helper **`glm()`** (was `lsf()`, `:594009`):

```js
// Etr(e, t) — builds the API tool descriptor, memoised
{
  name:         e.name,
  description:  await glm(e, t),     // searchHint when B9o() (tool-search/simple), else 1st para of prompt()
  input_schema: f,                   // inputJSONSchema verbatim, OR JOe(e.inputSchema) -> JSON Schema
  ...c.strict            && { strict: true },                 // gated, see below
  ...c.eager_input_streaming && { eager_input_streaming: true },
  ...t.deferLoading      && { defer_loading: true },
  ...t.cacheControl      && { cache_control: t.cacheControl },
}
```

Notable details (all verified at `:594019`–`:594072`):

- **Memoisation.** Results are cached in `axi()` (was `lFK()`) keyed by a string `a` that folds in
  an `L:` prefix when `yh(model)`, an `F:` prefix when the provider sets `eagerInputStreaming`, the
  tool name, and (when present) a hash of `inputJSONSchema`. So each tool is serialised once per
  `(model, eager-streaming, schema)` combination.
- **`strict: true`** is added only when `it("tengu_tool_pear", !1)` is on **AND** the tool declares
  `strict:true` **AND** `R3e(model)` (was `SyH`, model supports strict). **Eight** built-in tools
  declare `strict:!0`: `Bash` (`:451220`), `Read` (`:465890`), `Write` (`:367107`), `Edit`
  (`:444492`), `Grep` (`:367740`), `PowerShell` (`:442970`), `TodoWrite` (`:298376`) and
  `ReportFindings` (`:426844`).
- **`eager_input_streaming: true`** (fine-grained tool streaming) is added when
  `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING` is truthy, OR provider is `firstParty` with
  `Eu()` and `it("tengu_fgts", !1)`, OR `vertex`/`bedrock` with the provider's `eagerInputStreaming`
  capability (and no custom base URL). Unchanged in shape from 2.1.169.
- **`input_examples` remains GONE** (the 2.1.32 `scarf_coffee` beta field is still absent).
- **Beta stripping.** If experimental betas are disabled (`k3e()`, was `hyH()`), any key outside
  `{name, description, input_schema, cache_control}` is stripped and reported once via `hlm()`
  (`:594073`, message `"[betas] Stripped from tool schemas: [...] (experimental betas disabled)"`).

### Schema property stripping (NEW)

A new pre-serialisation pass `mlm(name, schema)` → `flm(schema, plm[name])` (`:594009`,
`:593993`) **deletes specific input-schema properties per-tool** when agent-teams are off
(`!ll()`). The strip map `plm` (`:594449`):

```js
plm = {
  [cP]: ["launchSwarm", "teammateCount"],   // cP = "ExitPlanMode"
  [is]: ["name", "team_name", "mode"]        // is = "Agent"
}
```

`ll()` (`:292358`) is the teams gate: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env **or**
`tengu_amber_flint` flag (default true). When teams are disabled, the team-coordination fields are
scrubbed from `Agent`'s and `ExitPlanMode`'s schemas — the residue of the removed `TeamCreate`/
`TeamDelete` tools.

## Full Tool List

### Always-on core (never deferred)

| Tool | Factory var | Name const | Category | One-liner (searchHint) |
|------|-------------|-----------|----------|------------------------|
| **Bash** | `gl` | `Co` | read-only **or** write (dynamic) | execute shell commands |
| **Read** | `Kg` | `Ms` | read-only | read files, images, PDFs, notebooks |
| **Write** | `mA` | `Rc` | write | create or overwrite files (`strict:!0`) |
| **Edit** | `RH` | `Ca` | write | modify file contents in place |
| **Glob** | `f3` | `ku` | read-only | find files by name pattern or wildcard |
| **Grep** | `nO` | `Wc` | read-only | search file contents with regex (ripgrep) |
| **PowerShell** | `Hwf` | `ys` | r-o/write | execute Windows PowerShell (gated `CLAUDE_CODE_USE_POWERSHELL_TOOL`) |
| **Agent** (alias `Task`) | `NJn` | `is` | read-only | delegate work to a subagent |
| **AskUserQuestion** | `__t` | `Ef` | read-only | prompt the user with a multiple-choice question |
| **StructuredOutput** | `hao` | `Qp` | read-only | return the final response as structured JSON |
| **ToolSearch** | `s3t` | `Hh` | read-only | fetch full schema for deferred tools |
| **SendUserMessage** (alias `Brief`) | `YEl` | `aP` | read-only | send a message / brief to the user |
| **SendUserFile** | `yAf` | `cGe` | read-only | deliver files (screenshots/reports) to the user |
| **ReportFindings** 🆕 | `iHl` | `$He` | read-only | report code-review findings as a structured list (`strict:!0`) |

> **Bash** is special: `isReadOnly(cmd)` is **dynamic** — it returns true only when the command
> classifies as `allow`, and `isConcurrencySafe` mirrors it (`this.isReadOnly?.(e) ?? !1`,
> `:451234`). `maxResultSizeChars: 30000`, `strict:!0`.

### Deferred tools (`shouldDefer:!0` — surfaced lazily via ToolSearch)

| Tool | Factory var | Name const | Category | One-liner |
|------|-------------|-----------|----------|-----------|
| **WebFetch** | `r2` | `wb` | read-only | fetch and extract content from a URL |
| **WebSearch** | `gQn` | `p5` | read-only | search the web for current information |
| **NotebookEdit** | `wq` | `Pv` | write | edit Jupyter notebook cells (.ipynb) |
| **TodoWrite** | `DPe` | `x$` | read-only | manage the session task checklist |
| **Skill** | `wbt` | `g_` | read-only | invoke a slash-command skill |
| **EnterPlanMode** | `kKn` | `sJ` | read-only | switch to plan mode |
| **ExitPlanMode** | `jP` | `cP` | read-only | present plan for approval, start coding |
| **ListMcpResourcesTool** (alias `ListMcpResources`) | `E5` | `vde` | read-only | list resources from MCP servers |
| **ReadMcpResourceTool** (alias `ReadMcpResource`) | `D5` | `"ReadMcpResourceTool"` | read-only | read an MCP resource by URI |
| **ReadMcpResourceDirTool** 🆕 (alias `ReadMcpResourceDir`) | `doe` | `$J` | read-only | list the children of an MCP directory resource |
| **WaitForMcpServers** | `OBa` | `CLe` | read-only | block until MCP servers connect |
| **Monitor** | `K_f` (base `z_f`) | `vT` | read-only | watch a process/log/WebSocket; stream each line as a notification |
| **ScheduleWakeup** | `GAl` | `Ah` | read-only | self-pace next `/loop` iteration (pick a delay) |
| **CronCreate** | `sAf` | `OI` | write | schedule a recurring or one-shot prompt |
| **CronDelete** | `lAf` | `C4` | write | cancel a scheduled cron job |
| **CronList** | `dAf` | `h4t` | read-only | list active cron jobs |
| **RemoteTrigger** | `mAf` | `Kze` | write | manage scheduled cloud-agent routines |
| **PushNotification** | `EAf` | `c6` | read-only | notify the user (terminal + optionally mobile) |
| **TaskCreate** | `cTl` | `pC` | write | create a task in the task list |
| **TaskGet** | `fTl` | `iJ` | read-only | retrieve a task by ID |
| **TaskUpdate** | `yTl` | `bP` | write | update a task |
| **TaskList** | `ATl` | `kL` | read-only | list all tasks |
| **TaskOutput** (aliases `BashOutput`, `AgentOutput`, …) | `mQn` | `u6` | read-only | read output/logs from a background task |
| **TaskStop** | `ESt` | `_P` | write | kill a running background task |
| **SendMessage** | `wHf` | `Dy` | read-only | send messages to agent teammates |
| **ShareOnboardingGuide** | `DHf` | `kYt` | read-only | upload ONBOARDING.md, get a team share link |
| **EnterWorktree** | `qHl` | `jSe` | write | create an isolated git worktree and switch in |
| **ExitWorktree** | `tTl` | `ONn` | write | exit a worktree session |
| **LSP** | `tPo` | `T_t` | read-only | code intelligence (defs/refs/symbols/hover) |
| **REPL** | `jDo` | `Wm` | read-only | execute JavaScript with programmatic tool access |
| **Workflow** (alias `RunWorkflow`) | `T_f` | `fC` | read-only | orchestrate subagents with a JS workflow |
| **DesignSync** | `GAf` | `w5t` | write | sync design-system components to claude.ai/design |

### Conditionally-loaded new tools (gated, not blanket-deferred)

| Tool | Factory var | Name const | Category | Gate (`isEnabled`) | One-liner |
|------|-------------|-----------|----------|--------------------|-----------|
| **ShowOnboardingRolePicker** 🆕 | `hEl` | `UJn` | read-only | `Lbf()` = `CLAUDE_CODE_REMOTE` env | show the Cowork onboarding role picker |
| **Projects** 🆕 | `eHf` | `Nvl` | dynamic r-o/write | `js("allow_projects_tool") && CLAUDE_PROJECT_UUID set` | read and write the session's attached claude.ai project |
| **Artifact** 🆕 | `DPo` | `N1` | write | `xLe()` (managed-settings `enableArtifact`) | render an HTML or Markdown file to a claude.ai web page (`shouldDefer:!1`) |

> **Projects** has a *dynamic* `isReadOnly(e) = XAf(e.method)` (`:432184`): `project_read` is
> read-only; `project_write`/`project_delete` are writes. **Artifact** explicitly sets
> `shouldDefer:!1` so it is loaded up front when enabled. **ReportFindings** (listed in the always-on
> table) likewise carries no `shouldDefer`, so it loads up front.

### Infrastructure / non-listed

| Object | Factory var | Notes |
|--------|-------------|-------|
| **mcp** (template) | `:258427` | `isMcp:!0`; prototype for dynamically-registered MCP server tools |
| **eval_registered__\<name\>** | dynamic, `:423056` | factory for evaluation/advisor registered tools |
| **TestingPermission** | `XNb` (`lHl`) | internal test tool for the permission system |

### Removed vs 2.1.169

`TeamCreate` and `TeamDelete` are **no longer `Ys({...})` tool objects**. The only surviving
reference is a hidden-name `Set` `s4t` (`:223426`):
`new Set(["Frame", "FrameRead", "TeamCreate", "TeamDelete", "SuggestBackgroundPR"])`, used to skip
those names when listing tools (`:464379` `if (s4t.has(k)) continue;`) and to mark them
`expected-absent` in serialisation diagnostics (`:379912`).

## Feature gates (`isEnabled`)

| Gate fn | Line | Controls | Logic |
|---------|------|----------|-------|
| `HH()` | `:297813` | Tasks (TaskCreate/Get/Update/List/Output, TaskStop) | on unless `CLAUDE_CODE_ENABLE_TASKS` falsy |
| `ll()` | `:292358` | Agent-teams schema fields (`SendMessage` family) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env **or** `tengu_amber_flint` flag (default true) |
| `d5() && Hu()` | `:223975` | Monitor | `d5()` = `it("tengu_amber_sentinel", !1)` flag |
| `iE()` | `:146597` | Workflow | launch gate + not managed-`disableWorkflows` |
| `Lbf()` | `:421618` | ShowOnboardingRolePicker | `CLAUDE_CODE_REMOTE` env |
| `xLe()` | `:224997` | Artifact | managed-settings `enableArtifact` (`Sla() && Ela() && (NNn() ?? E4t())`) |
| `js("allow_projects_tool") && Uvl()` | `:432165` | Projects | managed entitlement + `CLAUDE_PROJECT_UUID` set |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | env | PowerShell | env |
| `CLAUDE_CODE_ENABLE_DESIGN_SYNC` | env | DesignSync | env |

## Permission Modes

The canonical enum (sorted const `qY` at `cli.beauty.js:57375`; Zod enum `Vve` at `:702208`):

```
["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk", "auto"]
```

The Zod `.describe()` (`:702208`) gives the authoritative descriptions:

| Mode | Description (verbatim from the Zod enum) |
|------|------------------------------------------|
| `default` | Standard behavior, prompts for dangerous operations. |
| `acceptEdits` | Auto-accept file **edit** operations. |
| `bypassPermissions` | Bypass all permission checks (requires `allowDangerouslySkipPermissions`). |
| `plan` | Planning mode, no actual tool execution. |
| `dontAsk` | Don't prompt for permissions, **deny** if not pre-approved. |
| `auto` | Use a **model classifier** to approve/deny permission prompts. |

Behaviour anchors (`:57414`): `bypassPermissions` → `"allow"`; `plan` (when allowed) → `"allow"`;
`dontAsk` → `"deny"` (`:57415`). `auto` is gated by `CLAUDE_CODE_ENABLE_AUTO_MODE` env and the
`afk-mode-2026-01-31` beta (`D0 = FE("afk_mode", ...)`, `:100577`).

> **Unchanged vs 2.1.169:** same six modes. An internal `permissionMode:"bubble"` still exists only
> for the implicit fork-subagent (`:225525`, `:476136`); it is filtered out of user-selectable modes
> (`:57389` `return e !== "bubble"`), not a real mode.

### Read-only restriction (plan mode)

In `plan` mode, a tool's `checkPermissions` returns `behavior:"ask"` (decisionReason
`{type:"mode", mode:"plan"}`) for any write/create action, with the message *"Cannot write … while
in plan mode."* Read-only tools and read-classified Bash run. Bash is gated by its **dynamic**
`isReadOnly(command)`. `bypassPermissions`/`plan`-when-available short-circuit to `"allow"`
(`:57414`); `dontAsk` short-circuits to `"deny"` (`:57415`, `:439948`, `:452099`).

## Deferred-Tool / Tool-Search System

### `isDeferredTool` (`x4`, module exports `TOOL_SEARCH_TOOL_NAME`)

A tool is hidden behind ToolSearch (only its name appears in a `<system-reminder>`) when `x4(e)`
returns true (`cli.beauty.js:225539`, was `bF` in 2.1.169):

```
x4(e):
  e.alwaysLoad === true                   -> false   (server alwaysLoad / defer_loading:false)
  tla().includes(e.name)                  -> false   (NEW: runtime non-deferrable allow-list)
  e.isMcp === true                        -> true    (ALL MCP tools deferred)
  e.name === ToolSearch (Hh)              -> false
  e.name === Agent (is) && fork-subagent  -> false
  e.name === Brief (Pup)                  -> false
  e.name === SendUserFile (Mup)           -> false
  e.name === PushNotification (c6) && Ifn() -> false
  e.name === ScheduleWakeup (Ah) && USe()   -> false
  e.name === EnterWorktree (jSe) && CLAUDE_CODE_SESSION_KIND==bg -> false
  else                                    -> e.shouldDefer === true
```

**NEW this build:** `tla()` (`:224445`) builds a runtime allow-list of names that must **never** be
deferred, from the `tengu_non_deferrable_builtins` flag (parsed JSON array) **or** managed-settings
`non_deferrable_builtins`. Default is `fup = []` (`:224500`) — so empty unless the server populates
it. This lets Anthropic force any built-in to load eagerly without a client release.

### ToolSearch tool (`s3t`, name const `Hh`)

Description const `$up` (`cli.beauty.js:225562`): *"Fetches full schema definitions for deferred
tools so they can be called. Deferred tools appear by name in `<system-reminder>` messages. Until
fetched, only the name is known … returns the matched tools' complete JSONSchema definitions inside
a `<functions>` block …"*. Query forms: `select:Read,Edit,Grep` (exact), `notebook jupyter`
(keyword), `+slack send` (require term).

### Modes & env

Controlled by env **`ENABLE_TOOL_SEARCH`** (registered at `:46065`, parsed for `auto:N` at
`:224403`):

| Value | Mode |
|-------|------|
| unset / falsy | `tst` on first-party Anthropic; `standard` on Vertex / non-first-party |
| `auto` | `tst-auto` |
| `auto:N` | `tst-auto`, threshold percentage `N` (clamped 0–100) |
| `0` | `tst` (always search) |
| `100` | `standard` (never search) |
| any truthy | `tst` |

Beta headers (`:100577`): `s4r = advanced-tool-use-2025-11-20` and
`NMt = tool-search-tool-2025-10-19` (both `FE("tool_search", …)`).

## What's New / Changed vs 2.1.169

- **Tool count 46 → 49 (+3 net).** Factory renamed `rK` → **`Ys`** (`:148125`); 52 literal call
  sites → 49 real tools.
- **+5 new tools:** `ReadMcpResourceDirTool`, `ShowOnboardingRolePicker`, `Projects`, `Artifact`,
  `ReportFindings`.
- **−2 removed tools:** `TeamCreate`, `TeamDelete` (now only hidden names in the `s4t` skip-set).
- **Serialiser renamed** `QR8` → **`Etr`** (`:594019`); helper `lsf` → `glm`; memo cache `lFK` →
  `axi`; schema converter `oZH` → `JOe`; strict-model check `SyH` → `R3e`; beta-strip `hyH` →
  `k3e`. Field shape (`strict`, `eager_input_streaming`, `defer_loading`, `cache_control`,
  no `input_examples`) is **unchanged**.
- **NEW schema property-stripping** (`mlm`/`flm`/`plm`, `:594449`): removes team-coordination fields
  from `Agent` and `ExitPlanMode` schemas when teams are off — a direct consequence of removing the
  team tools.
- **NEW runtime non-deferrable allow-list** `tla()` (`:224445`) consulted first in `isDeferredTool`,
  driven by `tengu_non_deferrable_builtins` flag / managed `non_deferrable_builtins`.
- **Deferred predicate renamed** `bF` → `x4` (`:225539`); same exception set (ToolSearch, fork-Agent,
  Brief, SendUserFile, conditional PushNotification/ScheduleWakeup/EnterWorktree).
- **Permission modes unchanged** (same 6-mode enum); `auto` now also keyed off the
  `CLAUDE_CODE_ENABLE_AUTO_MODE` env var (registered in the typed env set, `:189148`).

## Uncertainties

- **`SendMessage` category** is inferred `read-only` (it has the default trait bag for read/write;
  no explicit `isReadOnly` override was confirmed in its block). The team *create/delete* tools it
  used to accompany are gone, but `SendMessage` itself remains a live `Ys({...})` tool.
- `read-only` vs `write` for the cron/worktree/task tools is inferred from intent
  (create/update/delete ⇒ write); only the core file/shell tools, `Projects`, `Artifact` and
  `ReportFindings` had their `isReadOnly()` bodies read directly this pass.
- The `…HHu()` second conjunct of Monitor's gate (`d5() && Hu()`) was not fully resolved; `d5()` =
  `tengu_amber_sentinel` is confirmed, `Hu()` is treated as a secondary availability check.
- Name-const → string mappings (`Co`, `Ms`, `$He`, `Nvl`, `N1`, `UJn`, `$J`, …) were each resolved
  from their `var X = "Name"` declarations and confirmed against the `Ys({ name: X, … })` site.
</content>
</invoke>
