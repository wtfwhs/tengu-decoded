# Shared Analysis Context — Claude Code (tengu) v2.1.197

You are one of several agents collaboratively producing a deep reverse-engineering analysis of
Claude Code v2.1.197 for the `tengu-decoded` repo. The analysis goes **beyond `strings`** — the
full JavaScript source was carved out of the Bun binary and beautified.

## Established ground truth (VERIFIED from the binary — do not contradict)

- **Version:** 2.1.197
- **BUILD_TIME:** 2026-06-29T19:08:42Z
- **GIT_SHA:** c8fd8048f30950a21d28734718275aa7e97f5143
- **Platform analyzed:** linux-x86_64, ELF 64-bit, 245,517,112 bytes
- **Runtime:** **Bun v1.4.0** standalone compiled binary (was Bun v1.3.14 in 2.1.169 — RUNTIME BUMP).
  Bundle header `// @bun @bytecode @bun-cjs`. Plaintext minified JS carved from byte offset
  225,406,600–243,504,418 (18,097,818 bytes, 33,697 lines) → beautified to 733,394 lines.
- **Feature-flag backend:** still GrowthBook (`cachedGrowthBookFeatures`).
- **Flag accessors in THIS build (minified names change every build):**
  - `it(name, default)` = primary flag get (was `j$` in 2.1.169, `kL` in 2.1.32). Resolution order
    (`cli.beauty.js:145150`): 1. `CBt()` override map, 2. `IBt()` override map, 3. if `!LW()` (not
    ready) return default, 4. track GrowthBook exposure, 5. `Pt().cachedGrowthBookFeatures[name]` else default.
  - `J7(name, default, _)` = thin wrapper around `it` (`cli.beauty.js:145167`).
  - `QYr(name)` / `$U(name)` = async boolean flag checks (was `lS`/`OG6`).
- **Telemetry event fire fn:** `q(eventName, payload)` (was `d` in 2.1.169) — ~1570 call sites.
- **device_id generator:** `vW()` (`cli.beauty.js:606434`, was `cU()`). Returns persisted
  `~/.claude.json` `userID` if present, else `crypto.randomBytes(32).toString("hex")` (random 256-bit
  hex, NOT hardware-derived), persisted on first run, survives logout.
- **Provider plane selector:** ternary at `cli.beauty.js:94638` maps
  `CLAUDE_CODE_USE_BEDROCK/FOUNDRY/ANTHROPIC_AWS/MANTLE/VERTEX` → bedrock|foundry|anthropicAws|mantle|vertex|firstParty.
- **System prompt:** intro strings at `cli.beauty.js:148076` (`"You are Claude Code, Anthropic's
  official CLI for Claude."`). Composer returns an array of sections incl. `# Tone and style`,
  `# Harness` (two-track: short "# Harness" for modern models). Coordinator-mode prompt at ~225135.

## Headline counts (VERIFIED inline — recon agent may refine, but these are the baseline)

- Feature flags (distinct names via `it`/`J7`/`QYr`/`$U` accessors): **243** (was 218 → +25)
- `CLAUDE_*` env vars distinct: **470**; `ANTHROPIC_*`: **56**
- tengu_ strings total: 1502 (recon agent computes exact telemetry-event count)
- Telemetry event-fire call sites (`q(...)`): ~1570

## Files available to you (ABSOLUTE paths)

- **Beautified source (PRIMARY):** `~/dev/projects/tengu-decoded/versions/2.1.197/bundle/cli.beauty.js`
  — 733k lines, readable. Search with `grep -n 'pattern' <path>` and Read with offset/limit.
- **Minified source:** `.../versions/2.1.197/bundle/cli.min.js` — 33k lines, for byte-accurate strings.
- **Raw extracts:** `~/dev/projects/tengu-decoded/versions/2.1.197/data/raw/`
  (strings-tengu.txt, strings-urls.txt, strings-env-vars.txt, env-claude.txt, models.txt,
  strings-long-prompts.txt, strings-full.txt).
- **Reference (2.1.169 — the previous DEEP analysis):** `~/dev/projects/tengu-decoded/versions/2.1.169/`
  — MATCH this version's markdown style and YAML schema exactly. Read the corresponding 2.1.169 file
  before writing yours. Reference (2.1.32, strings-only): `.../versions/2.1.32/`.

## Output location

Write your assigned files into `~/dev/projects/tengu-decoded/versions/2.1.197/`
(markdown at top level, YAML under `data/`). The directory and `data/` already exist.

## Quality bar (the user asked to "go super deep, beyond string analysis")

- Ground every claim in the actual source. Cite function names (e.g. `it`, `q`, `vW`) or
  `cli.beauty.js:LINE`. Prefer reading real function bodies over guessing from isolated strings.
- Decode behavior: don't just list a flag — explain what the code DOES when on/off.
- Note what is NEW or CHANGED vs **2.1.169** wherever you can tell (this is the key delta, not 2.1.32).
- Be precise about defaults (`!0`=true, `!1`=false, `null`, `{}`, `""`, numbers).
- Mark genuine uncertainty explicitly; never fabricate. Minified identifiers are mangled — infer
  from surrounding string context and call sites, and say when an inference is tentative.
- Write for both humans and future LLM sessions: clear headings, lookup tables, fenced snippets.
