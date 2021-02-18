// deno run --allow-net --allow-env examples/emit-metrics.ts

import { runMetricsLoop, MetricSubmission,headers } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 10, 'ercot_eea');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await fetch(`http://127.0.0.1:5102/content/alerts/conservation_state.js`, headers('application/javascript')).then(x => x.text());

  const line = body.split(/\r?\n/).find(x => x.startsWith('eeaLevel = '));
  if (!line) {
    console.log(new Date, 'Unknown');
    return [];
  }

  const level = parseInt(line.split('=')[1].trim());
  console.log(new Date, 'EEA Level', level);

  return [{
    metric_name: `ercot.eea_level`,
    points: [{value: level}],
    interval: 60*10,
    metric_type: 'gauge',
  }];
}
