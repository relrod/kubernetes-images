import { start as startStats } from "./stats.ts";

import {
  runMetricsServer, replaceGlobalFetch,
} from './deps.ts';
if (Deno.args.includes('--serve-metrics')) {
  replaceGlobalFetch();
  runMetricsServer({ port: 9090 });
  console.log("Now serving OpenMetrics @ :9090/metrics");
}

if (import.meta.main) {
  await Promise.race([
    startStats(),
  ]);
}
