package signal

import "testing"

func TestEmitMetadataSignal(t *testing.T) {
	t.Parallel()
	if got, want := EmitMetadataSignal("sei1signal"), "signal:sei1signal"; got != want {
		t.Fatalf("EmitMetadataSignal() = %q, want %q", got, want)
	}
}
