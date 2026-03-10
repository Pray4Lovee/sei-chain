package adapters

import (
	"flag"
	"fmt"

	core "github.com/sei-protocol/sei-chain/sei-pay-agent/core"
)

func RunCLI(orchestrator *core.PaymentOrchestrator) error {
	command := flag.String("command", "", "bind|pay|confirm")
	actor := flag.String("actor", "cli", "actor id")
	username := flag.String("username", "", "username")
	address := flag.String("address", "", "address")
	target := flag.String("target", "", "@username or 0x...")
	amount := flag.Float64("amount", 0, "amount")
	intentID := flag.String("intent", "", "intent id")
	flag.Parse()

	switch *command {
	case "bind":
		u, a, err := orchestrator.Bind(*actor, *username, *address)
		if err != nil {
			return err
		}
		fmt.Printf("bound @%s -> %s\n", u, a)
	case "pay":
		intent, err := orchestrator.CreateIntent(*actor, *target, *amount)
		if err != nil {
			return err
		}
		fmt.Printf("intent %s created\n", intent.IntentID)
	case "confirm":
		hash, err := orchestrator.ConfirmIntent(*actor, *intentID)
		if err != nil {
			return err
		}
		fmt.Printf("executed tx %s\n", hash)
	default:
		return fmt.Errorf("unsupported command")
	}
	return nil
}
