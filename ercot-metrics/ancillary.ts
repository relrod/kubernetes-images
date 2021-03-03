// deno run --allow-net --allow-env examples/emit-metrics.ts

import { runMetricsLoop, MetricSubmission, headers, fetch } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 5, 'ercot_ancillary');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await fetch('http://127.0.0.1:5102/content/cdr/html/as_capacity_monitor.html', headers('text/html')).then(x => x.text());

  const sections = body.split('an="2">').slice(1);
  const metrics = new Array<MetricSubmission>();
  for (const section of sections) {
    const label = section.slice(0, section.indexOf('<'));
    const boxes = section.match(/    <td class="tdLeft">[^<]+<\/td>\r\n    <td class="labelClassCenter">[^<]+<\/td>/g) ?? [];
    for (const box of boxes) {
      const parts = box.split(/[<>]/);
      const field = parts[2]
        .replace(/Controllable Load Resource/g, 'CLR')
        .replace(/Load Resource/g, 'LR')
        .replace(/Generation Resource/g, 'GR')
        .replace(/Energy Offer Curve/g, 'EOC')
        .replace(/Output Schedule/g, 'OS')
        .replace(/Base Point/g, 'BP')
        .replace(/Resource Status/g, 'RS')
        .replace(/ \(energy consumption\)/g, '')
        .replace(/telemetered/g, 'TMd')
        .replace(/Fast Frequency Response/g, 'FFR')
        .replace(/available to decrease/g, 'to decr')
        .replace(/available to increase/g, 'to incr')
        .replace(/in the next 5 minutes/g, 'in 5min')
        .replace(/Physical Responsive Capability \(PRC\)/g, 'PRC')
        .replace(/^Real-Time /, '')
        .replace(/[ ()-]+/g, ' ').trim().replace(/ /g, '_');
      // console.log(label, field, parts[6]);
      metrics.push({
        metric_name: `ercot_ancillary.${field}`,
        points: [{value: parseFloat(parts[6].replace(/,/g, ''))}],
        interval: 60,
        metric_type: 'gauge',
      });
    }
  }

  console.log(new Date, 'ancillary', metrics
    .find(x => x.metric_name.endsWith('PRC'))
    ?.points[0]?.value);

  return metrics;
}
