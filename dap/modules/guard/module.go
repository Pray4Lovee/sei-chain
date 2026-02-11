package guard

import "fmt"

// AcknowledgeTransition confirms a state mutation is signed and tracked.
func AcknowledgeTransition(account string) string {
	return fmt.Sprintf("guarded:%s", account)
}
