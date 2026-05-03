package core

import "fmt"

type PolicyGate struct {
	authorized map[string]struct{}
}

func NewPolicyGate(users []string) *PolicyGate {
	m := make(map[string]struct{}, len(users))
	for _, u := range users {
		m[u] = struct{}{}
	}
	return &PolicyGate{authorized: m}
}

func (p *PolicyGate) AssertAuthorized(actor string) error {
	if _, ok := p.authorized[actor]; !ok {
		return fmt.Errorf("actor not authorized")
	}
	return nil
}
