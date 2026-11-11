# Device Fingerprinting — Claude Code (tengu) v2.1.300

> How Claude Code identifies the device, user, account, and environment it runs on — what it
> reads from the host, what it derives, what it persists, what it hashes, and what it transmits.
>
> Produced from the **beautified JavaScript source** extracted from the Bun module graph
> (`cli.beauty.js`, 1,857,789 lines; 2,401 application JS modules, ESM code-split). Every claim cites a
> function or `cli.beauty.js:LINE`. Cross-chunk export names are global in this build; chunk-local
> names (`q`, `z`, `me`, `le`, `Ee`, …) are reused per module, so the module is named wherever it
> matters. Readable names come from the build's own re-export map (`cli.beauty.js:877517`).
>
> **Version**: 2.1.300 | **Build**: `2026-10-14T12:54:55Z` | **GIT_SHA**: `c6733ae1276880507ca0c5b053ae18fb0df090d6` | **Runtime**: Bun **v1.4.3** (was v1.4.0) | **Platform analyzed**: linux-x86_64
>
> Baseline: [../2.1.197/device-fingerprinting.md](../2.1.197/device-fingerprinting.md). Structured data:
> [data/fingerprinting.yaml](data/fingerprinting.yaml).

## TL;DR

| Question | Answer |
|----------|--------|
| How many persistent install identifiers are there now? | **Four random ones plus a device keypair.** `userID` (`_M` / `getOrCreateUserID`), `machineID` (`Umt` / `getOrCreateMachineID`) and **NEW** `summonSidKey` (`rPo` / `getOrCreateSummonSidKey`) are each `randomBytes(32).toString("hex")` (`cli.beauty.js:115569-115606`). **NEW** `remoteControlMachineId` (`f7s` / `getOrCreateRemoteControlMachineId`) is a `crypto.randomUUID()` (`:115613-115625`). **NEW** a per-account **ECDSA P-256 device key** (`~/.claude/.device-keys.json`, `:999861`, `:271338`) registered server-side as a "remote device". |
| Correction to the brief | The brief said 2.1.197 had **one** persistent random id. It had **two**: `userID` (`vW`) and `machineID` (`z5t`, `2.1.197 cli.beauty.js:606453`, already documented in the 2.1.197 doc). What is new in 2.1.300 is `summonSidKey`, `remoteControlMachineId` and the device key. |
| Is any of them hardware-derived? | **No.** All are CSPRNG output (`Tu = randomBytes`, `tO = randomUUID`, `generateKeyPairSync("ec", P-256)`). |
| Where does each leave the machine? | `userID` → raw on Messages API `metadata.user_id`, 1P events, GrowthBook, OTel `user.id`, and the NEW built-in plugin telemetry service. `machineID` → **only** `host_name_redacted = Umt().slice(0,12)` in error reports (`:350262`), unchanged. `summonSidKey` → **never sent**; used as an HMAC key so only `sid = HMAC-SHA256(key, sessionId+slug)[:16]` goes to `/api/frame/comments/{slug}/{thread}/summon-status` (`:701360-701462`). `remoteControlMachineId` → **raw**, as `machine_id` (top level and `metadata.machine_id`) in `POST /v1/environments/bridge` (`:1075736-1075748`). Device public key → `POST /api/organizations/:orgUUID/cowork/remote_devices` (`:1000152`, `:1000198-1000203`). |
| Does `_M` take a caller-supplied seed? | It **accepts** one (`_M(e, n)`: uses `n` if it matches `/^[0-9a-f]{64}$/`, `:115574`), but **no production caller passes it**. Every call site in the bundle is `_M()` or `_M(storageV5)` (module-aware trace below). The only other alias is `_getOrCreateUserIDForTesting`. |
| Hardware machine-id? | OTel `getMachineId` detector still bundled (now one copy, lazily imported per-platform chunks `:91665-91688`, modules 962-966). Still **stripped**: the 3P OTel resource keeps only `host.arch` (`:1470602`). **NEW:** first-party code now reads raw `/etc/machine-id` + the PID-namespace link to build a `pidDomain` (`XFs`, `:100314-100318`) that is written to **local** session pid-files. No network sink for it was found (tentative). |
| Account identity transmitted? | `accountUuid`, `organizationUuid` (plaintext); `organizationRole`, `subscriptionCreatedAt` **NEW** in GrowthBook attributes (`:142828-142829`). OTel `user.email` is still sent without an env gate in normal mode (`:194465`); diskless mode changes that. The central-bundle `email()` getter is still a stub returning `undefined` (`:133652`). |
| Credentials machine-bound? | Tokens: **no**, still plaintext `.credentials.json`. API-key Keychain save still dead (`let s = !1`, `:129660`). **But** the NEW device key is a real device credential; **logout explicitly preserves it** (`:958978`, `:959056`). |
| Trusted device? | Same opaque `device_token` from `POST /api/auth/trusted_devices` (`:292628`), display name `Claude Code on ${os.hostname()} · ${eHe("linux")}`, which renders as `… · Linux` (`eHe`, `:10588`). New enrollment triggers `server_denied` and `device_bind` (`:292604`); header `X-Trusted-Device-Token` literal occurrences 5 → 27. |
| Geo-blocking? | None. `Ie()` provider selector (`:21727`) adds `anthropicGoogleCloud`; still routing, not geo. |

**Bottom line:** 2.1.300 still does **not** hardware-fingerprint over the network. It does carry more
identifiers. There are four persisted random ids. Two of them leave raw: `userID` everywhere, and
`remoteControlMachineId` on bridge registration. One is a 12-char prefix (`machineID`). One never leaves
(`summonSidKey`, used only as an HMAC key). On top of those sits a server-registered per-account device
keypair that **survives logout**. The raw hardware `/etc/machine-id` is now read by first-party code,
but only for local pid-file bookkeeping as far as this pass could trace.

## Contents

1. [Machine & Hardware Fingerprinting](#1-machine--hardware-fingerprinting)
2. [Account, User & Session Identity](#2-account-user--session-identity)
3. [Device Trust, Auth & Credential Binding](#3-device-trust-auth--credential-binding)
4. [Environment, Runtime & Network — delta note](#4-environment-runtime--network--delta-note)
5. [What leaves the machine — summary](#5-what-leaves-the-machine--summary)

---

## 1. Machine & Hardware Fingerprinting

### 1.0 The identifier family (module 152 `chunk-7rwjz6p0.js`)

All four getters live together in module 152 and share one in-process state object `le()` whose class
declares `generatedUserID`, `generatedMachineID`, `generatedSummonSidKey`, `remoteControlMachineIdOnce`
(`cli.beauty.js:112840-112843`; setters/clearers `:113017-113037`). Readable names from the re-export
map (`:877517`):

| Minified | Readable | Config key | Shape | Validator | NEW vs 2.1.197 |
|---|---|---|---|---|---|
| `_M(e, n)` | `getOrCreateUserID` | `userID` | 64-hex (`randomBytes(32)`) | `Ps = /^[0-9a-f]{64}$/` (`:115567`) | CHANGED (was `vW()`, no seed, no validator) |
| `Umt(e)` | `getOrCreateMachineID` | `machineID` | 64-hex | `Ps` | CHANGED (was `z5t()`, no validator) |
| `rPo(e)` | `getOrCreateSummonSidKey` | `summonSidKey` | 64-hex | `Ps` | **NEW** (0 hits for `summonSidKey` in 2.1.197) |
| `f7s(e)` → `xO(e)` | `getOrCreateRemoteControlMachineId` | `remoteControlMachineId` | UUID (`randomUUID`) | `OO` UUID regex (`:115607`) | **NEW** (0 hits in 2.1.197) |
| `Uee(e)` | `seedInstallIDs` | — | calls `_M(e), Umt(e)`, then `await $mt()` | — | NEW name |
| `K7s`/`V7s`, `Z7s`/`eZs`/`Q7s` | `_getOrCreate*ForTesting`, `_resetGenerated*ForTesting` | — | test hooks only | — | NEW |

In module 152, `import{randomBytes as Tu, randomUUID as tO} from "crypto"` (verified in
`ANALYSIS_CONTEXT.md` ground truth). The first argument `e` of every getter is **not** a seed. It is the
pinned storage-V5 backend handle, forwarded to the config writer `Ce(updater, e)` (`:113841`). The
entry module passes it as `seedInstallIDs(storageV5)` (`:1289`).

### 1.1 `userID` (`_M` / `getOrCreateUserID`, was `vW`)

```js
var Ps = /^[0-9a-f]{64}$/;                         // cli.beauty.js:115567
function _M(e, n) {                                // :115569
  let r = le(), s = ce();                          // in-process state, global config
  if (typeof s.userID === "string" && Ps.test(s.userID)) return s.userID;  // 1. valid persisted id
  if (r.generatedUserID) return r.generatedUserID;                         // 2. in-process cache
  let h = n !== void 0 && Ps.test(n) ? n : Tu(32).toString("hex");         // 3. seed or 256 random bits
  return r.setGeneratedUserID(h), Ce((y) => ({ ...y, userID: h }), e), h;  // 4. persist (async)
}
```

**What changed vs 2.1.197 `vW()`:**
- **Strict validation (NEW).** A persisted `userID` that is not exactly 64 lowercase hex is ignored and
  **overwritten** with a fresh one. 2.1.197 accepted any truthy value.
- **Optional seed `n` (NEW).** Used only if it is valid 64-hex.
- The cache moved from a module variable (`p6o`) to the shared state object (`generatedUserID`).

**Who passes the seed?** Nobody, in production code. A module-aware trace looked at every module that
imports `_M`/`Umt`/`rPo`/`Uee`/`f7s` from `chunk-7rwjz6p0.js`, plus the defining module. It found these
`_M` call sites, all with **no** second argument:

| Line | Module | Call | Purpose |
|---|---|---|---|
| `:115593` | 152 | `_M(e)` inside `Uee` | install-id seeding |
| `:133594` | 152 | `_M()` | central bundle `coreUserData.deviceId` |
| `:142341` | 152 | `_M()` | 1P event `user_id` (`PW`) |
| `:142411` | 152 | `_M()` | GrowthBook experiment event `device_id` (`Mxo`) |
| `:176894` | 187 `chunk-v7aj317d.js` | `_M()` | Messages API `metadata.user_id` (`EBe`) |
| `:194426` | 212 `chunk-wtz98g8s.js` | `_M()` | OTel `user.id` (`CDt`) |
| `:349721` | 332 `chunk-c17p1pm2.js` | `_M()` | Datadog `getUserBucket` |
| `:350128` | 334 `chunk-pjq854na.js` | `_M()` | error-report `user_bucket` |
| `:772825` | 701 `chunk-7g3j6er8.js` | `_M(n)` | init: eager create only when `z() && n !== void 0` (storage-V5 pinned) |
| `:813761` | 767 `chunk-fngv4535.js` | `_M()` | local org-config rollout bucket |

No destructured `getOrCreateUserID` dynamic import exists (grep of the readable name hits only the
export map). The seed parameter is reachable only via `_getOrCreateUserIDForTesting` (`K7s = _M`,
`:115747`). **Inference (tentative):** the seed exists so that tests, or a future host, can inject a
known id.

**Lifetime / reset paths.**
- Persisted to the global config (`~/.claude.json`, or under `CLAUDE_CONFIG_DIR`). Stable across sessions.
- **Survives logout.** The logout config mutator clears `oauthAccount` and caches (`:959008`) but never
  touches `userID`.
- There is **no** clearer for `generatedUserID`. The state class has `clearGeneratedMachineID` and
  `clearGeneratedSummonSidKey` but no user-id equivalent (`:113017-113030`).
- Ways it changes: delete or edit the key, point `CLAUDE_CONFIG_DIR` elsewhere, or store a non-64-hex
  value (it is then regenerated).
- **Diskless mode (NEW).** When `me()` (module 19: `host.launchOptions.diskless()`) is true, config
  writes are in-memory only (`Ls`, `:113830-113838`). The id is then **per process**.

### 1.2 `machineID` (`Umt` / `getOrCreateMachineID`, was `z5t`) — CHANGED (validation only)

```js
function Umt(e) {                                   // :115581
  let n = le(), r = ce();
  if (typeof r.machineID === "string" && Ps.test(r.machineID)) return r.machineID;
  if (n.generatedMachineID) return n.generatedMachineID;
  let s = Tu(32).toString("hex");                   // independent randomBytes(32), no seed
  return n.setGeneratedMachineID(s), Ce((h) => ({ ...h, machineID: s }), e), s;
}
```

- Created eagerly at init: `oPo(n), Umt(n)` (`:772825`). `oPo` = `recordFirstStartTime`. Also created
  by `seedInstallIDs` from the entry module (`:740`, `:854`, `:948`, `:1287`).
- **Only read** at `:115593` (seed) and `:350262`: `host_name_redacted: Umt().slice(0, 12)` in the
  error-report payload. **Unchanged from 2.1.197** (`2.1.197 :299471`).
- Survives logout. There is a test-only reset (`_resetGeneratedMachineIDForTesting`).

### 1.3 NEW — `summonSidKey` (`rPo` / `getOrCreateSummonSidKey`)

```js
function rPo(e) {                                   // :115596
  let n = le(), r = ce();
  if (typeof r.summonSidKey === "string" && Ps.test(r.summonSidKey)) return r.summonSidKey;
  if (n.generatedSummonSidKey) return n.generatedSummonSidKey;
  let s = Tu(32).toString("hex");
  return n.setGeneratedSummonSidKey(s), Ce((h) => ({ ...h, summonSidKey: s }), e), s;
}
```

- **Lazy.** `seedInstallIDs` does not call it. Its single consumer is module 576 `chunk-bhg73hzf.js`:

```js
import { createHmac as le, randomUUID as me } from "crypto";      // :701352-701354
function Se(e, t, n) {                                              // :701360
  return le("sha256", rPo(n)).update(e + t, "utf8").digest("hex").slice(0, 16);
}
// $h(handoff, outcome)                                             // :701431
let f = s.sidBySlug.get(n);
if (f === void 0) f = Se(q(), n, e.storageV5), s.sidBySlug.set(n, f);   // :701445
... b = { status, reason?, covers_reply_id?, gesture_at?, sid: f, seq: d };  // :701451-701464
return Bns(n, o, b) ...
```

- `q` is imported from module 19 and re-exported as `getSessionId` (`:878167`); module 19 defines
  `function q(){return h()?.sessionId??n().id}`. So
  **`sid = HMAC-SHA256(key = summonSidKey, msg = sessionId + artifactSlug)[0:16 hex]`**.
- `Bns(slug, threadId, body)` (module 572, `:700337`) sends it with
  `Pc.postRelayBound("/api/frame/comments/{slug}/{threadId}/summon-status", body, {isBackground:!0, timeout:5000})`.
  This is the artifact-comment "summon" status channel: Claude reporting whether it picked up a
  comment that summoned it.
- **The key itself never leaves.** The server sees a 64-bit pseudonymous `sid` that is stable for one
  (session, artifact) pair. Without the key it cannot be linked across sessions or artifacts. `seq` is
  a per-`sid` counter: `seq = max(lastSeq, floor(Date.now()/1000)*1000)`, then stored as `seq+1` (`:701447-701449`).
- Survives logout. There is a test-only reset (`_resetGeneratedSummonSidKeyForTesting`).

### 1.4 NEW — `remoteControlMachineId` (`f7s` / `getOrCreateRemoteControlMachineId`)

```js
function f7s(e) { return le().remoteControlMachineIdOnceFrom(() => xO(e)) }     // :115613 (memoised promise)
async function xO(e) {                                                           // :115616
  let n = ce();
  if (Pm(n.remoteControlMachineId)) return n.remoteControlMachineId;             // UUID regex OO
  let r = tO(), s = r;                                                           // crypto.randomUUID()
  return await xu((y) => (s = Pm(y.remoteControlMachineId) ? y.remoteControlMachineId : s,
                          { ...y, remoteControlMachineId: s }), e).catch(() => !1)
         || s !== r ? s : null;                                                  // null if not persisted
}
```

- A random v4 UUID. It is compare-and-set against a concurrent writer: if another process persisted
  one first, that one wins. If the write fails and no prior value exists it returns **`null`**, so the
  id is never sent unpersisted.
- Consumers (both via `await import("/$bunfs/root/chunk-0naraqc9.js")`):
  - `claude remote-control` bridge startup: `machineId: An` (`:1079764-1079864`)
  - the standalone bridge path: `machineId: O` (`:1080324`, `:1080356`)
- **Transmission:** `registerBridgeEnvironment` (`:1075710`) POSTs to `${baseUrl}/v1/environments/bridge`:

```js
{ machine_name: r.machineName,                 // os.hostname() (kr = os.hostname, module 1380)
  ...r.machineId != null && { machine_id: r.machineId },          // :1075737-1075738  NEW
  directory, branch, git_repo_url, max_sessions,
  metadata: { worker_type, ...r.machineId != null && { machine_id: r.machineId }, ...toolHost },  // :1075746
  ...r.hostProfile && { host: r.hostProfile },                     // NEW, see 1.7
  ...r.reuseEnvironmentId && { environment_id } }
```

  `machine_name` (hostname) was already in 2.1.197 (2 hits). **`machine_id` is NEW** (0 hits in
  2.1.197).
- Survives logout. There is a test-only reset (`_resetRemoteControlMachineIdForTesting`).

### 1.5 The OTel hardware machine-id detector (`getMachineId`) — still stripped

The vendored OTel `getMachineId` is now bundled **once**: dispatcher `IH` (`:91665-91688`), with the
per-platform readers split into lazily imported chunks. 2.1.197 had two byte-identical copies.

| Platform | Source | Module / line |
|---|---|---|
| darwin | `ioreg -rd1 -c "IOPlatformExpertDevice"` → `IOPlatformUUID` | 962 `chunk-q41h63mb.js`, `:906474` |
| linux | `/etc/machine-id`, then `/var/lib/dbus/machine-id` | 963 `chunk-psfxkqtw.js`, `:906513` |
| freebsd | `/etc/hostid`, then `kenv -q smbios.system.uuid` | 964 `chunk-tn6appbd.js`, `:906558-906565` |
| win32 | `%windir%\System32\REG.exe QUERY HKLM\SOFTWARE\Microsoft\Cryptography /v MachineGuid` | 965 `chunk-pmkcaqa1.js`, `:906608` |
| default | none | 966 `chunk-c3zefe0d.js` |

Consumer: `hostDetector.detect()` → `{host.name: os.hostname(), host.arch, host.id: getMachineId()}`
(`:91733-91739`). The 3P OTel resource builder `it()` in module 1771 `chunk-ftswk8c4.js` (`:1470602`,
minified) does
`p=C.hostDetector.detect(), i=p.attributes?.[HOST_ARCH]?{[HOST_ARCH]:p.attributes[HOST_ARCH]}:{}`. So
**only `host.arch` is kept**; `host.id`/`host.name` are discarded, as in 2.1.197. NEW: `osDetector` is
also skipped when `i8e()` (diskless + an OTLP logs exporter) is true. The internal-metrics transform
(`transformMetricsForInternal`, same line) re-emits only `service.*`, `os.type`, `os.version`,
`host.arch`, `wsl.version`.

### 1.6 NEW — first-party read of `/etc/machine-id` for `pidDomain`

```js
async function XFs(n) {                                   // module 128 chunk-kbrwtpfv.js, :100314
  if (n === "windows") return `linux:${os.hostname().toLowerCase()}`;
  if (n !== "linux" && n !== "wsl") return "linux";
  let [e, t] = await Promise.all([readFile("/etc/machine-id","utf8").then(o=>o.trim(), ()=>""),
                                  readlink("/proc/self/ns/pid").catch(() => "")]);
  return `linux:${e}:${t}`;                               // RAW machine-id + pid-ns inode
}
function MA() { return mje.pidDomain ??= XFs(O()) }       // :100382 (exported as ownPidDomain)
```

- `pidDomain` is written into **local** files:
  - session pid-files under the config dir's `sessions/` (`:139910`; the write is `n.write(...)` via
    storage V5, or `_p(w, P)`, `:139929-139932`)
  - peer/lock records (`:103771`, `:103786`, `:119860`)
- It is compared to detect sessions that live in a foreign PID namespace (`:118893` `"foreign_pid_space"`,
  `:463172`).
- A sibling `wme()` builds `pidSpace = hostname + "#" + pid-ns` (`:100369-100379`).
- **NEW** (`pidDomain`: 0 hits in 2.1.197).
- **Not observed in any network payload.** No HTTP builder that serialises `pidDomain` was found among
  its consumers (`:100300`, `:103719-103800`, `:118814-118893`, `:119259-120072`, `:139611-140202`,
  `:347853-347947`, `:463172`). Treat that as **tentative**: whether storage-V5 replicates session
  pid-files off-box was not traced. Either way, the raw hardware machine-id now sits in plaintext in
  local session files, which 2.1.197 never did.

### 1.7 NEW — bridge host profile (`host` on environment registration)

`Pzr()` (`:1074734`) / `Izr()` (`:1074792`) collect a profile and attach it to bridge registration as
`host` (`:1075751`). The profile holds:
- `platform` and `arch`
- `os_version` (macOS `ProductVersion`, Linux distro version) and `distro` id
- `wsl`
- `tools`: names of selected CLI tools present on `PATH`
- optionally `mcp_servers`
- `collected_at`

Gates:
- GrowthBook `tengu_bridge_host_profile` (default `"off"`, `:1074678`).
- Overridable by setting `remoteControl.shareHostProfile` (`:1074684`).
- Forced off when there are settings errors in remote-control paths (`ee()`, `:1074683`, `:1074690`).
- With `"full"`, the MCP server list is included.

**NEW** (0 hits for both strings in 2.1.197). It is a software-inventory fingerprint, not a hardware
one, and it is off by default.

### 1.8 Hashing applied to identifiers

| Derivative | Formula | Transmitted? | Line |
|---|---|---|---|
| Datadog `userBucket` | `parseInt(sha256(userID).slice(0,8),16) % 30` | integer only | `:349720-349723` (`Q=30`, `:349687`) |
| Error-report `user_bucket` | same formula, cached in `Hrn().cachedUserBucket` | integer only | `:350125-350130` (`D=30`) |
| **NEW** org-config rollout bucket | `parseInt(sha256("org_config_gate:"+userID).slice(0,8),16) % 100` | **no**; used locally in `qt(e, r.bucket)` for a percent rollout to team/enterprise tiers | `Wt` `:813601-813603`, `:813652` |
| **NEW** summon `sid` | `HMAC-SHA256(summonSidKey, sessionId+slug)[:16]` | `sid` only | `:701360` |
| repo hash `rh` | `sha256(normalised git remote URL)[:16]` (`QLo`) | yes, 1P `core_metadata.rh` (also in 2.1.197) | `:59932-59937`, `:141219` |

`createHash` call-site totals were **not recomputed**. In the code-split build, `createHash` is
imported under per-chunk aliases (`x`, `R`, `Io`, `c`, `Xs`, …), so a literal grep is not comparable to
2.1.197's `sha256 ×47`.

---

## 2. Account, User & Session Identity

### 2.1 Identity fields

| Field | What | Source / accessor | Hashed? |
|---|---|---|---|
| `userID` / `device_id` / `deviceId` | 64-hex random install id | `_M()` `:115569` | no |
| `machineID` | 64-hex random | `Umt()` `:115581` | sent as 12-char prefix only |
| `summonSidKey` | 64-hex random HMAC key (**NEW**) | `rPo()` `:115596` | never sent |
| `remoteControlMachineId` | UUID (**NEW**) | `f7s()` `:115613` | no (raw `machine_id`) |
| device key / `deviceUUID` | P-256 keypair; server row UUID (**NEW**) | `~/.claude/.device-keys.json` `:271338`; registry `Ee` `:1000193` | public key sent; signatures sent |
| `accountUuid` | account | `VC()` (gateway) ?? `An()` (`oauthAccount`) ?? env when diskless `:133603-133607`; `Zw` len≥8 passthrough `:133690` | no |
| `organizationUuid` | org | same | no |
| `emailAddress` | PII | central `email()` is a **stub** `:133652`; OTel reads `oauthAccount.emailAddress` directly `:194465` | no |
| `sessionId` | per-conversation | `q()` / `getSessionId` (module 19) | no |
| `parent_session_id` | parent conversation (**NEW** in API metadata) | `QC()` `:103144` | no |

### 2.2 The central metadata bundle (`ek.coreUserData`, was `nit`)

`class ek` (`:133590`), memoised on `(includeAuth | qge())`:

```js
coreUserData = uo((e) => {
  let n = _M(), r = ce(), s, h, y;            // :133594
  if (e) { s = Rr() /*subscriptionType*/; h = EA() /*rateLimitTier*/; y = firstTokenTime from claudeCodeFirstTokenDate }
  let S = VC(), C = S ?? An() ?? (me() ? { organizationUuid: env.CLAUDE_CODE_ORGANIZATION_UUID,
                                           accountUuid: env.CLAUDE_CODE_ACCOUNT_UUID } : void 0);
  return { deviceId: n, sessionId: q(), email: S ? void 0 : this.email() /* stub -> undefined */,
           appVersion: "2.1.300", platform: bun() /* CLAUDE_CODE_HOST_PLATFORM | process.platform */,
           organizationUuid: Zw(C?.organizationUuid), accountUuid: Zw(C?.accountUuid),
           userType: "external", subscriptionType: s, rateLimitTier: h, firstTokenTime: y,
           ...GITHUB_ACTIONS && { githubActionsMetadata: { actor, actorId, repository, repositoryId,
                                                           repositoryOwner, repositoryOwnerId } } };
});                                                     // :133593-133638
email() { return }   async emailAsync() { return }      // :133652-133657  (still stubs)
```

CHANGED vs 2.1.197:
- account/org now prefer the enterprise-gateway account `VC()` (`:130898`, `mBo()`) over `oauthAccount`.
- In diskless mode they fall back to env vars.
- `gitEmail`/`gitUserName` are memoised readers on the same class (`:133644-133645`), not part of the
  bundle.

### 2.3 Where `userID` flows

- **Messages API `metadata.user_id`** (`EBe`, module 187, `:176875-176918`):

  ```js
  S = { ...h && { ti: h },                       // h is declared but never assigned -> dead
        device_id: _M(),
        account_uuid: (CLAUDE_CODE_REMOTE && CLAUDE_CODE_ACCOUNT_UUID) || VC()?.accountUuid || An()?.accountUuid || "",
        session_id: q(),
        ...y && { parent_session_id: y },        // NEW: QC()
        ...w && { tk: w } };                      // NEW: only when CLAUDE_CODE_REMOTE && Jn() (vmt, :140465)
  v = { ...s, ...EXTRA_METADATA (sanitised Bd()), ...S };
  if (JSON(v).length > Za /*512*/) drop extras, then drop everything but S;   // NEW cap :176697, :176909-176913
  return { user_id: JSON.stringify(v) };
  ```

  Still a plaintext JSON blob, unhashed. NEW in 2.1.300: `parent_session_id`, `tk`, and the 512-byte cap
  that silently drops `CLAUDE_CODE_EXTRA_METADATA` when it is too large.
- **First-party events** (`PW`, `:142328-142350`): `{event_name, event_id, core_metadata: GOr(),
  user_metadata: pl(!0) /*central bundle*/, event_metadata, user_id: _M()}`. Transport default path
  `/api/event_logging/v2/batch`, `maxBatchSize` 200 (`:141444`).
- **GrowthBook experiment event** (`Mxo`, `:142397-142430`): `device_id: _M()`, `account_uuid`,
  `organization_uuid`, `experiment_id`, `variation_id`.
- **GrowthBook attributes** (`aqn` → `nT`, `:142800-142843`, `:142573-142640`): see §2.4.
- **OTel resource** (`CDt`, module 212, `:194425-194478`): `user.id = _M()` (`:194437`), unconditional.
- **NEW: built-in plugin telemetry** (module 1802 `chunk-babcr4fj.js`, service `cc-plugin-telemetry`,
  `:1534439`): see §2.7.

### 2.4 Per-backend identity matrix

| Service | id key | account | org | email | session | hashed? | gate / notes |
|---|---|---|---|---|---|---|---|
| **Messages API** (`metadata.user_id`) | `device_id`=`_M()` | `account_uuid` | — | — | `session_id`, **`parent_session_id`** | no | always (`:176894`); `tk` under remote; 512-byte cap |
| **GrowthBook** attrs | `id`=`deviceID`=`deviceId` | `accountUUID` | `organizationUUID`, **`organizationRole`** | absent (stub) | `sessionId` | no | NEW attrs: `organizationRole`, `subscriptionCreatedAt`, `sessionOrigin` (`CLAUDE_CODE_SESSION_ORIGIN`), `ccrDerivedSurface`, `atisPin`, `slackTagConnected` (`:142828-142842`) |
| **GrowthBook** exposure event | `device_id` | `account_uuid` | `organization_uuid` | — | — | no | `:142411-142425` |
| **1P events** (`/api/event_logging/v2/batch`) | `user_id`=`_M()` | core `auth.account_uuid` | core `auth.organization_uuid` | — | core `session_id` | no | `:142342`; `core_metadata` now adds `head_sha` and tree-state counts (§4) |
| **Datadog** (`http-intake.logs.us5.datadoghq.com/api/v2/logs`) | `userBucket` (0–29) | tag | tag | — | tag | bucket only | `Ie()==="firstParty"`, allowlisted events only (`O`, `:349582`); token `pubea5604… (redacted)` (`:349577`) |
| **Error reports** (`browser-intake-us5-datadoghq.com/api/v2/logs`) | `user_bucket` | — | — | — | — | bucket | **`host_name_redacted = Umt().slice(0,12)`** (`:350262`); same `dd-api-key` (`:349926`); ≤100 reports/process |
| **OpenTelemetry** (user-configured) | `user.id`=`_M()` | `user.account_uuid` + `user.account_id` | `organization.id` | `user.email` (see 2.6) | `session.id`, `ccr.session.id` | no | include flags `:194373-194378` |
| **Bridge registration** (`POST /v1/environments/bridge`) | **`machine_id` = remoteControlMachineId** | via bearer | via bearer | — | — | no | **NEW** `:1075736-1075748`; `machine_name` = hostname |
| **Summon status** (`/api/frame/comments/…/summon-status`) | **`sid` = HMAC(summonSidKey, …)** | via relay auth | — | — | (in HMAC) | **HMAC** | **NEW** `:701445-701465` |
| **Device registry** (`/api/organizations/:orgUUID/cowork/remote_devices`) | **`public_key`** (SPKI b64) → server `id` | via `teleport-org` auth | path | — | — | n/a | **NEW** `:1000196-1000203`; `display_name` = `Claude Code on <hostname> · Linux` |
| **Plugin telemetry** (`https://api.anthropic.com/api/event_logging/v2/batch`) | `deviceId` (config `userID`) | `auth.accountUuid` | `auth.organizationUuid` | only if `userType==="ant"` | `sessionId` | no | **NEW** `:1534454-1534470` |
| **Trusted-device enrollment** | — | bearer | — | — | — | n/a | `:292628`; `display_name` hostname |
| **API requests via `Gw`** (`x-cc-atis` header) | **`atis`** (server-issued, echoed back) | — | — | — | — | no | from `client_data.atis` (`:142940`), set at `:182426` when `Wl()` holds; also GrowthBook attribute **`atisPin`** (NEW, `:142838`). Pre-existing header; not generated on the device |
| **Segment** | absent | — | — | — | — | — | — |

### 2.5 OTel include-flag defaults (`Se`, `:194373-194378`)

`SESSION_ID=true`, `VERSION=false`, `ACCOUNT_UUID=true`, `ENTRYPOINT=false`,
`RESOURCE_ATTRIBUTES=true`, **`REPOSITORY=false` (NEW;** 0 hits for `OTEL_METRICS_INCLUDE_REPOSITORY`
in 2.1.197). When `REPOSITORY` is on, `vcs.repository.url.full`, `vcs.owner.name`,
`vcs.repository.name` and `vcs.provider.name` are added. They are parsed from the git remote; URLs
containing `@` userinfo are refused (`Pe()`, `:194493-194503`).

### 2.6 OTel email — CHANGED

```js
let c = VC() ?? An() ?? Le();                                    // gateway acct, oauthAccount, fallback
let g = !me() ? c.emailAddress                                   // normal: plaintext, no env gate
               : i8e() ? a.CLAUDE_CODE_USER_EMAIL : void 0;      // diskless: env only, and only with OTLP logs
if (g) s["user.email"] = g;                                      // :194465-194467
```

In normal (non-diskless) mode email is still emitted unconditionally whenever the account has one. The
enterprise-gateway OIDC overlay (`ZAr`, `:194356`) still adds `identity.source:"gateway-oidc"` plus
`user.id`/`user.email`/`user.groups` from the JWT. In that case `user.*`/`identity.*` keys from
`OTEL_RESOURCE_ATTRIBUTES` are dropped (`:194432-194436`). The base58 tagged id
`user.account_id = CLAUDE_CODE_ACCOUNT_TAGGED_ID || uqn("user", accountUuid)` (`:194470-194472`)
remains a reversible encoding.

### 2.7 NEW — built-in plugin telemetry (`cc-plugin-telemetry`, module 1802)

A capability exposed to `builtin`/`core`-tier plugins only (`it()`, `ke=["builtin","core"]`). Its
behaviour:
- **Reads `~/.claude.json` itself** (`Qe`, `:1534786-1534806`):
  - `deviceId` = `userID`, under a *looser* regex `/^[A-Za-z0-9_-]{8,128}$/`
  - `accountUuid` / `organizationUuid` (8–128 chars)
  - `email` **only when** `userType === "ant"` (`:1534896`)
- Probes the machine with `uname -s/-r/-m` and `command -v npm yarn pnpm bun deno node` (`ye`, `:1534816`).
- Detects VCS (`.jj`, `.sl`, perforce) and the repo remote hash.
- Posts rows `{eventId, eventName, deviceId, email, auth:{accountUuid, organizationUuid}, sessionId,
  model, userType, env:{…}, additionalMetadata: base64(JSON{rh, ...props})}` (`W`, `:1534454-1534470`).
- **Target is hard-coded** to `https://api.anthropic.com/api/event_logging/v2/batch` (`We`,
  `:1534583`) with header `x-service-name: claude-code`. It is not derived from `ANTHROPIC_BASE_URL`.
- Gated by `F = () => !iy()` (`:1534436`) and the analytics switches/policy check (`c()`).

**NEW** (0 hits for `cc-plugin-telemetry` in 2.1.197).

### 2.8 NEW — compliance allowlist mode

When `Zk()` is true (`:135958`), 1P events (`rin`, `:136259`) and Datadog rows (`txo()` → `wNs`,
`:349835`) pass through per-field validators. `Zk()` is true when the policy "taint" list contains
`"hipaa"` (`Ta("hipaa")`, `:70091`), or under `Ugt()` with a local-agent entrypoint. The validators are
`GH` / `vNs` / `ENs` (`:136280-136364`; `vNs` `:136327`): `os.version` is forced off (`() => !1`), and
`device_id`/`session_id` are shape-checked. `user.email` is absent from the OTel allowlist schema, so it
is dropped. The exact policy source of the `hipaa` taint was not traced (**tentative**).

---

## 3. Device Trust, Auth & Credential Binding

### 3.1 Trusted-device token — CHANGED (more triggers, many more injection sites)

Module 287 `chunk-ayxavv1t.js`. Gate constants (`:292296-292298`):

| Gate | Value | Notes |
|---|---|---|
| `s` | `tengu_sessions_elevated_auth_enforcement` | `await rb(s)` (`:292589`) |
| `u` | `require_trusted_devices` | org policy; `isPolicyEnforced(u)`, or `isPolicyAllowed(u)` for some triggers |
| `P` | `tengu_sessions_elevated_auth_disable_proactive_enrollment` | `Afe()` |

`son({trigger, lazy, credentials})` (`:292569`):
1. Requires Claude.ai subscriber and `Jn()`; skipped in cloud containers (`CLAUDE_CODE_REMOTE`) and when
   `CLAUDE_TRUSTED_DEVICE_TOKEN` is set (`:292597`).
2. **NEW triggers:** `proactive` (default), `server_denied`, `device_bind`. For the last two, an org that
   merely *allows* `require_trusted_devices` suffices (`:292604-292605`). For `device_bind` the
   account must also be a consumer subscriber.
3. **NEW:** skipped in "essential traffic only" mode (`Ct()`, `:292613`).
4. `POST ${BASE_API_URL}/api/auth/trusted_devices` with body
   `{display_name: `Claude Code on ${os.hostname()} · ${eHe("linux")}`}`, i.e. `… · Linux` (`q` = `os.hostname`, `:292294`; `eHe` `:10588`), headers
   `User-Agent: claude-code/2.1.300`, `Authorization: Bearer <oauth>` (`:292628-292638`).
5. Persists `trustedDeviceToken` and NEW `trustedDeviceEnrolledAfterRefusalAtMs` (`:292653-292657`).

Read: env `CLAUDE_TRUSTED_DEVICE_TOKEN` first, then the credentials store (`:292428-292430`). The header
literal `X-Trusted-Device-Token` occurs 27 times (2.1.197: 5). Sites include:
- bridge API headers (`:1075686`)
- PR-subscription worker headers (`dkr`, `:368271`)
- the CCR/session clients (`:137889`, `:393813`, `:1054024`)
- the token-recovery client class (`:1240678-1241355`)

**No site on the Messages API path was found** (consistent with 2.1.197, tentative). A default logout wipes
the whole credentials store, `trustedDeviceToken` included (`:958979`). The
`preserveNonAnthropicAuth` path instead prunes named keys, `trustedDeviceToken` and
`trustedDeviceEnrolledAfterRefusalAtMs` among them (`:958963`).

### 3.2 NEW — device registry, device key and device-bound sessions

Gated by `nx()` = `rb("tengu_violin_wood")` (module 272, `:280539-280544`).

**Key generation** (`loadOrCreate`, `:999848-999877`):
`generateKeyPairSync("ec", {namedCurve: "P-256"}).privateKey` exported PKCS#8 DER base64. Keys are
indexed by **accountUuid**. Storage backends:
- **file** `~/.claude/.device-keys.json` (`jUn()` = `join(os.homedir(), ".claude", ".device-keys.json")`,
  `:271338`). Written mode `0600` (`Rn(n, _, 384)` + chmod, `:999753`). Default on this Linux build
  (`D()`, `:999828-999832`). Note: it is `homedir`-based, not `CLAUDE_CONFIG_DIR`.
- **keychain**: generic-password service `"Claude Code-device-keys"` (`C`, `:999673`). Defined
  (`ie()`, `:999766`) but not selected by `D()` in this Linux build.
- **legacy**: credentials-store field `coworkRemoteDevice[accountUuid]` (`ge`, `:999909`). It migrates
  to the item store when possible (`M`, `:1000030`).
- **diskless**: none (`withWriteLock` throws, `:999818-999825`).

**Registration** (`Ee`, `:1000193-1000227`): `POST /api/organizations/:orgUUID/cowork/remote_devices`
with `{display_name: Re(name) || "Claude Code on <hostname> · Linux", platform: "linux",
public_key: <SPKI DER base64>}` and auth `teleport-org`. The server-assigned `id` (UUID) is cached as
`rowPk` → `deviceUUID`. Error codes include `cowork_remote_device_limit_reached` and
`cowork_remote_device_registration_revoked`.

**Use:** ECDSA-SHA256 signatures in `ieee-p1363` encoding (`sign`, `:1000076-1000079`) over
domain-separated messages:
- `"anthropic.ccr.create_session_bind.v1" || orgUuid || accountUuid || deviceUuid || issuedAtMs`
  (`R`/`S`, `:1000470-1000495`)
- `anthropic.ccr.session_bind.v1`
- `anthropic.ccr.tool_host_resume.v1`

Session create then carries `target_device_id: deviceUUID` and `bind_attestation: {kid: "creg_" +
deviceUUID, signature}` plus `bind_attestation_issued_at` (`:199009-199014`).

**Lifetime:**
- **Survives logout by design.** `performLogout` reads `coworkRemoteDevice` before wiping the
  credentials store (`:958978`). It writes it back afterwards (`ee`, `:959050-959060`: "logout: the device
  identity could not be written back after the credential wipe").
- The `.device-keys.json` file is not touched by logout.
- A key changes on revocation/re-enroll (`Mts`), or when the stored key is unreadable ("minting a new
  one", `:999853`).

**NEW** (`.device-keys.json`, `creg_`, `bind_attestation`, `cowork/remote_devices`, `tengu_violin_wood`:
all 0 hits in 2.1.197). **This is the first genuine device credential in the product:** a private key
at rest whose public half is registered to the account server-side. It is still random, not
hardware-derived, and not in a TPM/Secure Enclave on Linux.

### 3.3 OAuth — client & device identifiers

Prod config block `a` (`:9510-9529`):

| Field | Value |
|---|---|
| `CLIENT_ID` | `9d1c250a-e61b-44d9-88ed-5944d1962f5e` (`:9522`) — unchanged |
| `DESIGN_CLIENT_ID` | `59637612-477b-4836-a601-b0589eda7704` (`:9523`) — present in 2.1.197 too |
| local-dev `CLIENT_ID` | `22422756-60c9-4084-8eb7-27705fd5cf9a` (`:9548`) — unchanged |
| `CONSOLE_AUTHORIZE_URL` | `https://platform.claude.com/oauth/authorize` |
| `CLAUDE_AI_AUTHORIZE_URL` | `https://claude.com/cai/oauth/authorize` |
| `TOKEN_URL` | `https://platform.claude.com/v1/oauth/token` |
| `API_KEY_URL` | `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |
| `ROLES_URL` | `https://api.anthropic.com/api/oauth/claude_cli/roles` |

- `CLAUDE_CODE_OAUTH_CLIENT_ID` overrides (`:9593`).
- Scopes (`:9473-9488`): `user:inference`, `user:profile`, `org:create_api_key`,
  `user:sessions:claude_code`, `user:mcp_servers`, `user:file_upload`, `user:projects:read/write`,
  design `user:design:read/write`. **NEW** `user:plugins` (added when `PLUGINS_SCOPE_REGISTERED`,
  `:9492`; 0 hits in 2.1.197).
- PKCE S256 (`:118397`). Profile endpoints `/api/claude_cli_profile` (`:118214`) and
  `/api/oauth/profile` (`:118237`).
- OAuth itself sends **no device identifiers**.
- The device-naming surfaces are all hostname-based:
  - trusted-device `display_name`
  - device-registry `display_name`
  - bridge `machine_name`

  Plus the NEW random ids in §1.

### 3.4 Credential storage

- Backend `name:"plaintext"`, `osGuarded:!1` (`:98156`). Warning string `"Warning: Storing credentials
  in plaintext."` (`:97953`).
- Dir: `CLAUDE_SECURESTORAGE_CONFIG_DIR` or the config dir (`wx`, `:97643-97647`); `null` when diskless
  (`GXe`).
- Keychain service name `Claude Code${OAUTH_FILE_SUFFIX}${suffix}${-sha256(configDir)[:8] when non-default}`
  (`Ome`, `:97653-97659`).
- **API-key Keychain save still dead:** `ELs` has `let s = !1; if (s) {security add-generic-password …}
  else i("tengu_api_key_saved_to_config", {})` (`:129660-129681`).
- Logout (`performLogout` = `mre`) has two credential paths:
  - **Default** (`preserveNonAnthropicAuth` false): the whole credentials store is deleted
    (`w.delete(m)`, `:958979`). `coworkRemoteDevice` is read first (`:958978`) and written back afterwards (`ee`, `:959049`).
  - **`preserveNonAnthropicAuth: true`**: only named keys are pruned: `claudeAiOauth`,
    `organizationUuid`, `trustedDeviceToken`, `trustedDeviceEnrolledAfterRefusalAtMs`,
    `enterpriseGateway`, `designOauth`, **`cloudSessionsOauth` (NEW key)** (`:958963`).
    `coworkRemoteDevice` is not in the list, so it survives this path too.

### 3.5 Provider plane selector (`Ie()`, was `yr()`)

```js
function Ie() {                                            // :21727
  if (Fr() || b7e() || w7e()) return "gateway";
  return USE_BEDROCK ? "bedrock" : USE_FOUNDRY ? "foundry" : USE_ANTHROPIC_AWS ? "anthropicAws"
       : USE_ANTHROPIC_GOOGLE_CLOUD ? "anthropicGoogleCloud"   // NEW
       : USE_MANTLE ? "mantle" : USE_VERTEX ? "vertex" : "firstParty";
}
```

Routing / data residency only. `firstParty` still gates the Datadog sink (`_0t`, `:349779`) and error
reporting (`TMs`, `:349419`). There is no IP or country collection.

---

## 4. Environment, Runtime & Network — delta note

The soft fingerprint (terminal, shell, runtimes, distro, WSL, CI detection) remains owned by the
env/telemetry analysis. Anchors verified for 2.1.300:

- **`core_metadata` (`GOr`, `:141165-141243`)** attached to every 1P event and Datadog row:
  - `model`, `sessionId`, `envContext`, `isClaudeAiAuth`, `entrypoint`, `sessionKind`, `hasAttacher`
  - `agentSdkVersion`, `desktopAppVersion`, `isInteractive`, `clientType`, `processMetrics`
  - `sweBench*`, `subscriptionType`
  - `rh` (repo hash)
  - `head_sha` — only when not diskless **and** Claude.ai Max/Pro (`c5()`, `:131207`)
  - **NEW** `is_clean_tree_at_start`, `changed_file_count_at_start`, `untracked_file_count_at_start`
    (same gate; 0 hits in 2.1.197)
  - **NEW** `remoteControlLane`, `projectsSession`, `promptId`, `rendererMode`

  Datadog strips `head_sha` and the three tree-state fields before sending (`:349797-349804`).
- **Error report** (`K`, module 334, `:350206-350268`):
  - `ddtags` (`service:claude-code-error-tracking`, `platform`, `os_release` = **major.minor only** via
    `X()`, `user_bucket`, `entrypoint`, `node_version`, `bun_version:1.4.3`, …)
  - `host_platform`, `host_os_release`, `host_name_redacted`
  - `error.{kind,message≤4000,stack≤16000,fingerprint=sha256(kind+top3frames)[:16]}`
  - `feature_flags` (≤50 boolean flags)

  Sender: `POST https://browser-intake-us5-datadoghq.com/api/v2/logs?ddsource=browser&dd-api-key=pubea…`
  (`:349907-349935`). This resolves 2.1.197's "exact URL not pinned" uncertainty. The same URL constant
  exists in 2.1.197 (`2.1.197 :299157`).
- Config file keys now include `userID`, `machineID`, **`summonSidKey`**, **`remoteControlMachineId`**,
  `firstStartTime`, `oauthAccount`, …
- User-Agent `claude-code/2.1.300` (`ps()`, `:376`); version only.

---

## 5. What leaves the machine — summary

| Identifier | Generated | Stored | Lifetime | Leaves as | Where (endpoint / field) | Line |
|---|---|---|---|---|---|---|
| `userID` | `randomBytes(32)` hex, lazy; eager in init only with storage V5 | global config `userID` | per install; survives logout; regenerated if not 64-hex | **raw** | Messages API `metadata.user_id.device_id`; 1P `user_id` + `user_metadata.deviceId`; GrowthBook `id`/`deviceID` + exposure `device_id`; OTel `user.id`; plugin telemetry `deviceId` | `:176894`, `:142342`, `:142577`, `:142411`, `:194437`, `:1534458` |
| `userID` (derived) | sha256 %30 | — | — | integer bucket | Datadog `userBucket`, error `user_bucket` | `:349720`, `:350125` |
| `userID` (derived) | sha256("org_config_gate:"…) %100 | — | — | **not sent** | local rollout | `:813601` |
| `machineID` | `randomBytes(32)` hex, eager | config `machineID` | per install; survives logout | **12-hex prefix** | error reports `host_name_redacted` | `:350262` |
| `summonSidKey` (NEW) | `randomBytes(32)` hex, lazy | config `summonSidKey` | per install; survives logout | **never** (HMAC key) | `sid` in `POST /api/frame/comments/{slug}/{thread}/summon-status` | `:701360`, `:701462`, `:700340` |
| `remoteControlMachineId` (NEW) | `randomUUID()`, lazy, CAS-persisted | config `remoteControlMachineId` | per install; survives logout | **raw** | `machine_id` + `metadata.machine_id` in `POST {base}/v1/environments/bridge` | `:1075737`, `:1075746` |
| device key (NEW) | P-256 keypair per account | `~/.claude/.device-keys.json` (0600) or credentials store | **survives logout** (explicitly restored) | public key + signatures | `POST /api/organizations/:orgUUID/cowork/remote_devices`; session create `target_device_id` + `bind_attestation` | `:1000198`, `:199009` |
| hardware machine-id | `/etc/machine-id` etc. | — / local pid-files (NEW) | OS | **not sent** (OTel strips; `pidDomain` local, tentative) | — | `:1470602`, `:100314` |
| hostname | `os.hostname()` | — | — | raw | trusted-device `display_name`; device-registry `display_name`; bridge `machine_name` | `:292629`, `:1000268`, `:1075736` |
| account / org uuid | OAuth / gateway / env | `oauthAccount` | until logout | raw | all first-party sinks, GrowthBook, OTel, Datadog tags | §2.4 |
| email | `oauthAccount.emailAddress` | config | until logout | raw | OTel `user.email` (non-diskless, no gate); plugin telemetry only for `ant` | `:194465`, `:1534896` |
| host software profile (NEW) | PATH tool scan, OS/distro | — | — | raw | bridge registration `host` (flag default off) | `:1074678`, `:1075751` |

**Hardware UUID:** still not transmitted. **Credentials:** plaintext tokens, not machine-bound. **New
exception:** a device keypair that is bound to the account server-side and preserved across logout.
**Geo:** none.

### Headline deltas vs 2.1.197

| Area | 2.1.197 | 2.1.300 |
|---|---|---|
| userID getter | `vW()` `:606434`, any truthy value accepted | `_M(e, seed)` `:115569`, 64-hex validated, optional (unused) seed |
| machineID getter | `z5t()` `:606453` | `Umt()` `:115581` (validated); same sole sink `host_name_redacted` |
| **summonSidKey** | — | **NEW** `rPo()` `:115596`; HMAC key for summon `sid` |
| **remoteControlMachineId** | — | **NEW** `f7s()` `:115613`; sent as bridge `machine_id` |
| **device key / registry / bind** | — | **NEW** P-256 key, `/cowork/remote_devices`, `bind_attestation`; survives logout |
| hardware machine-id in 1P code | none | **NEW** `pidDomain` = raw `/etc/machine-id` + pid-ns (local files) |
| OTel machine-id detector | 2 bundled copies | 1 copy, lazily imported per-platform chunks; still stripped |
| Messages API metadata | `device_id`, `account_uuid`, `session_id` | + `parent_session_id`, `tk` (remote), 512-byte cap |
| GrowthBook attrs | … `entrypoint`, `hasUsedRemoteSession`, `hasRemoteEnvironment` | + `organizationRole`, `subscriptionCreatedAt`, `sessionOrigin`, `ccrDerivedSurface`, `atisPin`, `slackTagConnected` |
| OTel email | unconditional | unconditional unless diskless (then env + OTLP-logs only) |
| OTel repo attrs | — | NEW `OTEL_METRICS_INCLUDE_REPOSITORY` (default false) |
| plugin telemetry | — | NEW `cc-plugin-telemetry`, hard-coded `api.anthropic.com` ingest |
| bridge host profile | — | NEW `host` profile (flag `tengu_bridge_host_profile`, default off) |
| trusted device | proactive only | + `server_denied`, `device_bind` triggers; header literal 5 → 27 |
| OAuth scopes | … | + `user:plugins` |
| logout | full wipe; selective prune of 5 keys under `preserveNonAnthropicAuth` (2.1.197 `:338135`) | full wipe, then restores `coworkRemoteDevice`; selective prune now 7 keys (adds `trustedDeviceEnrolledAfterRefusalAtMs`, `cloudSessionsOauth`) |
| provider selector | `yr()` gateway-first | `Ie()` `:21727`, adds `anthropicGoogleCloud` |
| keychain API-key save | dead (`t=!1`) | still dead (`s=!1`, `:129660`) |
| Datadog client token | `pubea5604… (redacted)` | same (`:349577`) |
| OAuth client ids | prod `9d1c250a…`, dev `22422756…` | same (`:9522`, `:9548`) |
| runtime | Bun 1.4.0 | Bun 1.4.3 (`bun_version:"1.4.3"` in error reports) |

### Uncertainties

- Whether storage-V5 replicates session pid-files (which now contain the raw `/etc/machine-id` in
  `pidDomain`) to any remote store was **not traced**. No network serialiser of `pidDomain` was found.
- The keychain device-key backend is defined, but in this Linux build `D()` selects the file store. The
  macOS/Windows builds were not analysed.
- The `z()` gate controlling eager `_M(n)` at init (`:772825`) is a chunk-local import in module 701.
  Its exact meaning (storage-V5 enabled) is inferred, not proven.
- The `hipaa` taint's policy source and the full `Ugt()` predicate in `Zk()` were not traced.
- Plugin telemetry posts through an injected `e.fetch`. Whether the host rewrites the hard-coded
  `api.anthropic.com` URL (e.g. for a custom base URL) was not traced.
- The `ti` field in `metadata.user_id` is declared but never assigned in this build (dead), as read.
- `createHash` totals were not recomputed (aliasing makes a literal grep non-comparable).
