export const meta = {
  name: 'cc-2.1.197-deep-analysis',
  description: 'Deep reverse-engineering analysis of Claude Code v2.1.197 from the carved+beautified Bun bundle',
  phases: [
    { title: 'Recon', detail: 'exact counts + symbol map written to _facts.md' },
    { title: 'Analyze', detail: 'one specialist agent per topic writes md + yaml' },
    { title: 'Verify', detail: 'adversarial per-topic verification against source, fixes in place' },
    { title: 'Synthesize', detail: 'overview + 2.1.169→2.1.197 comparison' },
  ],
}

const ROOT = '~/dev/projects/tengu-decoded'
const V = `${ROOT}/versions/2.1.197`
const REF = `${ROOT}/versions/2.1.169`
const BEAUTY = `${V}/bundle/cli.beauty.js`

const PREAMBLE = `You are analyzing Claude Code v2.1.197 for the tengu-decoded reverse-engineering repo.
FIRST read the shared context: ${V}/bundle/ANALYSIS_CONTEXT.md — it has verified ground truth
(version 2.1.197, build 2026-06-29T19:08:42Z, GIT_SHA c8fd8048f30950a21d28734718275aa7e97f5143,
Bun v1.4.0, flag accessors it()/J7()/QYr()/$U(), event-fire q(name,payload), device_id gen vW()).
Primary source to grep/Read: ${BEAUTY} (733k lines). Raw extracts under ${V}/data/raw/.
ALWAYS read the equivalent 2.1.169 file under ${REF}/ first and MATCH its markdown style + YAML schema.
Ground every claim in the source — cite cli.beauty.js:LINE or function names. Note what is NEW/CHANGED
vs 2.1.169. Never fabricate; mark uncertain inferences. Use \`grep -n\` and Read with offset/limit;
do NOT cat the whole 27MB file.`

phase('Recon')
const FACTS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['feature_flags', 'telemetry_events', 'builtin_tools', 'env_vars', 'api_endpoints', 'slash_commands', 'models', 'headline_deltas'],
  properties: {
    feature_flags: { type: 'integer' },
    telemetry_events: { type: 'integer' },
    builtin_tools: { type: 'integer' },
    env_vars: { type: 'integer' },
    api_endpoints: { type: 'integer' },
    slash_commands: { type: 'integer' },
    models: { type: 'integer' },
    headline_deltas: { type: 'array', items: { type: 'string' }, description: 'short bullet strings: notable NEW/CHANGED vs 2.1.169 with evidence' },
  },
}

const facts = await agent(
  `${PREAMBLE}

TASK: Establish the canonical headline numbers for v2.1.197 that every other doc will cite, and write
a facts file the other agents read.

Compute EXACT distinct counts, grounded in ${BEAUTY}:
- feature_flags: distinct tengu_ flag names passed as the first string arg to it()/J7()/QYr()/$U() accessors.
- telemetry_events: distinct event-name strings passed to the event-fire fn q(name, payload). Distinguish
  these from feature flags (flags go through the accessors above; events go through q()).
- builtin_tools: count of registered built-in tool definitions (look at how 2.1.169 counted ~46; find the
  tool registry / objects with name+description+inputSchema).
- env_vars: distinct process.env.* keys referenced (CLAUDE_*, ANTHROPIC_*, plus others like ENABLE_/DISABLE_/USE_).
- api_endpoints: distinct URL path templates hit (api.anthropic.com/... and claude.ai/...).
- slash_commands: distinct user-facing slash commands.
- models: distinct claude-* model ids referenced.

Then WRITE ${V}/bundle/_facts.md containing: (1) a table of these counts WITH the 2.1.169 number beside
each and the delta, (2) the per-build symbol map (accessors, event fire, composer, device_id gen,
provider selector) with cli.beauty.js line numbers, (3) a bulleted "headline deltas vs 2.1.169" list
with evidence. Be precise; this is the source of truth for the overview and comparison docs.

Return the structured counts.`,
  { label: 'recon:facts', phase: 'Recon', schema: FACTS_SCHEMA }
)

const TOPICS = [
  { key: 'feature-flags', md: 'feature-flags.md', yaml: 'data/feature-flags.yaml', ref: 'feature-flags.md',
    focus: `Enumerate the feature flags reachable via it()/J7()/QYr()/$U(). For each: name, default (decode !0/!1/null/{}/""/number), accessor, category, and what the code DOES when on vs off. Group by codename family (bg_, kairos_, bridge_, ccr_, relay_, harbor, amber_, workflows, cowork, advisor, plan, classifier, review, etc.). Call out flags NEW in 2.1.197 and any default that FLIPPED vs 2.1.169. YAML top key flags:, items {name, default, category, accessor, description, optional related_env_var/notes}.` },
  { key: 'telemetry', md: 'telemetry.md', yaml: 'data/telemetry-events.yaml', ref: 'telemetry.md',
    focus: `Document the telemetry stack and events fired via q(name, payload). Cover every backend present and its on/off default + gating flag: first-party event_logging v2 batch, Datadog us5 (token? rotated?), OpenTelemetry, GrowthBook, Perfetto. Confirm Segment still removed, no Sentry. Enumerate the major event families and counts. Note telemetry dropped on 3P provider planes. YAML follows 2.1.169 telemetry-events.yaml schema.` },
  { key: 'api-endpoints', md: 'api-endpoints.md', yaml: 'data/api-endpoints.yaml', ref: 'api-endpoints.md',
    focus: `Map all internal API endpoints: api.anthropic.com paths (messages, event_logging, oauth, trusted_devices), the managed-agents cloud surface (/v1/sessions, /v1/agents, /v1/environments, /v1/files, /v1/skills, /v1/user_profiles, beta header managed-agents-*), claude.ai/code routines, and any remote-control/bridge ws endpoints. Note new/changed surfaces and beta-header date bumps vs 2.1.169. YAML per 2.1.169 schema.` },
  { key: 'system-prompt', md: 'system-prompt.md', ref: 'system-prompt.md',
    focus: `Decode the system-prompt composition. Find the composer and section builders (intro variants for CLI vs Agent SDK vs coordinator at ~148076/225135, # System, # Doing tasks, # Tone and style, # Harness two-track). Quote the actual extracted section text where load-bearing. Note CLAUDE_CODE_SIMPLE / modern-model short-harness gating. Diff the prompt text vs 2.1.169 where you can.` },
  { key: 'tool-definitions', md: 'tool-definitions.md', yaml: 'data/tools.yaml', ref: 'tool-definitions.md',
    focus: `Enumerate built-in tools (name, internal_name, description, category). Cover schema serialisation and permission modes. Identify tools NEW vs 2.1.169. YAML top key tools: plus schema_serialisation and permission_modes blocks per 2.1.169.` },
  { key: 'security-model', md: 'security-model.md', yaml: 'data/security-checks.yaml', ref: 'security-model.md',
    focus: `Document the security model: command-injection detection (LLM prefix-classifier via Haiku + destructive-command regex table + auto-mode classifier — confirm still that shape, find the prompts/regexes), file-access gating, permission system, credential storage (~/.claude/.credentials.json plaintext chmod 600?). Note changes vs 2.1.169. YAML per 2.1.169 security-checks schema.` },
  { key: 'architecture', md: 'architecture.md', ref: 'architecture.md',
    focus: `Internal architecture: Bun 1.4.0 standalone packaging, background-agent daemon/supervisor/worker pool, kairos loops/scheduling, Workflows VM engine, multi-agent teams/coordinator, remote-control bridge. Describe how the pieces connect with function/line evidence. Highlight architectural changes vs 2.1.169 (esp. the Bun runtime bump and anything new).` },
  { key: 'model-references', md: 'model-references.md', yaml: 'data/models.yaml', ref: 'model-references.md',
    focus: `All model ids referenced (claude-opus/sonnet/haiku/fable families) and the fallback/aliasing system. Default models per role (main, fast/haiku classifier, subagent). Note new model ids vs 2.1.169 (e.g. fable, opus-4-x). YAML per 2.1.169 models schema.` },
  { key: 'environment-variables', md: 'environment-variables.md', yaml: 'data/environment-vars.yaml', ref: 'environment-variables.md',
    focus: `Catalogue env vars (CLAUDE_*, ANTHROPIC_*, ENABLE_/DISABLE_/USE_*). Group by domain (auth, telemetry, bg agents, provider planes, feature toggles). For each give effect. Mark NEW vs 2.1.169. YAML per 2.1.169 environment-vars schema.` },
  { key: 'hidden-commands', md: 'hidden-commands.md', yaml: 'data/commands.yaml', ref: 'hidden-commands.md',
    focus: `Enumerate slash commands incl. hidden/disabled/dev-only ones and their gating. Note new commands (/loop, /schedule, /background, /tasks, /fork, /remote-control, /teleport, etc.) and any added in 2.1.197. YAML top key commands: per 2.1.169 schema.` },
  { key: 'codenames', md: 'codenames.md', ref: 'codenames.md',
    focus: `Catalogue internal codenames (amber, kairos, harbor, baku, mantle, flint, sextant, etc.) mapping codename→feature domain, with evidence. Flag codenames NEW in 2.1.197 vs 2.1.169.` },
  { key: 'plan-tier-gating', md: 'plan-tier-gating.md', ref: 'plan-tier-gating.md',
    focus: `Subscription/plan gating: how plan tiers (free/pro/max/team/enterprise) gate features, rate limits, model access. Find the gating logic and any new tier checks vs 2.1.169.` },
  { key: 'device-fingerprinting', md: 'device-fingerprinting.md', yaml: 'data/fingerprinting.yaml', ref: 'device-fingerprinting.md',
    focus: `MARQUEE deep section. How Claude Code identifies the device + user. Cover: device_id = random hex from vW() persisted to ~/.claude.json userID (NOT hardware); the cross-platform hardware machine-id detector (ioreg/etc/machine-id/hostid/registry) and whether it is hashed/stripped; identity fields (sessionId, oauthAccount, organizationUuid, accountUuid, deviceId); hashing primitives (sha256/sha1/md5 counts); trusted-device token flow (X-Trusted-Device-Token, /api/auth/trusted_devices); OAuth client id + PKCE; what gets sent to which telemetry backend. Provide a clear "what leaves the machine" summary. YAML data/fingerprinting.yaml per 2.1.169.` },
]

const written = await pipeline(
  TOPICS,
  (t) => agent(
    `${PREAMBLE}

Also read ${V}/bundle/_facts.md (canonical counts — use these numbers, don't recompute differently)
and ${REF}/${t.ref} (the 2.1.169 version of YOUR file — match its structure and depth).

TASK — produce the v2.1.197 "${t.key}" analysis:
${t.focus}

Write the markdown to ${V}/${t.md}${t.yaml ? ` and the structured YAML to ${V}/${t.yaml}` : ''}.
Depth bar: this is a DEEP analysis — at least as thorough as the 2.1.169 file, grounded in real
function bodies with cli.beauty.js:LINE citations. When done, return a JSON-free plain-text list of
the 6-10 most load-bearing factual claims you made (each with the file:line evidence) so a verifier
can check them.`,
    { label: `write:${t.key}`, phase: 'Analyze' }
  ).then((claims) => ({ t, claims })),
  ({ t, claims }) => agent(
    `${PREAMBLE}

You are an adversarial VERIFIER for the v2.1.197 "${t.key}" analysis at ${V}/${t.md}${t.yaml ? ` (+ ${V}/${t.yaml})` : ''}.
The author listed these key claims:
---
${claims}
---
Read the file(s), then independently check the highest-risk claims against ${BEAUTY} (grep + Read the
real lines). For ANY claim that is wrong, imprecise, or unsupported: FIX it directly with Edit in the
md/yaml file (correct the fact, adjust the count to match _facts.md, or soften to a marked inference).
Do not pad. Verify counts, defaults (!0/!1), function names, line cites, and any "NEW vs 2.1.169" claim.
Return a short verdict: which claims were CONFIRMED, which you FIXED (and how).`,
    { label: `verify:${t.key}`, phase: 'Verify' }
  )
)

phase('Synthesize')
const synth = await parallel([
  () => agent(
    `${PREAMBLE}

Read ${V}/bundle/_facts.md and ALL the topic markdown files now present in ${V}/ (feature-flags.md,
telemetry.md, api-endpoints.md, system-prompt.md, tool-definitions.md, security-model.md,
architecture.md, model-references.md, environment-variables.md, hidden-commands.md, codenames.md,
plan-tier-gating.md, device-fingerprinting.md). Also read ${REF}/overview.md to match style.

TASK: Write ${V}/overview.md — the background + "big story" for v2.1.197: build metadata, runtime
(Bun 1.4.0), headline counts table with deltas vs 2.1.169, and a narrative of what changed in this
release. Link to the sibling docs. Match the 2.1.169 overview.md structure and tone.`,
    { label: 'synth:overview', phase: 'Synthesize' }
  ),
  () => agent(
    `${PREAMBLE}

Read ${V}/bundle/_facts.md, the new v2.1.197 topic docs in ${V}/, the corresponding 2.1.169 docs in
${REF}/, and ${ROOT}/comparisons/2.1.32-to-2.1.169.md (to match the comparison format exactly).

TASK: Write ${ROOT}/comparisons/2.1.169-to-2.1.197.md — a focused version comparison. Include: a header
line with both build dates + patch-count gap, an "At a glance" delta table (runtime, flags, events,
tools, env vars, endpoints, notable flag flips), a "big story" narrative of what changed between
2.1.169 and 2.1.197, and per-dimension sections (feature flags, telemetry, tools, security, models,
architecture). Ground claims in the per-version docs. Since 2.1.169 and 2.1.197 are only ~28 patch
versions apart and BOTH are deep analyses, the deltas are REAL changes (not analysis-depth artifacts) —
say so. Also append a one-line entry for this comparison to ${ROOT}/comparisons/README.md if that file
lists comparisons.`,
    { label: 'synth:comparison', phase: 'Synthesize' }
  ),
])

return {
  facts,
  topics_written: TOPICS.map((t) => t.key),
  verify_summaries: written.map((w, i) => ({ topic: TOPICS[i].key, ok: Boolean(w) })),
  synth_done: synth.map(Boolean),
}
