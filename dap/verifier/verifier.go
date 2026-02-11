package verifier

import "crypto/sha256"

// VerifyReceipt checks whether the receipt journal matches the expected hash.
func VerifyReceipt(journal []byte, expected [32]byte) bool {
	actual := sha256.Sum256(journal)
	return actual == expected
}
