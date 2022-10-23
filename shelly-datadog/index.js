import ShellyIot from 'shelly-iot';
import { hostname } from 'node:os';
import { client as Datadog, v1 as DatadogV1 } from '@datadog/datadog-api-client';

const shelly = new ShellyIot({});
shelly.listen(() => console.log('Listening'));

const latestViewpoints = new Map();

shelly.on('update-device-status', (deviceId, status) => {
  // Deduplicate retransissions
  const latestViewpoint = latestViewpoints.get(deviceId);
  const viewpoint = JSON.stringify(status);
  if (latestViewpoint == viewpoint) {
    console.log(new Date(), 'duplicate status from', deviceId);
    return;
  }
  latestViewpoints.set(deviceId, viewpoint);

  // Handle particular device types
  const [deviceType, deviceSerial, _] = deviceId.split('#');
  if (deviceType == 'SHHT-1') {
    // https://shelly-api-docs.shelly.cloud/gen1/#shelly-h-amp-t
    const fields = new Map(status.G.map(x => [x[1], x[2]]));
    const payload = {
      temperature_c: fields.get(3101),
      temperature_f: fields.get(3102),
      humidity: fields.get(3103),
      sensor_error: fields.get(3115),
      battery_level: fields.get(3111),
      triggers: fields.get(9102), // ["button"]
      config_changed: fields.get(9103),
    };
    reportPayload(deviceSerial, payload);
    console.log(new Date(), deviceSerial, payload);
  } else console.log('Unknown device', deviceId);
});

async function reportPayload(deviceSerial, payload) {
  const host = hostname();
  const tags = [`shelly_id:${deviceSerial}`];
  if (deviceSerial == '701364') {
    tags.push(`sensor_name:living room`);
    tags.push(`sensor_location:living room`);
  }
  if (deviceSerial == '7013A6') {
    tags.push(`sensor_name:balcony`);
    tags.push(`sensor_location:outside`);
    // tags.push(`sensor_name:bedroom`);
    // tags.push(`sensor_location:bedroom`);
  }

  const series = new Array(); // <DatadogV1.Series>
  const now = Math.floor(Date.now() / 1000);

  for (const item of Object.entries(payload)) {
    if (typeof item[1] == 'number') {
      series.push({
        host, tags,
        metric: 'shelly.'+item[0],
        points: [[now, item[1]]],
        type: 'gauge',
      });
    } else if (Array.isArray(item[1])) {
      series.push({
        host,
        tags: [ ...tags,
          ...item[1].map(x => `sensor_${item[0]}:${x}`),
        ],
        metric: 'shelly.'+item[0],
        points: [[now, 1]],
        type: 'gauge',
      });
    }
  }

  const configuration = Datadog.createConfiguration();
  await new DatadogV1.MetricsApi(configuration).submitMetrics({
    body: { series },
  });
}

// make sure the api key is set up
const configuration = Datadog.createConfiguration();
await new DatadogV1.MetricsApi(configuration).submitMetrics({
  body: { series: [] },
});
