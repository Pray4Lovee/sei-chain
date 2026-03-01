module github.com/sei-protocol/sei-chain/x402

go 1.24.5

require (
	github.com/ethereum/go-ethereum v1.16.1
	github.com/gorilla/mux v1.8.0
	github.com/mattn/go-sqlite3 v1.14.14
	github.com/prometheus/client_golang v1.23.0
	github.com/rs/zerolog v1.30.0
)

replace github.com/ethereum/go-ethereum => github.com/sei-protocol/go-ethereum v1.15.7-sei-7.0.20250929182230-93350978bb7c
