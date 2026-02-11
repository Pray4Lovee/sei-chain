package genzk402

import "fmt"

// StoreCommitment records a sealed zk commitment in the DAP layer.
func StoreCommitment(account string) string {
	return fmt.Sprintf("commitment:%s", account)
}
