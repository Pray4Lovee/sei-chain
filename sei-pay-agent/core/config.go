package core

import "os"

type Config struct {
	Adapter             string
	ChainID             int64
	MaxTPS              int
	StressMode          bool
	StressBurst         int
	AuthorizedActors    []string
	EnforceRequesterOwn bool
}

func LoadConfig() Config {
	adapter := os.Getenv("PAY_AGENT_ADAPTER")
	if adapter == "" {
		adapter = "cli"
	}
	actors := []string{"6665377131", "cli"}
	return Config{
		Adapter:             adapter,
		ChainID:             1329,
		MaxTPS:              10,
		StressMode:          os.Getenv("PAY_AGENT_STRESS") == "1",
		StressBurst:         5,
		AuthorizedActors:    actors,
		EnforceRequesterOwn: true,
	}
}
