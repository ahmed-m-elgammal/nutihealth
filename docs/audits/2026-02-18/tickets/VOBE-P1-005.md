# VOBE-P1-005 — SSRF hardening gap in recipe import

## Summary
Recipe import endpoint validates URL syntax but does not block internal/private-network egress after hostname resolution.

## Severity / Priority
- Severity: P1
- Priority rationale: Potential lateral movement / internal service access via crafted URLs.

## Evidence
- Repo/path/line: `backend/routes/recipeImport.js` lines `7-44`.
- Command/log reference: Manual code path review shows protocol-only validation then downstream fetch invocation.

## Reproduction steps
1. Start backend locally.
2. Submit `/api/recipes/import` URL payload targeting internal-resolving host in staging-safe environment.
3. Observe request is accepted at validation layer (expected behavior should reject internal destinations).

## Proposed fix (minimal)
- Resolve DNS and reject RFC1918, loopback, link-local, and metadata service IP ranges.
- Optional domain allowlist for supported recipe providers.

## Rollback plan
- Wrap new egress guard behind feature flag if legitimate domains are blocked unexpectedly.

## Acceptance criteria
- [ ] Internal/private network targets are blocked with explicit error code.
- [ ] Unit/integration tests cover blocked and allowed URL cases.
- [ ] Security review signs off on SSRF test matrix.

## Owner / ETA
- Owner: Backend + Security
- ETA: 3–5 days
