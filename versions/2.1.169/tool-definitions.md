# Tool Definitions

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64 | **Runtime**: Bun 1.3.14

See [data/tools.yaml](data/tools.yaml) for the structured dataset.

This build's tool surface roughly **tripled** vs 2.1.32: ~46 built-in tool objects vs 17.
The growth is almost entirely the new **tasks**, **teams**, **scheduling/cron**, **monitoring**,
**worktrees**, **LSP/REPL/Workflow**, and **deferred-tool / tool-search** subsystems.

## How Tools Are Built

Every built-in tool is constructed by the factory **`rK({...})`** (the tool-object literal
in 2.1.32 is now a factory call). There are 49 `rK(...)` call sites; subtracting the generic
`mcp` template, the `eval_registered__*` dynamic factory and `TestingPermission` leaves ~46
real tools. Each object carries:

| Member | Purpose |
|--------|---------|
| `name` | user-facing tool name, stored in a mangled top-level const (e.g. `tq = "Bash"`) |
| `searchHint` | one-line summary used by **ToolSearch** and as the description when tool search is active |
| `async description()` / `async prompt()` | full tool description / system-prompt blurb |
| `get inputSchema()` | Zod schema, built **lazily** (getter), serialised to JSON Schema on demand |
| `get outputSchema()` | structured-output schema |
| `isReadOnly()` / `isConcurrencySafe()` | parallelism + plan-mode gating (Bash's are dynamic) |
| `isEnabled()` | feature gate (flag/env) — absent ⇒ always on |
| `isOpenWorld()`, `isMcp`, `shouldDefer`, `strict`, `aliases`, `userFacingName`, `maxResultSizeChars` | misc traits |

## How Tool Schemas Are Serialised for the API

The serialiser is **`QR8()`** (was `SC$()` in 2.1.32), with description helper **`lsf()`**:

```js
// QR8(tool, ctx) — cli.beauty.js:558781
{
  name: tool.name,
  description: await lsf(tool, ctx),       // searchHint when tool-search/simple, else 1st para of prompt()
  input_schema: D,                         // oZH(tool.inputSchema) -> JSON Schema, or tool.inputJSONSchema verbatim
  ...tool.strict && { strict: true },      // only if tengu_tool_pear AND tool.strict AND SyH(model)
  ...eager_input_streaming && { eager_input_streaming: true },  // NEW this build
  ...ctx.deferLoading && { defer_loading: true },
  ...ctx.cacheControl && { cache_control: ctx.cacheControl },
}
```

Notable details:

- Results are **memoised** per `(model, name[, inputJSONSchema])` key in a cache (`lFK()`),
  so a tool's serialised form is computed once per model.
- `strict: true` is added only when `tengu_tool_pear` is on **and** the tool declares
  `strict:true` **and** `SyH(model)` (model supports strict).
- **`eager_input_streaming: true`** is NEW vs 2.1.32. Toggled by
  `CLAUDE_CODE_ENABLE_FINE_GRAINED_TOOL_STREAMING`, the `tengu_fgts` flag (first-party), or
  per-provider `eagerInputStreaming` (vertex/bedrock).
- **`input_examples` is GONE** (the 2.1.32 `scarf_coffee` beta field is not present in 2.1.169).
- If experimental betas are disabled (`hyH()`), `nsf()` strips everything except
  `name`, `description`, `input_schema`, `cache_control`.

## Full Tool List

### Always-on core (never deferred)

| Tool | Factory var | Name const | Category | One-liner (searchHint / description) |
|------|-------------|-----------|----------|--------------------------------------|
| **Bash** | `Y9` | `tq` | read-only **or** write (dynamic) | execute shell commands |
| **Read** | `bY` | `LK` | read-only | read files, images, PDFs, notebooks |
| **Write** | `TD` | `y1` | write | create or overwrite files |
| **Edit** | `NJ` | `V4` | write | modify file contents in place |
| **Glob** | `Fb` | `s5` | read-only | find files by name pattern or wildcard |
| **Grep** | `yk` | `__` | read-only | search file contents with regex (ripgrep) |
| **PowerShell** | `Dt6` | `dK` | r-o/write | execute Windows PowerShell commands (gated `CLAUDE_CODE_USE_POWERSHELL_TOOL`) |
| **Agent** (alias `Task`) | `QE8` | `PK` (alias `GF`) | read-only | delegate work to a subagent |
| **AskUserQuestion** | `e6$` | `fA` | read-only | prompt the user with a multiple-choice question |
| **StructuredOutput** | `QS6` | `Iz` | read-only | return the final response as structured JSON |
| **ToolSearch** | `TG$` | `bO` | read-only | fetch full schema for deferred tools |
| **SendUserMessage** (alias `Brief`) | `$N4` | `DR` (alias `bS6`) | read-only | send a message / brief to the user |
| **SendUserFile** | `_Af` | `rZ$` | read-only | deliver files (screenshots/reports) to the user |

> Bash is special: `isReadOnly(cmd)` is **dynamic** — it returns true only when the command
> classifies as `allow`, and `isConcurrencySafe` mirrors it. So read-classified commands run in
> plan mode and may run in parallel; write commands are blocked in plan mode.

### Deferred tools (`shouldDefer:!0` — surfaced lazily via ToolSearch)

| Tool | Factory var | Name const | Category | One-liner |
|------|-------------|-----------|----------|-----------|
| **WebFetch** | `ab` | `VL` | read-only | fetch and extract content from a URL |
| **WebSearch** | `Zh8` | `Tm` | read-only | search the web for current information |
| **NotebookEdit** | `kB` | `hT` | write | edit Jupyter notebook cells (.ipynb) |
| **TodoWrite** | `qZH` | `Yk` | read-only | manage the session task checklist |
| **Skill** | `_q$` | `vL` | read-only | invoke a slash-command skill |
| **EnterPlanMode** | `pv8` | `Al` | read-only | switch to plan mode |
| **ExitPlanMode** | `rb` | `CN` | read-only | present plan for approval, start coding |
| **ListMcpResourcesTool** (alias `ListMcpResources`) | `Sm` | `pLH` | read-only | list resources from MCP servers |
| **ReadMcpResourceTool** (alias `ReadMcpResource`) | `pm` | `"ReadMcpResourceTool"` | read-only | read an MCP resource by URI |
| **WaitForMcpServers** | `ic7` | `OLH` | read-only | block until MCP servers connect |
| **Monitor** | `CKf` | `DX` | read-only | watch a process/log; stream each line as a notification |
| **ScheduleWakeup** | `gN4` | `F3` | read-only | self-pace next /loop iteration (pick a delay) |
| **CronCreate** | `nff` | `q2` | write | schedule a recurring or one-shot prompt |
| **CronDelete** | `off` | `Nb` | write | cancel a scheduled cron job |
| **CronList** | `tff` | `aZ$` | read-only | list active cron jobs |
| **RemoteTrigger** | `$Af` | `FxH` | write | manage scheduled cloud-agent routines |
| **PushNotification** | `YAf` | `SF` | read-only | notify the user (terminal + optionally mobile) |
| **TaskCreate** | `ak4` | `uP` | write | create a task in the task list |
| **TaskGet** | `Hy4` | `$n` | read-only | retrieve a task by ID |
| **TaskUpdate** | `_y4` | `Mv` | write | update a task |
| **TaskList** | `Oy4` | `yT` | read-only | list all tasks |
| **TaskOutput** (aliases `BashOutput`, `AgentOutput`, …) | `Wh8` | `ns` | read-only | read output/logs from a background task |
| **TaskStop** | `cK$` | `wv` | write | kill a running background task |
| **TeamCreate** | `RAf` | `Kn` | write | create a multi-agent team |
| **TeamDelete** | `CAf` | `rs` | write | disband a team and clean up |
| **SendMessage** | `nAf` | `Q3` | read-only | send messages to agent teammates |
| **ShareOnboardingGuide** | `aAf` | `XR$` | read-only | upload ONBOARDING.md, get a team share link |
| **EnterWorktree** | `xk4` | `ofH` | write | create an isolated git worktree and switch in |
| **ExitWorktree** | `gk4` | `e38` | write | exit a worktree session |
| **LSP** | `eHq` | `wH$` | read-only | code intelligence (defs/refs/symbols/hover) |
| **REPL** | `gHq` | `Jw` | read-only | execute JavaScript with programmatic tool access |
| **Workflow** (alias `RunWorkflow`) | `ZKf` | `gG` | read-only | orchestrate subagents with a JS workflow |
| **DesignSync** | `kAf` | `aV$` | write | sync design-system components to claude.ai/design |

### Infrastructure / non-listed

| Object | Factory var | Notes |
|--------|-------------|-------|
| **mcp** (template) | `Ab6` | `isMcp:!0`; `checkPermissions` returns `passthrough`; the prototype object used for dynamically-registered MCP server tools |
| **eval_registered__\<name\>** | (dynamic) | factory at `cli.beauty.js:398474` for evaluation/advisor registered tools |
| **TestingPermission** | `No3` (`aN4`) | internal test tool for the permission system |

## Feature gates (`isEnabled`)

| Gate fn | Controls | Logic |
|---------|----------|-------|
| `LJ()` | Tasks (TaskCreate/Get/Update/List/Output, TaskStop) | on unless `CLAUDE_CODE_ENABLE_TASKS` falsy |
| `_4()` | Agent Teams (TeamCreate/Delete, SendMessage) | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` env **or** `tengu_amber_flint` flag (default true) |
| `Gm() && n1()` | Monitor | `Gm()` = `tengu_amber_sentinel` flag |
| `RP()` | Workflow | launch gate + not managed-`disableWorkflows` |
| `wk()` | ToolSearch tool | tool-search mode != standard, first-party/override |
| `YU6(z7())` | WaitForMcpServers | MCP non-blocking startup active |
| `CLAUDE_CODE_USE_POWERSHELL_TOOL` | PowerShell | env |
| `CLAUDE_CODE_ENABLE_DESIGN_SYNC` | DesignSync | env |

## Permission Modes

The canonical enum (const `qc` at `cli.beauty.js:55067`, Zod enum at `:279352`):

```
["default", "acceptEdits", "bypassPermissions", "plan", "dontAsk", "auto"]
```

| Mode | Description |
|------|-------------|
| `default` | Standard behavior; prompts for dangerous operations. |
| `acceptEdits` | Auto-accept file **edits** within allowed dirs; still asks for other writes / bash. |
| `bypassPermissions` | Bypass all permission checks (requires `allowDangerouslySkipPermissions`); tool calls auto-`allow`. |
| `plan` | Planning only — write/create tools return `behavior:"ask"` *"Cannot write … while in plan mode."* Read-only tools and read-classified Bash run. |
| `dontAsk` | Never prompt; **deny** anything not pre-approved. |
| `auto` | **NEW** — a model classifier approves/denies each permission prompt (afk-mode-2026-01-31 beta). |

> **Changes vs the 2.1.32 doc:** `delegate` is **not** in the real enum (it was speculative).
> `auto` (classifier) is real and new. `dontAsk` is confirmed real. An internal
> `permissionMode:"bubble"` exists only for the implicit fork-subagent definition (`yb`),
> not as a user-selectable mode.

### Read-only restriction (plan mode)

Plan-mode enforcement lives in the per-tool `checkPermissions`/the central
`cli.beauty.js:552058` path: any **write/create** action while `mode === "plan"` returns
`behavior:"ask"` with `decisionReason: {type:"mode", mode:"plan"}` and the message
*"Cannot write to `<path>` while in plan mode."* The permission UI offers a `setMode →
acceptEdits` suggestion to escape. Bash is gated by its **dynamic** `isReadOnly(command)`:
read-classified commands are allowed, write commands are blocked just like Write/Edit.

## Deferred-Tool / Tool-Search System

### `isDeferredTool` (`bF`, module `qR6`)

A tool is hidden behind ToolSearch (only its name appears in a `<system-reminder>`) when
`bF(tool)` returns true (`cli.beauty.js:210962`):

```
bF(H):
  H.alwaysLoad === true                  -> false   (server set alwaysLoad / defer_loading:false)
  H.isMcp === true                       -> true    (ALL MCP tools deferred)
  H.name === ToolSearch                  -> false
  H.name === Agent && fork-subagent on   -> false
  H.name === Brief                       -> false
  H.name === SendUserFile                -> false
  H.name === PushNotification && wn$()   -> false
  H.name === ScheduleWakeup && rfH()     -> false
  H.name === EnterWorktree && SESSION_KIND==bg -> false
  else                                   -> H.shouldDefer === true
```

28 built-ins set `shouldDefer:!0`; plus every MCP tool. The deferred names are listed for the
model, which then calls **ToolSearch** to fetch their real JSON Schemas before invoking them.

### ToolSearch tool (`TG$`, name const `bO`)

Description (verbatim from `cli.beauty.js:210984`):

> *Fetches full schema definitions for deferred tools so they can be called. Deferred tools
> appear by name in `<system-reminder>` messages. Until fetched, only the name is known … This
> tool takes a query, matches it against the deferred tool list, and returns the matched tools'
> complete JSONSchema definitions inside a `<functions>` block …*

Query forms: `select:Read,Edit,Grep` (exact), `notebook jupyter` (keyword, ranked), `+slack
send` (require term, rank by rest).

### Modes (`mR6()` / master predicate `wk()`)

| Mode | Behavior |
|------|----------|
| `standard` | All non-deferred tools loaded up front; no tool search. |
| `tst` | Tool search always on. |
| `tst-auto` | Search auto-engaged once the deferred-tool prompt size crosses a char threshold. |

Controlled by env **`ENABLE_TOOL_SEARCH`**:

| Value | Mode |
|-------|------|
| unset / falsy | `tst` on first-party Anthropic (optimistic default); `standard` on Vertex / non-first-party |
| `auto` | `tst-auto` |
| `auto:N` | `tst-auto`, threshold percentage `N` (clamped 0–100) |
| `0` | `tst` (always search) |
| `100` | `standard` (never search) |
| any truthy | `tst` |

Additional gates: `ts(model)` returns false for models in `tengu_tool_search_unsupported_models`
(only Sonnet 4+/Opus 4+ and newer accept `tool_reference` blocks); `hyH()` (experimental betas
off) forces `standard`. Beta headers: `advanced-tool-use-2025-11-20` and
`tool-search-tool-2025-10-19`.

Discovered tool names are recovered from `tool_reference` blocks in history (`t7H`) and carried
across compaction (`compactMetadata.preCompactDiscoveredTools`). Telemetry:
`tengu_tool_search_mode_decision`, `tengu_tool_search_outcome`, `tengu_tool_search_mcp_wait`,
`tengu_deferred_tools_pool_change`, `tengu_deferred_tool_schema_not_sent`.

## What's New vs 2.1.32

- **Count:** ~46 built-in tools vs 17 (≈ +29).
- **New subsystems / tools:** PowerShell, StructuredOutput, ToolSearch, WaitForMcpServers,
  ReadMcpResourceTool, Monitor, ScheduleWakeup, Cron{Create,Delete,List}, RemoteTrigger,
  PushNotification, Task{Create,Get,Update,List,Output,Stop}, Team{Create,Delete}, SendMessage,
  SendUserMessage/Brief, SendUserFile, ShareOnboardingGuide, EnterWorktree, ExitWorktree, LSP,
  REPL, Workflow/RunWorkflow, DesignSync.
- **BashOutput / KillShell folded in:** there is no standalone `BashOutput` or `KillShell` tool
  — `BashOutput` is now an **alias** of `TaskOutput`, and killing a background process is
  `TaskStop`.
- **Serialiser:** `SC$ → QR8`; gained `eager_input_streaming`, **lost `input_examples`**.
- **Permission modes:** added `auto` (classifier), `dontAsk`; the speculative `delegate` is not
  in the real enum.

## Uncertainties

- The **`Loop`** tool listed in the assignment is not a distinct tool object; `/loop`
  self-pacing is driven by **ScheduleWakeup** (`F3`). Listed as such.
- **`KillShell`** and **`BashOutput`** exist only as alias strings, not standalone tools
  (folded into `TaskStop` / `TaskOutput`). The same is true of `Teammate` (2.1.32's name): the
  team tools are now `TeamCreate`/`TeamDelete`/`SendMessage`.
- `read-only` vs `write` categories for the new tasks/teams/cron tools are inferred from intent
  (create/update/delete ⇒ write); only the core file/shell tools have explicitly verified
  `isReadOnly()` bodies.
- A handful of name-const → string mappings for `$`-suffixed minified vars (e.g. `aZ$`, `rZ$`,
  `XR$`, `aV$`, `wH$`) were resolved from their `var X = "Name"` declarations and are solid; the
  factory→name binding was confirmed for each by reading the `rK({ name: X, ... })` site.
