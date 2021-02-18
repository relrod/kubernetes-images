// Dumb HTTP proxy to 'fix' Set-Cookie headers from ERCOT
// Deno follows the latest HTTP/1.1 RFC which disallows newlines in headers

import { BufReader } from "https://deno.land/std@0.87.0/io/bufio.ts";

const target: Deno.ConnectOptions = {
  hostname: 'www.ercot.com',
  port: 80,
};

const listener = Deno.listen({
  hostname: '127.0.0.1',
  port: 5102,
});
const addr = listener.addr as Deno.NetAddr;
console.log(`Listening on http://${addr.hostname}:${addr.port}`);
for await (const conn of listener) {
  proxyConn(conn, target);
}

async function proxyConn(conn: Deno.Conn, target: Deno.ConnectOptions) {
  let upstream: Deno.Conn | null = null;
  // console.log(new Date, 'conn opened');

  try {
    upstream = await Deno.connect(target);
    console.log(new Date, 'upstream connected');

    const promises = [
      proxyRequest(conn, upstream),
      proxyResponse(upstream, conn),
    ];
    for (const p of promises) {
      p.catch(err => {});
    }
    await Promise.all(promises);

  } finally {
    console.log(new Date, 'cleaning up conn');

    try {
      conn.close();
    } catch (err) {
      console.log('cleanup 1 err', err.message);
    }

    try {
      upstream?.close();
    } catch (err) {
      console.log('cleanup 2 err', err.message);
    }

    console.log();
  }
}

async function proxyRequest(from: Deno.Conn, to: Deno.Conn) {
  const connReader = new BufReader(from);
  let line: string | null;
  while ((line = await connReader.readString('\n')) !== null) {
    if (line.match(/^host: /i)) {
      line = `Host: ${target.hostname}\r\n`;
    } else if (line.match(/^accept-encoding: /i)) {
      continue;
    }
    to.write(new TextEncoder().encode(line));
    // if (line.trimEnd().endsWith(' HTTP/1.1')) {
      console.log(new Date, '>>', line.trimEnd());
    // }
  }
  console.log(new Date, 'request read EOF');
}

async function proxyResponse(from: Deno.Conn, to: Deno.Conn) {
  const connReader = new BufReader(from);
  let line: string | null;
  let cookieCache: string | null = null;
  while ((line = await connReader.readString('\n')) !== null) {
    if (cookieCache) {
      cookieCache = null;
      continue;
    } else if (line.startsWith('Set-Cookie: ')) {
      if (!line.includes('path=')) {
        cookieCache = line.trimEnd();
      }
      continue;
    }
    // if (!line.endsWith("\r\n")) {
    //   line = line.trimEnd()+"\r\n";
    // }
    to.write(new TextEncoder().encode(line));
    // if (line.startsWith('HTTP/1.1 ')) {
      console.log(new Date, '<<', line.trimEnd());
    // }
  }
  console.log(new Date, 'response read EOF');
}
