package genzk402

import "testing"

func TestStoreCommitment(t *testing.T) {
	t.Parallel()
	if got, want := StoreCommitment("sei1commit"), "commitment:sei1commit"; got != want {
		t.Fatalf("StoreCommitment() = %q, want %q", got, want)
	}
}
