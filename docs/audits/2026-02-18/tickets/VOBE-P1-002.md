# VOBE-P1-002 — Frontend tests fail at initialization

## Summary
All frontend test suites fail before test execution due to a `jest-expo` initialization error.

## Severity / Priority
- Severity: P1
- Priority rationale: No reliable automated regression signal for application behavior.

## Evidence
- Repo/path/line: `jest.setup.js`.
- Command/log reference: `npm test -- --coverage --runInBand` -> `TypeError: Object.defineProperty called on non-object` from `node_modules/jest-expo/src/preset/setup.js`.

## Reproduction steps
1. Install dependencies with `npm ci`.
2. Run `npm test -- --coverage --runInBand`.
3. Observe 9/9 failed suites before assertions run.

## Proposed fix (minimal)
- Align versions between Jest, `jest-expo`, Expo SDK, and RN runtime.
- Replace brittle setup mocks with framework-supported presets.

## Rollback plan
- Revert Jest config/setup changes if runtime regression occurs; keep patched branch for isolated debug.

## Acceptance criteria
- [ ] All suites execute (no initialization crash).
- [ ] Coverage report generated from executed tests.
- [ ] CI enforces test pass for PR merge.

## Owner / ETA
- Owner: Frontend + QA
- ETA: 3–5 days
