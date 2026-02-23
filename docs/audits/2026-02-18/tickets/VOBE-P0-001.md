# VOBE-P0-001 — Missing CI/CD and IaC artifacts

## Summary
Production readiness is blocked because repository-level CI/CD workflows and infrastructure-as-code artifacts are absent.

## Severity / Priority
- Severity: P0
- Priority rationale: No enforceable quality/security gates and no reproducible deployment mechanism.

## Evidence
- Repo/path/line: repository scan showed no `.github/workflows`, Dockerfiles, or IaC files.
- Command/log reference: `find . -maxdepth 3 -type f | rg -n "(Dockerfile|\.github/workflows|\.gitlab-ci|Jenkinsfile|terraform|\.tf$|k8s|helm|prometheus|grafana|datadog|ansible|cloudformation|docker-compose|compose\.ya?ml)"`.

## Reproduction steps
1. Clone repository.
2. Run the file scan command above.
3. Observe empty result for CI/CD + infra artifacts.

## Proposed fix (minimal)
- Add baseline PR pipeline (`lint`, `test`, `secret-scan`, `sca`) and release pipeline with artifact versioning.
- Introduce IaC starter module per environment (`dev`, `staging`, `prod`).

## Rollback plan
- Disable newly added workflows if false positives block releases; keep manual deployment as temporary fallback.

## Acceptance criteria
- [ ] CI workflow exists and runs on pull requests.
- [ ] Release workflow builds immutable versioned artifact.
- [ ] IaC plan validates in CI for at least one environment.

## Owner / ETA
- Owner: DevOps + Platform
- ETA: 2–3 weeks
