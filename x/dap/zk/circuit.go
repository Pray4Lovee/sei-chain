package zk

// PPLCircuit is a simple witness container for a future zk-SNARK circuit backend.
type PPLCircuit struct {
	PreState      []byte
	PostState     []byte
	ExtrinsicHash []byte
}
