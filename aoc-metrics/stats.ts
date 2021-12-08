// deno run --allow-net --allow-env examples/emit-metrics.ts

import { runMetricsLoop, MetricSubmission, headers, fetch } from "./_lib.ts";
function sleep(mins: number) { return new Promise(ok => setTimeout(ok, mins * 60 * 1000)); }

export async function start() {
  await Promise.race([
    runMetricsLoop(() => grabYearMetrics(2021), 5, 'aoc_stats'),
    sleep( 2).then(() => runMetricsLoop(() => grabYearMetrics(2020), 30, 'aoc_stats')),
    sleep( 7).then(() => runMetricsLoop(() => grabYearMetrics(2019), 30, 'aoc_stats')),
    sleep(12).then(() => runMetricsLoop(() => grabYearMetrics(2018), 30, 'aoc_stats')),
    sleep(17).then(() => runMetricsLoop(() => grabYearMetrics(2017), 30, 'aoc_stats')),
    sleep(22).then(() => runMetricsLoop(() => grabYearMetrics(2016), 30, 'aoc_stats')),
    sleep(27).then(() => runMetricsLoop(() => grabYearMetrics(2015), 30, 'aoc_stats')),
  ]);
}
if (import.meta.main) start();

async function grabYearMetrics(year: number): Promise<MetricSubmission[]> {
  const body = await fetch(`https://adventofcode.com/${year}/stats`, headers('text/html')).then(x => x.text());

  const matches = Array.from(body.matchAll(
    /> ?(?<day>\d?\d) *<span class="stats-both"> *(?<full>\d+)<\/span> *<span class="stats-firstonly"> *(?<partial>\d+)<\/span>/g
  )).map(x => x.groups as {day: string, full: string, partial: string})
    .filter(x => x.partial != '0');

  const metrics = matches.flatMap<MetricSubmission>((match, idx) => {
    const tags = [`aoc_year:${year}`, `aoc_day:${match.day}`];
    if (idx == 0 && year === new Date().getFullYear()) {
      tags.push(`aoc_current_day`);
    }

    const full = parseInt(match.full);
    const partial = parseInt(match.partial);
    return [{
      metric_name: `adventofcode.stars`,
      tags: [...tags, 'aoc_part:1', 'aoc_partial:yes'],
      points: [{value: partial}],
      interval: 300,
      metric_type: 'gauge',
    },{
      metric_name: `adventofcode.stars`,
      tags: [...tags, 'aoc_part:1', 'aoc_partial:no'],
      points: [{value: full}],
      interval: 300,
      metric_type: 'gauge',
    },{
      metric_name: `adventofcode.stars`,
      tags: [...tags, 'aoc_part:2'],
      points: [{value: full}],
      interval: 300,
      metric_type: 'gauge',
    }];
  });

  const topDay = matches[0];
  console.log(new Date, year, 'day', topDay?.day, topDay?.partial, topDay?.full);

  return metrics;
}
