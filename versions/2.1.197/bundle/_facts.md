# Canonical Facts — Claude Code v2.1.197

> **SOURCE OF TRUTH for the v2.1.197 analysis.** Every other doc (overview, comparison, per-topic)
> MUST cite the numbers and symbols below. Computed directly from the carved, beautified bundle.
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **Platform**: Linux x86-64 (ELF, 245,517,112 bytes)
> **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Runtime**: Bun **v1.4.0** (was v1.3.14 in 2.1.169)
> **Primary artifact**: `cli.beauty.js` (733,394 lines) carved from byte offset 225,406,600.

---

## 1. Headline counts (vs 2.1.169)

| Dimension | 2.1.169 | **2.1.197** | Δ | Method (identical-grep where stated) |
|---|---|---|---|---|
| **Feature flags** | 218 | **243** | **+25** | distinct `tengu_*` first-arg to `it`/`J7`/`QYr`/`$U` accessors |
| **Telemetry events** | 1086 | **1163** | **+77** | distinct event-name first-arg to fire fn `q(name,payload)` |
| **Built-in tools** | 46 | **49** | **+3** | factory call sites − `mcp` − `eval_registered__` − `TestingPermission` |
| **Env vars (CLAUDE_*/ANTHROPIC_*)** | 490† | **526** | **+36** | distinct `CLAUDE_*`(470) + `ANTHROPIC_*`(56) identifiers |
| **API path templates** | 144 | **164** | **+20** | distinct `/v1/*` + `/api/*` templates (docs/.md stripped) |
| **Slash commands** | 93 | **93** | **0** | distinct `name:` on a `type:"local\|local-jsx\|prompt"` command object (churn: +2/−2) |
| **Model ids** | 56 | **61** | **+5** | distinct `claude-*` model-id strings (incl. legacy/dated/`-fast`/`-v1`) |

† 2.1.169's published headline was **490**. Re-running the *identical* `CLAUDE_*`+`ANTHROPIC_*`
identifier grep over the 2.1.169 bundle yields **474**, so the same-method delta is **+52** (474→526).
The +36 figure compares 526 against 2.1.169's published 490. Use **526** as the 2.1.197 number.

### Counting caveats (so downstream docs don't re-derive divergent numbers)

- **Feature flags = 243.** Breakdown by accessor: `it` 239, `J7` 6, `QYr` 1, `$U` 3 (union, deduped).
  All first-args are `tengu_`-prefixed string literals. `it(name,default)` is the primary getter; the
  others are wrappers / async-boolean checks.
- **Telemetry events = 1163.** `q(` appears at **1684** call sites; **1163** carry a distinct string
  literal as the first arg, and **all 1163 are `tengu_`-prefixed**. There is **no** non-`tengu_` event
  namespace and no single/backtick-quoted event names. Events (`q`) are a **disjoint** mechanism from
  flags (`it`/`J7`/`QYr`/`$U`) even though both use the `tengu_` prefix.
- **Built-in tools = 49.** The tool factory is **`Ys({...})`** (was `rK` in 2.1.169) — **52** object-literal
  call sites. Subtract the three non-tools, matching 2.1.169's method: the generic `"mcp"` template
  (`:258427`), the dynamic `` `eval_registered__${e.name}` `` factory (`:423056`), and `"TestingPermission"`
  (`lHl`, `:426897`). `"ReadMcpResourceTool"` (`:273192`) **is** counted as a real built-in. One block
  (`K_f`, `:417376`, the **Monitor** tool) takes its `name` via a `...z_f` spread.
- **Env vars.** Total distinct `process.env.*` keys actually read = **644** (dot + bracket access).
  The headline **526** is the CLAUDE_/ANTHROPIC slice (the metric 2.1.169 headlined), which is the
  apples-to-apples figure. Direct `process.env.CLAUDE_*` access is only ~288 because most vars are read
  through the typed env-registry proxy via `process.env[NAME]` with a variable `NAME`.
- **API path templates = 164** (distinct `/v1/*` + `/api/*`, doc/asset extensions stripped). `/v1/*`
  alone = 110 (was 98). 24 new templates appear, 3 drop.
- **Slash commands = 93** (registry total: active + hidden + gated + stubs). Net count is unchanged but
  the set churned: **NEW** `design-login`, `pause-memory`; **REMOVED** `bridge-kick`, `toggle-memory`.
  Count includes the `mcp__` namespace placeholder and the disabled `stub`, identically in both builds.
- **Model ids = 61** via identical `claude-(opus|sonnet|haiku|fable)-N… | claude-N…` extraction over
  each bundle (197=61, 169=56). Family-only (opus/sonnet/haiku/fable) = 36 (was 31).

---

## 2. Per-build symbol map (this build only — minified names change every build)

| Role | 2.1.197 symbol | Line | 2.1.169 was | Notes |
|---|---|---|---|---|
| Primary flag get | `it(name, default)` | `cli.beauty.js:145150` | `j$` | override→managed→`!LW()` default→GrowthBook exposure→`Pt().cachedGrowthBookFeatures[name]` |
| Flag get wrapper | `J7(name, default, _)` | `:145167` | — | thin wrapper around `it` |
| Async bool flag | `QYr(name)` | `:145170` | `lS` | async |
| Async bool flag | `$U(name)` | `:145181` | `OG6` | async |
| Telemetry fire | `q(name, payload)` | `:4135` | `d` | 1684 call sites, 1163 distinct events |
| Tool factory | `Ys(spec)` | `:148125` | `rK` | builds tool objects; 52 literal call sites → 49 real tools |
| System-prompt intro | `j7r` (string const) | `:148076` | — | `"You are Claude Code, Anthropic's official CLI for Claude."` |
| Intro selector | `$Rn(e)` | `:148068` | — | returns intro string per provider (vertex variant) |
| Composer (Tone/style) | `zam()` | `:593679` | `iT` (family) | `["# Tone and style", ...Pz(e)].join(…)` at `:593681` |
| device_id generator | `vW()` | `:606434` | `cU` | returns `~/.claude.json` `userID` else `crypto.randomBytes(32).toString("hex")` |
| Provider selector | `yr()` | `:94637` (ternary `:94638`) | — | gateway→bedrock→foundry→anthropicAws→mantle→vertex→firstParty |

---

## 3. Headline deltas vs 2.1.169 (with evidence)

- **Runtime bump: Bun v1.3.14 → v1.4.0** (ANALYSIS_CONTEXT ground truth; bundle header `// @bun @bytecode @bun-cjs`).
- **+25 feature flags (218→243)** — server-gated surface keeps growing; accessors renamed `j$`→`it`.
- **+77 telemetry events (1086→1163)** — instrumentation still expanding; fire fn renamed `d`→`q`.
- **+3 built-in tools (46→49)** — factory renamed `rK`→`Ys` (52 literal call sites → 49 real tools).
  Which exact 3 are new is not pinned here (tool `name` fields are mangled top-level consts, not
  diffable by string); note **Monitor** (`K_f`, `:417376`) and **StructuredOutput** (`hao`/`Qp`,
  `:224719`) already existed in 2.1.169, so they are NOT the additions.
- **+20 API path templates (144→164)** — major new cloud surfaces: **`/v1/vaults/*`** (credential
  vaults incl. `…/credentials/{id}/mcp_oauth_validate`), **`/v1/deployments` & `/v1/deployment_runs`**
  (deploy/run/pause/archive lifecycle), **`/v1/skills/{id}/versions/*`** (skill versioning),
  **`/v1/design` + `/v1/design/mcp`**, **`/v1/ultrareview/preflight`**, **`/api/frame/deploy/*`**
  (frame deploy/track), plus `/v1/traces`, `/v1/groups`, `/v1/metrics`, `/v1/token`.
- **+5 model ids (56→61)** — NEW: **`claude-fable-5`**, **`claude-fable-5-mythos-5`**,
  **`claude-sonnet-5`**, **`claude-opus-4-7-fast`** (and a `claude-fable-5.md` doc reference). The
  `fable` family and a `sonnet-5` id are the marquee additions.
- **Slash-command churn, net 0 (93→93)** — NEW `/design-login`, `/pause-memory`; REMOVED `/bridge-kick`,
  `/toggle-memory`. The design + pause-memory commands align with the new `/v1/design*` endpoints and
  memory tooling.
- **Provider selector now checks a `gateway` plane first** — `yr()` (`:94637`) returns `"gateway"` via
  `Lm()` before the Bedrock/Foundry/AnthropicAws/Mantle/Vertex/firstParty ternary.
- **Identity model unchanged in shape** — `device_id`/`userID` is still a random 256-bit token from
  `crypto.randomBytes(32).toString("hex")` (`vW()`, `:606434`), persisted to `~/.claude.json`, survives logout.
