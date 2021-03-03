export { default as DatadogApi } from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
export type { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";

export { fixedInterval } from "https://cloudydeno.github.io/deno-bitesized/logic/fixed-interval@v1.ts";

export { Sha256 } from "https://deno.land/std@0.87.0/hash/sha256.ts";

export {
  runMetricsServer,
} from "https://raw.githubusercontent.com/cloudydeno/deno-openmetrics_exporter/49ce410657ae5cbd9f647acf1233656933a936aa/mod.ts";
export {
  replaceGlobalFetch,
  fetch,
} from "https://raw.githubusercontent.com/cloudydeno/deno-openmetrics_exporter/49ce410657ae5cbd9f647acf1233656933a936aa/lib/instrumented/fetch.ts";
