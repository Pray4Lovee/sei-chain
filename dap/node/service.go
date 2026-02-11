package node

import "fmt"

// Boot logs the startup plan for a Sei-native DAP node runtime.
func Boot(cfg Config) error {
	fmt.Printf("🌀 Sei DAP node booting with chain spec: %s\n", cfg.ChainSpec())
	fmt.Printf("   dev mode: %v\n", cfg.DevMode)
	fmt.Printf("   execution: %s\n", cfg.Execution)
	fmt.Printf("   rpc cors: %s\n", cfg.RPCAllowCORS)
	fmt.Printf("   node name: %s\n", cfg.NodeName)
	fmt.Printf("   base path: %s\n", cfg.BasePath)
	fmt.Printf("   p2p port: %d\n", cfg.P2PPort)
	fmt.Printf("   ws port: %d\n", cfg.WSPort)
	fmt.Printf("   validator: %v\n", cfg.Validator)
	fmt.Println("✅ Sei DAP services wired (scaffold)")
	return nil
}
