// deno run --allow-net --allow-env examples/emit-metrics.ts

import DatadogApi from "https://deno.land/x/datadog_api@v0.1.2/mod.ts";
import { MetricSubmission } from "https://deno.land/x/datadog_api@v0.1.2/v1/metrics.ts";
const datadog = DatadogApi.fromEnvironment(Deno.env);

const knownTexts = new Map<string,string>();

async function grabUserMetrics(): Promise<MetricSubmission[]> {

  const ids = [
    'KAUS',
    'KDFW',
    'KIAH',
    'KMAF',
    'KSAT',
    'KTKI',
  ];

  const body = await fetch(`https://www.aviationweather.gov/metar/data?ids=${ids.join('%2C')}&format=decoded`, {
    headers: {
      'accept': 'text/html',
      'User-Agent': 'curl/7.64.1',
    },
  }).then(resp => resp.text());

  const sections = body.split(/<!-- Data (?:starts|ends) here -->/)[1].split(`METAR for:</span></td><td>`).slice(1);

  const stations = new Array<MetricSubmission[]>();
  for (const sect of sections) {
    const title = sect.slice(0, sect.indexOf('<'));
    const code = title.split(' ')[0];
    const name = title.split(/[\(\)]/)[1].replace(/[ ,]+/g, '_');
    const metrics = new Array<MetricSubmission>();
    let text = '';
    for (const row of sect.match(/>[^<]+<\/span><\/td><td[^>]*>[^<]+<\/td>/g) ?? []) {
      const cells = row.split(/[<>]/);
      const metric = cells[1].split(/[:(]/)[0].toLowerCase().trim();
      const value = cells[7].trim();
      // console.log([code, name, cells[1].slice(0, -1), cells[7]]);

      if (metric === 'text') {
        text = value;
      }

      if ([
        'temperature',
        'dewpoint',
        'pressure',
      ].includes(metric)) {
        metrics.push({
          metric_name: `metar.${metric}`,
          tags: [
            `metar_code:${code}`,
            `metar_location:${name}`,
          ],
          points: [{value: parseFloat(value)}],
          interval: 60,
          metric_type: 'gauge',
        });
      }

      if (metric === 'winds' && value.includes('MPH')) {
        const [speed, gusts] = value.match(/([0-9.]+) MPH/g) ?? [];
        if (speed) metrics.push({
          metric_name: `metar.winds.speed`,
          tags: [
            `metar_code:${code}`,
            `metar_location:${name}`,
          ],
          points: [{value: parseFloat(speed)}],
          interval: 60,
          metric_type: 'gauge',
        });
        if (gusts) metrics.push({
          metric_name: `metar.winds.gusts`,
          tags: [
            `metar_code:${code}`,
            `metar_location:${name}`,
          ],
          points: [{value: parseFloat(gusts)}],
          interval: 60,
          metric_type: 'gauge',
        });
      }
    }

    // console.log(code, text, knownTexts.get(code), metrics.length);
    if (!text) continue;
    if (knownTexts.get(code) === text) continue;
    stations.push(metrics);
    knownTexts.set(code, text);
  }
  console.log(new Date, (stations[0] ?? [])[0]);
  return stations.flat();
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
