export * from "./deps.ts";
import {
  DatadogApi,
  MetricSubmission,
  fixedInterval,
} from "./deps.ts";

const datadog = DatadogApi.fromEnvironment(Deno.env);

export function headers(accept = 'text/html') {
  return {
    headers: {
      'Accept': accept,
      'User-Agent': `Deno/${Deno.version} (+https://p.datadoghq.com/sb/5c2fc00be-393be929c9c55c3b80b557d08c30787a)`,
    },
  };
}

export async function runMetricsLoop(
  gather: () => Promise<MetricSubmission[]>,
  intervalMinutes: number,
  loopName: string,
) {
  for await (const dutyCycle of fixedInterval(intervalMinutes * 60 * 1000)) {
    try {

      const data = await gather();

      // Our own loop-health metric
      data.push({
        metric_name: `ercot.app.duty_cycle`,
        points: [{value: dutyCycle*100}],
        tags: [`app:${loopName}`],
        interval: 60,
        metric_type: 'gauge',
      });

      // Submit all metrics
      try {
        await datadog.v1Metrics.submit(data);
      } catch (err) {
        console.log(new Date().toISOString(), 'eh', err.message);
        await datadog.v1Metrics.submit(data);
      }

    } catch (err) {
      console.log(new Date().toISOString(), '!!', err.message);
    }
  }
};
