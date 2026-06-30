# Hidden Commands

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/commands.yaml](data/commands.yaml) for the structured dataset.

## Hidden / Gated Commands

| Command | Aliases | Status | Notes |
|---------|---------|--------|-------|
| `/files` | -- | **Disabled** (`isEnabled: () => false`) | Lists files in context -- exists but turned off |
| `/thinkback-play` | -- | **Hidden** | Plays a thinkback animation |
| `/btw` | -- | Gated | Side-question feature, requires `ENABLE_BTW` env var |
| `/stickers` | -- | Active | Order Claude Code stickers |
| `/think-back` | -- | Gated | 2025 Year in Review, gated by `tengu_thinkback` flag |

## All Active Commands

`/help`, `/config` (`/settings`), `/login`, `/logout`, `/compact`, `/resume` (`/continue`), `/memory`, `/plan`, `/permissions` (`/allowed-tools`), `/hooks`, `/agents`, `/skills`, `/tasks` (`/bashes`), `/todos`, `/usage`, `/cost`, `/status`, `/feedback` (`/bug`), `/ide`, `/mcp`, `/fork`, `/add-dir`, `/extra-usage`, `/passes`, `/privacy-settings`, `/theme`, `/terminal-setup`, `/install-github-app`, `/install-slack-app`, `/session` (`/remote`), `/mobile` (`/ios`, `/android`), `/stickers`, `/chrome`, `/clear` (`/reset`, `/new`), `/copy`, `/color`, `/rename`
