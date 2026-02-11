package soulsync

import "fmt"

// CaptureEntropyFingerprint stores entropy-locked mutation metadata.
func CaptureEntropyFingerprint(account string) string {
	return fmt.Sprintf("mutation:%s", account)
}
