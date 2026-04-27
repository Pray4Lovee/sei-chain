package zk

import "crypto/sha256"

// GenerateReceiptHash returns a deterministic 32-byte receipt hash from
// extrinsic payload + pre-state + post-state. This is a local placeholder
// for future Halo2/Risc0 proof materialization.
func GenerateReceiptHash(extrinsic, preState, postState []byte) [32]byte {
	payload := make([]byte, 0, len(extrinsic)+len(preState)+len(postState))
	payload = append(payload, extrinsic...)
	payload = append(payload, preState...)
	payload = append(payload, postState...)
	return sha256.Sum256(payload)
}
