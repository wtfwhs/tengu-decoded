# Security Model

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/security-checks.yaml](data/security-checks.yaml) for the structured dataset.

## Bash Command Checks

Claude Code implements a multi-layered detection system with **14 check categories** for commands run via the Bash tool:

| Check ID | Name | What It Detects |
|----------|------|-----------------|
| 1 | `INCOMPLETE_COMMANDS` | Commands that appear truncated or incomplete |
| 2 | `JQ_SYSTEM_FUNCTION` | `jq` commands using the `system()` function |
| 3 | `JQ_FILE_ARGUMENTS` | `jq` commands with suspicious file arguments |
| 4 | `OBFUSCATED_FLAGS` | Quoted characters in flag names, ANSI-C quoting |
| 5 | `SHELL_METACHARACTERS` | `;`, `|`, `&` in arguments |
| 6 | `DANGEROUS_VARIABLES` | Variables used in dangerous contexts |
| 7 | `NEWLINES` | Embedded newlines that could hide commands |
| 8 | `DANGEROUS_PATTERNS_COMMAND_SUBSTITUTION` | `$(...)`, backtick substitution |
| 9 | `DANGEROUS_PATTERNS_INPUT_REDIRECTION` | `<` input redirection |
| 10 | `DANGEROUS_PATTERNS_OUTPUT_REDIRECTION` | `>` output redirection |
| 11 | `IFS_INJECTION` | `$IFS` usage to bypass validation |
| 12 | `GIT_COMMIT_SUBSTITUTION` | Command substitution in git commit messages |
| 13 | `PROC_ENVIRON_ACCESS` | `/proc/*/environ` access |
| 14 | `MALFORMED_TOKEN_INJECTION` | Ambiguous syntax with command separators |

## Check Behaviours

Each check returns one of: `allow` (safe), `ask` (prompt user), or `passthrough` (not applicable, next check). Checks are **cumulative** -- a command passes through all 14 in sequence.

## Special Cases

- **`echo` without pipes/redirects**: Always passes through
- **Git commit with quoted `-m` message**: Allowed if simple
- **Heredocs with quoted delimiters**: Allowed
- **`jq` system() function**: Always flagged
- **ANSI-C quoting (`$'...'`)**: Always flagged

## Disabling Checks

`CLAUDE_CODE_DISABLE_COMMAND_INJECTION_CHECK` env var disables the entire pipeline.

## File Access

The system prompt instructs the model to never read/modify: `.env` files, `node_modules/`, `.git/` internals, build output directories, certificate files, and secrets directories. These are **prompt-level** restrictions, not filesystem ACLs.

## Additional Features

- **`CLAUDE_CODE_ADDITIONAL_PROTECTION`** -- Enables extra protection mode
- **Ripgrep path filtering** -- File paths extracted from commands are validated
- **Command parsing** -- Commands are parsed to extract base commands, detect quoting, and identify patterns before execution
