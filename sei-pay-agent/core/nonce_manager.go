package core

import "sync"

type NonceProvider interface {
	CurrentNonce(address string) (uint64, error)
}

type NonceManager struct {
	provider NonceProvider
	address  string
	local    *uint64
	mu       sync.Mutex
}

func NewNonceManager(provider NonceProvider, address string) *NonceManager {
	return &NonceManager{provider: provider, address: address}
}

func (n *NonceManager) Next() (uint64, error) {
	n.mu.Lock()
	defer n.mu.Unlock()
	if n.local == nil {
		start, err := n.provider.CurrentNonce(n.address)
		if err != nil {
			return 0, err
		}
		n.local = &start
		return start, nil
	}
	(*n.local)++
	return *n.local, nil
}
