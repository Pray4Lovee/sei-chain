package core

import (
	"fmt"
	"regexp"
	"strings"
)

var evmAddressPattern = regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)

func NormalizeUsername(name string) (string, error) {
	value := strings.TrimSpace(strings.TrimPrefix(name, "@"))
	if value == "" {
		return "", fmt.Errorf("username cannot be empty")
	}
	if len(value) > 64 {
		return "", fmt.Errorf("username too long")
	}
	return strings.ToLower(value), nil
}

func ValidateAddress(address string) (string, error) {
	value := strings.TrimSpace(address)
	if !evmAddressPattern.MatchString(value) {
		return "", fmt.Errorf("invalid EVM address")
	}
	return value, nil
}

func ValidateAmount(amount float64) error {
	if amount <= 0 {
		return fmt.Errorf("amount must be positive")
	}
	return nil
}
