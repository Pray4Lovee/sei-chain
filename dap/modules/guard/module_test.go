package guard

import "testing"

func TestAcknowledgeTransition(t *testing.T) {
	t.Parallel()
	for _, acct := range []string{"sei1abc", "", "sei1✨"} {
		acct := acct
		t.Run(acct, func(t *testing.T) {
			t.Parallel()
			got := AcknowledgeTransition(acct)
			want := "guarded:" + acct
			if got != want {
				t.Fatalf("AcknowledgeTransition(%q) = %q, want %q", acct, got, want)
			}
		})
	}
}
