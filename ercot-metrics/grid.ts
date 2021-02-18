// deno run --allow-net --allow-env examples/emit-metrics.ts

import { runMetricsLoop, MetricSubmission, headers } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 1, 'ercot_realtime');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await fetch('http://127.0.0.1:5102/content/cdr/html/real_time_system_conditions.html', headers('text/html')).then(x => x.text());

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

  console.log(new Date, 'grid', metrics[0]?.points[0]?.value);

  return metrics;
}
