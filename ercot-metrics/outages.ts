// deno run --allow-net --allow-env examples/emit-metrics.ts
// launch this script 2m30s after the 15-minute mark for most-timely data

import { Sha256 } from "https://deno.land/std@0.87.0/hash/sha256.ts";
let lastHash = '';

import { runMetricsLoop, MetricSubmission } from "./_lib.ts";
await runMetricsLoop(grabUserMetrics, 10, 'poweroutages_us');

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const bodyText = await fetch(`https://poweroutage.us/api/web/counties?key=18561563181588&countryid=us&statename=Texas`, {
    headers: {
      'accept': 'application/json',
      'User-Agent': 'curl/7.64.1',
    },
  }).then(resp => resp.text());

  const hash = new Sha256().update(bodyText).hex();
  if (hash === lastHash) {
    console.log(new Date, hash);
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

  console.log(new Date, hash, body.WebCountyRecord[0].CountyName, body.WebCountyRecord[0].OutageCount);
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
