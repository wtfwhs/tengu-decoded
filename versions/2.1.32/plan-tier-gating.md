# Plan and Tier Gating

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

## Subscription Types

The binary maps organization types via an internal function `P0()`:

| Organization Type | Internal Name | Helper Function |
|---|---|---|
| `claude_max` | `"max"` | `LTH()` -- isMax |
| `claude_pro` | `"pro"` | `DTH()` -- isPro |
| `claude_enterprise` | `"enterprise"` | (no dedicated helper) |
| `claude_team` | `"team"` | `ITH()` -- isTeam |
| API users | `null` | -- |

Combined helpers:
- `$q0(H)` -- isPaidConsumer (`H === "max" || H === "pro"`)
- `oD$()` -- isFirstPartyPaidConsumer

## Model Access by Plan

Opus is not available on Pro. On startup with Pro + Opus selected, the model is switched to Sonnet.

## Agent Teams Teammate Limits

The function `ZoD()` controls max teammate count:

| Plan | Max Teammates |
|------|--------------|
| Max (20x tier) | 3 |
| Enterprise | 3 |
| Team | 3 |
| Pro / API / Free | **1** (effectively disabled) |

**Override**: `CLAUDE_CODE_PLAN_V2_AGENT_COUNT` env var (accepts 1-10).

## 1M Context Window Access

**Sonnet 1M** -- gated via API call to `/claude_code_sonnet_1m_access`, cached 1 hour. API users need prepaid tier 3.

**Opus 1M** (codename: `marble_lantern`) -- controlled by `tengu_marble_lantern_disabled` flag. Third-party access separately gated by `tengu_marble_lantern_3p_disabled`.

## Rate Limit Tiers

| Type | Window |
|------|--------|
| `five_hour` | 5-hour session limit |
| `seven_day` | Weekly limit (all models) |
| `seven_day_opus` | Weekly Opus-specific limit |
| `seven_day_sonnet` | Weekly Sonnet-specific limit |
| `overage` | Extra usage tracking |

Key tier identifier: `default_claude_max_20x` (the highest Max tier).

## Feature Availability Matrix

| Feature | Free/API | Pro | Max | Team | Enterprise |
|---|---|---|---|---|---|
| Opus model | No | **No** | Yes | Yes | Yes |
| Opus 1M context | Tier-gated | Tier-gated | Yes | Yes | Yes |
| Sonnet 1M context | Tier 3 | API check | API check | API check | API check |
| Agent Teams | 1 (disabled) | 1 (disabled) | 3 | 3 | 3 |
| `/upgrade` command | Yes | Yes | Yes | Yes | Hidden |
| `/privacy-settings` | No | Yes | Yes | No | No |
| `/extra-usage` | Varies | Yes | Yes | Admin-gated | Admin-gated |

## Organization Policies

Enterprise/Team orgs can set:
- `allow_remote_sessions` -- gates teleport/remote features
- `allow_product_feedback` -- gates `/bug` and feedback surveys

Both default to `true` if no policy exists.
