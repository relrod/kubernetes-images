// deno run --allow-net --allow-env examples/emit-metrics.ts

import DatadogApi from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
import { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";
const datadog = DatadogApi.fromEnvironment(Deno.env);

import {SubProcess} from "https://github.com/cloudydeno/deno-bitesized/raw/main/system/sub-process@v1.ts";

async function grabUserMetrics(): Promise<MetricSubmission[]> {

  const body = await new SubProcess('fetch', {
    cmd: ['curl', '-s', 'http://www.ercot.com/content/cdr/html/real_time_system_conditions.html'],
    errorPrefix: /curl: /,
    stdin: 'null',
  }).captureAllTextOutput();

  const sections = body.split('an="2">').slice(1);

  const metrics = new Array<MetricSubmission>();
  for (const section of sections) {
    const label = section.slice(0, section.indexOf('<'));
    const boxes = section.match(/    <td class="tdLeft">[^<]+<\/td>\r\n    <td class="labelClassCenter">[^<]+<\/td>/g) ?? [];
    for (const box of boxes) {
      const parts = box.split(/[<>]/);
      // console.log(label, parts[2], parts[6]);
      if (label === 'DC Tie Flows') {
        metrics.push({
          metric_name: `ercot.${label}`.replace(/[ -]+/g, '_'),
          tags: [`ercot_dc_tie:${parts[2].split('(')[0].trim()}`],
          points: [{value: parseFloat(parts[6])}],
          interval: 60,
          metric_type: 'gauge',
        });
      } else {
        metrics.push({
          metric_name: `ercot.${label}.${parts[2].split('(')[0].trim()}`.replace(/[ -]+/g, '_'),
          points: [{value: parseFloat(parts[6])}],
          interval: 60,
          metric_type: 'gauge',
        });
      }
    }
  }

  console.log(new Date, metrics[0]?.points[0]?.value);

  return metrics;
}

// Run at the same time, each minute
import { fixedInterval } from "https://cloudydeno.github.io/deno-bitesized/logic/fixed-interval@v1.ts";
for await (const dutyCycle of fixedInterval(60 * 1000)) {
  try {

    const data = await grabUserMetrics();

    // Our own loop-health metric
    data.push({
      metric_name: `ercot.app.duty_cycle`,
      points: [{value: dutyCycle*100}],
      tags: [`app:ercot_realtime`],
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
