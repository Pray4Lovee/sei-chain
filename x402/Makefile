BINARY=x402d

.PHONY: bootstrap build test run

bootstrap:
	./scripts/bootstrap_modules.sh

build:
	go build -mod=vendor -o $(BINARY) ./cmd/x402d

test:
	go test ./...

run:
	go run ./cmd/x402d
