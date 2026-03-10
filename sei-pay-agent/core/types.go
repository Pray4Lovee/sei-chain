package core

import "time"

type IntentStatus string

const (
	StatusPending  IntentStatus = "pending"
	StatusExecuted IntentStatus = "executed"
	StatusFailed   IntentStatus = "failed"
)

type Binding struct {
	Username  string
	Address   string
	CreatedAt time.Time
}

type Intent struct {
	IntentID    string
	Source      string
	RequesterID string
	Username    string
	Address     string
	AmountSEI   float64
	Status      IntentStatus
	TxHash      string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type AuditEntry struct {
	ID        int64
	EventType string
	Actor     string
	Payload   string
	CreatedAt time.Time
}
