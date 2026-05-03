package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	RPCURL               string
	WSURL                string
	SettlementPrivateKey string
	SettlementContract   string
	PayoutContract       string
	ListenAddr           string
	DBPath               string
	ChainID              int64
	Confirmations        uint64
	PollInterval         time.Duration
	SignerInterval       time.Duration
	ConfirmerInterval    time.Duration
	GasTipCapGwei        int64
	MaxFeeCapWei         int64
}

func Load() (Config, error) {
	cfg := Config{
		RPCURL:               getenv("RPC_URL", "http://127.0.0.1:8545"),
		WSURL:                getenv("WS_URL", "ws://127.0.0.1:8546"),
		SettlementPrivateKey: os.Getenv("SETTLEMENT_PRIVATE_KEY"),
		SettlementContract:   os.Getenv("SETTLEMENT_CONTRACT"),
		PayoutContract:       os.Getenv("PAYOUT_CONTRACT"),
		ListenAddr:           getenv("LISTEN_ADDR", ":8080"),
		DBPath:               getenv("DB_PATH", "x402.db"),
		ChainID:              getenvInt64("CHAIN_ID", 1329),
		Confirmations:        uint64(getenvInt64("CONFIRMATIONS", 3)),
		PollInterval:         getenvDuration("POLL_INTERVAL", 3*time.Second),
		SignerInterval:       getenvDuration("SIGNER_INTERVAL", time.Second),
		ConfirmerInterval:    getenvDuration("CONFIRMER_INTERVAL", 3*time.Second),
		GasTipCapGwei:        getenvInt64("GAS_TIP_CAP_GWEI", 2),
		MaxFeeCapWei:         getenvInt64("MAX_FEE_CAP_WEI", 100_000_000_000),
	}
	if cfg.SettlementPrivateKey == "" {
		return Config{}, fmt.Errorf("SETTLEMENT_PRIVATE_KEY is required")
	}
	if cfg.SettlementContract == "" {
		return Config{}, fmt.Errorf("SETTLEMENT_CONTRACT is required")
	}
	if cfg.PayoutContract == "" {
		return Config{}, fmt.Errorf("PAYOUT_CONTRACT is required")
	}
	return cfg, nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt64(key string, fallback int64) int64 {
	if v := os.Getenv(key); v != "" {
		parsed, err := strconv.ParseInt(v, 10, 64)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func getenvDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		parsed, err := time.ParseDuration(v)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
