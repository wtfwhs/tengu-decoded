# Model References

> [Back to version index](../README.md)
>
> **Version**: 2.1.32 | **Build**: `2026-02-05T17:02:25Z` | **Platform**: Linux x86-64

See [data/models.yaml](data/models.yaml) for the structured dataset.

## Current Models

| Family | Model IDs |
|--------|-----------|
| Opus 4.6 | `claude-opus-4-6`, `claude-opus-4-6-v1` |
| Opus 4.5 | `claude-opus-4-5`, `claude-opus-4-5-20251101` |
| Opus 4.1 | `claude-opus-4-1`, `claude-opus-4-1-20250805` |
| Opus 4.0 | `claude-opus-4`, `claude-opus-4-0`, `claude-opus-4-20250514` |
| Sonnet 4.5 | `claude-sonnet-4-5`, `claude-sonnet-4-5-20250929` |
| Sonnet 4.0 | `claude-sonnet-4`, `claude-sonnet-4-20250514` |
| Haiku 4.5 | `claude-haiku-4-5`, `claude-haiku-4-5-20251001` |
| Sonnet 3.7 | `claude-3-7-sonnet`, `claude-3-7-sonnet-20250219` |
| Sonnet 3.5 | `claude-3-5-sonnet`, `claude-3-5-sonnet-20241022` |
| Haiku 3.5 | `claude-3-5-haiku`, `claude-3-5-haiku-20241022` |

## Legacy Models

`claude-3-opus`, `claude-3-sonnet`, `claude-3-haiku`, `claude-2.1`, `claude-2.0`, `claude-1.3`, `claude-instant-1.1`, `claude-instant-1.2`

No unreleased model names were found.

## Model Fallback System

A fallback system exists -- `tengu_api_opus_fallback_triggered` fires when the primary model fails. `FALLBACK_FOR_ALL_PRIMARY_MODELS` env var forces fallback for all models.
