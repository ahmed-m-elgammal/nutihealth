# NutriHealth Feature Audit (React Native / Expo)

_Date:_ 2026-02-18  
_Scope:_ Existing implementation health check for these features: meal logging, food search, barcode scanner, AI food detection, water tracking, workout tracking, recipe import, weekly meal plans, progress charts, notifications, onboarding.

## Executive Summary

- **Feature coverage is broad and real**: all requested features exist in the app navigation and supporting services.
- **Architecture alignment is strong**: Expo Router + WatermelonDB + Zustand + React Query are used consistently in core feature flows.
- **Main gaps are product-quality, not missing modules**: a few screens still include hardcoded values and some features lack tests around edge/error states.
- **Highest-leverage next work**: improve progress analytics realism, expand e2e-style validation for camera/import flows, and tighten localization consistency.

## Feature-by-Feature Check

| Feature                      | Status                   | What exists                                                                                                                    | Risk / gaps                                                                                          | Suggested next step                                                                                   |
| ---------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Meal logging                 | ✅ Implemented           | Add-meal entry hub, per-day meal aggregation, WatermelonDB create/update/delete services, macro totals displayed in Meals tab. | Some copy strings in UI are still hardcoded English and not fully localized.                         | Move all visible strings to i18n keys and add integration tests for add/edit/delete meal paths.       |
| Food search                  | ✅ Implemented           | Debounced search modal with sections (recent, local DB, external/OpenFoodFacts), pushes selected food to details flow.         | No explicit empty/error telemetry; mostly console logging on failure.                                | Add structured error state + retry CTA and analytics events for failed searches.                      |
| Barcode scanner              | ✅ Implemented           | Camera permissions handling, cooldown guard, OpenFoodFacts lookup, fallback to manual search if not found.                     | Dependent on external dataset quality; could use offline fallback cache.                             | Cache recent successful barcode lookups in MMKV/AsyncStorage.                                         |
| AI food detection via camera | ✅ Implemented           | Image picker flow, Groq-backed analysis service, confidence/source indicators, portion multiplier before save.                 | Camera-capture UX is currently gallery-first in this modal; uncertainty handling is UI-only.         | Add direct camera capture option and confidence-threshold confirmation rules before save.             |
| Water tracking               | ✅ Implemented           | Water tab UI + quick add amounts; Zustand waterStore handles load/add/delete + dynamic target adjustments.                     | Surface-level trend/history is limited in screen presentation.                                       | Add weekly hydration trend chart and consistency streak from stored logs.                             |
| Workout tracking             | ✅ Implemented           | Weekly schedule generation from templates + preferences, rest-day controls, workout logging routes.                            | Complexity is high; coverage appears stronger in services than in full-flow UI tests.                | Add integration tests that validate schedule re-application + dropped template behavior.              |
| Recipe import                | ✅ Implemented           | Dedicated import flow, URL validation, retry/caching, parser normalization, preview route and tests in services.               | Depends on backend parser availability; partial parser failures can still surface as generic errors. | Add richer client-side error mapping for backend parser edge cases + snapshot tests for preview data. |
| Weekly meal plans            | ✅ Implemented           | CRUD-like weekly goal plan management modal + active plan selection + daily macro fetch integration in Meals tab.              | Naming says “weekly goal plans”; could confuse users expecting explicit meal-by-meal planning.       | Add product copy clarification (“macro plan”) or extend to actual meal scheduling if intended.        |
| Progress charts              | ⚠️ Partially implemented | Weight/calorie history hooks are wired and simple visualizations exist.                                                        | Several metrics/cards still display static placeholders (e.g., nutrition stats/adherence values).    | Replace placeholder cards with computed aggregates from actual logs.                                  |
| Notifications                | ✅ Implemented           | Expo notification registration + smart reminder scheduler + profile toggles to enable/clear reminders.                         | No segmentation logic (behavior-based reminder timing) yet; fixed schedule defaults.                 | Add adaptive reminder windows based on missed logs and user routine.                                  |
| Full onboarding flow         | ✅ Implemented           | Multi-screen onboarding stack (welcome → personal info → goals → activity → dietary → finish) + Zustand onboarding state.      | Ensure all profile-critical fields are validated before finish for downstream features.              | Add completion gate tests for required metrics (height/weight etc.).                                  |

## Evidence Map (Key Files Reviewed)

### Navigation / routes

- `src/app/(tabs)/meals.tsx`
- `src/app/(tabs)/water.tsx`
- `src/app/(tabs)/workouts.tsx`
- `src/app/(tabs)/progress.tsx`
- `src/app/(modals)/add-meal.tsx`
- `src/app/(modals)/food-search.tsx`
- `src/app/(modals)/barcode-scanner.tsx`
- `src/app/(modals)/ai-food-detect.tsx`
- `src/app/(modals)/recipe-import.tsx`
- `src/app/(modals)/weekly-plans.tsx`
- `src/app/onboarding/_layout.tsx`

### Services / state / data

- `src/services/api/meals.ts`
- `src/services/api/foodSearch.ts`
- `src/services/api/openFoodFacts.ts`
- `src/services/ai/foodDetection.ts`
- `src/services/recipeImportService.ts`
- `src/services/api/weeklyGoals.ts`
- `src/services/notifications.ts`
- `src/services/notifications/scheduler.ts`
- `src/store/waterStore.ts`
- `src/store/onboardingStore.ts`

### i18n

- `src/i18n/index.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/ar.json`
- `src/i18n/locales/es.json`

## Priority Recommendations

1. **Progress screen data fidelity (High)**
    - Replace static KPI blocks with real aggregates from meals/water/workout logs.
2. **Localization hardening (High)**
    - Remove remaining hardcoded English strings from feature modals/tabs.
3. **End-to-end feature confidence (Medium)**
    - Add high-value integration tests for: barcode scan fallback, AI detection save flow, weekly plan activation edge cases.
4. **Notification intelligence (Medium)**
    - Evolve fixed reminder times into adaptive scheduling driven by engagement patterns.
5. **Operational resiliency (Medium)**
    - Add explicit user-facing retry/error states in network-dependent flows (food search, recipe import, external APIs).

## Overall Verdict

NutriHealth already contains all listed capabilities with practical, production-oriented foundations. The next phase should focus less on adding new modules and more on **polish, reliability, and data truthfulness in UI analytics**, especially on progress and edge-state handling.
