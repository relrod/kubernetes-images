// deno run --allow-net --allow-env examples/emit-metrics.ts

import { curlUrl, runMetricsLoop, MetricSubmission } from "./_lib.ts";
await runMetricsLoop(grabUserMetrics, 15, 'ercot_pricing');

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await curlUrl(`http://www.ercot.com/content/cdr/html/real_time_spp`);

  const sections = body.split('</table>')[0].split('<tr>').slice(1).map(x => x.split(/[<>]/).filter((_, idx) => idx % 4 == 2));
  const header = sections[0]?.slice(2, -1) ??[];
  const last = sections[sections.length-1]?.slice(2, -1) ??[];

  const timestamp = sections[sections.length-1][1];
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
