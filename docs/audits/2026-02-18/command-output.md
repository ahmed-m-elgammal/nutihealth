# Audit command outputs (abridged)

## Repo health / churn
```bash
git log --since=90.days --pretty=format:"%an %ar %s" | head
```
- Recent activity is high and merge-heavy, indicating active churn.

```bash
git log --since=90.days --name-only --pretty=format: | rg -v '^$' | sort | uniq -c | sort -nr | head -n 20
```
- Churn hotspots include `src/query/queries/useProgress.ts`, `src/app/_layout.tsx`, and progress/profile screens.

## TODO/FIXME/secret pattern scan
```bash
rg -n "TODO|FIXME|XXX|SECRET|API_KEY|PASSWORD|TOKEN" .
```
- Found environment-key references in backend server and auth/nutrition modules.

## Install / build baseline
```bash
npm ci
(cd backend && npm ci)
```
- Completed successfully.

## Static quality checks
```bash
npm run lint
```
- Failed with **2306** issues (2165 errors, 141 warnings).

## Tests / coverage
```bash
npm test -- --coverage --runInBand
```
- Failed: 9/9 suites, `TypeError: Object.defineProperty called on non-object` from `jest-expo` preset setup.

```bash
cd backend && npm test
```
- Backend reports: `No backend tests configured`.

## Dependency audit (SCA)
```bash
npm audit --json
(cd backend && npm audit --json)
```
- Blocked by registry policy: `403 Forbidden - .../security/advisories/bulk`.

## Dependency freshness
```bash
npm outdated --json || true
(cd backend && npm outdated --json || true)
```
- Multiple frontend major-version drifts; backend has `dotenv` update available.

## Complexity scan
```bash
npx eslint src backend --ext .js,.ts,.tsx --no-eslintrc --parser @typescript-eslint/parser --parser-options '{"ecmaVersion":2022,"sourceType":"module","ecmaFeatures":{"jsx":true}}' --rule 'complexity:[1,12]' -f json > /tmp/complexity.json || true
```
- 32 complexity violations above threshold, max observed = 32.

## Infra/CI artifact presence check
```bash
find . -maxdepth 3 -type f | rg -n "(Dockerfile|\.github/workflows|\.gitlab-ci|Jenkinsfile|terraform|\.tf$|k8s|helm|prometheus|grafana|datadog|ansible|cloudformation|docker-compose|compose\.ya?ml)"
```
- No matching infrastructure/deployment files found.
