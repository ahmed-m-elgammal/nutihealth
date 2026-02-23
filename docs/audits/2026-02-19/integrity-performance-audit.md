# NutriHealth Integrity & Performance Audit (Codebase Review)

Date: 2026-02-19  
Auditor: Codex (static + limited CLI validation)

## Executive Summary

Overall app health is **moderate**: core screens and most planned feature surfaces are present, but implementation consistency is uneven.

- **Strengths:** broad feature coverage across Home/Meals/Progress/Water/Workouts/Plans/Profile, global toast/skeleton systems, haptics utility, and skia-based charting foundation.
- **Key integrity risk:** design token and theming adoption is incomplete; many components still use hard-coded colors, spacing, and elevation values.
- **Key performance risk:** no reproducible runtime profiling evidence for cold start, fps, memory, or interaction latency targets; static code indicates likely avoidable UI-thread work and avoidable rerenders in high-frequency surfaces.
- **Build quality signal:** current branch has significant lint/test regressions, and Android export bundling currently fails in this environment.

## Integrity Findings

### 1) Design Token System (colors/spacing/typography/elevation)

**What is correct**
- A centralized token file exists with colors, spacing, typography, elevation, and motion scales.
- Dark theme override tokens are defined.

**What is missing / bugs**
- Token usage is inconsistent: many UI surfaces still contain direct hex colors and literal spacing values.
- Repo-wide scan found **662 hard-coded hex color literals** outside token source files (`rg -n "#[0-9a-fA-F]{3,8}" ... | wc -l`).
- Critical shared components (tab bar, chart cards, meal cards, screen headers) still include literals, reducing theme consistency and maintainability.

**Impact**
- Theme drift, duplicated values, slower redesign iteration, and increased risk of visual regressions.

### 2) Theme Engine (light/dark + toggle + persistence)

**What is correct**
- `ThemeProvider` supports `light|dark|system`, derives current scheme, and persists setting to storage.
- Profile screen exposes a dark mode toggle through settings.

**What is missing / bugs**
- Several screens/components are still hard-coded to light colors (`#fff`, `#0f172a`, etc.), so dark mode cannot be considered complete.
- Some root-level loading/error surfaces use hardcoded classes/colors (`bg-white`, fixed activity indicator color).
- Theme state also exists in `uiStore`, creating duplicate theme state paths (provider + store) and potential future divergence.

### 3) Navigation & Floating Tab Bar

**What is correct**
- Floating pill tab bar exists with blur shell and animated indicator.
- Haptic feedback is triggered on tab press.
- Main visible tabs are six (`Today, Meals, Workouts, Progress, Water, Me`), with `plans` hidden from tab bar (`href: null`).
- Stack uses slide animations and gesture options.

**What is missing / bugs**
- Tab bar uses hardcoded light tint/colors and does not adapt to dark theme.
- Predictive back/shared element transitions are partial:
  - shared transitions are present in meal-food components,
  - but broader spec-level shared element/predictive-back coverage is not demonstrated across other key flows.

### 4) Home Screen

**What is correct**
- Personalized header, calorie ring card, quick actions, suggestion banner, adherence strip, meal timeline, and empty/skeleton states are present.

**What is missing / bugs**
- Edit/delete meal actions currently resolve to `Coming soon` alerts in Home, indicating incomplete action depth.
- No explicit confetti/celebration hook found for goal reach on Home.
- Meal cards and timeline visuals use hard-coded colors.

### 5) Meal Logging

**What is correct**
- Meals tab includes date strip, macro bar, collapsible meal sections, and food-detail navigation.
- Food search modal has debounce (~300ms timer), sections, empty state, and serving-size picker modal.
- Undo-like behavior exists for deletion via toast action.

**What is missing / bugs**
- Food search does not show translation-aware query flow in the modal implementation itself.
- Instant persistence path is mixed: local duplicated foods are immediate, but some flows are toast/UI-only placeholders.
- Add/edit flows still include placeholder behavior in places; complete “add meal bottom sheet + immediate list reconciliation” cannot be fully verified from static run.

### 6) Progress Screen

**What is correct**
- Period selector, weight chart (Skia), calorie history chart, macro ring, stats strip, and body measurements are wired.
- Weight chart supports pinch gesture and point selection tooltip behavior.

**What is missing / bugs**
- Heavy use of inline styles/literal values in chart components, reducing theme compliance.
- No runtime evidence collected for one-year dataset render time target (<400ms) or frame-drop behavior.

### 7) Water Screen

**What is correct**
- Screen includes animated fill visualization, quick-add, custom input, undo countdown, history list, reminder toggle, and empty state.

**What is missing / bugs**
- Reminder toggle is local state in screen; persistence/integration with reminder scheduler is not visible in this screen path.
- Multiple hard-coded colors remain.

### 8) Workout Screen

**What is correct**
- Weekly calendar strip, today workout card, tracker modal trigger, and completion toast are present.
- Weekly plan derived from DB schedules with reactive subscription.

**What is missing / bugs**
- Completion celebration appears toast-based; richer celebration effect coverage depends on modal internals and is not globally evident.
- Some branch states still route to “browse programs” placeholders.

### 9) Plans & Profile Screens

**What is correct**
- Plans has active hero, feature tabs, and template library structures.
- Profile has hero header, grouped settings, and edit profile route.
- Edit profile includes horizontal slot-picker style controls for weight/height.

**What is missing / bugs**
- Dark-mode adaptation is inconsistent due hardcoded colors in these surfaces.
- Several settings/actions are still “coming soon” alerts, indicating incomplete product depth.

### 10) Micro-interactions (haptics, toast, celebrations, long-press)

**What is correct**
- Central haptics utility exists and is used in multiple interactions.
- Global toast container/store is present.
- Long-press hooks exist in some components (e.g., food/template cards).

**What is missing / bugs**
- Not all critical interactions are guaranteed to trigger haptics consistently.
- Celebration effects are not uniformly implemented at all specified milestones.

### 11) Empty States & Skeletons

**What is correct**
- Reusable empty state component and multiple per-screen illustrations are present.
- Skeleton system includes shared shimmer provider and per-screen skeletons.

**What is missing / bugs**
- Some loading paths still use custom loading blocks instead of standardized skeleton states.

### 12) Error Handling

**What is correct**
- Screen/root error boundaries exist.
- Network error banner component exists with retry/dismiss behavior.
- API wrapper tests and logic indicate toast-aware error handling strategy.

**What is missing / bugs**
- Full forbidden-action matrix (authorization/role/blocking workflows) is not clearly represented across primary user paths.
- Existing tests for API wrapper currently fail, indicating mismatch between expected and actual behavior in edge cases.

## Performance Findings

> Important: true device instrumentation (Pixel 7 cold start, Flipper fps, memory after 30 min) was **not feasible** in this CLI-only environment. Findings below combine measured CLI signals and static risk analysis.

| Metric | Target | Measured / Assessed | Status | Notes |
|---|---:|---:|---|---|
| Cold start (launch→interactive) | <2s | Not directly measurable here | ⚠️ | Requires device/profiler run. Root init does sequential async work (storage + user + seeds) that may push startup depending on device state. |
| Tab switching fps | 60fps | Not directly measurable | ⚠️ | Animated tab indicator exists; many screens heavy with inline render trees may rerender on state updates. |
| Meal log to visibility | <300ms | Not directly measurable | ⚠️ | Local state updates appear immediate for some actions; DB/network-backed updates need instrumented trace. |
| Food search responsiveness | <600ms post-debounce | Debounce = 300ms + API latency | ⚠️ | Baseline implementation aligns conceptually, but no p95 measured. |
| Progress chart render (1 year) | <400ms | Not directly measurable | ⚠️ | Skia line generation is O(n) and reasonable; actual render cost depends on device/GPU/data volume. |
| Long-list scroll smoothness | 60fps | Not directly measurable | ⚠️ | FlashList used in key lists (positive), but nested non-virtualized structures still exist in places. |
| Memory after 30min | <280MB | Not measurable | ⚠️ | Requires runtime tooling + scenario script. |
| Main JS bundle gzipped | <2.5MB | Not measured (export failed) | ❌ | `expo export --platform android` failed at bundling due Babel/TS transform config conflict. |
| Animation smoothness/UI thread | UI-thread worklets | Partial | ⚠️ | Reanimated/Skia used, but not all animation paths were validated as worklet-safe with runtime traces. |

## Recommendations (Prioritized)

### P0 — Correctness & Release Safety
1. **Token compliance sweep:** replace hard-coded color/spacing/radius/elevation literals in shared components first (tab bar, cards, charts, settings rows, headers).
2. **Fix bundling pipeline:** resolve Babel transform ordering for Expo/TypeScript class fields (`expo-file-system` failure), then re-run export and capture bundle size.
3. **Repair failing tests:** stabilize `apiWrapper` retry/suppressErrors/timeout test behavior and ensure deterministic mocks.

### P1 — Product Completeness
4. **Close placeholders:** replace “coming soon” actions in Home/Profile/Plans with complete UX or explicit disabled states.
5. **Dark-mode parity pass:** run per-screen visual diff for light/dark and eliminate low-contrast or hardcoded light backgrounds.
6. **Interaction contract audit:** ensure required haptics/celebrations trigger exactly at spec moments (goal reach, workout completion, undo actions).

### P2 — Performance Engineering
7. **Startup budget instrumentation:** add launch markers around storage init, user hydration, seed execution; report p50/p95 on target devices.
8. **Render-cost optimization:** memoize heavy section trees and normalize callback identities for frequently updated screens.
9. **Profile critical journeys:** Flipper perf traces for tab switches, meal add flow, food search, and one-year chart interactions.
10. **Memory soak test:** automated 30-min navigation/logging loop in CI device farm and threshold alerts.

## Code Quality Observations

- Architecture shows good separation by domain (tabs/components/query/services), but style strategy is mixed (NativeWind utility classes + inline style literals + token hooks).
- Theme ownership is split between theme context and UI store; consolidate to a single source of truth.
- Some feature modules are mature (workout schedule derivation, chart components), while others still contain placeholder UX behavior.
- Test and lint debt is high in current branch and should be addressed before claiming conformance complete.

## Commands Executed

1. `rg -n "#[0-9a-fA-F]{3,8}" src --glob '!src/theme/design-tokens.ts' --glob '!src/theme/tailwind-tokens.js' | wc -l` → `662`
2. `npm run lint` → failed with large existing lint/prettier backlog.
3. `npm test -- --runInBand src/services/__tests__/apiWrapper.test.ts` → 4 failing tests.
4. `npx expo export --platform android --output-dir .audit-dist` → Android bundling failed (Babel/TS transform ordering error).
