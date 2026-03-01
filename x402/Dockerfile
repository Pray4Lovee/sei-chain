FROM golang:1.24.5-alpine AS builder
WORKDIR /app
COPY . .
RUN go build -mod=vendor -trimpath -ldflags="-s -w" -o x402d ./cmd/x402d

FROM alpine:3.20
RUN adduser -D x402
USER x402
WORKDIR /home/x402
COPY --from=builder /app/x402d .
ENTRYPOINT ["./x402d"]
