package main

import (
	"flag"
	"log"

	"github.com/sei-protocol/sei-chain/dap/node"
)

func main() {
	cfg := node.Config{}
	flag.StringVar(&cfg.Chain, "chain", "local", "chain profile (local, testnet, mainnet)")
	flag.BoolVar(&cfg.DevMode, "dev", false, "run in dev mode")
	flag.StringVar(&cfg.Execution, "execution", "native", "execution backend")
	flag.StringVar(&cfg.RPCAllowCORS, "rpc-cors", "all", "rpc cors mode")
	flag.StringVar(&cfg.NodeName, "name", "sei-dap-node", "human-readable node name")
	flag.StringVar(&cfg.BasePath, "base-path", "./.sei-dap", "node data path")
	flag.IntVar(&cfg.P2PPort, "port", 30333, "p2p port")
	flag.IntVar(&cfg.WSPort, "ws-port", 9944, "websocket rpc port")
	flag.BoolVar(&cfg.Validator, "validator", false, "run as validator")
	flag.Parse()

	if err := node.Boot(cfg); err != nil {
		log.Fatal(err)
	}
}
