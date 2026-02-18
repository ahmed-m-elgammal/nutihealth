# VOBE-P1-003 — Lint gate debt

## Summary
Lint check currently reports >2k issues, preventing lint from serving as an actionable quality gate.

## Severity / Priority
- Severity: P1
- Priority rationale: High chance of hidden defects and low signal-to-noise in review automation.

## Evidence
- Repo/path/line: broad codebase impact.
- Command/log reference: `npm run lint` -> `2306 problems (2165 errors, 141 warnings)`.

## Reproduction steps
1. Run `npm ci`.
2. Run `npm run lint`.
3. Observe very high failure count across many files.

## Proposed fix (minimal)
- Introduce incremental lint policy (`fail-on-new-issues`) and remediate by module.
- Auto-fix formatting-only violations first (`eslint --fix`).

## Rollback plan
- If broad formatting changes destabilize UI snapshots, revert module-level batches.

## Acceptance criteria
- [ ] Lint baseline reduced by at least 70%.
- [ ] CI blocks only new lint violations during transition.
- [ ] Final state returns to full blocking lint gate.

## Owner / ETA
- Owner: Frontend + Backend Leads
- ETA: 2–4 weeks
