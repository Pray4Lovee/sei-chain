package node

import (
	"bytes"
	"io"
	"os"
	"strings"
	"testing"
)

func TestBootPrintsRuntimePlan(t *testing.T) {
	cfg := Config{
		Chain:        "local",
		DevMode:      true,
		Execution:    "autobahn",
		RPCAllowCORS: "*",
		NodeName:     "dap-dev",
		BasePath:     "/tmp/dap",
		P2PPort:      26656,
		WSPort:       8546,
		Validator:    true,
	}

	stdout := os.Stdout
	r, w, err := os.Pipe()
	if err != nil {
		t.Fatalf("pipe create failed: %v", err)
	}
	os.Stdout = w

	bootErr := Boot(cfg)
	_ = w.Close()
	os.Stdout = stdout

	if bootErr != nil {
		t.Fatalf("Boot() returned unexpected error: %v", bootErr)
	}

	var b bytes.Buffer
	if _, err := io.Copy(&b, r); err != nil {
		t.Fatalf("failed reading boot output: %v", err)
	}
	out := b.String()

	for _, expected := range []string{
		"sei-local-dev",
		"execution: autobahn",
		"rpc cors: *",
		"node name: dap-dev",
		"✅ Sei DAP services wired (scaffold)",
	} {
		if !strings.Contains(out, expected) {
			t.Fatalf("Boot() output missing %q\noutput:\n%s", expected, out)
		}
	}
}
