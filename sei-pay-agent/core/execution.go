package core

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

type TxExecutor interface {
	ExecuteTransaction(to string, amountSEI float64) (string, error)
}

type DeterministicExecutor struct {
	chainID int64
}

func NewDeterministicExecutor(chainID int64) *DeterministicExecutor {
	return &DeterministicExecutor{chainID: chainID}
}

func (e *DeterministicExecutor) ExecuteTransaction(to string, amountSEI float64) (string, error) {
	if _, err := ValidateAddress(to); err != nil {
		return "", err
	}
	if err := ValidateAmount(amountSEI); err != nil {
		return "", err
	}
	material := fmt.Sprintf("%d|%s|%.8f", e.chainID, to, amountSEI)
	h := sha256.Sum256([]byte(material))
	return "0x" + hex.EncodeToString(h[:]), nil
}
