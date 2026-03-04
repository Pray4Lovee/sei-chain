package circuit

import "testing"

func TestPPLCircuitFieldWiring(t *testing.T) {
	t.Parallel()
	pre := FieldElement(1)
	post := FieldElement(2)
	tx := FieldElement(3)
	c := PPLCircuit{PreState: &pre, PostState: &post, TxHashWitness: &tx}

	if c.PreState == nil || c.PostState == nil || c.TxHashWitness == nil {
		t.Fatalf("circuit witnesses must be connected: %+v", c)
	}
	if *c.PreState+*c.TxHashWitness != 4 {
		t.Fatalf("unexpected witness arithmetic: pre=%d tx=%d", *c.PreState, *c.TxHashWitness)
	}
}
