package node

import "fmt"

// Config captures runtime boot settings for a local Sei DAP node process.
type Config struct {
	Chain        string
	DevMode      bool
	Execution    string
	RPCAllowCORS string
	NodeName     string
	BasePath     string
	P2PPort      int
	WSPort       int
	Validator    bool
}

func (c Config) ChainSpec() string {
	mode := "live"
	if c.DevMode {
		mode = "dev"
	}
	return fmt.Sprintf("sei-%s-%s", c.Chain, mode)
}
