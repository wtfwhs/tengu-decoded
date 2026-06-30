# Device Fingerprinting — Claude Code (tengu) v2.1.169

> How Claude Code identifies the device, user, account, and environment it runs on — what it
> reads from the host, what it derives, what it persists, what it hashes, and what it transmits.
>
> This is a new section for the `tengu-decoded` project, produced from the **beautified JavaScript
> source** carved out of the Bun-compiled binary (not `strings`). Every claim cites a function or
> line in `cli.beauty.js` (the 662k-line beautified bundle for this build). Minified identifiers
> (`cU`, `j$`, `Mq`, `getMachineId`, …) are build-specific and will change between releases.

## TL;DR

| Question | Answer |
|----------|--------|
| Is there a stable per-device identifier sent to Anthropic? | **Yes — but it is not hardware-derived.** `device_id` = the config field `userID` = a random 256-bit token (`cU()`, `crypto.randomBytes(32).toString("hex")`, `cli.beauty.js:141641`) generated on first run and persisted to `~/.claude.json`. It is install-scoped, survives logout, and is sent **plaintext, unhashed**. |
| Does Claude Code read the hardware machine UUID? | **Yes, but it strips it before sending.** A bundled OpenTelemetry/`node-machine-id` detector reads the platform UUID (macOS `ioreg` IOPlatformUUID, Linux `/etc/machine-id`, Windows registry `MachineGuid`, FreeBSD `/etc/hostid`). The detector runs whenever a metrics provider is built — including the **first-party metrics path that is on by default for logged-in users** (not only under `CLAUDE_CODE_ENABLE_TELEMETRY`) — but the resource builder keeps **only `host.arch`**; `host.id`/`host.name` are discarded, so the UUID is **never exported**. |
| What account identity is transmitted? | `accountUuid`, `organizationUuid`, `emailAddress`, `subscriptionType`, `rateLimitTier` — mostly **plaintext** (OTel `user.email` is sent unconditionally on the first-party plane; the only identity hash in the codebase is a Datadog sampling bucket `sha256(userID)%30`). |
| Are credentials bound to the machine? | **No.** OAuth tokens live in plaintext `~/.claude/.credentials.json` (chmod 600). No encryption, no machine-id key/salt. macOS Keychain save path is dead code in this build. |
| Is there a "trusted device" concept? | **Yes** — a server-issued opaque `device_token` from `POST /api/auth/trusted_devices` (display name = `os.hostname()`), sent only on Remote-Control/bridge traffic as `X-Trusted-Device-Token`. Enforcement requires org policy `require_trusted_devices` + a flag. |
| Is there IP/country geo-blocking? | **No client-side geo-block.** What exists is a provider data-residency gate (`Mq()`) that refuses first-party API calls on the wrong plane. |
| What environment is profiled? | Entrypoint, terminal/IDE, shell, runtime (Bun/Node/Deno) + package managers, Docker/WSL/sandbox detection, distro/kernel, locale/timezone, VCS-in-cwd, plus persisted `firstStartTime`/`numStartups`/`installMethod`. Git committer identity is used locally but **not** sent in standard telemetry. |

**Bottom line:** Claude Code's transmitted identity is built around a **random per-install token plus
account identity**, not hardware fingerprinting. Hardware/OS introspection is extensive but
overwhelmingly used locally (system-prompt context, sandbox/runtime decisions, UI) rather than
exported. The most identifying data that leaves the machine is account-level (UUIDs + email) on the
first-party telemetry plane, and the hostname inside a trusted-device enrollment.

## Contents

1. [Machine & Hardware Fingerprinting](#machine--hardware-fingerprinting) — machine-id sources per OS, `device_id` derivation, host/OS resource attributes
2. [Account, User & Session Identity](#account-user--session-identity) — canonical user/anon id, account/org/email, per-backend identity matrix, session lineage
3. [Device Trust, Auth & Credential Binding](#device-trust-auth--credential-binding) — trusted-device tokens, OAuth/PKCE client identity, credential storage, attestation
4. [Environment, Runtime & Network Fingerprinting](#environment-runtime--network-fingerprinting) — entrypoint/terminal/IDE, Docker/WSL/sandbox, git/repo, geo/data-residency, persisted install fingerprint

---


## Machine & Hardware Fingerprinting

> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Runtime**: Bun v1.3.14 standalone
>
> Structured data: [data/fingerprinting.yaml](data/fingerprinting.yaml). This is the FP1 partial of the merged `device-fingerprinting.md`. It owns the **hard machine identity** (the actual hardware/OS-derived UUID) and the **host/OS OpenTelemetry resource attributes**. The *soft* environment/runtime/network fingerprint (entrypoint, shell, terminal, locale, network) is covered by FP4 (`_fp4-envnet.md`).

The single most important finding: **the value Claude Code transmits as `device_id` is NOT derived from the hardware machine-id at all.** It is a per-install random 256-bit token persisted to the user config file. The genuine hardware machine-id (`getMachineId`) lives only inside the bundled OpenTelemetry resource-detector library, and even when the OTel monitoring feature is fully enabled, Claude Code **deliberately strips `host.id` (and `host.name`) out of the resource** — only `host.arch` survives. So in the default product, the hardware UUID of the machine is read by *no* code path that ships off-device.

---

### 1. The cross-platform hardware machine-id (`getMachineId`)

This is a vendored copy of the `node-machine-id` / OpenTelemetry `host.id` detector. It is bundled **twice**, byte-identical, once at `cli.beauty.js:136682+` and once at `cli.beauty.js:323174+` (two copies of `@opentelemetry/resources` get pulled into the bundle). Each platform is its own CommonJS module; a dispatcher (`OE_` at `cli.beauty.js:136784`, second copy `Ic5` at `323271`) lazily `require`s the right one based on `process.platform` and memoises the result (`lyH` / `mCH`). The default arm returns `undefined` and logs `could not read machine-id: unsupported platform`.

| Platform | Exact source command / file | Parsing | Citation |
|----------|-----------------------------|---------|----------|
| **darwin** | `ioreg -rd1 -c "IOPlatformExpertDevice"` | find line containing `IOPlatformUUID`, split on `" = "`, take value, drop trailing `"` (`.slice(0,-1)`) | `136685` / `323172` |
| **linux** | `/etc/machine-id`, then fall back to `/var/lib/dbus/machine-id` | `readFile(utf8).trim()`, first that exists wins | `136706` / `323193` |
| **freebsd** | `/etc/hostid`, then fall back to `kenv -q smbios.system.uuid` | `readFile(utf8).trim()` then `exec(...).stdout.trim()` | `136727` / `323214` |
| **win32** | `%windir%\System32\REG.exe QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid` (uses `sysnative` shim when running 32-bit `node` on 64-bit Windows: `arch === "ia32" && "PROCESSOR_ARCHITEW6432" in env`) | split on `REG_SZ`, take `[1].trim()` | `136752` / `323239` |
| **default** | none — returns `undefined`, logs debug | — | `136771` / `323258` |

The exec is via `execAsync = promisify(child_process.exec)` (`b18`, `cli.beauty.js:136673`). Every read is wrapped in try/catch and on error only emits an OTel `diag.debug("error reading machine id: …")` — failures are silent to the user.

This machine-id value is **raw and stable**: it is the unmodified platform UUID/GUID (or `/etc/machine-id` content). It is **not hashed, not salted, not truncated** at the point of production — that is the job of whatever consumes the detector, and (see §3) the only consumer in Claude Code throws it away.

### 2. Where `getMachineId` actually feeds: the OTel host detector

`getMachineId` is consumed by exactly one thing — the OpenTelemetry **`hostDetector`** (`vsK` class, `cli.beauty.js:136845`), which emits three host attributes:

```js
detect() { return { attributes: {
    [ATTR_HOST_NAME]: os.hostname(),
    [ATTR_HOST_ARCH]: normalizeArch(os.arch()),   // x64→amd64, arm→arm32, ppc→ppc32
    [ATTR_HOST_ID]:   getMachineId()              // ← the hardware UUID, async
}}; }
```

Sibling detectors in the same bundle:
- **`osDetector`** (`EsK`, `136866`): `os.type` = `normalizeType(os.platform())` (`win32→windows`, `sunos→solaris`), `os.version` = `os.release()`.
- **`processDetector`** (`SsK`, `136886`): `process.pid`, `process.title`, `process.execPath`, full `process.command_args`, `process.runtime.version` = `process.versions.node`, `process.runtime.name` = `"nodejs"`, and `process.owner` = `os.userInfo().username`.
- **`serviceInstanceIdDetector`** (`IsK`, `136918`): `service.instance.id` = `crypto.randomUUID()` (fresh per process, not stable).
- **`envDetector`** (`jsK`, `136577`): parses `OTEL_RESOURCE_ATTRIBUTES` and `OTEL_SERVICE_NAME` env vars only.

### 3. CRITICAL — `host.id` and `host.name` are stripped before export

The host detector is invoked by the OTel resource builder `Kf4()` (`cli.beauty.js:325308`), which
runs whenever a meter provider is built (`En5()` `:325558`). Importantly, the **first-party** metrics
reader is added **by default** for logged-in first-party users (`zf4()`/`lDH()` `:325557`, `:131583`)
with **no** `CLAUDE_CODE_ENABLE_TELEMETRY` requirement — so on the default first-party path the host
detector *does* run and the hardware machine-id *is* read. (The separate user-configured OTel
exporters are what `CLAUDE_CODE_ENABLE_TELEMETRY`/`Af4` `:325529` gate.) Either way, what matters for
privacy is that `host.id`/`host.name` are dropped from the exported resource — only `host.arch`
survives (`325328-325339`):

```js
let K = resourceFromAttributes({ "service.name":"claude-code", "service.version":"2.1.169", ["wsl.version"]? }),
    _ = resourceFromAttributes(osDetector.detect().attributes),          // os.type, os.version
    f = hostDetector.detect(),                                            // { host.name, host.arch, host.id }
    A = f.attributes?.[HOST_ARCH] ? { [HOST_ARCH]: f.attributes[HOST_ARCH] } : {},  // ← ONLY host.arch kept
    z = resourceFromAttributes(A),
    ...
    j = K.merge(_).merge(z).merge(M).merge(resourceFromAttributes(userAttrs));
```

`f` (the host detector output) contains `host.id` (= hardware machine-id) and `host.name` (= hostname), but the code copies **only `host.arch`** into the resource (`A`). `host.id` and `host.name` are discarded. So the hardware UUID is computed (the `ioreg`/registry/`/etc/machine-id` read does run when OTel is enabled) but **never leaves the machine**. This is a deliberate privacy choice — they kept the detector library but filtered its most identifying output.

The first-party event resource (`L_8`, `cli.beauty.js:140063-140090`) does **not** even call the detectors — it hand-builds `{ service.name:"claude-code", service.version, wsl.version? }` via `resourceFromAttributes`, so no host/os/process/machine attributes touch the first-party stream's resource at all.

### 4. The real `device_id`: a random per-install token (`cU` / `getOrCreateUserID`)

The telemetry field `device_id` everywhere in the codebase resolves to `cU()` (`cli.beauty.js:141641`):

```js
function cU() {                              // getOrCreateUserID
    let H = h$();                            // read global config (~/.claude.json or $CLAUDE_CONFIG_DIR)
    if (H.userID) return H.userID;           // persisted random id wins
    if (WG6) return WG6;                     // in-process cache
    let $ = GeK.randomBytes(32).toString("hex");  // 32 bytes → 64 hex chars, crypto.randomBytes
    WG6 = $;
    try { L8(q => ({ ...q, userID: $ })) }   // persist to config (saveGlobalConfig)
    catch (q) { /* log error */ }
    return $;
}
```

- `GeK = require("crypto")` (`141732`); `h$` = cached global-config read (`141179`); `L8` = config writer (`141040`).
- It is **64 hex chars of cryptographic randomness**, generated on first run and persisted. It is **stable across sessions** but **per-install / per-config-dir**, NOT tied to hardware. Wiping the config file or pointing `CLAUDE_CONFIG_DIR` elsewhere yields a new `device_id`.
- **Not hashed before transmission.** The raw value is sent.

This `cU()` value flows into:
- `device_id: cU()` in the model-API billing/metadata blob (`aPH`, `cli.beauty.js:559637`), JSON-stringified into `user_id`.
- `deviceId: cU()` in the user-metadata object `gnH` (`132438/132451`), which also carries `sessionId`, `organizationUuid`, `accountUuid` (each gated to ≥8 chars by `DQK`), `userType:"external"`, `subscriptionType`, `rateLimitTier`, version, platform, and (under GitHub Actions) the actor/repo metadata.
- `user_id` on first-party OTel log events (`f = cU(); if (f) _.user_id = f`, `cli.beauty.js:139980`).
- `device_id` on GrowthBook experiment events (`qG6`, `140024/140035`) alongside `account_uuid` / `organization_uuid`.
- `user.id` resource attribute on third-party OTel events (`BhH`, `185354/185364`).

**The one place the value is hashed** is feature-flag bucketing, not transmission: `XS_` (`cli.beauty.js:141899`) computes `parseInt(sha256(cU()).slice(0,8), 16) % JS_` to deterministically assign a rollout bucket. The hash is local; it is the *only* `createHash("sha256")` applied to the device/user id.

> Naming note: the codebase overloads "deviceId". The `deviceId` fields in `cli.beauty.js:12xxx / 13xxx / 37xxx / 523xxx` are **Chrome-extension / browser-bridge** instance IDs (per-browser, for `select_browser`/`list_connected_browsers`), unrelated to machine fingerprinting. The fingerprinting `device_id` is exclusively `cU()`.

### 5. Other host/OS introspection (read but mostly local)

| What | Source | Where it goes | Citation |
|------|--------|---------------|----------|
| **hostname** | `os.hostname()` | OTel `host.name` — but **stripped** before export (§3). Also used by daemon/socket/log code, not telemetry. | `136849`, `288410`, `397849`, `537041` |
| **platform** | `CLAUDE_CODE_HOST_PLATFORM` override else `os.platform()` (`H3$`) | telemetry `platform`, model billing context | `45498` |
| **arch** | `os.arch()` → `normalizeArch` | OTel `host.arch` (kept); BigQuery exporter resource `host.arch` | `136850`, `294428` |
| **os.type / os.version** | `os.platform()`→`normalizeType`, `os.release()` | OTel `os.type` / `os.version` resource attrs (kept) | `136870-136871`, `294426-294427` |
| **cpu count** | `os.cpus().length` | local concurrency sizing only | `373006` |
| **free memory** | `os.freemem()` | local memory-pressure decisions for background agents | `11920`, `542074`, `659703` |
| **process owner** | `os.userInfo().username` | OTel `process.owner` (detector not run by CC) | `136899` |
| **shell** | basename of `$SHELL`/`$COMSPEC`, whitelisted (`Z66`/`tn$`) | telemetry / env context (FP4) | `45504-45512` |
| **terminal type** | `jE.terminal` (from `TERM_PROGRAM` etc.) | OTel `terminal.type` attr (`BhH`, `185393`) | `185393` |
| **timezone** | `Intl.DateTimeFormat().resolvedOptions().timeZone` (`qz$`) | UI time formatting + China-TZ detection (`Asia/Shanghai`/`Asia/Urumqi`, `h85` `211024`), NOT a transmitted host fingerprint | `11417`, `211023` |
| **locale** | `Intl.DateTimeFormat().resolvedOptions().locale` language (`jVq`) | local formatting | `11423` |
| **WSL** | `WSL_DISTRO_NAME`/`WSL_INTEROP` or `/proc/version` substring; version via `WSL(\d+)` regex (`r$`/`xvH`) | OTel resource `wsl.version`, BigQuery resource | `47727`, `47744`, `294431`, `325324` |
| **User-Agent** | `claude-code/2.1.169` (`WO`) — version only, **no host info** | every HTTP request | `186` |

### 6. Telemetry SDK / service resource constants (not host-identifying, for completeness)

- `service.name` = `"claude-code"` (first-party `140075`, third-party `325313`, BigQuery default `294424`). Default OTel fallback would be `unknown_service:${process.argv0}` (`136385`) but CC always overrides it.
- `service.version` = `2.1.169`; logger/meter scope `com.anthropic.claude_code` / `…claude_code.events`.
- `telemetry.sdk.{name,language,version}` come from the SDK's static `SDK_INFO` (`defaultResource`, `136512-136518`).
- Header `x-service-name: claude-code` (`139748`).

### 7. Relevant env overrides

| Env var | Effect on machine/host fingerprinting |
|---------|----------------------------------------|
| `CLAUDE_CODE_HOST_PLATFORM` | Forces reported platform to `win32`/`darwin`/`linux`, overriding `os.platform()` (`H3$`, `45499`). |
| `CLAUDE_CONFIG_DIR` | Relocates the config file that holds the persisted random `userID`/`device_id`; changing it ⇒ new device_id. |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | Gate for the **user-configured** OTel exporters. The host/os detectors also run on the default first-party metrics path *without* this flag; either way `host.id`/`host.name` are stripped (only `host.arch` is kept). |
| `OTEL_RESOURCE_ATTRIBUTES` / `OTEL_SERVICE_NAME` | Parsed by `envDetector` and merged into the OTel resource (user-controlled). |
| `OTEL_METRICS_INCLUDE_RESOURCE_ATTRIBUTES` / `_SESSION_ID` / `_ACCOUNT_UUID` / `_VERSION` / `_ENTRYPOINT` | Toggle which identity/resource attrs ride on metrics (`BhH`, defaults `185408-185413`). |
| `CLAUDE_CODE_ACCOUNT_TAGGED_ID` | Overrides the derived `user.account_id` tag (`185389`). |

---

### Privacy implications

- **Uniquely identifying, transmitted by default:** the persisted random `device_id`/`userID` (`cU()`) — 256-bit, stable across sessions, sent on model-API metadata, first-party events, GrowthBook experiments, and OTel `user.id`. It is *install-scoped*, not hardware-scoped, so it does not survive a config wipe and does not correlate two installs on the same machine.
- **Identifying but tied to account, not hardware:** `accountUuid`, `organizationUuid`, `user.email` (when authed / gateway-OIDC), `account_id` tag — these flow alongside `device_id` and are the real cross-install correlator.
- **Hardware UUID is NOT transmitted in the default product.** The platform machine-id (`ioreg IOPlatformUUID` / `MachineGuid` / `/etc/machine-id`) is only read when OTel telemetry is explicitly enabled, and even then `host.id` and `host.name` are filtered out of the exported resource (`Kf4`, `325331`). Only `host.arch`, `os.type`, `os.version` (low-entropy, non-identifying) leave the box.
- **Low-entropy host signals that do leave:** `host.arch` (amd64/arm64/…), `os.type`, `os.version` (`os.release()` — moderately identifying when combined), `wsl.version`, `terminal.type`, `platform`. None alone identifies a device.
- **Not used as a fingerprint despite being read:** hostname, cpu count, free memory, timezone, locale — read for local logic only; timezone is additionally checked for China (`Asia/Shanghai`/`Asia/Urumqi`) for routing/compliance, not as a device id.

### Cross-cutting notes for the identity / telemetry agents

1. `device_id == userID == cU()` everywhere — treat them as one value. Per-service identity detail (which endpoint/header each carries) is yours; the *source* is `cU()` (random, persisted, unhashed).
2. The only sha256 of the id is local feature-flag bucketing (`XS_`, `141899`), never sent.
3. `service.instance.id` = `crypto.randomUUID()` is per-process random (not stable) — don't mistake it for a device id.
4. `gnH` (`132437`) is the canonical user-metadata bundle; `BhH` (`185353`) is the canonical OTel per-event attribute bundle. Both gate account/org by min length (`DQK`, ≥8) and by include-flags.
5. The hardware machine-id machinery exists and runs (when OTel is on) but its identifying output is intentionally dropped — worth flagging as a deliberate privacy posture rather than an oversight.

---

## Account, User & Session Identity

> [Back to version index](../README.md)
>
> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: linux-x86_64 | **Runtime**: Bun 1.3.14
>
> Part of the device-fingerprinting series (`_fp2`). Companion data: [data/_fp2.yaml](data/_fp2.yaml).

This section documents how Claude Code answers *"who is using me?"* and how that identity is
stitched across every telemetry/feature-flag backend. All citations are `cli.beauty.js:LINE` and
minified function names (mangled per build — inferred from call sites and string context).

### TL;DR

- **Canonical user id (anonymous/distinct id):** `userID` — a 64-hex-char random string created on
  first run by `cU()` (`cli.beauty.js:141641`) via `randomBytes(32).toString("hex")`, persisted to
  `~/.claude.json` under key `userID`. It is **NOT** derived from the account or email. It is the
  primary device/distinct id everywhere (OTel `user.id`, GrowthBook `id`, Datadog `userBucket` seed,
  first-party `user_id`).
- **Account identity** (`accountUuid`, `organizationUuid`, `emailAddress`, `displayName`, billing/seat
  fields) lives in `config.oauthAccount`, populated at login from the OAuth profile endpoint
  `${BASE_API_URL}/api/oauth/profile` (`RjH`, `cli.beauty.js:93494`) or overridden by env vars.
  Accessor: `F_()` (`cli.beauty.js:131589`) returns `h$().oauthAccount` only when authed (`yM()`).
- **What is hashed:** almost nothing. The *only* identity hash is the Datadog/GrowthBook **sampling
  bucket** `XS_()` = `sha256(userID).slice(0,8) → int → % 30` (`cli.beauty.js:141899`). The email,
  accountUuid, organizationUuid, sessionId, deviceId are all transmitted **plaintext**.
- **API request `metadata.user_id` is a JSON-stringified plaintext blob** `{device_id, account_uuid,
  session_id, ...CLAUDE_CODE_EXTRA_METADATA}` — `aPH()` (`cli.beauty.js:559624`), `CH`=`JSON.stringify`
  (`cli.beauty.js:10081`). No hashing.

### 1. Canonical user id derivation (`cU` / `userID`)

```js
function cU() {                                   // cli.beauty.js:141641
    let H = h$();
    if (H.userID) return H.userID;                // 1. persisted config value (~/.claude.json)
    if (WG6) return WG6;                           // 2. in-process cache
    let $ = GeK.randomBytes(32).toString("hex");   // 3. generate 64-hex anonymous id
    WG6 = $;
    try { L8((q) => ({ ...q, userID: $ })) }       // 4. persist to config
    catch (q) { /* log getOrCreateUserID persist failure */ }
    return $;
}
```

Resolution order: **config `userID` → in-memory cache `WG6` → freshly generated `randomBytes(32)`**.
This is a stable *anonymous/distinct id* — it survives logout (it is not part of `oauthAccount`) and
is reused across sessions. It is *not* the cross-platform machine-id (that is a separate value handled
by FP1's `node-machine-id` reader); `cU()` is the persisted-config distinct id and is what almost every
backend keys on as `device_id` / `user.id` / GrowthBook `id`.

> Note the naming inversion: the field is called `userID` in config but functions as a **device-scoped
> anonymous id**, while the real account identity is `accountUuid` inside `oauthAccount`.

### 2. Account / OAuth identity (`oauthAccount`, `accountUuid`, `organizationUuid`, email)

The authenticated identity is persisted by `TcH()` (`cli.beauty.js:93835`) into
`config.oauthAccount`. It is sourced, in priority order, by `HbH`/the login flow
(`cli.beauty.js:329288`, `:93785`):

1. **OAuth profile fetch** `RjH(accessToken)` → `GET ${BASE_API_URL}/api/oauth/profile`
   (`cli.beauty.js:93494`) returning `{account:{uuid,email,created_at,display_name}, organization:{uuid,
   billing_type, seat_tier, has_extra_usage_enabled, cc_onboarding_flags, claude_code_trial_*}}`.
2. **Token-embedded account** `H.tokenAccount.{uuid,emailAddress,organizationUuid}`.
3. **Environment overrides**: `CLAUDE_CODE_ACCOUNT_UUID` + `CLAUDE_CODE_USER_EMAIL` +
   `CLAUDE_CODE_ORGANIZATION_UUID` — if all three are set and no `oauthAccount` exists yet, they seed
   it (`cli.beauty.js:93799`). Profile fetch overrides env when available.

`oauthAccount` fields persisted (`TcH`, `cli.beauty.js:93835`): `accountUuid, emailAddress,
organizationUuid, displayName, hasExtraUsageEnabled, billingType, accountCreatedAt,
subscriptionCreatedAt, ccOnboardingFlags, claudeCodeTrialEndsAt, claudeCodeTrialDurationDays, seatTier`.

Accessors: `F_()` → `oauthAccount` (`:131589`); `h$().oauthAccount?.accountUuid` is the canonical
account id; the messages-API `account_uuid` falls back to env via
`h$().oauthAccount?.accountUuid || process.env.CLAUDE_CODE_ACCOUNT_UUID` (`:561885`, `:140358`).

**OIDC gateway identity** (enterprise gateway/OTEL path): `iY8()` (`cli.beauty.js:185283`) decodes the
gateway JWT (`ni_` base64url-decodes the JWT payload, `:185271`) and emits resource attrs
`user.id = jwt.sub`, `user.email = jwt.email`, `user.groups = jwt.groups.join(",")` with
`identity.source = "gateway-oidc"`. When this path is active it **overrides** any `user.*`/`identity.*`
from `OTEL_RESOURCE_ATTRIBUTES` (`:185361`).

#### Config storage

Config file: `~/.claude.json` (or `${CLAUDE_CONFIG_DIR}/.claude.json`). Path resolver
`TG()` (`cli.beauty.js:45520`) = `path.join(CLAUDE_CONFIG_DIR || os.homedir(), ".claude.json")`;
config dir = `CLAUDE_CONFIG_DIR ?? ~/.claude` (`:4168`). Reader `h$()` (`:141179`, memoised on mtime);
writer `L8()`/`b_8` (`:141040`) with a lock + a guard refusing to wipe auth (`:141272`, GH #3117).

### 3. The central metadata object (`gnH` / `XQK`)

Almost every backend pulls from one memoised metadata builder `gnH` (`cli.beauty.js:132437`),
exposed via `XQK()` = `gnH(!0)` (`:132411`):

```js
gnH = y8((H) => {
    let A = F_(),
        z = DQK(A?.organizationUuid),     // DQK = length>=8 string validator, NOT a hash (:132422)
        Y = DQK(A?.accountUuid);
    return {
        deviceId: cU(),                   // the anonymous userID
        sessionId: y$(),                  // current session uuid
        email: eV_(),                     // *** STUB: returns undefined (:132415) ***
        appVersion: "2.1.169",
        platform: H3$(),                  // CLAUDE_CODE_HOST_PLATFORM | os.platform (:45498)
        organizationUuid: z,
        accountUuid: Y,
        userType: "external",
        subscriptionType: O4(),           // max/team/enterprise/pro
        rateLimitTier: ac(),
        firstTokenTime: ...,
        ...GITHUB_ACTIONS && { githubActionsMetadata: { actor, actorId, repository, ... } }
    };
});
```

Two things stand out:

- `DQK(H)` (`:132422`) is `typeof H === "string" && H.length >= 8 ? H : void 0` — a **passthrough
  validator, not a hash**. `accountUuid`/`organizationUuid` leave this function in plaintext.
- `eV_()` (`:132415`) — the email getter — is a **no-op stub returning `undefined`**. So `email` is
  effectively absent from this central object, which means GrowthBook and the first-party event sink
  receive **no email** through `gnH`. Email only reaches OTel (from `oauthAccount.emailAddress`
  directly) and the OIDC gateway path. (New vs 2.1.32 worth flagging: email scrubbed from the GB/flag
  attribute surface.)

### 4. Per-service identity matrix

| Service | Active? | id key | account | org | email | session | extra identity | hashed? | gate |
|---|---|---|---|---|---|---|---|---|---|
| **Anthropic Messages API** (`metadata.user_id`) | yes | `device_id` = `cU()` | `account_uuid` (oauth or env) | — | — | `session_id` = `y$()` | `+CLAUDE_CODE_EXTRA_METADATA` merged | **no** (JSON.stringify) | always; `aPH()` `:559624` |
| **GrowthBook** (flags/experiments) | yes (default backend) | `id` = `deviceId` (`cU()`) | `accountUUID` | `organizationUUID` | `email`→**absent** (eV_ stub) | `sessionId` | `deviceID`, `userType`, `subscriptionType`, `rateLimitTier`, `firstTokenTime`, `platform`, `apiBaseUrlHost`, `appVersion` | **no** | `DISABLE_GROWTHBOOK`, `iu()`; `YG6()` `:140351` |
| **GrowthBook experiment exposure event** | yes | `device_id` = `cU()` | `account_uuid` | `organization_uuid` | — | `session_id` | `experiment_id`, `variation_id`, `user_attributes:{appVersion}` | **no** | `qG6()` `:140021` |
| **Datadog** (`http-intake.logs.us5.datadoghq.com/api/v2/logs`) | yes (first-party only) | `userBucket` = sha256(`cU()`)%30 | `auth.account_uuid` (via core_metadata) | `auth.organization_uuid` | — | `session_id`, `parent_session_id` | `service:"claude-code"`, `hostname:"claude-code"`, `env:"external"`, `userType`, `subscriptionType`, `model`, `platform` | **userBucket only** | `Mq()==="firstParty"` + `tengu_log_datadog_events` flag; `EiH()` `:141812` |
| **First-party metrics** (`/api/claude_code/metrics`) | **yes — on by default for logged-in first-party users** | `user.id` = `cU()` | `user.account_uuid` | `organization.id` | **`user.email` (plaintext, sent by default)** | `session.id` | counter datapoint attrs via `BhH()` spread (`:570980`); exporter `Mg6` forwards verbatim (`:294448`) | **no** | first-party + org metrics-enabled (`st7()` `:294324`); **not** gated by `CLAUDE_CODE_ENABLE_TELEMETRY`; `zf4()`/`lDH()` `:325557` |
| **OpenTelemetry** (user-configured exporters) | opt-in (`CLAUDE_CODE_ENABLE_TELEMETRY`/OTEL env) | `user.id` = `cU()` | `user.account_uuid` + `user.account_id`(base58 `user_01…`) | `organization.id` | `user.email` (plaintext, **unconditional** if set) | `session.id` | `app.version`, `app.entrypoint`, `terminal.type`; OIDC: `user.groups`, `identity.source` | **no** | per-field env gates; `BhH()` `:185353`, `iY8()` `:185283` |
| **First-party OTel event/log sink** (`d()`/`Ny`) | yes | `user_id` = `cU()` | `core.auth.account_uuid` | `core.auth.organization_uuid` | — | `core.session_id`, `core.parent_session_id`, `agent_id`, `team_name` | `user_metadata` = full `gnH` object, `userType:"external"`, `subscriptionType` | **no** | `iu()` (=`!CLAUDE_CODE_DISABLE_NONESSENTIAL…`); `$G6()` `:139967`, `ltK()` `:139270` |
| **Trusted-device enrollment** | yes | — | `accountUuid` | `organizationUuid` | — | — | enrollment token request keyed by account+org | n/a | re-login skipped if same account+org; `Iy8`/`_4f` `:383523` |
| **Segment** | **REMOVED** | — | — | — | — | — | 0 hits for `api.segment.io` (was primary analytics in 2.1.32) | — | — |
| **Statsig** | **not present** | — | — | — | — | — | only incidental local cache dir name (`:593189`) | — | — |

Notes:
- `Mq()==="firstParty"` means the user is on Anthropic's own backend (not Bedrock/Vertex/custom). The
  Datadog sink is suppressed off-first-party. GrowthBook/first-party events also short-circuit when
  `ayH("firstParty")`/`QC()` indicate non-essential traffic disabled.
- **Datadog public client token (changed):** `pubea5604404508cdd34afb69e6f42a05bc`
  (was `pubbbf48e6d78dae54bceaa4acf463299bf` in 2.1.32). Region still US5. Flush 15 000 ms, batch 100
  (`zS_`/`YS_` `:141871`), override `CLAUDE_CODE_DATADOG_FLUSH_INTERVAL_MS`.

### 5. Session id lineage

Session state lives in a single in-memory object `B$` (`cli.beauty.js:3800`), initialised with
`sessionId: randomUUID()` and `parentSessionId: void 0` (`:2385`). Accessors:

- `y$()` (`:2465`) = `CV()?.sessionId ?? B$.sessionId` — current session id (`CV()` is the async-local
  override used inside sub-agents/teammates).
- `Il8()` (`:2481`) — current parent session id.

| Operation | Function | Effect on lineage |
|---|---|---|
| **New session** | `B$` init `:2385` | `sessionId = randomUUID()`, `parentSessionId = undefined` |
| **Clear / fork** | `Rl8({setCurrentAsParent})` `:2469` | if `setCurrentAsParent`: `parentSessionId = old sessionId`; then `sessionId = randomUUID()`, resets promptIndex/caches; emits "clear" |
| **Resume / set** | `pJ(id, action, projectDir)` `:2486` | `sessionId = id` (resumes an existing id), emits action |
| **Conversation reset** | `:456344` | yields `conversation_reset`, calls `Rl8({setCurrentAsParent:!0})`, re-syncs `process.env.CLAUDE_CODE_SESSION_ID = y$()` |

`CLAUDE_CODE_SESSION_ID` (env, accessor `GG1` `:45954`) is exported to child processes and re-synced on
fork (`:456346`); `--session-id` CLI flag can pin it. Sub-agents/teammates carry `agentId`,
`parentSessionId`, `agentType` (`standalone`/`teammate`), `teamName`, `parentAgentId` via `Xh_()`
(`:139144`), which flow into telemetry `core.{agent_id, parent_session_id, agent_type, team_name}`
(`:139333`). `userType` is hard-coded `"external"` throughout.

### 6. The base58 account-id tag (`user_01…`)

For OTel, the raw account UUID is additionally encoded into a stable tagged id `f37("user", uuid)`
(`cli.beauty.js:185329`): strips dashes → `BigInt("0x"+hex)` (`ri_` `:185323`) → base58 (`ii_`
`:185311`, 22-char fixed) → prefixed `user_01<base58>`. Emitted as `user.account_id` only when
`OTEL_METRICS_INCLUDE_ACCOUNT_UUID` is set, and `CLAUDE_CODE_ACCOUNT_TAGGED_ID` can supply it directly
(`:185389`). This is an encoding, **not** a one-way hash — the UUID is recoverable.

### 7. Privacy implications

- **Plaintext PII leaves by default on the first-party metrics path:** `user.email` (the real
  account email) and `organization.id` are spread into metric datapoint attributes via `BhH()`
  (`:185386`, `:570980`) and forwarded verbatim by the first-party metrics exporter `Mg6` to
  `${BASE_API_URL}/api/claude_code/metrics` (`:294360`, `:294448`). This runs by default for logged-in
  first-party users (subject to the org metrics-enabled setting `st7()` `:294324`) and is **not** gated
  by `CLAUDE_CODE_ENABLE_TELEMETRY`. The same `user.email`/`organization.id` also flow to any
  user-configured OTel exporters (`CLAUDE_CODE_ENABLE_TELEMETRY`/OTEL env) unredacted; operators
  routing OTel to third-party collectors should treat these as PII.
- **API `user_id` is a structured plaintext object**, not an opaque id: it leaks `device_id`,
  `account_uuid`, `session_id` (and any `CLAUDE_CODE_EXTRA_METADATA`) on every request.
- **No real hashing of identifiers** anywhere except the `userBucket` sampling integer. The
  `createHash("sha256")` calls noted in the FP ground-truth are used for content/machine-id digests and
  the sampling bucket — not for pseudonymising account/email/session before transmission.
- **Stable cross-session correlation:** the random `userID` persists in `~/.claude.json` and survives
  logout, so anonymous sessions remain linkable to the same install; on login they additionally join to
  `accountUuid`/email, letting backends bridge the anonymous→identified boundary.
- **Kill switches:** `DISABLE_TELEMETRY`, `DISABLE_GROWTHBOOK`, `DISABLE_ERROR_REPORTING`,
  `DO_NOT_TRACK`, `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (`:377949`). These suppress the *sinks*;
  they do not change how `userID`/`oauthAccount` are stored locally.

### Uncertainties

- `eV_()` returning `undefined` is unambiguous in this build, but whether some *other* code path repopulates
  `gnH.email` before GrowthBook init was not found — best read is email is genuinely absent from the GB
  surface here.
- Whether the Anthropic backend re-hashes the plaintext `user_id` blob server-side is out of scope
  (binary only shows it sent plaintext).
- `Mq()`/`ayH()`/`iu()` exact truth tables (first-party vs non-essential gating) are cross-referenced
  with the telemetry agent's findings.

---

## Device Trust, Auth & Credential Binding

> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **Platform**: Linux x86-64
> Source citations are `cli.beauty.js:LINE`. Minified identifiers are mangled; inferences from
> call-site/string context are marked *(inferred)*.

This partial covers how Claude Code establishes **device trust** and stores/keys credentials.
The headline finding: **trusted-device is a server-side enrollment gate scoped to Remote Control
(bridge) features, not a local attestation/TPM mechanism**, and **credentials in this Bun build
default to a plaintext `~/.claude/.credentials.json` file (chmod 0600) — they are NOT bound to the
machine by any encryption key or salt derived from the machine ID.**

---

### 1. Trusted-Device Token Lifecycle

The trusted-device module lives at `cli.beauty.js:288285-288473` (exports map `288289-288303`).

**What it is.** A trusted device token is an **opaque server-issued string** (`device_token`)
returned by `POST {BASE_API_URL}/api/auth/trusted_devices`. It is NOT computed locally, contains
no local fingerprint, and is not cryptographically derived from the machine ID. It is simply a
bearer credential the server hands out after the user authenticates with their OAuth access token.

**How it's obtained — enrollment** (`enrollTrustedDevice` = `QH$`, `288368-288448`):

1. Pre-conditions: must be first-party provider (`o_()`), Claude.ai subscriber (`$()`), feature
   gate `tengu_sessions_elevated_auth_enforcement` on (`lS(WP8)`), proactive enrollment not
   disabled (`!fzH()`), and `CLAUDE_TRUSTED_DEVICE_TOKEN` env var NOT set (env takes precedence,
   `288386-288389`).
2. Org policy must require it: `_.isPolicyEnforced("require_trusted_devices")` (or
   `isPolicyAllowed` when server-requested) — `288392`. Policy limits are awaited via
   `waitForPolicyLimitsToLoad()` (`288390`).
3. Refresh OAuth token, grab `accessToken` (`288400-288405`).
4. `zq.post(`${BASE_API_URL}/api/auth/trusted_devices`, { display_name: `Claude Code on
   ${os.hostname()} · linux` }, { Authorization: `Bearer ${accessToken}` })` — `288409-288418`.
   **The only device identifier sent is the hostname** (in a human-readable `display_name`); no
   machine-id, no MAC, no hardware UUID.
5. Extract `Y.data.device_token` (`288427`); if missing → telemetry `bridge_trusted_device_enroll`
   = `missing_token`.
6. Persist via `v1().mutate(... trustedDeviceToken: O)` (`288433-288436`) → written to the
   credentials store (see §3). Logs `device_id` from the response (`288441`).

**Enrollment triggers** (lazy + proactive):
- `enrollTrustedDeviceIfNeeded` (`nF6`, `288351-288355`): if org enforces it and device is
  unenrolled and proactive enrollment isn't disabled → "lazy enrollment with OAuth token". Called
  before establishing a remote/bridge session (`529920`).
- `383526` fires `QH$()` (proactive). `574736` re-enrolls when server requests a fresh token.
- `/login` path: `657087` does `clearTrustedDeviceToken(); enrollTrustedDevice()`.

**How it's stored & read** (`readStoredTrustedDeviceToken` = `WWH`, `288468-288472`, memoised via
`y8(...)`):
```js
WWH = y8(async () => {
    let H = process.env.CLAUDE_TRUSTED_DEVICE_TOKEN;   // env override wins
    if (H) return H;
    return (await v1().readAsync())?.trustedDeviceToken; // else from .credentials.json
});
```
`getTrustedDeviceToken` (`Qb`, `288333-288336`) returns it only when the gate is enabled
(`HN$()`). Cache cleared by `clearTrustedDeviceTokenCache` (`288348`). `clearTrustedDeviceToken`
(`iF6`, `288357-288367`) wipes `trustedDeviceToken` from storage for Claude.ai subscribers.

**How it's sent.** Exclusively as the HTTP header **`X-Trusted-Device-Token`** on Remote-Control /
bridge requests — never on normal inference traffic. Injection sites:
- `qP4()` header builder (`369069-369083`): `if (q !== undefined) K["X-Trusted-Device-Token"] = q`
  — used for bridge PR-subscribe (`369026`), Slack-thread-subscribe (`369054`).
- `interruptRemoteSession` (`371879-371886`), environment runner headers (`522413-522414`),
  teleport-events fetch (`369609`), session-ingress.

**Server enforcement / failure UX.** When the server rejects with HTTP 403 and
`error.resource === "untrusted_device"`, the CLI throws: *"This session requires a trusted device.
Run /login to enroll this device, then retry."* (`369639`; also `574096-574099`, `574723`).
Unenrolled-but-required reason string at `288342-288346`.

**Feature gates / policy keys:**
| Constant | Value | Role |
|---|---|---|
| `WP8` | `tengu_sessions_elevated_auth_enforcement` | master GrowthBook gate, default `!1` (off), `288318/288323` |
| `ev$` | `require_trusted_devices` | org **managed-policy** key checked via `isPolicyAllowed`/`isPolicyEnforced` |
| `jo7` | `tengu_sessions_elevated_auth_disable_proactive_enrollment` | disables proactive enrollment, default `!1`, `288305-288307` |

So trust is **two-keyed**: a GrowthBook rollout flag (`tengu_sessions_elevated_auth_enforcement`)
AND an org-level MDM/managed-settings policy (`require_trusted_devices`). Both must be on.

---

### 2. Attestation (bridge / Remote Control event signing)

Distinct from the device token, there is an **event attestation** filter for inbound Remote-Control
events (`cli.beauty.js:287890-287974`). This validates a per-event `device_attestation_status`
field, NOT a TPM/hardware attestation of the local machine.

- Statuses: `["UNSPECIFIED","ABSENT","VERIFIED","VERIFIED_BY_GATE","INVALID","UNCHECKED"]`
  (`287965`), prefixed `DEVICE_ATTESTATION_STATUS_` (`287958`).
- Policy builder `getAttestationFilterPolicy` (`CIH`, `288327-288332`): returns the permissive
  default `MP8` (`{enforce:!1, acceptLevel:"VERIFIED", acceptStatuses:∅}`, `287966-287969`) unless
  **both** flag `tengu_bridge_attestation_enforce` (default `!1`) is on **and** the org enforces
  `require_trusted_devices`. The enforcement config comes from flag
  `tengu_bridge_attestation_enforce_config` (`{}` default), parsed by zod `$o7` (`287903-287910`,
  schema `287970-287973`) into `{enforce:true, acceptLevel, acceptStatuses}`.
- Filter `jP8` (`287920-287957`): accepts events whose status meets `acceptLevel`
  (`yk5`, `287897-287901`: `VERIFIED` always; `VERIFIED_BY_GATE` only if acceptLevel is
  `VERIFIED_BY_GATE`). When enforcing, unverified events are **DROPPED** unless their status is in
  the `acceptStatuses` exception set; a UI warning is shown: *"Remote Control received a … without
  a valid device signature (attestation: …) and will not execute it."* (`575357-575366`,
  `573803`). Telemetry: `bridge_event_attestation` (accept/drop), `bridge-attestation-drop` UI key.

This is server-driven trust signaling on the **inbound control channel**, gated behind the same
org `require_trusted_devices` policy. No local crypto attestation of the host is performed.

---

### 3. Credential Storage — and whether it's machine-bound

**Storage backend resolver `v1()` returns `Xw6` — the plaintext backend** (`cli.beauty.js:101829-101831`).
`Xw6` (`101692-101750`) reads/writes `${L8H()}/.credentials.json`:
- Path: `k68()` (`101675-101682`) → `{storageDir, storagePath: join(L8H(), ".credentials.json")}`.
- `L8H()` (`94162-94166`) = `CLAUDE_SECURESTORAGE_CONFIG_DIR` (or `~/.claude` if empty) else the
  normal config dir `q6()`.
- `update()` (`101723-101738`) writes `JSON` then `chmod(q, 384)` → **0600**, and returns
  `warning: "Warning: Storing credentials in plaintext."` The backend's `name` is literally
  `"plaintext"` (`101693`).

**Bound to the machine? NO.** The on-disk credential file is plaintext JSON protected only by Unix
file permissions (0600). There is **no encryption-at-rest, no AES, no key/salt derived from the
machine ID**. The `pbkdf2`/`createCipher`/AES-CBC hits in the binary (`187357`, `188982`,
`189004`, `195696`, etc.) all belong to the bundled `node-forge` TLS library, not credential
storage. The machine-id (FP1) feeds OTel/telemetry `device_id`, not the credential cipher.

The closest thing to a path-binding is `J_H()` (`94168-94174`), which builds the **macOS-keychain
service name** as `Claude Code{suffix}{name}-{sha256(configDir).slice(0,8)}` — i.e. the keychain
*account name* is salted by a hash of the config-dir path (not the machine). But see below: that
keychain path is largely dead in this build.

**What's stored in `.credentials.json`:**
- `claudeAiOauth` `{accessToken, refreshToken, expiresAt, scopes, subscriptionType, rateLimitTier,
  clientId}` — written by `cDH` (`131204-131252`); telemetry `tengu_oauth_tokens_saved`
  `{storageBackend:"plaintext"}` (`131234-131235`).
- `trustedDeviceToken` (§1).
- `enterpriseGateway` `{url, jwt, expiresAt, idpRefreshToken, tokenEndpoint}` — Enterprise gateway
  IdP refresh (`101870-101878`, `101901-101911`).
- `organizationUuid`. Logout deletes `claudeAiOauth/organizationUuid/trustedDeviceToken/
  enterpriseGateway` (`325832`).
- Change-detection: `EV_` (`131271-131280`) watches the file's `mtimeMs` to invalidate the token
  cache; `auth: no token found, will re-check keychain every 30s` poll loop (`535094-535104`).

**macOS keychain — present but mostly inert in this build:**
- A `security find-generic-password -a <user> -w -s <service>` reader exists (`m0K`,
  `101780-101792`) and a legacy API-key keychain prefetch path (`getApiKeyFromConfigOrMacOSKeychain`
  = `FnH`/`Z98`, `130565-130566`). But the prefetch trigger `Pw6` (`101794-101798`) early-returns
  with no work, and `setLastKnown`/`isWindowsCredManagerAvailable` are stubs.
- The API-key **save-to-keychain branch is dead code**: `EY6` (`131146-131182`) does
  `let $ = !1; if ($) { ...add-generic-password... } else d("tengu_api_key_saved_to_config")`
  (`131149-131168`). `$` is hardcoded `!1`, so API keys are persisted to config (`primaryApiKey`),
  never the keychain, in this build. *(Likely a Bun-port regression vs. the prior Node SEA build,
  where keychain was the default on macOS — flagged as an inference.)*

**Net:** in 2.1.169 (Bun standalone), the effective credential store for OAuth + trusted-device +
gateway tokens is the **plaintext 0600 file**. Anyone with read access to the user account (or a
backup of `~/.claude`) can lift the tokens; portability across machines is trivial (no machine
binding).

---

### 4. OAuth Flow — client & device identifiers

Endpoint config `nK()` (`40256-40292`), prod constants `MRq` (`40303-40319`):

| Field | Prod value |
|---|---|
| `CLIENT_ID` (Console/platform) | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| `CLIENT_ID` (local dev `PM1`) | `22422756-60c9-4084-8eb7-27705fd5cf9a` |
| `CONSOLE_AUTHORIZE_URL` | `https://platform.claude.com/oauth/authorize` |
| `CLAUDE_AI_AUTHORIZE_URL` | `https://claude.com/cai/oauth/authorize` |
| `TOKEN_URL` | `https://platform.claude.com/v1/oauth/token` |
| `API_KEY_URL` | `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |
| `ROLES_URL` | `https://api.anthropic.com/api/oauth/claude_cli/roles` |
| `MANUAL_REDIRECT_URL` | `https://platform.claude.com/oauth/code/callback` |

- `CLAUDE_CODE_OAUTH_CLIENT_ID` env overrides `CLIENT_ID` (`40286-40290`).
  `CLAUDE_CODE_CUSTOM_OAUTH_URL` allows only an allow-listed set `Dn$` (beacon staging,
  claude.fedstart.com, claude-staging.fedstart.com) — `40267-40285`.
- **Scopes** (`40294-40303`): `ju="user:inference"`, `nwH="user:profile"`,
  `XM1="org:create_api_key"`. Default authorize scope set `e$6` =
  `[org:create_api_key, user:profile] ∪ [user:profile, user:inference, user:sessions:claude_code,
  user:mcp_servers, user:file_upload]`. `inferenceOnly` requests just `["user:inference"]`
  (`93582`). The `user:sessions:claude_code` scope is what authorizes Remote-Control sessions.

**PKCE (S256)** — `EzH` class (`326087-326132`), helpers `326067-326082`:
- `code_verifier` = `base64url(randomBytes(32))` (`Df4`, `326071-326073`).
- `code_challenge` = `base64url(sha256(verifier))` (`Jf4`, `326075-326078`),
  `code_challenge_method=S256` (`93583`).
- `state` = `base64url(randomBytes(32))` (`Xf4`, `326080-326082`).
- Loopback redirect `http://localhost:${port}/callback` or the manual paste URL (`93581`,
  `93592`). Authorize URL builder `S$8` (`93568-93587`) also appends optional `orgUUID`,
  `login_hint`, `login_method`.

**Device identifiers sent during OAuth: effectively none.** The authorize/token requests carry
`client_id`, `response_type`, `redirect_uri`, `scope`, `code_challenge(+method)`, `state`,
optional `orgUUID/login_hint/login_method`, and PKCE `code_verifier` at exchange (`93588-93596`).
No machine-id, no hardware fingerprint. The only "device naming" anywhere is the trusted-device
`display_name` hostname (§1).

- **Token exchange** `VY6` (`93588-93606`): `grant_type=authorization_code`. **Refresh** `FNH`
  (`93607-93678`): `grant_type=refresh_token`. **Revoke** `vY6` (`93679-93695`) →
  `${TOKEN_URL}/revoke`.
- **`claude_cli` first-party endpoints**: `create_api_key` (`kY6`, `93717-93736`) POSTs to
  `API_KEY_URL` with `Bearer <accessToken>`, returns `raw_key` → persisted via `EY6`. `roles`
  (`NY6`, `93696-93716`) fetches `organization_role/workspace_role/organization_name`. Profile via
  `${BASE_API_URL}/api/claude_cli_profile` (`93474`).
- **Client platform header** `i2()` (`190-216`) maps `CLAUDE_CODE_ENTRYPOINT` to
  `anthropic-client-platform` values: `claude_code_cli` (default), `claude_code_vscode`,
  `claude_code_remote`, `claude_code_sdk`, `claude_code_mcp`, `claude_code_github_action`,
  `claude_code_local_agent`, `claude_in_slack`. This is the closest thing to a client identity on
  normal API calls.
- **OAuth env injection**: `CLAUDE_CODE_OAUTH_TOKEN` (`T31`), `_TOKEN_FILE_DESCRIPTOR` (`C31`),
  `_SCOPES` (`B31`), `_REFRESH_TOKEN` (`u31`), `_CLIENT_ID` (`m31`). A static `CLAUDE_CODE_OAUTH_TOKEN`
  short-circuits the credential file and is the recommended CI/headless path (`130700-130705`).

---

### 5. API-Key Helper, Identity Tokens, Federation, Service Accounts

**`apiKeyHelper`** (settings string, `56355`): path to a script printing an auth value.
- Resolution `JV_` (`130923-...`): runs the helper via shell with a **600 s timeout** (`130932-130935`).
- **TTL caching** `tFK` (`130864-130874`): `CLAUDE_CODE_API_KEY_HELPER_TTL_MS` env (parsed int,
  must be ≥0). Cached in `gU` `{value, timestamp}`; re-run when `Date.now()-ts >= TTL` (`130880-130896`).
- **Trust guard**: `JV_` refuses to run the helper before workspace trust is confirmed —
  *"Security: apiKeyHelper executed before workspace trust is confirmed"* + telemetry
  `tengu_apiKeyHelper_missing_trust11` (`130926-130930`). This is a real defense against an
  untrusted repo's settings triggering arbitrary helper execution.
- `apiKeyHelper` is one of the script-valued settings (`ro7`, `289447`) alongside `awsAuthRefresh`,
  `gcpAuthRefresh`, `otelHeadersHelper`, `proxyAuthHelper`, `statusLine`, etc.

**OIDC Workload-Identity Federation** (SDK auth provider, `cli.beauty.js:4844-5180`, `102464-102476`):
- Config (`authentication` block / env): `identity_token` (source must be `"file"` only,
  `5172-5176`), `federation_rule_id`, `service_account_id`, `organization_id`, `workspace_id`.
- Env mapping: `ANTHROPIC_IDENTITY_TOKEN_FILE`, `ANTHROPIC_IDENTITY_TOKEN`,
  `ANTHROPIC_FEDERATION_RULE_ID`, `ANTHROPIC_SERVICE_ACCOUNT_ID`, `ANTHROPIC_ORGANIZATION_ID`
  (`4844-4884`, `5178-5180`).
- Federation token request `_0q` (`4981-5004`): `POST {baseURL}/v1/oauth/token` with
  `grant_type=<dGq>` (token-exchange), `assertion=<identity token>`, `federation_rule_id`,
  `organization_id`, optional `service_account_id`/`workspace_id`. Identity token capped at **16 KiB**
  (`4985`). Requires both an identity token and a `federation_rule_id` or it throws (`5137-5138`).
- This is the **enterprise / CI machine-identity path**: the "device" is identified by an external
  OIDC IdP assertion (e.g. GitHub Actions / cloud workload identity), exchanged for an Anthropic
  token scoped to a federation rule + service account. The "trust" here is delegated to the IdP,
  not to local hardware.

---

### 6. First-Party / Trusted-Base-URL Detection

Provider/first-party logic `SjK` (`93059-93133`):
- `getAPIProvider` `Mq()` (`93073-93074`): picks `bedrock|foundry|anthropicAws|mantle|vertex` from
  `CLAUDE_CODE_USE_*` env, else `"firstParty"`.
- `isFirstPartyProvider` `o_()` (`93081-93083`): `Mq()==="firstParty"`. Gates OAuth/trusted-device
  enrollment (§1) and several auth paths.
- `isFirstPartyAnthropicBaseUrl` `zf()` (`93119-93129`):
  ```js
  if (xQH._CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL) return !0;   // assume-first-party override
  if (!process.env.ANTHROPIC_BASE_URL) return !0;
  return new URL(ANTHROPIC_BASE_URL).host === "api.anthropic.com";
  ```
  i.e. an internal `_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` flag (read off `xQH`, the env/flag
  bag) **forces first-party trust even against a non-Anthropic base URL** — used to point at a
  proxy that should still be treated as first-party (and `shouldPropagateTraceContext` `Hj$`,
  `93131-93132`, then propagates W3C traceparent).
- `isFirstPartyApiBackend` `D8H()` = `firstParty && zf()` (`93115-93117`).
- First-party-vs-3P matters for the data-residency gate: `externalHttp` throws if a URL is
  Anthropic-operated, forcing callers through `firstPartyApi` which "enforces the 3P data-residency
  gate" (`45397`).

---

### 7. `--bare` mode (auth hardening)

The `--bare` flag (`656422` help text) sets `CLAUDE_CODE_SIMPLE=1` and: *"Anthropic auth is
strictly `ANTHROPIC_API_KEY` or `apiKeyHelper` via `--settings` (OAuth and keychain are never
read)."* It also skips keychain reads, hooks, plugin sync, auto-memory, and background prefetches.
This is the deterministic, no-ambient-credential mode for CI.

---

### Privacy & Security Implications

1. **Plaintext credentials, no machine binding.** OAuth access/refresh tokens, the trusted-device
   token, and enterprise-gateway JWTs sit in `~/.claude/.credentials.json` as plaintext (0600).
   No encryption, no machine-id-derived key. Copying the file to another machine yields a fully
   working session — the trusted-device token does **not** prevent credential exfiltration/reuse
   because it itself lives in the same plaintext file. The "trusted device" guarantee is only as
   strong as filesystem permissions + the server's willingness to accept the bearer token from any
   host that presents it. *(Confirmed: `v1()`→plaintext, `131217 z=A.name`, `chmod 384`.)*

2. **Keychain effectively disabled in the Bun build.** macOS-keychain save is dead code
   (`$=!1` at `131149`) and the prefetch is a no-op (`101794-101798`). On macOS this is a
   **regression** vs. the prior Node build's keychain-backed storage — credentials that users may
   assume are in the Keychain are actually in a dotfile. *(Inference, but strongly supported.)*

3. **Trusted-device is opt-in and org-gated, not universal.** It only activates when GrowthBook
   `tengu_sessions_elevated_auth_enforcement` is on AND the org policy `require_trusted_devices` is
   enforced. Default consumer usage never enrolls. The token is sent only on Remote-Control/bridge
   traffic, never on inference.

4. **Minimal hardware fingerprinting in auth.** Auth/OAuth sends no hardware identifiers; the only
   device descriptor is the hostname in the trusted-device `display_name`. The machine-id from FP1
   is a telemetry/OTel `device_id`, not an auth credential or encryption key.

5. **apiKeyHelper trust gate is a genuine control** — it refuses to execute a repo-supplied helper
   script before workspace trust is confirmed, mitigating settings-based RCE from untrusted dirs.

6. **`_CLAUDE_CODE_ASSUME_FIRST_PARTY_BASE_URL` is a trust override** that can make the CLI treat
   an arbitrary base URL as first-party (propagating trace context and bypassing the 3P
   data-residency gate). Anyone able to set this flag/env on the host can redirect "trusted"
   traffic.

### Uncertainties
- Whether the dead keychain branch (`$=!1`) is a deliberate Bun-port decision or a temporary
  regression — flagged as inference; the string `tengu_api_key_saved_to_keychain` and the working
  `security` reader suggest keychain was intended.
- The exact server-side schema of `device_token` (opaque to the client). The client only logs
  `device_id` and stores `device_token`.
- `Q31`/`T31`/etc. are env-accessor thunks (`mH.str()`); their string env names are confirmed via
  the exports map at `40072/40090-40095`, but I did not trace every downstream consumer.

---

## Environment, Runtime & Network Fingerprinting

> **Version**: 2.1.169 | **Build**: `2026-06-08T03:22:12Z` | **GIT_SHA**: `eb44edf196b8a320135d5a27a3cfba37773ce0cd` | **Runtime**: Bun v1.3.14 standalone
>
> Structured data: [data/_fp4.yaml](data/_fp4.yaml). This is a partial of the merged `device-fingerprinting.md`.

This is the **soft** fingerprint: everything Claude Code infers about the *environment, terminal, runtime, and network* it runs in (as opposed to the hard machine-id covered by FP1). Almost all of it is collected once per session into one `envContext` object (`Lh_`, `cli.beauty.js:139439`) and shipped on every telemetry event as the protobuf `env` message (`ltK`, `cli.beauty.js:139270`). The `Y$` object (`bQH`, `cli.beauty.js:5611`) is the central "environment service" that all probes hang off of.

---

### 1. Entrypoint & runtime context

**`CLAUDE_CODE_ENTRYPOINT`** is the master self-classification string. It is normalised at boot by `_Rq` (`cli.beauty.js:39983`):

- if already set + value is `"cli"` and SDK mode → rewrite to `"sdk-cli"`
- `argv` contains `mcp serve` → `"mcp"`
- `CLAUDE_CODE_ACTION` set → `"claude-code-github-action"`
- else → `"sdk-cli"` (SDK) or `"cli"` (plain).

The recognised entrypoint set (`j31`, `cli.beauty.js:40011`) is:
`cli, mcp, sdk-cli, sdk-ts, sdk-py, bench, claude-vscode, claude-code-github-action, local-agent, claude-desktop, remote, remote_baku, remote_cowork, remote_trigger, remote_desktop, remote_mobile, claude_in_slack, claude-desktop-3p, ssh-remote`.

The entrypoint is sent in **three** outbound channels:
- telemetry `env`/`core.entrypoint` (`cli.beauty.js:139236`, `139328`);
- the **`x-anthropic-billing-header`** sent to the model API as `cc_entrypoint=${entrypoint}` (`q68`, `cli.beauty.js:99846-99856`), alongside `cc_version`, optional `cc_workload`, and `cc_is_subagent`;
- the User-Agent string `claude-cli/2.1.169 (external, ${entrypoint}…)` (`cli.beauty.js:132311`).

**Runtime probes** (all cached via `y8()`), exposed on `Y$`/`jE`:

| Field | How | Line |
|-------|-----|------|
| `platform` | `CLAUDE_CODE_HOST_PLATFORM` override else `process.platform` (`H3$`) | 45499 |
| `platformRaw` | `CLAUDE_CODE_HOST_PLATFORM \|\| "linux"` | 139443 |
| `arch` | build constant `"x64"` | 45616 |
| `nodeVersion` | `process.version` | 45617 |
| `isRunningWithBun` | `cd()` (this build IS Bun) | 45622 |
| `getRuntimes` | probes PATH for `bun`/`deno`/`node` | 45542 |
| `getPackageManagers` | probes PATH for `npm`/`yarn`/`pnpm` | 45536 |
| `shell` | basename of `$SHELL`/`$COMSPEC`, whitelisted to ~18 known shells (`tn$`/`Z66`) | 45504 |
| `isCi` | **hardcoded `false`** in `bQH`/`envContext` (`$$(!1)`) — CI is NOT reported via this field | 45614, 139451 |

> Note the `isCi` quirk: the env-context `is_ci` is wired to a constant `false`. A *separate* terminal-emulator detector (`MN`, `cli.beauty.js:42871`) does check `CI`/`TRAVIS`/`CIRCLECI`/`APPVEYOR`/`GITLAB_CI`/`GITHUB_ACTIONS`/`BUILDKITE`/`DRONE`/`codeship`, but only to decide colour-support level, not for telemetry. GitHub Actions *is* separately reported via `is_github_action` (`$$(GITHUB_ACTIONS)`, line 139469) and a whole `github_actions_metadata` block (actor/repo/owner IDs from `GITHUB_*` env, lines 139310-139343).

**Container / sandbox / WSL detection:**
- Docker: `test -f /.dockerenv` (`LtK`, `cli.beauty.js:138175`) and also `existsSync("/.dockerenv")` in the deployment-env detector (`cli.beauty.js:45604`).
- "Contained, no internet" gate: `(isDocker || bubblewrap || IS_SANDBOX==="1") && !hasInternetAccess` (`WtK`, `cli.beauty.js:138181`). Internet is probed by a 1s HEAD to `http://1.1.1.1` (`QX1`, `cli.beauty.js:45529`).
- musl libc: `stat("/lib/libc.musl-x86_64.so.1")` (`cli.beauty.js:138189`).
- WSL: `WSL_DISTRO_NAME`/`WSL_INTEROP`, else grep `/proc/version` for `microsoft`/`wsl` (`r$`, `cli.beauty.js:47727`); WSL **version** parsed from `/proc/version` `WSL(\d+)` (`xvH`, `cli.beauty.js:47744`); WSLInterop binfmt check `/proc/sys/fs/binfmt_misc/WSLInterop` (`kxq`, `cli.beauty.js:45548`); npm-from-Windows-path (`/mnt/c/`) check (`lX1`, `cli.beauty.js:45554`).
- Linux distro: `/etc/os-release` → `linux_distro_id`, `linux_distro_version`; kernel from `os.release()` → `linux_kernel` (`Pmq`, `cli.beauty.js:47759`).
- VCS-in-cwd: directory probe for `.git/.hg/.svn/.p4config/$tf/.tfvc/.jj/.sl` + `P4PORT` → reported as `vcs` list (`Zmq`, `cli.beauty.js:47710`).
- **`detectDeploymentEnvironment`** (`yxq`, `cli.beauty.js:45565`) is a large cascade reporting one of: `codespaces, gitpod, coder, devpod, daytona, gcp-cloud-workstations, aws-cloud9, replit, glitch, vercel, railway, render, netlify, heroku, fly.io, cloudflare-pages, deno-deploy, aws-lambda, aws-fargate, aws-ecs, aws-ec2` (via `/sys/hypervisor/uuid`), `gcp-cloud-run, gcp, azure-app-service, azure-functions, digitalocean-app-platform, huggingface-spaces, github-actions, gitlab-ci, circleci, buildkite, ci, kubernetes` (`KUBERNETES_SERVICE_HOST`), `docker`, else `unknown-<platform>`. This is sent as `deployment_environment`.

`is_interactive` (`a2()`, line 139248), `client_type` (`jUH`→`B$.clientType`, `cli.beauty.js:3068`), `is_local_agent_mode`, `is_claude_code_remote`, `is_conductor`, `is_claubbit` (`CLAUBBIT` env) are all also part of the env context.

---

### 2. Editor / IDE / terminal fingerprint

Terminal type is resolved by `iX1` (`cli.beauty.js:45445`) — a long priority cascade over env vars:

- JetBrains: `sp` set (`pycharm, intellij, webstorm, phpstorm, rubymine, clion, goland, rider, datagrip, appcode, dataspell, aqua, gateway, fleet, jetbrains, androidstudio`, line 45564); `TERMINAL_EMULATOR === "JetBrains-JediTerm"` → `pycharm`; `VisualStudioVersion` → `visualstudio`.
- `TERM=xterm-ghostty`→ghostty, `TERM` includes `kitty`→kitty.
- `TERM_PROGRAM` (line 45463): if it matches `/^devin([ -]desktop)?$/i` → **`windsurf`**, else returns `TERM_PROGRAM` verbatim (so `vscode`, `iTerm.app`, `Apple_Terminal`, `ghostty`, `mintty`, etc. flow through).
- Then `TMUX→tmux`, `STY→screen`, `KONSOLE_VERSION`, `GNOME_TERMINAL_SERVICE`, `XTERM_VERSION`, `VTE_VERSION`, `TERMINATOR_UUID`, `KITTY_WINDOW_ID`, `ALACRITTY_LOG`, `TILIX_ID`, `WT_SESSION→windows-terminal`, cygwin, `MSYSTEM`, ConEmu, `WSL_DISTRO_NAME→wsl-<name>`.
- SSH: `SSH_CONNECTION || SSH_CLIENT || SSH_TTY` → `ssh-session` (`Exq`, `cli.beauty.js:45494`).
- fall through to raw `TERM`; if no TTY → `non-interactive`; else `null`.

A second, **async** JetBrains refinement (`lE_`/`nE_`, `cli.beauty.js:138149`) runs `GtK()` on non-darwin JediTerm to pin the specific JetBrains IDE. Terminal type is reported as `env.terminal` in telemetry and `terminal.type` in OTel resource attributes (`cli.beauty.js:185393`). VS Code is special-cased throughout for colour level (`cli.beauty.js:149272`, `151008`, `163378`) and a JetBrains/VSCode version gate (`Zm_`, line 151139). `LC_TERMINAL === "iTerm2"` is checked for clipboard/key behaviour (`cli.beauty.js:146745`). Terminal-program **version** comes from `TERM_PROGRAM_VERSION` (`cW1`/`dW1`, line 45789-90).

---

### 3. Git / repo identity

Git **user identity** is read on demand by two cached helpers:
- `q6H` = `git config --get user.email` (`cli.beauty.js:132482`)
- `LQK` = `git config --get user.name` (`cli.beauty.js:132488`)

**Crucially, these are NOT sent to telemetry.** Their only call sites are: commit authoring defaults (`cli.beauty.js:569312-569313`, the commit/PR flow), and a couple of local UI/feedback paths (`283794`, `286267`, `588645`). The `user.email` that *does* appear in OTel attrs (`cli.beauty.js:185294`, `185386`) comes from a different source: the **OAuth account** `emailAddress` and the **gateway OIDC JWT** `email` claim — i.e. the logged-in Anthropic identity, not the git committer. So git committer email leaks to Anthropic only indirectly, when you actually create a commit/PR through the tool.

Repo URL / branch *are* collected, but only in the **Claude-in-Chrome / remote-bridge** subsystem, not core telemetry:
- `gitRepoUrl`, `branch`, `machineName`, `dir` are POSTed to `/v1/environments/bridge` for remote-control environments (`cli.beauty.js:522445-522458`, `537068+`). The URL is run through a sanitizer `OgH()` before logging.
- `git config --get remote.origin.url` (`cli.beauty.js:52527`), `rev-parse --abbrev-ref HEAD` (branch), upstream tracking, etc. are used widely for the git/PR tooling and worktrees (`cli.beauty.js:52767`, `53129`, `369219`, `557344+`), and the GitHub-action path reports `repository_id`/`repository_owner_id` etc. from `GITHUB_*` env.

So: **ordinary repo identity (origin URL, branch, committer email) is not part of the standard per-event telemetry env payload.** It only goes outbound in the remote-bridge feature (opt-in remote control) and the GitHub Action integration.

---

### 4. Network / geo gating & proxy

**There is no IP-geolocation or country-list block.** Searches for `supported-countries`, `cf-ipcountry`, `countryCode`, "not available in your country" return nothing relevant. The CLI never collects the client's public IP for gating.

What looks like "country gating" is actually a **provider-based data-residency gate**:
- `firstPartyApi` (`nL$`, `cli.beauty.js:138716`) refuses any first-party Anthropic API call unless `Mq() === "firstParty"` (`cli.beauty.js:138721`), returning `{ok:false, reason:"data-residency"}`. `Mq()` (`cli.beauty.js:93073`) maps env to provider: `CLAUDE_CODE_USE_BEDROCK→bedrock`, `…_FOUNDRY→foundry`, `…_ANTHROPIC_AWS→anthropicAws`, `…_MANTLE→mantle`, `…_VERTEX→vertex`, else `firstParty`. When you use a 3P cloud provider, traffic is forced to stay on that provider's plane.
- The `externalHttp` client throws if asked to hit an Anthropic-operated host, with the message *"it enforces the 3P data-residency gate"* (`cli.beauty.js:45397`). Three HTTP lanes are enforced: `firstPartyApi` (api.anthropic.com, residency-gated), `externalHttp` (non-Anthropic), and a CDN lane for `downloads.claude.ai` (`cli.beauty.js:242118`).
- Telemetry itself is dropped for 3P providers: events note `[3P telemetry] Event dropped` (`cli.beauty.js:185467`), and `analytics_disabled` is set true on 3P/`DO_NOT_TRACK`/privacy-level (`cli.beauty.js:279875`).

**Proxy detection** (`cli.beauty.js:83545-83632`, module `getProxyUrl`/etc.):
- proxy URL from `https_proxy/HTTPS_PROXY/http_proxy/HTTP_PROXY` (`yS`, line 83587);
- `no_proxy/NO_PROXY` honoured with wildcard `*`, suffix `.domain`, host:port, and CIDR matching (`Gc`/`B56`, lines 83595-83632);
- Claude-specific proxy controls: `CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS` (line 83674), `CLAUDE_CODE_PROXY_RESOLVES_HOSTS` (forces custom DNS lookup through the proxy, line 83647), and an auth-helper subprocess that is handed `CLAUDE_CODE_PROXY_URL`/`CLAUDE_CODE_PROXY_HOST`/`CLAUDE_CODE_PROXY_AUTHENTICATE` (lines 83703-83709). Client mTLS via `CLAUDE_CODE_CLIENT_CERT`/`_CLIENT_KEY`/`_CLIENT_KEY_PASSPHRASE`/`_CERT_STORE`.

Internal-network reachability is probed (`probeInternalNetworkAccess`, `gX1`) and combined with the Docker/sandbox checks to drive the "DSP env gate" (`passesAntDspEnvGate`, `cli.beauty.js:138185`) — an internal Anthropic sandbox/datacentre detector, not a user-geo signal.

---

### 5. Locale / timezone

Collected purely from the JS runtime `Intl` API and POSIX env — **never** sent as a standalone telemetry field, but injected into model context:

- Timezone: `Intl.DateTimeFormat().resolvedOptions().timeZone` (`qz$`, `cli.beauty.js:11416`; also `615083` and `576705` numeric offset). Used in the **system-prompt environment context** block (current date/time + local timezone + day-of-week, `cli.beauty.js:615083-615094`) and the natural-language date parser (`cli.beauty.js:576714-576716`).
- Locale/language: `Intl.DateTimeFormat().resolvedOptions().locale` → `Intl.Locale(...).language` (`jVq`, `cli.beauty.js:11421`).
- POSIX locale env: `LC_ALL || LC_TIME || LANG` read for date formatting (`cli.beauty.js:388596`).

So the model *sees* your timezone and locale (because they're in the prompt), but they aren't enumerated into the analytics `env` protobuf.

---

### 6. Persisted install fingerprint (in `~/.claude.json` / config)

The global config (`~/.claude.json`, or `$CLAUDE_CONFIG_DIR`, or a project `.config.json`; resolved at `cli.beauty.js:5520-5523`) is the durable per-install fingerprint. Defaults from `oU()` (`cli.beauty.js:140921`).

| Field | Meaning | Source |
|-------|---------|--------|
| **`userID`** | **Stable per-install random ID** — `crypto.randomBytes(32).toString("hex")` (256-bit), created once and persisted. **Not derived from the machine-id**, so it's a pure install identifier. (`cU`/getOrCreateUserID, `cli.beauty.js:141641`) | generated |
| **`firstStartTime`** | ISO timestamp of first ever launch, written once (`kG6`, `cli.beauty.js:141660`) | clock |
| **`numStartups`** | Monotonic launch counter, `+1` at every session start (`cli.beauty.js:657608-657610`); read into `tengu_init`/OTel and gating logic (e.g. tips shown while `<10` / `<50`, `cli.beauty.js:633182-633231`) | counter |
| **`installMethod`** | `"local"` / `"global"` / `"native"` (`cli.beauty.js:326303`, `326850`, `328435`) — how the binary was installed; cross-checked against runtime install dir for drift warnings (`cli.beauty.js:327327-327332`) | resolved |
| **`oauthAccount`** | The big identity blob: `accountUuid`, `emailAddress`, `organizationUuid`, `displayName`, `organizationRole`, `workspaceRole`, `billingType`, `subscriptionType`/`seatTier`, `accountCreatedAt`, `claudeCodeTrialEndsAt`, `ccOnboardingFlags`, `hasExtraUsageEnabled` (`cli.beauty.js:93383`, `93863-93867`) | OAuth |
| `hasCompletedOnboarding`, `theme`, `editorMode`, `verbose`, `autoUpdates`, `diffTool`, `env`, etc. | UX prefs (full list = `GLOBAL_CONFIG_KEYS`/`I_8`, `cli.beauty.js:141743`) | user |

`userID` is exported as OTel `user.id` (`cli.beauty.js:185364`) and is the primary analytics actor key; `firstStartTime`+`numStartups`+`installMethod` characterise install age and update channel. The OAuth account UUID/email/org are sent to OTel only behind the explicit `OTEL_METRICS_INCLUDE_*` opt-ins (`BhH`, `cli.beauty.js:185353-185394`), and `account_uuid`/`organization_uuid` ride in the telemetry `auth` sub-message when present (`cli.beauty.js:139346-139348`). An "account tagged id" can be supplied via `CLAUDE_CODE_ACCOUNT_TAGGED_ID` or derived from the account UUID by base58 encoding (`f37`/`ii_`, `cli.beauty.js:185329-185389`).

`lastUsedNumStartups` is also snapshotted per-something (`cli.beauty.js:185211`, `185232`) to compute "startups since last seen" deltas (`cli.beauty.js:185709`).

---

### Privacy implications

1. **Per-install tracking ID is permanent.** `userID` is a 256-bit random token written to `~/.claude.json` on first run and reused forever; combined with `firstStartTime`/`numStartups` it gives Anthropic a stable, age-stamped device profile even for API-key (non-OAuth) users. Deleting `~/.claude.json` is the only reset.
2. **Rich passive environment profile every event.** Each telemetry event carries platform/arch/distro/kernel/WSL-version/shell/package-managers/runtimes/terminal/deployment-environment/CI-host metadata — enough to fingerprint a fairly specific dev setup, distinct from the random userID.
3. **Git committer email/repo URL are largely contained.** Standard telemetry does NOT exfiltrate `git config user.email`, origin URL, or branch. They leak only via (a) actually committing/PR-ing through the tool, (b) the opt-in remote-control bridge, or (c) the GitHub Action integration. The `user.email` in OTel is the *login* identity, not git.
4. **No client-IP / country collection.** "Geo" gating is purely provider-routing (data residency), driven by `CLAUDE_CODE_USE_*` env, not IP lookup. The only network self-probes are a 1.1.1.1 HEAD (internet up?) and an internal-network probe (sandbox detection).
5. **Timezone & locale reach the model.** Your IANA timezone, language, and current local time are placed in the system prompt context, so the LLM (and thus any logging of prompts) sees them, even though they're absent from the analytics protobuf.
6. **Entrypoint is broadcast to the model API**, not just analytics — `cc_entrypoint` rides in the `x-anthropic-billing-header` and User-Agent on every model call.

### Changes vs 2.1.32 / notes

- New since 2.1.32: Bun runtime (`isRunningWithBun` now true), `deployment_environment` cascade is far broader, WSL **version** parsing, `linux_distro_*`/`linux_kernel`, `vcs` list, `is_claubbit`/`is_conductor`/`is_local_agent_mode`, expanded entrypoint set (`remote_*`, `claude_in_slack`, `ssh-remote`, `claude-desktop-3p`).
- The telemetry transport is now the protobuf `event_logging/v2/batch` to `api.anthropic.com` (`cli.beauty.js:139534-139535`), not Segment.
- **Uncertainty**: `client_type` (`jUH`/`B$.clientType`) is a mutable runtime field set by `bn8`; I did not trace every setter, so its exact value space (beyond `"cli"`, `cli.beauty.js:2360`) is partially inferred. The `isCi:false` constant in `envContext` is verified literal but I cannot rule out a downstream override I didn't see.
