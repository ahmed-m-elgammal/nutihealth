# Feature Flags Audit

## Scope

Audit performed for `config.features` in `src/constants/config.ts`.

## Findings

| Flag                  | Current Gate Status      | Evidence                                                                  | Action                                                                |
| --------------------- | ------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `enableSync`          | ✅ Wired                 | Used in `syncService.initialize`, `performSync`, `enableAutoSync` guards. | Keep.                                                                 |
| `enableAI`            | ⚠️ Previously decorative | AI surfaces/routes/services were reachable regardless of flag.            | **Wired** in UI + service layer (see below).                          |
| `enableBarcode`       | ❌ Not wired             | No runtime checks found before barcode UI/route usage.                    | Leave for follow-up (needs routing/UI gating strategy similar to AI). |
| `enableCamera`        | ❌ Not wired             | No runtime checks found for camera-dependent flows.                       | Leave for follow-up.                                                  |
| `enableNotifications` | ❌ Not wired             | No feature-level guard around notification surfaces/registration path.    | Leave for follow-up.                                                  |
| `enableAnalytics`     | ❌ Not wired             | No runtime checks around analytics instrumentation.                       | Leave for follow-up.                                                  |

## Changes made in this PR

### `enableAI` wired end-to-end

- Environment-driven feature toggles added (`EXPO_PUBLIC_ENABLE_AI` and peers) and fed into config.
- AI UI surfaces are now gated:
    - Add-meal AI detect button hidden when disabled.
    - Quick actions AI detect tile hidden when disabled.
    - AI modal routes render disabled states if accessed directly/deep-linked.
    - Root stack only registers AI food-detect screen when enabled.
- AI service entry points are now gated:
    - `chatWithCoach` returns a disabled message when AI is off.
    - `generateMealPlan` returns structured fallback when AI is off.
    - `identifyFoodFromImage` throws explicit disabled error when AI is off.

## Recommendation

For non-AI flags still unwired (`enableBarcode`, `enableCamera`, `enableNotifications`, `enableAnalytics`), either:

1. wire each with explicit UI + service guards, or
2. remove them from `config.features` until they control real behavior.

Do not keep decorative flags in production code.
