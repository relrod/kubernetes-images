// deno run --allow-net --allow-env examples/emit-metrics.ts

import { Sha256 } from "https://deno.land/std@0.87.0/hash/sha256.ts";
let lastHash = '';

import { runMetricsLoop, MetricSubmission, headers } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 10, 'poweroutages_us');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const bodyText = await fetch(`https://poweroutage.us/api/web/counties?key=18561563181588&countryid=us&statename=Texas`, headers('application/json')).then(resp => resp.text());

  const hash = new Sha256().update(bodyText).hex().slice(0, 12);
  if (hash === lastHash) {
    console.log(new Date, 'Outages', hash);
    return [];
  }
  lastHash = hash;

  const body = JSON.parse(bodyText) as {
    WebCountyRecord: {
      CountyName: string;
      OutageCount: number;
      CustomerCount: number;
    }[];
  };

  console.log(new Date, 'Outages', hash, body.WebCountyRecord[0].CountyName, body.WebCountyRecord[0].OutageCount);
  return body.WebCountyRecord.flatMap(x => [{
    metric_name: `poweroutageus.outages`,
    tags: [
      `county_name:${x.CountyName}`,
      `county_state:Texas`,
    ],
    points: [{value: x.OutageCount}],
    interval: 60,
    metric_type: 'gauge',
  }, {
    metric_name: `poweroutageus.customers`,
    tags: [
      `county_name:${x.CountyName}`,
      `county_state:Texas`,
    ],
    points: [{value: x.CustomerCount}],
    interval: 60,
    metric_type: 'gauge',
  }]);
}
