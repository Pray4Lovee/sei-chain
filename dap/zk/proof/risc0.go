package proof

// Receipt captures a proof journal emitted by a zk execution backend.
type Receipt struct {
	Journal []byte
}

func Generate(extrinsic, pre, post []byte) Receipt {
	journal := make([]byte, 0, len(extrinsic)+len(pre)+len(post))
	journal = append(journal, extrinsic...)
	journal = append(journal, pre...)
	journal = append(journal, post...)
	return Receipt{Journal: journal}
}
