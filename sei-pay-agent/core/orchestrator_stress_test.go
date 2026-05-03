package core_test

import (
	"fmt"
	"sync"
	"testing"

	core "github.com/sei-protocol/sei-chain/sei-pay-agent/core"
	"github.com/sei-protocol/sei-chain/sei-pay-agent/storage"
)

type countingExecutor struct {
	mu    sync.Mutex
	count int
}

func (c *countingExecutor) ExecuteTransaction(to string, amount float64) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.count++
	return fmt.Sprintf("0x%064x", c.count), nil
}

func TestOrchestratorStressConcurrency(t *testing.T) {
	db := storage.NewDatabase()
	identity := core.NewIdentityResolver(db)
	intents := core.NewIntentEngine(db)
	audit := core.NewAuditLog(db)
	exec := &countingExecutor{}
	orch := core.NewPaymentOrchestrator("test", identity, intents, audit, core.NewRateLimiter(10000), exec, false, 1, true)

	_, _, err := orch.Bind("actor1", "alice", "0x000000000000000000000000000000000000dEaD")
	if err != nil {
		t.Fatalf("bind: %v", err)
	}

	const workers = 100
	var wg sync.WaitGroup
	wg.Add(workers)

	for i := 0; i < workers; i++ {
		go func() {
			defer wg.Done()
			intent, err := orch.CreateIntent("actor1", "@alice", 1)
			if err != nil {
				t.Errorf("create: %v", err)
				return
			}
			if _, err := orch.ConfirmIntent("actor1", intent.IntentID); err != nil {
				t.Errorf("confirm: %v", err)
			}
		}()
	}
	wg.Wait()

	if db.AuditCount() < workers*2+1 {
		t.Fatalf("expected many audit rows, got %d", db.AuditCount())
	}
}

func TestStressModeBurst(t *testing.T) {
	db := storage.NewDatabase()
	identity := core.NewIdentityResolver(db)
	intents := core.NewIntentEngine(db)
	audit := core.NewAuditLog(db)
	exec := &countingExecutor{}
	orch := core.NewPaymentOrchestrator("test", identity, intents, audit, core.NewRateLimiter(10000), exec, true, 7, true)

	_, _, _ = orch.Bind("actor1", "alice", "0x000000000000000000000000000000000000dEaD")
	intent, err := orch.CreateIntent("actor1", "@alice", 2.5)
	if err != nil {
		t.Fatalf("create intent: %v", err)
	}

	if _, err := orch.ConfirmIntent("actor1", intent.IntentID); err != nil {
		t.Fatalf("confirm intent: %v", err)
	}
	if exec.count != 7 {
		t.Fatalf("expected 7 tx sends in stress mode, got %d", exec.count)
	}
}
