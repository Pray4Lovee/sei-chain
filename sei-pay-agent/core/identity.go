package core

import "fmt"

type BindingStore interface {
	Bind(username, address string)
	Resolve(username string) (string, error)
}

type IdentityResolver struct {
	store BindingStore
}

func NewIdentityResolver(store BindingStore) *IdentityResolver {
	return &IdentityResolver{store: store}
}

func (i *IdentityResolver) Bind(username, address string) (string, string, error) {
	normalized, err := NormalizeUsername(username)
	if err != nil {
		return "", "", err
	}
	validated, err := ValidateAddress(address)
	if err != nil {
		return "", "", err
	}
	i.store.Bind(normalized, validated)
	return normalized, validated, nil
}

func (i *IdentityResolver) Resolve(username string) (string, error) {
	normalized, err := NormalizeUsername(username)
	if err != nil {
		return "", err
	}
	address, err := i.store.Resolve(normalized)
	if err != nil {
		return "", fmt.Errorf("resolve failed: %w", err)
	}
	return address, nil
}
