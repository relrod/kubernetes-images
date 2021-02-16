// deno run --allow-net --allow-env examples/emit-metrics.ts

import { curlUrl, runMetricsLoop, MetricSubmission } from "./_lib.ts";
await runMetricsLoop(grabUserMetrics, 10, 'ercot_eea');

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await curlUrl(`http://www.ercot.com/content/alerts/conservation_state.js`);

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
