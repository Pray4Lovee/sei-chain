package signal

import "fmt"

// EmitMetadataSignal broadcasts governance metadata for synchronization.
func EmitMetadataSignal(account string) string {
	return fmt.Sprintf("signal:%s", account)
}
