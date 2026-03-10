package core

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

type IntentStore interface {
	CreateIntent(intent Intent)
	GetIntent(intentID string) (Intent, error)
	UpdateIntent(intent Intent) error
}

type IntentEngine struct {
	store IntentStore
}

func NewIntentEngine(store IntentStore) *IntentEngine {
	return &IntentEngine{store: store}
}

func (e *IntentEngine) Create(source, requesterID, username, address string, amount float64) (Intent, error) {
	if err := ValidateAmount(amount); err != nil {
		return Intent{}, err
	}
	validatedAddr, err := ValidateAddress(address)
	if err != nil {
		return Intent{}, err
	}
	now := time.Now().UTC()
	intent := Intent{
		IntentID:    newIntentID(),
		Source:      source,
		RequesterID: requesterID,
		Username:    username,
		Address:     validatedAddr,
		AmountSEI:   amount,
		Status:      StatusPending,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	e.store.CreateIntent(intent)
	return intent, nil
}

func newIntentID() string {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return hex.EncodeToString(buf)
}

func (e *IntentEngine) Fetch(intentID string) (Intent, error) {
	return e.store.GetIntent(intentID)
}

func (e *IntentEngine) MarkExecuted(intentID, txHash string) error {
	if txHash == "" {
		return fmt.Errorf("tx hash required")
	}
	intent, err := e.store.GetIntent(intentID)
	if err != nil {
		return err
	}
	intent.Status = StatusExecuted
	intent.TxHash = txHash
	intent.UpdatedAt = time.Now().UTC()
	return e.store.UpdateIntent(intent)
}

func (e *IntentEngine) MarkFailed(intentID string) error {
	intent, err := e.store.GetIntent(intentID)
	if err != nil {
		return err
	}
	intent.Status = StatusFailed
	intent.UpdatedAt = time.Now().UTC()
	return e.store.UpdateIntent(intent)
}
