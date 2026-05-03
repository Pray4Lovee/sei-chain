package core

import (
	"encoding/json"
)

type AuditStore interface {
	AddAudit(eventType, actor, payload string)
}

type AuditLog struct {
	store AuditStore
}

func NewAuditLog(store AuditStore) *AuditLog {
	return &AuditLog{store: store}
}

func (a *AuditLog) Record(eventType, actor string, payload map[string]any) {
	buf, _ := json.Marshal(payload)
	a.store.AddAudit(eventType, actor, string(buf))
}
