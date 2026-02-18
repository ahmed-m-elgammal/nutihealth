# VOBE-P1-004 — Root .env tracked in git

## Summary
Repository currently tracks `.env`, increasing risk of accidental secret exposure.

## Severity / Priority
- Severity: P1
- Priority rationale: Secret leakage risk and policy non-compliance.

## Evidence
- Repo/path/line: `.env` tracked in repository.
- Command/log reference: `git ls-files .env .env.example backend/.env.example` includes `.env`.

## Reproduction steps
1. Run `git ls-files .env`.
2. Confirm `.env` appears in tracked files.
3. Inspect file and confirm environment config lives in tracked file.

## Proposed fix (minimal)
- Remove `.env` from index (`git rm --cached .env`), keep `.env.example` templates.
- Add secret scanning and pre-commit checks.

## Rollback plan
- Restore developer onboarding by documenting `cp .env.example .env` and local setup.

## Acceptance criteria
- [ ] `.env` is no longer tracked.
- [ ] CI fails if `.env` or credential-like tokens are committed.
- [ ] Secrets rotation process documented if prior leak exists.

## Owner / ETA
- Owner: Security + Maintainers
- ETA: 1–2 days
