package proof

import (
	"bytes"
	"testing"
)

func TestGenerateConcatenatesSegments(t *testing.T) {
	t.Parallel()
	extrinsic := []byte("tx")
	pre := []byte("pre")
	post := []byte("post")

	r := Generate(extrinsic, pre, post)
	if got, want := string(r.Journal), "txprepost"; got != want {
		t.Fatalf("Generate() journal = %q, want %q", got, want)
	}

	r.Journal[0] = 'X'
	if bytes.Equal(extrinsic, r.Journal[:len(extrinsic)]) {
		t.Fatal("journal unexpectedly aliases extrinsic input")
	}
}
