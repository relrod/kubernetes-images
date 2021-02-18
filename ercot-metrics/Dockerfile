#FROM hayd/alpine-deno:1.6.1
FROM danopia/deno-experiments:per_op_metrics
WORKDIR /src/app

ADD deps.ts ./
RUN ["deno", "cache", "deps.ts"]

ADD *.ts ./
RUN ["deno", "cache", "mod.ts"]

ENTRYPOINT ["deno", "run", "--unstable", "--allow-net", "--allow-hrtime", "--allow-env", "--cached-only", "--no-check", "mod.ts"]
