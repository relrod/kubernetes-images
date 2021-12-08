export { default as DatadogApi } from "https://deno.land/x/datadog_api@v0.2.0/mod.ts";
export type { MetricSubmission } from "https://deno.land/x/datadog_api@v0.2.0/v1/metrics.ts";

export { fixedInterval } from "https://crux.land/4MC9JG#fixed-interval@v1";

export { runMetricsServer } from "https://deno.land/x/observability@v0.1.2/sinks/openmetrics/server.ts";
export { replaceGlobalFetch, fetch } from "https://deno.land/x/observability@v0.1.2/sources/fetch.ts";
