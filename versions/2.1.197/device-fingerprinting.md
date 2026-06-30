# Device Fingerprinting — Claude Code (tengu) v2.1.197

> How Claude Code identifies the device, user, account, and environment it runs on — what it
> reads from the host, what it derives, what it persists, what it hashes, and what it transmits.
>
> Produced from the **beautified JavaScript source** carved out of the Bun-compiled binary
> (`cli.beauty.js`, 733,394 lines for this build), not `strings`. Every claim cites a function or
> `cli.beauty.js:LINE`. Minified identifiers (`vW`, `z5t`, `nit`, `$xi`, …) are build-specific and
> change between releases — the 2.1.169 names are given alongside for cross-version tracing.
>
> **Version**: 2.1.197 | **Build**: `2026-06-29T19:08:42Z` | **GIT_SHA**: `c8fd8048f30950a21d28734718275aa7e97f5143` | **Runtime**: Bun **v1.4.0** standalone (was v1.3.14) | **Platform analyzed**: linux-x86_64
>
> Structured data: [data/fingerprinting.yaml](data/fingerprinting.yaml).

## TL;DR

| Question | Answer |
|----------|--------|
| Is there a stable per-device identifier sent to Anthropic? | **Yes — but it is not hardware-derived.** `device_id` = config field `userID` = a random 256-bit token (`vW()`, `crypto.randomBytes(32).toString("hex")`, `cli.beauty.js:606434`) generated on first run, persisted to `~/.claude.json`, install-scoped, survives logout, sent **plaintext, unhashed**. |
| **NEW in 2.1.197** — is there a second persisted random id? | **Yes.** `machineID` (`z5t()` / `getOrCreateMachineID`, `cli.beauty.js:606453`) — a *second* independent `randomBytes(32)` hex token, generated eagerly at startup (`:617835`). It is **not** the hardware machine-id. It leaves the box in exactly one place: the error-report field `host_name_redacted: z5t().slice(0,12)` (`:299471`) — a 12-hex-char redacted stand-in for the real hostname. This is new; 2.1.169 had no `machineID`. |
| Does Claude Code read the hardware machine UUID? | **Yes, but it strips it before sending.** A bundled OpenTelemetry/`node-machine-id` detector reads the platform UUID (macOS `ioreg` IOPlatformUUID, Linux `/etc/machine-id`, Windows registry `MachineGuid`, FreeBSD `/etc/hostid`/`smbios.system.uuid`). When the third-party OTel resource is built (`cli.beauty.js:337605`) only `host.arch` is kept; `host.id`/`host.name` are discarded, so the hardware UUID is **never exported**. |
| What account identity is transmitted? | `accountUuid`, `organizationUuid`, `emailAddress`, `subscriptionType`, `rateLimitTier` — mostly **plaintext**. OTel `user.email` is emitted unconditionally (no env gate) whenever the account has one (`:191324`). The only identity *hash* anywhere is the Datadog sampling bucket `sha256(vW())%30` (`:606744`). |
| Are credentials bound to the machine? | **No.** OAuth tokens live in plaintext `~/.claude/.credentials.json` (chmod 0600, `:104573`). No encryption, no machine-id key/salt. The macOS-Keychain *save* branch is still dead code (`let t=!1`, `:133991`). |
| Is there a "trusted device" concept? | **Yes** — a server-issued opaque `device_token` from `POST {BASE_API_URL}/api/auth/trusted_devices` (display name = `os.hostname()`), sent only on Remote-Control/bridge traffic as `X-Trusted-Device-Token`. Enforcement needs org policy `require_trusted_devices` + flag `tengu_sessions_elevated_auth_enforcement`. |
| Is there IP/country geo-blocking? | **No client-side geo-block.** What exists is a provider data-residency selector (`yr()`, `:94637`) that now checks a `gateway` plane first, then bedrock/foundry/anthropicAws/mantle/vertex/firstParty. |

**Bottom line (unchanged in shape from 2.1.169):** transmitted identity is a **random per-install
token plus account identity**, not hardware fingerprinting. The hardware UUID detector still runs
(when OTel is enabled) but its identifying output is filtered out. The marquee 2.1.197 change is the
**new `machineID` random token** that only ever leaves as a 12-char redacted hostname placeholder in
crash reports — a privacy-conscious addition, not a hardware fingerprint.

## Contents

1. [Machine & Hardware Fingerprinting](#1-machine--hardware-fingerprinting)
2. [Account, User & Session Identity](#2-account-user--session-identity)
3. [Device Trust, Auth & Credential Binding](#3-device-trust-auth--credential-binding)
4. [Environment, Runtime & Network — delta note](#4-environment-runtime--network--delta-note)
5. [What leaves the machine — summary](#5-what-leaves-the-machine--summary)

---

## 1. Machine & Hardware Fingerprinting

The single most important finding is unchanged: **the value transmitted as `device_id` is NOT derived
from the hardware machine-id.** It is a per-install random 256-bit token persisted to the user config.
The genuine hardware machine-id detector lives only inside the bundled OpenTelemetry resource library,
and even with OTel fully enabled, `host.id`/`host.name` are stripped — only `host.arch` survives.

### 1.1 The random per-install `device_id` (`vW` / `getOrCreateUserID`, was `cU`)

```js
function vW() {                                  // cli.beauty.js:606434
    let e = Pt();                                // read global config (~/.claude.json)
    if (e.userID) return e.userID;               // 1. persisted random id wins
    if (p6o) return p6o;                         // 2. in-process cache
    let t = b6o.randomBytes(32).toString("hex"); // 3. 32 bytes -> 64 hex chars
    p6o = t;
    try { yn((n) => ({ ...n, userID: t })) }     // 4. persist to config
    catch (n) { T(`getOrCreateUserID: could not persist userID: ${n}`, {level:"error"}) }
    return t;
}
```

- `b6o = require("crypto")`; `Pt()` = cached global-config read; `yn()` = config writer.
- 64 hex chars of cryptographic randomness, generated once, persisted. **Stable across sessions**,
  **per-install / per-config-dir**, NOT tied to hardware. Wiping `~/.claude.json` or pointing
  `CLAUDE_CONFIG_DIR` elsewhere yields a new `device_id`. Survives logout (not part of `oauthAccount`).
- **Not hashed before transmission** — the raw value is sent.

### 1.2 NEW — the second random token `machineID` (`z5t` / `getOrCreateMachineID`)

2.1.197 adds a *second* persisted random token, byte-for-byte the same construction as `vW`, but under
a different config key (`machineID`) and in-process cache (`f6o`):

```js
function z5t() {                                 // cli.beauty.js:606453
    let e = Pt();
    if (e.machineID) return e.machineID;
    if (f6o) return f6o;
    let t = b6o.randomBytes(32).toString("hex"); // independent randomBytes(32)
    f6o = t;
    try { yn((n) => ({ ...n, machineID: t })) }
    catch (n) { T(`getOrCreateMachineID: could not persist machineID: ${n}`, {level:"error"}) }
    return t;
}
```

- Generated **eagerly at startup**, right after `firstStartTime` is set: `…H6o(), z5t();` (`:617835`).
- Exported from its module as `getOrCreateMachineID` (`:605582`).
- **It is NOT the hardware machine-id.** Despite the name, it is the same `crypto.randomBytes(32)`
  pattern as `userID`. There is no `ioreg`/registry/`/etc/machine-id` read behind it.
- **The only place it leaves the device** is the error-report payload field
  `host_name_redacted: z5t().slice(0, 12)` (`:299471`) — i.e. the first **12 hex chars** of the random
  token, used as a privacy-redacted stand-in for the real hostname in crash/error reports (the same
  Datadog-style payload that carries `ddtags`, `ddsource:"nodejs"`, `user_bucket`, `sourcemap_group`,
  and stack frames, `:299450-299480`). The real `os.hostname()` is *not* in this payload.

> **Why this matters.** 2.1.169 stripped the real hostname from OTel but had no notion of a stable,
> redacted host token in error reports. 2.1.197 introduces one: a per-install random id whose 12-char
> prefix lets Anthropic correlate crash reports from the same install **without** ever transmitting the
> real hostname or hardware UUID. It is a deliberate privacy posture, not a hardware fingerprint.

### 1.3 The cross-platform hardware machine-id detector (`getMachineId`)

A vendored copy of the `node-machine-id` / OpenTelemetry `host.id` detector. Bundled **twice**,
byte-identical, once at `cli.beauty.js:141016+` and once at `:335462+` (two copies of
`@opentelemetry/resources`). Each platform is its own CommonJS module; a dispatcher (`zBd`,
`cli.beauty.js:141115`, second copy at `:335…`) lazily `require`s the right one per `process.platform`
and memoises (`nGe`). The default arm logs `could not read machine-id: unsupported platform` (`:141103`).

| Platform | Exact source command / file | Parsing | Citation |
|----------|-----------------------------|---------|----------|
| **darwin** | `ioreg -rd1 -c "IOPlatformExpertDevice"` | find line containing `IOPlatformUUID`, split on `" = "`, value minus trailing `"` (`.slice(0,-1)`) | `141018` |
| **linux** | `/etc/machine-id`, then `/var/lib/dbus/machine-id` | `readFile(utf8).trim()`, first that exists wins | `141037` |
| **freebsd** | `/etc/hostid`, then `kenv -q smbios.system.uuid` | `readFile(utf8).trim()` then `exec(...).stdout.trim()` | `141058` |
| **win32** | `%windir%\System32\REG.exe QUERY HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Cryptography /v MachineGuid` (uses `%windir%\sysnative\cmd.exe` shim when `arch==="ia32"` and `PROCESSOR_ARCHITEW6432` in env) | split on `REG_SZ`, take `[1].trim()` | `141083` |
| **default** | none — returns `undefined`, logs debug | — | `141102` |

Every read is wrapped in try/catch; on error only `diag.debug("error reading machine id: …")` is
emitted (silent to the user). The value is **raw and stable** — the unmodified platform UUID/GUID. It
is **not hashed, salted, or truncated** at the point of production; that is the consumer's job, and (see
§1.4) the only consumer throws it away.

### 1.4 The hardware UUID is read, then stripped before export

`getMachineId` is consumed by exactly one thing — the OTel `hostDetector` (`SNi` class,
`cli.beauty.js:141176`):

```js
detect() { return { attributes: {
    [ATTR_HOST_NAME]: os.hostname(),
    [ATTR_HOST_ARCH]: normalizeArch(os.arch()),   // x64->amd64, arm->arm32, ppc->ppc32
    [ATTR_HOST_ID]:   getMachineId()              // <- the hardware UUID, async
}}; }
```

The host detector is invoked by the **third-party** OTel resource builder (the `Kf4` equivalent,
`cli.beauty.js:337585`, gated by `CLAUDE_CODE_ENABLE_TELEMETRY`, `:337808`). It keeps **only `host.arch`**:

```js
let r = resourceFromAttributes({ "service.name":"claude-code", "service.version":"2.1.197", "wsl.version"? }),
    o = resourceFromAttributes(osDetector.detect().attributes || {}),   // os.type, os.version
    s = hostDetector.detect(),                                          // {host.name, host.arch, host.id}
    i = s.attributes?.[HOST_ARCH] ? { [HOST_ARCH]: s.attributes[HOST_ARCH] } : {},  // <- ONLY host.arch
    a = resourceFromAttributes(i),
    ...
    p = r.merge(o).merge(a).merge(d).merge(resourceFromAttributes(l));   // :337605-337616
```

`s` (host detector output) contains `host.id` (= hardware machine-id) and `host.name` (= hostname), but
only `host.arch` is copied into the resource. `host.id`/`host.name` are discarded → the hardware UUID is
computed but **never leaves the machine**. Same deliberate privacy filter as 2.1.169.

The **first-party** event resource builder (`cli.beauty.js:144794`) does **not** call the detectors at
all — it hand-builds `{service.name:"claude-code", service.version:"2.1.197", wsl.version?}`, so no
host/os/process/machine attributes touch the first-party stream's resource.

### 1.5 Sibling detectors & SDK constants (not host-identifying)

- **`osDetector`** (`TNi`, `:141197`): `os.type` = `normalizeType(os.platform())` (`win32→windows`,
  `sunos→solaris`), `os.version` = `os.release()`.
- **`hostDetector`** (`SNi`, `:141176`) as above.
- `service.name` = `"claude-code"` (first-party `:144795`, third-party `:337589`).
- `service.version` = `2.1.197`; logger scope `com.anthropic.claude_code.events` (`:144827`).
- First-party event transport: `POST {baseUrl}/api/event_logging/v2/batch`, batch 200, delay 100ms (`:144253`).
- User-Agent: `claude-code/2.1.197` — version only, no host info (`:206`).

### 1.6 Hashing primitives present in the build

`createHash("…")` call sites across the whole bundle: **sha256 ×47, sha1 ×6, md5 ×2**. The vast
majority are content digests / cache keys / the bundled `node-forge` TLS stack. **The only hash applied
to the device/user id is the sampling bucket** `zdm()` (`cli.beauty.js:606744`):

```js
zdm = wn(() => {
    let e = vW(),
        t = Amc.createHash("sha256").update(e).digest("hex");
    return parseInt(t.slice(0, 8), 16) % Vdm;   // Vdm = 30
});
```

i.e. `parseInt(sha256(device_id).slice(0,8),16) % 30` → a 0–29 bucket, used locally for Datadog
sampling / tagging. The hash is **never transmitted**; the bucket integer is.

---

## 2. Account, User & Session Identity

How Claude Code answers *"who is using me?"* and stitches that across every backend. Shape is unchanged
from 2.1.169; symbols renamed.

### 2.1 Identity fields

| Field | What | Source / accessor | Hashed? |
|---|---|---|---|
| `userID` / `device_id` | canonical anonymous/distinct id, 64-hex random | `vW()` `:606434`; config `~/.claude.json` key `userID` | no (sha256 only for sampling bucket) |
| `machineID` | **NEW** second random token | `z5t()` `:606453`; config key `machineID` | no (sent as 12-char slice only) |
| `accountUuid` | authenticated account id | `oauthAccount.accountUuid`; env `CLAUDE_CODE_ACCOUNT_UUID`; validated by `$xi()` (len≥8 passthrough) `:135383` | no |
| `organizationUuid` | org/tenant id | `oauthAccount`; env `CLAUDE_CODE_ORGANIZATION_UUID` | no |
| `emailAddress` | account email (PII) | `oauthAccount.emailAddress`; env `CLAUDE_CODE_USER_EMAIL`; **central getter `t$d()` is a no-op stub returning `undefined` (`:135376`)** | no |
| `sessionId` | per-conversation id | `randomUUID()`; accessor `Lt()`; env `CLAUDE_CODE_SESSION_ID` | no |
| `deviceId` (config object) | the `vW()` value, surfaced in the central metadata bundle | `nit()` `:135398` | no |

`t$d()` (the email getter) being a stub returning `undefined` is unchanged from 2.1.169 (`eV_`): the
central metadata object therefore carries **no email**; email reaches only OTel (read directly from
`oauthAccount.emailAddress`) and the OIDC gateway path.

### 2.2 The central metadata bundle (`nit`, was `gnH`)

One memoised builder feeds almost every backend (`cli.beauty.js:135398`):

```js
nit = wn((e) => {
    let t = vW(),                       // the anonymous userID
        n = Pt(), r, o, s,
        i = Oc(),                       // oauthAccount (when authed)
        a = $xi(i?.organizationUuid),   // $xi = length>=8 passthrough validator, NOT a hash (:135383)
        l = $xi(i?.accountUuid);
    return {
        deviceId: t,                    // = vW()
        sessionId: Lt(),
        email: t$d(),                   // STUB -> undefined
        appVersion: "2.1.197",
        platform: YRt(),                // CLAUDE_CODE_HOST_PLATFORM | os.platform
        organizationUuid: a,
        accountUuid: l,
        userType: "external",
        subscriptionType: r,
        rateLimitTier: o,
        firstTokenTime: s,
        ...GITHUB_ACTIONS && { githubActionsMetadata: { actor, actorId, repository, repositoryId,
                                                        repositoryOwner, repositoryOwnerId } }
    };
});
```

`$xi(H)` = `typeof H === "string" && H.length >= 8 ? H : void 0` (`:135383`, `r$d=8`) — a passthrough
validator, **not** a hash. `accountUuid`/`organizationUuid` leave plaintext.

### 2.3 Where `device_id` flows

- **Anthropic Messages API `metadata.user_id`** (`cli.beauty.js:594863`): builds
  `user_id = JSON.stringify({ ...CLAUDE_CODE_EXTRA_METADATA, device_id: vW(), account_uuid:
  (CLAUDE_CODE_ACCOUNT_UUID under remote | oauthAccount.accountUuid | ""), session_id: Lt() })`. A
  **plaintext structured object**, not an opaque id; no hashing.
- **First-party event sink** (`:144700`): `user_id = vW()`, `user_metadata: nit(!0)` (the full central
  bundle), `core_metadata: {…auth.account_uuid, auth.organization_uuid…}` (`:144050`).
- **GrowthBook attributes** (`:145083`): `{ id: deviceId, deviceID: deviceId, sessionId, accountUUID,
  organizationUUID, platform, userType, subscriptionType, rateLimitTier, apiBaseUrlHost }`. Email
  **absent** (stub).
- **GrowthBook experiment event** (`:144741`): `device_id: vW()`, `account_uuid`, `organization_uuid`,
  `session_id`, `experiment_id`, `variation_id`.
- **OTel resource attrs** (`:191288`): `user.id = vW()` (`:191299`), and from `oauthAccount`:
  `organization.id`, `user.email` (**unconditional, no env gate**, `:191324`), `user.account_uuid` +
  `user.account_id` (base58 tagged, only under `OTEL_METRICS_INCLUDE_ACCOUNT_UUID`).

### 2.4 Per-backend identity matrix

| Service | id key | account | org | email | session | hashed? | gate / notes |
|---|---|---|---|---|---|---|---|
| **Messages API** (`metadata.user_id`) | `device_id`=`vW()` | `account_uuid` | — | — | `session_id` | no (JSON.stringify) | always (`:594863`); `+CLAUDE_CODE_EXTRA_METADATA` merged |
| **GrowthBook** (flags/experiments) | `id`=`deviceId` | `accountUUID` | `organizationUUID` | absent (stub) | `sessionId` | no | `DISABLE_GROWTHBOOK`; attrs `:145083`, event `:144741` |
| **First-party events** (`/api/event_logging/v2/batch`) | `user_id`=`vW()` | `core.auth.account_uuid` | `core.auth.organization_uuid` | — | `core.session_id` | no | `:144700`; transport `:144253` |
| **Datadog** (`http-intake.logs.us5.datadoghq.com/api/v2/logs`) | `user_bucket`=sha256(`vW()`)%30 | tag `account_uuid` | tag `organization_uuid` | — | tags | **bucket only** | `yr()==="firstParty"`; `:606655`; token `pubea5604404508cdd34afb69e6f42a05bc` |
| **OpenTelemetry** (user-configured) | `user.id`=`vW()` | `user.account_uuid` + base58 `user.account_id` | `organization.id` | **`user.email` (plaintext, unconditional)** | `session.id` | no | per-field env gates (`:191367`); OIDC override `:191218` |
| **Error reports** (Datadog-style) | `user_bucket` | — | — | — | `session_kind` | no | carries **`host_name_redacted`=`z5t().slice(0,12)`** `:299471` |
| **Trusted-device enrollment** | — | `accountUuid` | `organizationUuid` | — | — | n/a | org-gated; `:298940` |
| **Segment** | REMOVED | — | — | — | — | — | 0 hits for `api.segment.io` |

**OTel include-flag defaults** (`eZd`, `cli.beauty.js:191367`): `SESSION_ID=true`, `ACCOUNT_UUID=true`,
`RESOURCE_ATTRIBUTES=true`, `VERSION=false`, `ENTRYPOINT=false`. So on a user-configured OTel exporter,
session id + account uuid + email ride by default.

### 2.5 The base58 account-id tag (`user_01…`)

For OTel, the raw account UUID is also encoded into a stable tagged id `iJi("user", uuid)` →
`` `${e}_01${base58(...)}` `` (`cli.beauty.js:191264`), emitted as `user.account_id` only under
`OTEL_METRICS_INCLUDE_ACCOUNT_UUID`, overridable by `CLAUDE_CODE_ACCOUNT_TAGGED_ID`. This is a
**reversible encoding, not a one-way hash** — the UUID is recoverable.

### 2.6 OIDC gateway identity

`I$n()` (`cli.beauty.js:191218`) decodes the enterprise-gateway JWT (`Lm()` provides the plane/jwt) and
emits `{"identity.source":"gateway-oidc", "user.id":jwt.sub, "user.email":jwt.email,
"user.groups":jwt.groups.join(",")}`. When active it **overrides** any `user.*`/`identity.*` coming from
`OTEL_RESOURCE_ATTRIBUTES` (the filter at `:191296`/`:337615` drops `user.`/`identity.` keys when the
gateway set is non-empty).

---

## 3. Device Trust, Auth & Credential Binding

### 3.1 Trusted-Device token lifecycle

A trusted-device token is an **opaque server-issued string** (`device_token`) from
`POST {BASE_API_URL}/api/auth/trusted_devices`. NOT computed locally, contains no local fingerprint,
not derived from the machine id. Shape unchanged from 2.1.169.

Enrollment (`cli.beauty.js:298940`):
1. Must be first-party + Claude.ai subscriber; flag `tengu_sessions_elevated_auth_enforcement`
   (`F3n`, `:299014`) on (`await $U(F3n)`, `:298943`); proactive enrollment not disabled
   (`tengu_sessions_elevated_auth_disable_proactive_enrollment`, `MUa`, `:299016`); env
   `CLAUDE_TRUSTED_DEVICE_TOKEN` **not** set (env takes precedence, `:298951`).
2. Org policy `require_trusted_devices` (`N5t`, `:299015`) enforced/allowed (`:298957`).
3. Refresh OAuth, grab `accessToken` (`:298966`).
4. `fo.post(`${BASE_API_URL}/api/auth/trusted_devices`, { display_name: `Claude Code on
   ${os.hostname()} · linux` }, { Authorization: `Bearer ${accessToken}` })` (`:298974`). **The only
   device identifier sent is the hostname** in `display_name`; no machine-id, MAC, or hardware UUID.
5. Extract `device_token` (`:298992`); persist as `trustedDeviceToken` (`:298998`). Telemetry
   `bridge_trusted_device_enroll` on each failure mode (`request_failed|http_error|missing_token|
   storage_failed|unexpected_error`).

Read (`cli.beauty.js:299036`): env `CLAUDE_TRUSTED_DEVICE_TOKEN` wins, else
`(await Dl().readAsync())?.trustedDeviceToken`.

Sent **exclusively** as the HTTP header **`X-Trusted-Device-Token`** on Remote-Control / bridge
requests — never on inference. Injection sites: `:297738`, `:358458`, `:361591`, `:567412`, `:623109`.
Clear/logout deletes it (`:298928`, `:338135`).

| Gate | Value | Default | Line |
|---|---|---|---|
| `F3n` | `tengu_sessions_elevated_auth_enforcement` (GrowthBook master) | off | `299014` |
| `N5t` | `require_trusted_devices` (org managed-policy) | — | `299015` |
| `MUa` | `tengu_sessions_elevated_auth_disable_proactive_enrollment` | off | `299016` |

Trust is **two-keyed**: a GrowthBook rollout flag AND an org-level managed policy. Default consumer
usage never enrolls.

### 3.2 OAuth — client & device identifiers

Endpoint constants (`cli.beauty.js:40762`):

| Field | Prod value |
|---|---|
| `CLIENT_ID` (prod) | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` (`:40771`) |
| `CLIENT_ID` (local dev) | `22422756-60c9-4084-8eb7-27705fd5cf9a` (`:40704`) |
| `CONSOLE_AUTHORIZE_URL` | `https://platform.claude.com/oauth/authorize` |
| `CLAUDE_AI_AUTHORIZE_URL` | `https://claude.com/cai/oauth/authorize` |
| `TOKEN_URL` | `https://platform.claude.com/v1/oauth/token` |
| `API_KEY_URL` | `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |

- `CLAUDE_CODE_OAUTH_CLIENT_ID` env overrides `CLIENT_ID` (`:40742`).
- **Scopes** (`:40750`): `user:inference`, `user:profile`, `org:create_api_key`, plus default set
  `[…, user:sessions:claude_code, user:mcp_servers, user:file_upload]` (`Zae`, `:40759`); new design
  scopes `user:design:read`/`user:design:write` and `user:projects:*` (`ele`/`Cys`, `:40759`).
  `inferenceOnly` requests just `["user:inference"]` (`:134115`).
- **PKCE (S256)**: authorize URL appends `code_challenge` + `code_challenge_method="S256"` + `state`
  (`cli.beauty.js:95175`). Verifier/challenge/state are `base64url(randomBytes(32))` /
  `base64url(sha256(verifier))` in the OAuth helper module.
- Profile fetch: `GET {BASE_API_URL}/api/oauth/profile` (`:95085`) and
  `{BASE_API_URL}/api/claude_cli_profile` (`:95064`).
- **Device identifiers sent during OAuth: effectively none** — `client_id`, `response_type`,
  `redirect_uri`, `scope`, `code_challenge(+method)`, `state`, optional `orgUUID/login_hint`, and PKCE
  `code_verifier` at exchange. No machine-id, no hardware fingerprint. The only device naming anywhere
  is the trusted-device `display_name` hostname.
- Client platform header `anthropic-client-platform` (entrypoint-derived) is the closest thing to a
  client identity on normal API calls.

### 3.3 Credential storage — not machine-bound

The credential backend is **plaintext** (`cli.beauty.js:104536`):

```js
_3r = {
    name: "plaintext",
    ...
    async update(e) {
        let { storageDir: t, storagePath: n } = CTn();   // {dir}/.credentials.json, dir defaults ~/.claude
        await qt().mkdir(t);
        await rg(n, De(e), 384); await oci.chmod(n, 384);  // 0600
        return { success: !0, warning: "Warning: Storing credentials in plaintext." };
    }
};
```

- Path: `{CLAUDE_SECURESTORAGE_CONFIG_DIR | ~/.claude}/.credentials.json` (`:104521`, `:95893`).
- **No encryption-at-rest, no key/salt derived from the machine id.** chmod 0600 only.
- **macOS-Keychain *save* is still dead code**: `g2r()` does `let t=!1; if (t) {…security
  add-generic-password…} else q("tengu_api_key_saved_to_config")` (`cli.beauty.js:133991-134010`). `t`
  is hardcoded `!1`, so API keys persist to config, never the keychain, in this Bun build (a Keychain
  *reader* via `security find-generic-password` still exists, `:104626`). Same regression as 2.1.169.
- Stored keys: `claudeAiOauth {accessToken, refreshToken, expiresAt, scopes, subscriptionType,
  rateLimitTier, clientId}`, `trustedDeviceToken`, `enterpriseGateway`, `organizationUuid`,
  `designOauth`. Logout deletes `claudeAiOauth/organizationUuid/trustedDeviceToken/enterpriseGateway/
  designOauth` (`:338135`).

Net: tokens are a plaintext 0600 file with **no machine binding** — trivially portable. The
trusted-device token lives in the very file it is meant to protect.

### 3.4 Provider plane / data-residency selector (`yr()`)

`yr()` (`cli.beauty.js:94637`) now checks a **gateway** plane first:

```js
if (Lm()) return "gateway";
return ct(CLAUDE_CODE_USE_BEDROCK) ? "bedrock"
     : ct(CLAUDE_CODE_USE_FOUNDRY) ? "foundry"
     : ct(CLAUDE_CODE_USE_ANTHROPIC_AWS) ? "anthropicAws"
     : ct(CLAUDE_CODE_USE_MANTLE) ? "mantle"
     : ct(CLAUDE_CODE_USE_VERTEX) ? "vertex"
     : "firstParty";
```

This is a **provider-routing / data-residency** gate, **not** an IP/country geo-block. `firstParty`
gates OAuth/trusted-device enrollment, the Datadog sink (`yr()==="firstParty"`, `:606656`), and
first-party telemetry. There is no client-IP or country collection anywhere.

---

## 4. Environment, Runtime & Network — delta note

The **soft** fingerprint (entrypoint, terminal/IDE, shell, runtimes, Docker/WSL/sandbox detection,
distro/kernel, locale/timezone, VCS-in-cwd, proxy, persisted install fields) is structurally **carried
over from 2.1.169** and is owned by the env/telemetry analysis. Verified-for-2.1.197 anchors:

- The protobuf `env` message still carries `platform`, `platform_raw`, `arch`, `node_version`,
  `terminal`, `package_managers`, `runtimes`, `is_running_with_bun`, `is_ci`, `is_claubbit`,
  `is_github_action`, `wsl_version`, `linux_distro_id/version`, `linux_kernel`, `vcs`,
  `deployment_environment`, `is_conductor`, `is_local_agent_mode`, `coworker_type`, etc.
  (`cli.beauty.js:142258`).
- Persisted install fields in `~/.claude.json` now include both `userID` (`vW`) **and** `machineID`
  (`z5t`), plus `firstStartTime`, `numStartups`, `installMethod`, `oauthAccount`.
- Config path: `CLAUDE_CONFIG_DIR ?? ~/.claude` then `.claude.json` (`cli.beauty.js:4505`, `:45949`).
- Git committer email/name are read for commit/PR authoring (`git config --get user.email`, `:135445`)
  but are **not** in the standard telemetry env payload — same containment as 2.1.169. The `user.email`
  in OTel is the login identity, not the git committer.

> The exact 2.1.197 line numbers for every soft-env probe were not all re-derived here (that surface is
> the env/telemetry agent's territory); the values above are the ones confirmed in this build. Treat the
> 2.1.169 `_fp4` tables as the structural reference, with `cU→vW` and the new `machineID` added.

---

## 5. What leaves the machine — summary

**Uniquely identifying, transmitted by default:**
- `device_id`/`userID` (`vW()`) — random 256-bit, install-scoped, stable across sessions, **unhashed**,
  on model-API `metadata.user_id`, first-party events, GrowthBook, and OTel `user.id`.
- Account identity alongside it: `accountUuid`, `organizationUuid`, and **`user.email` (plaintext,
  unconditional on OTel)** — the real cross-install correlator.

**NEW, low-risk by design:** `machineID` (`z5t()`) — a *second* random token, but it only ever leaves
as `host_name_redacted = z5t().slice(0,12)` (12 hex chars) in error/crash reports. It correlates crash
reports from one install **without** exposing the real hostname or hardware UUID.

**Hardware UUID:** **NOT transmitted.** The platform machine-id (`ioreg`/`MachineGuid`/`/etc/machine-id`)
is read only when OTel is enabled, and `host.id`/`host.name` are filtered out of the exported resource
(`:337608`). Only `host.arch`, `os.type`, `os.version`, `wsl.version`, `terminal.type` (low-entropy)
leave.

**Hashing:** the **only** hash of an identifier is the Datadog sampling bucket
`parseInt(sha256(vW()).slice(0,8),16) % 30` (`:606744`) — computed locally, only the integer is sent.
All other identifiers (account/org/email/session/device id) are transmitted **plaintext**; the base58
`user.account_id` is a reversible encoding, not a hash. (Build-wide `createHash`: sha256 ×47, sha1 ×6,
md5 ×2 — overwhelmingly content/TLS, not identity.)

**Credentials:** plaintext `~/.claude/.credentials.json` (0600), **no machine binding**, no encryption.

**Trusted device:** opt-in, org-gated; only the hostname is sent at enrollment; token rides only on
Remote-Control/bridge traffic as `X-Trusted-Device-Token`.

**Geo:** no IP/country collection; "geo" is provider data-residency routing via `yr()` (now
gateway-first).

### Headline deltas vs 2.1.169

| Area | 2.1.169 | 2.1.197 |
|---|---|---|
| device_id generator | `cU()` `:141641` | `vW()` `:606434` (identical logic) |
| **second random token** | — | **NEW `machineID` via `z5t()` `:606453`; sent as 12-char `host_name_redacted` `:299471`** |
| central metadata bundle | `gnH` `:132437` | `nit` `:135398` |
| len validator | `DQK` (≥8) | `$xi` (≥8) `:135383` |
| email getter stub | `eV_` `:132415` | `t$d` `:135376` (still a stub) |
| 3P resource builder (strips host.id) | `Kf4` `:325308` | `:337585` (only `host.arch` kept `:337608`) |
| sampling bucket | `XS_` `:141899` | `zdm` `:606744` (sha256 % 30) |
| Datadog client token | `pubea5604404508cdd34afb69e6f42a05bc` | **same** (`:606714`) |
| OAuth client ids | prod `9d1c250a…`, dev `22422756…` | **same** (`:40771`, `:40704`) |
| provider selector | bedrock/…/firstParty | **gateway-first** then same (`yr()` `:94637`) |
| runtime | Bun 1.3.14 | **Bun 1.4.0** (hardcoded `bun_version:1.4.0` `:299451`) |
| keychain save | dead (`$=!1`) | still dead (`t=!1` `:133991`) |
| Segment | removed | still absent |

### Uncertainties

- `t$d()` returning `undefined` is unambiguous, but whether any other path repopulates the central
  bundle's `email` before GrowthBook init was not found — best read is email is genuinely absent from
  the GrowthBook surface, same as 2.1.169.
- The server-side schema of the trusted-device `device_token` is opaque to the client.
- The exact backend/endpoint that receives the `host_name_redacted` error payload (`:299450`) is the
  Datadog-style logs intake (`ddsource:"nodejs"`, `ddtags`); the precise URL was not pinned in this
  pass, but the payload shape and the `z5t().slice(0,12)` redaction are verified.
- Soft-env probe line numbers (§4) were not exhaustively re-derived for 2.1.197.
