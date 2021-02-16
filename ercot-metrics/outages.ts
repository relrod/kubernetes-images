// deno run --allow-net --allow-env examples/emit-metrics.ts
// launch this script 2m30s after the 15-minute mark for most-timely data

import DatadogApi from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
import { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";
const datadog = DatadogApi.fromEnvironment(Deno.env);

import { Sha256 } from "https://deno.land/std@0.87.0/hash/sha256.ts";
let lastHash = '';

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

// Run at the same time, each minute
import { fixedInterval } from "https://cloudydeno.github.io/deno-bitesized/logic/fixed-interval@v1.ts";
for await (const dutyCycle of fixedInterval(10 * 60 * 1000)) {
  try {

    const data = await grabUserMetrics();

    // Our own loop-health metric
    data.push({
      metric_name: `ercot.app.duty_cycle`,
      points: [{value: dutyCycle*100}],
      tags: [`app:metar`],
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
