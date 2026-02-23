# Vobe / NutriHealth Comprehensive Technical Audit

**Date:** 2026-02-18  
**Auditors:** Principal Architect + Backend + Frontend + DevOps + Security + QA + Data + Maintainer panel (simulated hands-on review)  
**Repositories in scope that were actually available:** single monorepo at `/workspace/nutihealth` with Expo frontend + Node backend.  

## 1) Executive health snapshot

### Weighted scoring rubric (0–100)

Weights:
- Architecture: 20%
- Code Quality: 20%
- Security: 20%
- DevOps Maturity: 15%
- Observability & SLOs: 10%
- Reliability & Testing: 15%

Scores:
- Architecture: **6.5 / 10**
- Code Quality: **3.5 / 10**
- Security: **4.5 / 10**
- DevOps Maturity: **2.0 / 10**
- Observability & SLOs: **1.5 / 10**
- Reliability & Testing: **2.5 / 10**

Calculation:
- (6.5×20) + (3.5×20) + (4.5×20) + (2.0×15) + (1.5×10) + (2.5×15)
- = 130 + 70 + 90 + 30 + 15 + 37.5 = **372.5 / 1000 = 37.25 / 100**

## Overall health score: **37 / 100 (High operational risk)**

### One-page health summary
- App architecture is coherent (frontend/backend split, explicit services and DB models), but operational scaffolding is incomplete for production scale.
- CI/CD, infrastructure-as-code, deployment templates, and runtime observability artifacts were not present in the repository.
- Linting debt is severe (2,306 findings), and test harness is currently broken for all frontend suites.
- Security posture is mixed: some good controls (helmet, input checks, rate-limits) but critical gaps remain (repository-tracked `.env`, SSRF hardening gaps in recipe URL import pipeline, no documented secret scanning in CI).

---

## 2) Prioritized issue list (P0 → P3)

| ID | Priority | Title | Evidence | Repro / Failure | Minimal patch direction | Effort | Rollback |
|---|---|---|---|---|---|---|---|
| VOBE-P0-001 | P0 | Missing CI/CD + IaC + deployment artifacts | No `.github/workflows`, Dockerfiles, Terraform/CloudFormation/Ansible manifests found via file scan. | `find . -maxdepth 3 -type f | rg ...` returns no infra files. | Add baseline pipeline + release workflow + infra repo/module structure. | L | Revert pipeline files and keep manual deploy path. |
| VOBE-P1-002 | P1 | Frontend test harness broken | Jest fails 9/9 suites with `Object.defineProperty called on non-object`. | `npm test -- --coverage --runInBand` | Pin compatible `jest-expo` / React Native preset and repair setup mocks. | M | Revert jest config changes and isolate to canary branch. |
| VOBE-P1-003 | P1 | Lint quality gate non-functional due massive violations | 2,306 lint findings (2,165 errors). | `npm run lint` | Stage lint remediation per module + enforce incremental CI budget. | L | Revert auto-format commit in case of UI regression. |
| VOBE-P1-004 | P1 | Repository tracks root `.env` file | `.env` is in git index. | `git ls-files .env` | Remove tracked `.env`, add policy guard, rotate any leaked secrets if present. | S | Restore from `.env.example` if local dev blocked. |
| VOBE-P1-005 | P1 | SSRF guardrails incomplete in recipe import endpoint | URL parser accepts any http(s) URL; no private-IP/domain denylist resolution checks before fetch. | POST `/api/recipes/import` with internal hostnames possible if resolver permits. | Enforce DNS/IP resolution checks and block RFC1918/link-local/metadata ranges. | M | Feature-flag SSRF guard and allowlist trusted domains if needed. |
| VOBE-P2-006 | P2 | Authentication disabled (offline mode), no production auth integration | Auth service returns `OFFLINE_MODE` for login/signup/refresh flows. | Inspect auth service behavior. | Integrate proper backend auth, token refresh, revocation, and RBAC checks. | L | Toggle back to offline mode feature flag. |
| VOBE-P2-007 | P2 | Backend has no automated tests | Backend `npm test` is placeholder echo only. | `cd backend && npm test` | Add API contract tests for `/api/chat`, `/api/analyze-food`, `/api/weather`, `/api/recipes/import`. | M | Keep smoke-only tests until full suite stable. |
| VOBE-P2-008 | P2 | Complexity hotspots in core flows | Multiple functions above complexity threshold; highest observed 32. | ESLint complexity scan output. | Split orchestrator functions into service helpers + schema validators. | M | Keep old functions behind adapters during phased rollout. |
| VOBE-P2-009 | P2 | No explicit observability signals (metrics/traces/SLO) | Backend exposes endpoints but no metrics middleware or tracing hooks. | Code inspection of `backend/server.js` | Add structured logging + request IDs + Prometheus endpoint + alerting baselines. | M | Disable metrics endpoint behind env toggle if overhead. |
| VOBE-P3-010 | P3 | Dependency freshness debt | Many major-version deltas in frontend dependencies. | `npm outdated --json` | Plan controlled upgrade waves (toolchain, runtime, UI, libs). | M | Freeze to known-good lockfile on regressions. |

### Detailed notes and exact references
- **P1-004** tracked env file: root `.env` is tracked and includes runtime endpoint configuration (`EXPO_PUBLIC_API_URL`).  
- **P1-005** recipe import validates URL syntax/protocol only and then forwards URL to parser service without internal-network deny checks.  
- **P2-006** auth flows hard-return `OFFLINE_MODE`; production auth is not active.  
- **P2-009** backend has security middleware and rate limiting, but no metrics/SLO hooks.

---

## 3) Code hotspots report

### Cyclomatic complexity hotspots (threshold 12)
Top offenders from ESLint complexity pass:
1. `src/services/api/weeklyGoals.ts` (complexity 32)
2. `src/app/(modals)/create-weekly-plan.tsx` (31)
3. `src/database/models/User.ts` (26)
4. `src/app/(modals)/ai-food-detect.tsx` (21)
5. `src/components/workout/ExerciseCard.tsx` (20)
6. `src/app/(modals)/browse-programs.tsx` (17)
7. `src/app/(tabs)/index.tsx` (16)
8. `src/components/RecipeImport/RecipePreviewCard.tsx` (16)
9. `backend/server.js` weather handler (15)
10. `backend/services/recipeParserService.js` `mergeRecipeData` (15)

### Churn hotspots (90 days)
Most frequently changed files:
- `src/query/queries/useProgress.ts` (7)
- `src/i18n/locales/en.json` (7)
- `src/i18n/locales/ar.json` (7)
- `src/app/_layout.tsx` (7)
- `src/app/(tabs)/progress.tsx` (7)

### Stale modules & potential vulnerability exposure
- No successful `npm audit` due registry method restriction (403), so vulnerability enumeration is **blocked**.
- Dependency staleness indicates elevated latent CVE risk until SCA can run in CI environment with valid advisory access.

---

## 4) CI/CD & infrastructure report

### Findings
- No CI workflow definitions detected in repo (GitHub/GitLab/Jenkins).
- No container build artifacts (Dockerfile/compose) found.
- No IaC artifacts found (Terraform, CloudFormation, ARM/Bicep, Ansible).
- No immutable artifact promotion chain or deploy gates detectable from repository evidence.

### Risk
- Releases cannot be proven reproducible.
- Security checks (SAST/SCA/secret scans) are not enforceable as mandatory gates.

### Recommendation
1. Introduce trunk pipeline with: lint, typecheck, test, SCA, secret-scan.
2. Introduce release pipeline with signed immutable artifacts and environment promotions.
3. Move deploy strategy to canary/blue-green with automated rollback hooks.

---

## 5) Security findings

### Confirmed findings (safe evidence)
1. **Tracked environment file in git** (P1).  
   Evidence: `.env` appears in tracked files list.
2. **SSRF hardening gap in recipe import path** (P1).  
   Evidence: URL normalization accepts public protocol but no private address denylist before parsing/fetch.
3. **Missing centralized security automation evidence** (P0/P1 support finding).  
   No gitleaks/git-secrets/CodeQL wiring found in repo.

### Secret management posture
- Backend has `.env.example` documenting secrets placeholders, which is good baseline.
- Need mandatory secret scanning and commit hooks.
- If historical leaks existed, run history purge workflow (BFG or `git filter-repo`) and rotate credentials.

### Safe PoC approach (non-exploit)
- For SSRF, test with controlled internal-resolving hostnames in a staging-only environment and verify server rejects them with dedicated error code (no data retrieval attempted).

---

## 6) Test & reliability report

### Current state
- Frontend: **0 passing suites** currently due preset/setup incompatibility.
- Backend: no tests configured.
- Coverage generated is effectively zero because test suites did not execute.

### Suggested test matrix
- Unit: service functions (`dietPlan`, parser helpers, API wrappers).
- Integration: backend route contracts with mocked upstreams.
- E2E: auth/onboarding, meal logging, recipe import, progress dashboards.
- Reliability: retry/backoff tests, offline queue replay tests, rate-limit behavior.

### Flaky/failing test references
- All 9 frontend suites fail identically at `jest-expo` setup initialization path.

---

## 7) Observability & incident playbook gaps

Gaps:
- No request correlation IDs in backend response/log context.
- No metrics endpoint for latency/error/saturation.
- No alert definitions / SLO targets in repo.
- No documented incident runbooks or rollback playbooks.

Minimum incident-readiness baseline:
1. Add structured logger with `request_id`, `route`, `status`, `duration_ms`.
2. Add RED metrics and alert thresholds.
3. Document on-call runbook for AI upstream outages and degraded mode handling.

---

## 8) 30/90/180-day roadmap

### 0–30 days (Stabilize)
- Owner: Tech Lead + QA Lead + Security
- Goals:
  - Fix Jest harness and recover minimum 60% unit-test pass baseline.
  - Establish CI with blocking lint/test/secret scan gates.
  - Remove tracked `.env` and enforce pre-commit secret checks.
- KPIs: CI pass rate > 90%, 0 tracked secret files, < 500 lint errors.

### 31–90 days (Harden)
- Owner: Backend Lead + DevOps
- Goals:
  - Implement SSRF protections and endpoint schema validation standard.
  - Add backend API tests and contract checks.
  - Introduce containerization + vulnerability scan stage.
- KPIs: backend coverage > 65%, P0/P1 security findings closed.

### 91–180 days (Scale)
- Owner: Platform + Data + SRE
- Goals:
  - Build IaC-managed environments and immutable promotion.
  - Add full observability stack with SLO dashboards.
  - Reduce top-10 complexity hotspots by 40%.
- KPIs: MTTR < 30 min, SLO alert precision > 80%, complexity budget enforced in CI.

---

## 9) Top 10 minimal patch/PR snippets (high-impact)

> These are intentionally small diffs; apply in dedicated PRs.

1. Add SSRF private-network block in `backend/routes/recipeImport.js` (DNS resolve + CIDR denylist).
2. Add `request-id` middleware in `backend/server.js` and include in error responses.
3. Add `GET /healthz` and `GET /metrics` endpoints.
4. Add Jest preset compatibility pin and stable test setup mocks.
5. Add `.gitignore` hard rule for `.env` and remove tracked file from index.
6. Add GitHub Actions workflow for lint/test/security checks.
7. Add backend route integration tests (supertest + nock).
8. Extract weather endpoint validator into dedicated schema module (zod/joi).
9. Split `weeklyGoals` service giant function into pure strategy functions.
10. Add CODEOWNERS + branch protection policy docs.

---

## Blocked-by (required for full enterprise audit completion)

The following requested audit scope items were **not available** in this environment and block full completion:
- Access to all repos (mobile/infra/shared libs/other branches beyond local `work`).
- CI/CD run logs/history and pipeline metadata.
- Container registry access and image manifests.
- Cloud account readonly inventory / IaC state files.
- Monitoring dashboards + alert rule configs.
- Prior pentest / SAST / SCA reports.
- Deployment playbooks and rollback scripts.

