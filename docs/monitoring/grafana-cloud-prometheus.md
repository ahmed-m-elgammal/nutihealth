# Grafana Cloud + Prometheus Metrics

This project exposes Prometheus metrics at `GET /metrics`.

In production, this endpoint is restricted to internal/local network requests.  
Use an internal collector (Grafana Alloy / Prometheus agent) running in the same network as the backend.

## 1. Create Grafana Cloud (Free)

1. Sign up at Grafana Cloud and create a free stack.
2. Open your stack and navigate to **Connections > Prometheus**.
3. Choose the option to collect Prometheus metrics from your own service.

## 2. Run an Internal Scraper

Use Grafana Alloy (or Prometheus) inside the same network as the backend and scrape:

`http://127.0.0.1:3000/metrics`

or your internal service address.

## 3. Forward to Grafana Cloud

In your scraper config, set `remote_write` with the Grafana Cloud URL/credentials from the Prometheus connection screen.

## 4. Build Dashboards

Use these starter PromQL queries:

- Request rate per endpoint:
  `sum by (route, method) (rate(nutrihealth_http_requests_total[5m]))`
- Error rate per endpoint:
  `sum by (route, method) (rate(nutrihealth_http_request_errors_total[5m]))`
- P95 latency per endpoint:
  `histogram_quantile(0.95, sum by (le, route, method) (rate(nutrihealth_http_request_duration_ms_bucket[5m])))`
- Avg latency per endpoint:
  `sum by (route, method) (rate(nutrihealth_http_request_duration_ms_sum[5m])) / sum by (route, method) (rate(nutrihealth_http_request_duration_ms_count[5m]))`
