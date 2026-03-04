package origin

import "testing"

func TestVerifyIdentity(t *testing.T) {
	t.Parallel()
	if got, want := VerifyIdentity("sei1origin"), "proven:sei1origin"; got != want {
		t.Fatalf("VerifyIdentity() = %q, want %q", got, want)
	}
}
