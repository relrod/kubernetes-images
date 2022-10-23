// deno run --allow-net --allow-env examples/emit-metrics.ts

const knownTexts = new Map<string,string>();

// https://www.faa.gov/air_traffic/weather/asos/?state=TX
// https://en.wikipedia.org/wiki/List_of_power_stations_in_Texas#Wind_farms
const ids = [
  'KABI', // Abilene (near Roscoe Wind Farm)
  'KAUS',
  'KDFW',
  'KEFD', // Houston/Ellington Ar
  'KGLS', // Galveston/Scholes In
  'KHOU', // Houston/Hobby Arpt
  'KIAH',
  'KLBX', // Angleton/Texas Gulf
  'KLRD', // Laredo (nearish Javelina Wind Energy Center)
  'KLVJ', // Houston/Pearland Rgn
  'KMAF',
  'KSAT',
  'KSGR', // Houston/Sugar Land R
  'KTKI',
];

import { runMetricsLoop, MetricSubmission, headers, fetch } from "./_lib.ts";
export async function start() {
  await runMetricsLoop(grabUserMetrics, 30, 'metar');
}
if (import.meta.main) start();

async function grabUserMetrics(): Promise<MetricSubmission[]> {
  const body = await fetch(`https://www.aviationweather.gov/metar/data?ids=${ids.join('%2C')}&format=decoded`, headers('text/html')).then(resp => resp.text());

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
  console.log(new Date, 'METAR', (stations[0] ?? [])[0]?.tags);
  return stations.flat();
}
