package circuit

// FieldElement is a lightweight stand-in for a zk scalar field element.
type FieldElement uint64

// PPLCircuit models pre/post-state transition constraints.
type PPLCircuit struct {
	PreState      *FieldElement
	PostState     *FieldElement
	TxHashWitness *FieldElement
}
