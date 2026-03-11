# State Authority Document

This document defines the source of truth for state in NutriHealth.

## 1) WatermelonDB (offline domain data authority)

WatermelonDB owns all user health and profile data that must be available offline:

- meals
- foods / custom foods
- workouts / exercise sets / templates
- weight logs
- water logs and water targets
- user profile and nutrition targets
- diet plans persisted for local usage

If a UI view needs durable health data, it should read from WatermelonDB models (prefer reactive observation).

## 2) TanStack Query (remote authority)

TanStack Query owns remote-only data that does **not** need full offline persistence:

- server diet templates/presets
- sync status endpoints and remote diagnostics
- future doctor-assigned plans fetched from backend services

Query caches are network-facing and should not be treated as durable local records.

## 3) Zustand (UI/session authority)

Zustand owns app UI state and session metadata only:

- toast visibility/messages and UI affordances
- sync indicator state shown in UI
- theme/preferences that are view-state concerns
- current Supabase session identity/token (for auth/routing/session-aware requests)

Zustand should **not** duplicate WatermelonDB profile entities.

## Routing/Auth Contract

- Auth state is derived from Supabase session state (session user id/token), not the WatermelonDB `users` row.
- `_layout.tsx` routing guard must use session presence as the authentication signal.
- WatermelonDB `users` remains the profile/onboarding data source (e.g., onboarding completion), not auth identity.

## Migration Decisions Included

- Removed `user: User | null` from `useUserStore`.
- Removed deprecated `updateUserTargets()` from `useUserStore`.
- Components requiring profile data should use WatermelonDB-reactive access (`useCurrentUser` / observable queries).
