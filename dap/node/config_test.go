package node

import "testing"

func TestConfigChainSpec(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		cfg  Config
		want string
	}{
		{name: "dev mode", cfg: Config{Chain: "local", DevMode: true}, want: "sei-local-dev"},
		{name: "live mode", cfg: Config{Chain: "mainnet", DevMode: false}, want: "sei-mainnet-live"},
		{name: "empty chain still formats", cfg: Config{DevMode: false}, want: "sei--live"},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			if got := tc.cfg.ChainSpec(); got != tc.want {
				t.Fatalf("ChainSpec() = %q, want %q", got, tc.want)
			}
		})
	}
}
