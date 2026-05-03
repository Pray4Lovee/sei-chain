package core_test

import (
	"sync"
	"testing"

	core "github.com/sei-protocol/sei-chain/sei-pay-agent/core"
)

type fixedNonceProvider struct{}

func (f fixedNonceProvider) CurrentNonce(address string) (uint64, error) { return 42, nil }

func TestNonceManagerConcurrent(t *testing.T) {
	nm := core.NewNonceManager(fixedNonceProvider{}, "0xaddr")
	const n = 200
	vals := make(chan uint64, n)
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			v, err := nm.Next()
			if err != nil {
				t.Errorf("next nonce: %v", err)
				return
			}
			vals <- v
		}()
	}
	wg.Wait()
	close(vals)

	seen := make(map[uint64]bool, n)
	for v := range vals {
		if seen[v] {
			t.Fatalf("duplicate nonce %d", v)
		}
		seen[v] = true
	}
	if len(seen) != n {
		t.Fatalf("expected %d nonces, got %d", n, len(seen))
	}
}
