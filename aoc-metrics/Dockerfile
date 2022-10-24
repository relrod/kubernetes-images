FROM denoland/deno:alpine-1.16.4
WORKDIR /src/app

ADD deps.ts ./
RUN ["deno", "cache", "deps.ts"]

ADD *.ts ./
RUN ["deno", "cache", "mod.ts"]

ENTRYPOINT ["deno", "run", "--allow-net", "--allow-hrtime", "--allow-env", "--cached-only", "--no-check", "mod.ts"]
