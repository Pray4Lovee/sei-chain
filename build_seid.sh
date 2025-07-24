#!/bin/bash
# 🛠️ Build the seid binary manually

echo "👉 Cleaning Go module cache..."
go clean -modcache

echo "👉 Tidying modules..."
go mod tidy

echo "👉 Building seid binary..."
go build -o seid ./cmd/seid

echo "✅ Done! You can now run ./seid"
