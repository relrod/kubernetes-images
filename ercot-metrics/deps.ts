export { default as DatadogApi } from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
export type { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";

export { fixedInterval } from "https://cloudydeno.github.io/deno-bitesized/logic/fixed-interval@v1.ts";

export { Sha256 } from "https://deno.land/std@0.87.0/hash/sha256.ts";

export {
  runMetricsServer,
} from "https://raw.githubusercontent.com/cloudydeno/deno-openmetrics_exporter/9425a42bd92595e75fb45034df70d8eff61aa10d/mod.ts";
export {
  replaceGlobalFetch,
  fetch,
} from "https://raw.githubusercontent.com/cloudydeno/deno-openmetrics_exporter/9425a42bd92595e75fb45034df70d8eff61aa10d/lib/instrumented/fetch.ts";
