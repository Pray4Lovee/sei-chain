package main

import (
	"crypto/sha256"
	"encoding/hex"
	"flag"
	"fmt"
	"log"

	"github.com/sei-protocol/sei-chain/dap/zk/circuit"
	"github.com/sei-protocol/sei-chain/dap/zk/proof"
)

func main() {
	var extrinsic, pre, post string
	flag.StringVar(&extrinsic, "extrinsic", "", "transaction payload")
	flag.StringVar(&pre, "pre", "", "pre-state witness")
	flag.StringVar(&post, "post", "", "post-state witness")
	flag.Parse()

	if extrinsic == "" {
		log.Fatal("-extrinsic is required")
	}

	hash := sha256.Sum256([]byte(extrinsic))
	fmt.Printf("🔐 Tx Hash: %s\n", hex.EncodeToString(hash[:]))

	one := circuit.FieldElement(1)
	two := circuit.FieldElement(2)
	three := circuit.FieldElement(3)
	ppl := circuit.PPLCircuit{PreState: &one, PostState: &two, TxHashWitness: &three}
	fmt.Printf("🧠 PPL circuit ready: %+v\n", ppl)

	receipt := proof.Generate([]byte(extrinsic), []byte(pre), []byte(post))
	fmt.Printf("📜 zk receipt bytes: %d\n", len(receipt.Journal))
}
