package e2e

import (
	"crypto/sha256"
	"fmt"
	"sync"
	"sync/atomic"
	"testing"

	"github.com/sei-protocol/sei-chain/dap/modules/genzk402"
	"github.com/sei-protocol/sei-chain/dap/modules/guard"
	"github.com/sei-protocol/sei-chain/dap/modules/origin"
	"github.com/sei-protocol/sei-chain/dap/modules/signal"
	"github.com/sei-protocol/sei-chain/dap/modules/soulsync"
	"github.com/sei-protocol/sei-chain/dap/node"
	"github.com/sei-protocol/sei-chain/dap/runtime"
	"github.com/sei-protocol/sei-chain/dap/verifier"
	"github.com/sei-protocol/sei-chain/dap/zk/proof"
)

func TestSovereignRuntimeE2EFlow(t *testing.T) {
	t.Parallel()
	rt := runtime.New()
	if rt.GenZK402 == "" || rt.PoolGuardian == "" || rt.OriginResolver == "" {
		t.Fatalf("runtime is not fully wired: %+v", rt)
	}

	cfg := node.Config{Chain: "local", DevMode: true}
	if got := cfg.ChainSpec(); got != "sei-local-dev" {
		t.Fatalf("unexpected chain spec: %s", got)
	}

	receipt := executeFlow("sei1sovereign", 0)
	expected := sha256.Sum256(receipt.Journal)
	if !verifier.VerifyReceipt(receipt.Journal, expected) {
		t.Fatal("receipt verification failed")
	}
}

func TestSovereignThroughputBatchFlow(t *testing.T) {
	t.Parallel()

	const total = 20000
	const workers = 64

	jobs := make(chan int, workers)
	var okCount int64
	var failCount int64

	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range jobs {
				receipt := executeFlow(fmt.Sprintf("sei1agent%05d", i), i)
				expected := sha256.Sum256(receipt.Journal)
				if verifier.VerifyReceipt(receipt.Journal, expected) {
					atomic.AddInt64(&okCount, 1)
				} else {
					atomic.AddInt64(&failCount, 1)
				}

				if len(receipt.Journal) > 0 {
					tampered := append([]byte{}, receipt.Journal...)
					tampered[len(tampered)-1] ^= 0x01
					if verifier.VerifyReceipt(tampered, expected) {
						atomic.AddInt64(&failCount, 1)
					}
				}
			}
		}()
	}

	for i := 0; i < total; i++ {
		jobs <- i
	}
	close(jobs)
	wg.Wait()

	if okCount != total || failCount != 0 {
		t.Fatalf("verified=%d failed=%d total=%d", okCount, failCount, total)
	}
}

func executeFlow(account string, nonce int) proof.Receipt {
	guarded := guard.AcknowledgeTransition(account)
	proven := origin.VerifyIdentity(account)
	signaled := signal.EmitMetadataSignal(account)
	mutated := soulsync.CaptureEntropyFingerprint(account)
	commitment := genzk402.StoreCommitment(account)

	return proof.Generate(
		[]byte(fmt.Sprintf("tx:%d", nonce)),
		[]byte(guarded+"|"+proven),
		[]byte(signaled+"|"+mutated+"|"+commitment),
	)
}
