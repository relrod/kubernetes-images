# build relevant binaries from source
FROM golang:1 AS build-go
WORKDIR /src
ADD . /src/
RUN go install .

# pack into minimal image
FROM gcr.io/distroless/base
COPY --from=build-go /go/bin/ercot-proxy /bin/
CMD ["/bin/ercot-proxy"]
