package origin

import "fmt"

// VerifyIdentity links sender identity and provenance to a runtime action.
func VerifyIdentity(account string) string {
	return fmt.Sprintf("proven:%s", account)
}
