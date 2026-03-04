package runtime

import "testing"

func TestNewRuntimeWiring(t *testing.T) {
	t.Parallel()
	rt := New()

	if rt.SystemKernel == "" || rt.PoolGuardian == "" || rt.OriginResolver == "" || rt.SignalMesh == "" || rt.SoulSync == "" || rt.GenZK402 == "" {
		t.Fatalf("runtime contains empty module wiring: %+v", rt)
	}

	if rt.SystemKernel != "sei-system-kernel" || rt.GenZK402 != "dap-genzk402" {
		t.Fatalf("runtime wiring unexpectedly changed: %+v", rt)
	}
}
