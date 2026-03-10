package main

import (
	"fmt"
	"os"

	"github.com/sei-protocol/sei-chain/sei-pay-agent/adapters"
	core "github.com/sei-protocol/sei-chain/sei-pay-agent/core"
	"github.com/sei-protocol/sei-chain/sei-pay-agent/storage"
)

func main() {
	cfg := core.LoadConfig()
	db := storage.NewDatabase()
	identity := core.NewIdentityResolver(db)
	intents := core.NewIntentEngine(db)
	audit := core.NewAuditLog(db)
	limiter := core.NewRateLimiter(cfg.MaxTPS)
	executor := core.NewDeterministicExecutor(cfg.ChainID)
	orchestrator := core.NewPaymentOrchestrator(
		cfg.Adapter,
		identity,
		intents,
		audit,
		limiter,
		executor,
		cfg.StressMode,
		cfg.StressBurst,
		cfg.EnforceRequesterOwn,
	)

	gate := core.NewPolicyGate(cfg.AuthorizedActors)
	actor := os.Getenv("PAY_AGENT_ACTOR")
	if actor == "" {
		actor = "cli"
	}
	if err := gate.AssertAuthorized(actor); err != nil {
		panic(err)
	}

	var err error
	switch cfg.Adapter {
	case "cli":
		err = adapters.RunCLI(orchestrator)
	case "telegram":
		err = adapters.RunTelegram()
	case "discord":
		err = adapters.RunDiscord()
	default:
		err = fmt.Errorf("unknown adapter: %s", cfg.Adapter)
	}
	if err != nil {
		panic(err)
	}
}
