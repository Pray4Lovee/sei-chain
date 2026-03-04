package verifier

import (
	"crypto/sha256"
	"testing"
)

func TestVerifyReceipt(t *testing.T) {
	t.Parallel()
	journal := []byte("receipt-journal")
	expected := sha256.Sum256(journal)
	if !VerifyReceipt(journal, expected) {
		t.Fatal("VerifyReceipt() should accept matching hash")
	}

	tampered := append([]byte{}, journal...)
	tampered[0] ^= 0xFF
	if VerifyReceipt(tampered, expected) {
		t.Fatal("VerifyReceipt() should reject tampered journal")
	}
}
