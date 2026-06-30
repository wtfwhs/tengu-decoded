# Methodology

## Overview

Findings are obtained from publicly distributed Claude Code binaries by two complementary methods,
depending on how the binary is packaged:

1. **String extraction** (`strings`/`grep`) — works on any build; used for v2.1.32.
2. **Cleartext bundle extraction + beautification** — used from v2.1.169. Recent builds are
   **Bun-compiled standalone executables** that embed the application's JavaScript as **plaintext**
   appended to the runtime. That byte range is carved out (`dd`) and reformatted with a beautifier so
   whole function bodies can be read, not just isolated strings. This is *not* decompilation or
   disassembly: no machine code or JavaScriptCore bytecode is reverse-engineered, and the JavaScript is
   already human-readable inside the binary. The carved bundle is committed under each version's
   `bundle/` directory, with raw extraction output in `data/raw/`, so findings are reproducible. (Older
   builds were Node.js SEA; the same idea applies if the bundle is recoverable as text.)

The primary analysis method is **Claude Code self-analysis** — using Claude Code itself to examine its
own binary — supplemented by the extraction above and targeted `strings`/`grep`.

### Detecting the packaging and extracting the bundle (Bun builds)

```bash
# Runtime fingerprint
strings binary | grep -oiE 'Bun v[0-9.]+|// @bun|NODE_SEA_BLOB'

# Find the plaintext JS bundle's byte offset(s)
grep -aboP 'You are Claude Code' binary | head

# Carve the contiguous plaintext run (offsets from a printable-run scan) and beautify
dd if=binary bs=1 skip=<START> count=<LEN> of=cli.min.js
npx js-beautify -f cli.min.js -o cli.beauty.js   # whitespace only
```

## Binary Locations

| Platform | Typical Path |
|----------|-------------|
| Linux | `~/.local/share/claude/versions/<version>` |
| macOS | `~/.local/share/claude/versions/<version>` |
| Windows | `%LOCALAPPDATA%\claude\versions\<version>` |

## Extraction Commands

```bash
# Find feature flag names
strings binary | grep -oP 'tengu_[a-z_]+' | sort -u

# Find feature flag checks (accessor functions)
strings binary | grep -oP 'kL\("[^"]+".{0,20}' | sort -u

# Find context around specific flags
strings binary | grep -oP '.{0,200}FLAG_NAME.{0,200}'

# Find API endpoints
strings binary | grep -oP 'https?://[^\s"]+' | grep -i "anthrop\|claude" | sort -u

# Find environment variables
strings binary | grep -oP 'CLAUDE_[A-Z_]+' | sort -u

# Find long prompt strings
strings -n 300 binary | grep -iP 'you are|IMPORTANT|you must'

# Find security check patterns
strings binary | grep -oP '.{0,200}KU\s*=\s*\{.{0,2000}'

# Find compaction prompts
strings binary | grep -oP 'Your task is to create a detailed summary.{0,3000}'
```

## Accessor Function Patterns

The minified binary uses specific functions to check feature flags:

| Function | Signature | Purpose |
|----------|-----------|---------|
| `kL()` | `kL(flagName, defaultValue)` | Primary boolean flag check |
| `df()` | `df(flagName)` | Alternate accessor (no default) |
| `Cu()` | `Cu(flagName, defaultObj)` | Configuration object flags |

**Note**: These function names are specific to v2.1.32 and will change between builds due to minification. Each version analysis should identify the current accessor patterns.

## Distinguishing Flags from Events

The binary contains hundreds of `tengu_*` strings. To distinguish feature flags from telemetry event names:

1. **Feature flags** appear as arguments to `kL()`, `df()`, or `Cu()` calls
2. **Telemetry events** appear as arguments to the event firing function `c(eventName, payload)`
3. Surrounding context (nearby strings) helps determine the purpose

## Limitations

- The binary is minified and bundled — variable names are mangled
- Some inferences about flag purposes are based on surrounding context and may be imprecise
- Server-side behaviour cannot be observed from the client binary alone
- GrowthBook flag values are fetched at runtime and may vary by account, region, or experiment cohort
- System prompt text is extracted from string fragments — some sections may be incomplete where strings are dynamically composed
- Function names (e.g., `kL`, `mL`, `df`) change between versions

## Contributing an Analysis

See the [How to Analyse](how-to-analyze.md) guide for step-by-step instructions on analysing a new version.
