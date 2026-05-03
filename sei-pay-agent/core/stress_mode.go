package core

func RunStressBatch(exec TxExecutor, address string, amount float64, burst int) ([]string, error) {
	if burst < 1 {
		burst = 1
	}
	out := make([]string, 0, burst)
	for i := 0; i < burst; i++ {
		h, err := exec.ExecuteTransaction(address, amount)
		if err != nil {
			return nil, err
		}
		out = append(out, h)
	}
	return out, nil
}
