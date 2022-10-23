// deno run --allow-net --allow-env examples/emit-metrics.ts

import { runMetricsLoop, MetricSubmission, headers, fetch } from "./_lib.ts";
export async function start() {
  await waitForNextPrices();
  await runMetricsLoop(grabUserMetrics, 15, 'ercot_pricing');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await fetch(`http://127.0.0.1:5102/content/cdr/html/real_time_spp`, headers('text/html')).then(x => x.text());

  const sections = body.split('</table>')[0].split('<tr>').slice(1).map(x => x.split(/[<>]/).filter((_, idx) => idx % 4 == 2));
  const header = sections[0]?.slice(2, -1) ??[];
  const last = sections[sections.length-1]?.slice(2, -1) ??[];

  const timestamp = sections[sections.length-1][1];
  console.log(new Date, 'Prices', timestamp, header[0], last[0]);

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

// launches this script 2m30s after the 15-minute mark for most-timely data
async function waitForNextPrices() {
  const startDate = new Date();
  while (startDate.getMinutes() % 15 !== 2) {
    startDate.setMinutes(startDate.getMinutes()+1);
  }
  startDate.setSeconds(30);
  startDate.setMilliseconds(0);

  const waitMillis = startDate.valueOf() - Date.now();
  if (waitMillis > 0) {
    console.log(`Waiting ${waitMillis/1000/60}min for next pricing cycle`);
    await new Promise(ok => setTimeout(ok, waitMillis));
  }
}
