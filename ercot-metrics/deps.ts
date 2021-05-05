export { default as DatadogApi } from "https://deno.land/x/datadog_api@v0.1.3/mod.ts";
export type { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.3/v1/metrics.ts";

export { fixedInterval } from "https://crux.land/4MC9JG#fixed-interval@v1";

export { Sha256 } from "https://deno.land/std@0.95.0/hash/sha256.ts";

export { runMetricsServer } from "https://deno.land/x/observability@v0.1.0/sinks/openmetrics/server.ts";
export { replaceGlobalFetch, fetch } from "https://deno.land/x/observability@v0.1.0/sources/fetch.ts";
