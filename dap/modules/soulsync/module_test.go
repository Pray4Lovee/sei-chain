package soulsync

import "testing"

func TestCaptureEntropyFingerprint(t *testing.T) {
	t.Parallel()
	if got, want := CaptureEntropyFingerprint("sei1soul"), "mutation:sei1soul"; got != want {
		t.Fatalf("CaptureEntropyFingerprint() = %q, want %q", got, want)
	}
}
