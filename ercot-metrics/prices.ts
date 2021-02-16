// deno run --allow-net --allow-env examples/emit-metrics.ts

import DatadogApi from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
import { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";
const datadog = DatadogApi.fromEnvironment(Deno.env);

import {SubProcess} from "https://github.com/cloudydeno/deno-bitesized/raw/main/system/sub-process@v1.ts";

let day = 16;

async function grabUserMetrics(): Promise<MetricSubmission[]> {

  const body = await new SubProcess('fetch', {
    cmd: ['curl', '-s', `http://www.ercot.com/content/cdr/html/202102${day}_real_time_spp`],
    errorPrefix: /curl: /,
    stdin: 'null',
  }).captureAllTextOutput();

  const sections = body.split('</table>')[0].split('<tr>').slice(1).map(x => x.split(/[<>]/).filter((_, idx) => idx % 4 == 2));
  const header = sections[0]?.slice(2, -1) ??[];
  const last = sections[sections.length-1]?.slice(2, -1) ??[];

  const timestamp = sections[sections.length-1][1];
  if (timestamp === '2400') day++;
  console.log(new Date, timestamp, header[0], last[0]);

  return header.map((h, idx) => {
    return {
      metric_name: `ercot.pricing`,
      tags: [`ercot_region:${h}`],
      points: [{value: parseFloat(last[idx])}],
      interval: 60*15,
      metric_type: 'gauge',
    };
  });
}

// Run at the same time, each minute
import { fixedInterval } from "https://cloudydeno.github.io/deno-bitesized/logic/fixed-interval@v1.ts";
for await (const dutyCycle of fixedInterval(15 * 60 * 1000)) {
  try {

    const data = await grabUserMetrics();

    // Our own loop-health metric
    data.push({
      metric_name: `ercot.app.duty_cycle`,
      points: [{value: dutyCycle*100}],
      tags: [`app:ercot_pricing`],
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
